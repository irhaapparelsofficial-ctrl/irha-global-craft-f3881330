import { chromium } from "playwright";

const BROWSER_ORIGIN = (process.env.BROWSER_ORIGIN || "https://irha-apparels.pages.dev").replace(/\/$/, "");
const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || "https://irhaapparels.com").replace(/\/$/, "");
const EXPECTED_SHA = process.env.EXPECTED_SHA || "";
const WATCH_PATH = "/factory-capability-video";
const CALL_PATH = "/factory-video-call";
const REPRESENTATIVE_PATHS = ["/manufacturing", "/buyer-trust", "/products/sportswear"];
const issues = [];

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function record(condition, message) {
  if (!condition) issues.push(message);
}

function expectedCanonical(pathname) {
  return pathname === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${pathname}`;
}

function canonicalFromHtml(html) {
  const tags = [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)].map((match) => match[0]);
  return tags.map((outerHTML) => ({
    outerHTML,
    href: outerHTML.match(/\bhref=["']([^"']+)["']/i)?.[1] || null,
    fallback: /\bdata-irha-fallback-seo=["']true["']/i.test(outerHTML),
  }));
}

async function verifyReleaseIdentity() {
  assert(/^[0-9a-f]{40}$/.test(EXPECTED_SHA), `EXPECTED_SHA must be an exact commit SHA; received ${EXPECTED_SHA || "<empty>"}`);
  const response = await fetch(`${BROWSER_ORIGIN}/build.json?gp4v_r2_diag=${EXPECTED_SHA.slice(0, 12)}-${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  assert(response.status === 200, `build.json HTTP ${response.status}`);
  const build = await response.json();
  assert(build?.source_commit === EXPECTED_SHA, `production source_commit ${build?.source_commit || "<missing>"}; expected ${EXPECTED_SHA}`);
  assert(build?.source_identity_state === "verified", `production source_identity_state ${build?.source_identity_state || "<missing>"}`);
  console.log(JSON.stringify({ phase: "release-identity", sourceCommit: build.source_commit, sourceIdentityState: build.source_identity_state, buildFingerprint: build.build_fingerprint }));
}

async function inspectInitialHtml(pathname) {
  const expectedHref = expectedCanonical(pathname);
  const response = await fetch(`${BROWSER_ORIGIN}${pathname}?gp4v_r2_raw=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
  record(response.status === 200, `raw ${pathname}: HTTP ${response.status}`);
  const html = await response.text();
  const canonicals = canonicalFromHtml(html);
  const result = { phase: "initial-html", pathname, expectedHref, count: canonicals.length, canonicals };
  console.log(JSON.stringify(result));
  record(canonicals.length === 1, `raw ${pathname}: expected one canonical, found ${canonicals.length}`);
  record(canonicals[0]?.href === expectedHref, `raw ${pathname}: canonical ${canonicals[0]?.href}; expected ${expectedHref}`);
  record(canonicals[0]?.fallback === true, `raw ${pathname}: static canonical is missing data-irha-fallback-seo=\"true\"`);
  return result;
}

async function captureCanonicalState(page, phase) {
  const state = await page.evaluate((label) => {
    const canonicals = Array.from(document.querySelectorAll('link[rel="canonical"]'));
    const helmetRelevant = Array.from(document.head.querySelectorAll('[data-rh="true"], [data-react-helmet="true"]'))
      .filter((node) => node.matches('link[rel="canonical"], title, meta[name="description"], meta[property="og:url"]'))
      .map((node) => node.outerHTML);
    const canonicalRelatedHead = Array.from(document.head.children)
      .filter((node) => node.matches('link[rel="canonical"], [data-irha-fallback-seo="true"], [data-rh="true"], [data-react-helmet="true"]'))
      .map((node) => node.outerHTML);
    const root = document.querySelector('#root');
    return {
      phase: label,
      currentURL: location.href,
      readyState: document.readyState,
      pathname: location.pathname,
      title: document.title,
      reactRootExists: Boolean(root),
      rootChildCount: root?.children.length ?? null,
      bootShellExists: Boolean(document.querySelector('#irha-app-boot-shell')),
      crawlerShellExists: Boolean(document.querySelector('#irha-static-crawler-shell')),
      canonicalCount: canonicals.length,
      canonicals: canonicals.map((node) => ({
        href: node.getAttribute('href'),
        outerHTML: node.outerHTML,
        fallback: node.getAttribute('data-irha-fallback-seo'),
        dataRh: node.getAttribute('data-rh'),
      })),
      fallbackSeoNodeCount: document.querySelectorAll('[data-irha-fallback-seo="true"]').length,
      helmetRelevant,
      canonicalRelatedHead,
    };
  }, phase);
  console.log(JSON.stringify(state));
  return state;
}

function recordRuntimeCanonical(state, pathname, label) {
  const expectedHref = expectedCanonical(pathname);
  record(state.canonicalCount === 1, `${label}: expected one runtime canonical, found ${state.canonicalCount}`);
  record(state.canonicals[0]?.href === expectedHref, `${label}: canonical ${state.canonicals[0]?.href}; expected ${expectedHref}`);
}

async function captureSettledCanonical(page, pathname, label) {
  const expectedHref = expectedCanonical(pathname);
  try {
    await page.waitForFunction((href) => {
      const nodes = Array.from(document.querySelectorAll('link[rel="canonical"]'));
      return nodes.length === 1 && nodes[0]?.getAttribute("href") === href;
    }, expectedHref, { timeout: 6_000 });
  } catch {
    // Diagnostic mode intentionally continues so every requested lifecycle state is printed.
  }
  const state = await captureCanonicalState(page, `${label}:settled`);
  recordRuntimeCanonical(state, pathname, label);
  return state;
}

async function waitForReactMount(page, phase) {
  try {
    await page.waitForFunction(() => {
      const root = document.querySelector('#root');
      return Boolean(root && root.children.length > 0 && !document.querySelector('#irha-app-boot-shell'));
    }, undefined, { timeout: 10_000 });
  } catch {
    issues.push(`${phase}: React mount signal was not observed within 10s`);
  }
  return captureCanonicalState(page, phase);
}

async function findBuyerLink(page, path) {
  const link = page.locator(`a[href="${path}"]`).first();
  for (let attempt = 0; attempt < 14; attempt += 1) {
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded();
      if (await link.isVisible()) return link;
    }
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 0.8, 520)));
    await page.waitForTimeout(250);
  }
  throw new Error(`buyer link ${path} not rendered`);
}

async function navigateByActualLink(page, path, label) {
  const link = await findBuyerLink(page, path);
  await Promise.all([
    page.waitForURL((url) => url.pathname === path, { timeout: 20_000 }),
    link.click(),
  ]);
  await captureCanonicalState(page, `${label}:immediately-after-spa-navigation`);
  await page.waitForTimeout(1_200);
  const stabilized = await captureCanonicalState(page, `${label}:stabilized-after-spa-navigation`);
  recordRuntimeCanonical(stabilized, path, `${label}:stabilized`);
  await captureSettledCanonical(page, path, `${label}:canonical`);
}

async function navigateRepresentative(page, path) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, '', nextPath);
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, path);
  await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 });
  await captureCanonicalState(page, `representative:${path}:immediately-after-spa-navigation`);
  await page.waitForTimeout(1_200);
  const stabilized = await captureCanonicalState(page, `representative:${path}:stabilized-after-spa-navigation`);
  recordRuntimeCanonical(stabilized, path, `representative:${path}:stabilized`);
  await captureSettledCanonical(page, path, `representative:${path}:canonical`);
}

async function main() {
  await verifyReleaseIdentity();
  const paths = ["/", WATCH_PATH, CALL_PATH, ...REPRESENTATIVE_PATHS];
  for (const path of paths) await inspectInitialHtml(path);

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    const page = await context.newPage();
    const response = await page.goto(`${BROWSER_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    assert(response && response.status() < 400, `homepage HTTP ${response?.status()}`);

    await captureCanonicalState(page, 'homepage:domcontentloaded');
    await waitForReactMount(page, 'homepage:after-react-mount');
    await page.waitForTimeout(1_200);
    const homeStable = await captureCanonicalState(page, 'homepage:stabilized');
    recordRuntimeCanonical(homeStable, '/', 'homepage:stabilized');
    await captureSettledCanonical(page, '/', 'homepage:canonical');

    try {
      await navigateByActualLink(page, WATCH_PATH, 'homepage-to-watch');
    } catch (error) {
      issues.push(`homepage-to-watch navigation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (new URL(page.url()).pathname === WATCH_PATH) {
      try {
        await navigateByActualLink(page, CALL_PATH, 'watch-to-factory-call');
      } catch (error) {
        issues.push(`watch-to-factory-call navigation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    for (const path of REPRESENTATIVE_PATHS) {
      try {
        await navigateRepresentative(page, path);
      } catch (error) {
        issues.push(`representative ${path} navigation failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    await context.close();
  } finally {
    await browser.close();
  }

  console.log(JSON.stringify({ phase: "diagnostic-summary", issueCount: issues.length, issues }, null, 2));
  if (issues.length) throw new Error(`Canonical diagnostic found ${issues.length} issue(s)`);
  console.log('GP-4V-R2 canonical diagnostic: PASS');
}

main().catch((error) => {
  console.error(`GP-4V-R2 canonical diagnostic: FAIL — ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
});