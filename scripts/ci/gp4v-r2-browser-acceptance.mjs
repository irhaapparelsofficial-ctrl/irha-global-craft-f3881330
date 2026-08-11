import { chromium, webkit } from "playwright";

const BROWSER_ORIGIN = (process.env.BROWSER_ORIGIN || "https://irha-apparels.pages.dev").replace(/\/$/, "");
const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || "https://irhaapparels.com").replace(/\/$/, "");
const EXPECTED_SHA = process.env.EXPECTED_SHA || "";
const WATCH_PATH = "/factory-capability-video";
const CALL_PATH = "/factory-video-call";
const REPRESENTATIVE_PATHS = ["/manufacturing", "/buyer-trust", "/products/sportswear"];
const RAW_PATHS = ["/", WATCH_PATH, CALL_PATH, ...REPRESENTATIVE_PATHS];
const MEDIA_MARKER = "irha-apparels-factory-capability-2026.mp4";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function expectedCanonical(pathname) {
  return pathname === "/" ? `${CANONICAL_ORIGIN}/` : `${CANONICAL_ORIGIN}${pathname}`;
}

function canonicalTagsFromHtml(html) {
  return [...html.matchAll(/<link\b[^>]*\brel=["']canonical["'][^>]*>/gi)].map((match) => ({
    outerHTML: match[0],
    href: match[0].match(/\bhref=["']([^"']+)["']/i)?.[1] || null,
    fallback: /\bdata-irha-fallback-seo=["']true["']/i.test(match[0]),
  }));
}

async function verifyExactArtifact() {
  assert(/^[0-9a-f]{40}$/.test(EXPECTED_SHA), `EXPECTED_SHA must be an exact 40-character commit; received ${EXPECTED_SHA || "<empty>"}`);
  const response = await fetch(`${BROWSER_ORIGIN}/build.json?gp4v_r2=${EXPECTED_SHA.slice(0, 12)}-${Date.now()}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  assert(response.status === 200, `build.json HTTP ${response.status}`);
  const build = await response.json();
  assert(build?.source_commit === EXPECTED_SHA, `source_commit ${build?.source_commit || "<missing>"}; expected ${EXPECTED_SHA}`);
  assert(build?.source_identity_state === "verified", `source_identity_state ${build?.source_identity_state || "<missing>"}`);
  assert(typeof build?.build_fingerprint === "string" && /^[0-9a-f]{64}$/.test(build.build_fingerprint), "build fingerprint missing or invalid");
  console.log(JSON.stringify({ check: "exact-release-identity", browserOrigin: BROWSER_ORIGIN, sourceCommit: build.source_commit, buildFingerprint: build.build_fingerprint }));
}

async function verifyRawStaticCanonicals() {
  const results = [];
  for (const pathname of RAW_PATHS) {
    const response = await fetch(`${BROWSER_ORIGIN}${pathname}?gp4v_r2_raw=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
    assert(response.status === 200, `raw ${pathname}: HTTP ${response.status}`);
    const html = await response.text();
    const tags = canonicalTagsFromHtml(html);
    const expected = expectedCanonical(pathname);
    assert(tags.length === 1, `raw ${pathname}: expected exactly one canonical, found ${tags.length}: ${JSON.stringify(tags)}`);
    assert(tags[0].href === expected, `raw ${pathname}: canonical ${tags[0].href}; expected ${expected}`);
    assert(tags[0].fallback, `raw ${pathname}: canonical missing data-irha-fallback-seo=\"true\": ${tags[0].outerHTML}`);
    results.push({ pathname, count: tags.length, href: tags[0].href, fallback: tags[0].fallback });
  }
  console.log(JSON.stringify({ check: "raw-static-canonicals", results }));
}

async function canonicalState(page, label) {
  const state = await page.evaluate((phase) => {
    const canonicals = Array.from(document.querySelectorAll('link[rel="canonical"]'));
    return {
      phase,
      currentURL: location.href,
      pathname: location.pathname,
      readyState: document.readyState,
      title: document.title,
      reactRootExists: Boolean(document.querySelector('#root')),
      rootChildCount: document.querySelector('#root')?.children.length ?? null,
      canonicalCount: canonicals.length,
      canonicals: canonicals.map((node) => ({
        href: node.getAttribute('href'),
        outerHTML: node.outerHTML,
        fallback: node.getAttribute('data-irha-fallback-seo'),
        dataRh: node.getAttribute('data-rh'),
      })),
      fallbackSeoNodeCount: document.querySelectorAll('[data-irha-fallback-seo="true"]').length,
      helmetCanonicalCount: document.querySelectorAll('link[rel="canonical"][data-rh="true"]').length,
      canonicalRelatedHead: Array.from(document.head.children)
        .filter((node) => node.matches('link[rel="canonical"], [data-irha-fallback-seo="true"], [data-rh="true"]'))
        .map((node) => node.outerHTML),
    };
  }, label);
  console.log(JSON.stringify(state));
  return state;
}

async function assertSingleCanonical(page, pathname, label) {
  const expected = expectedCanonical(pathname);
  try {
    await page.waitForFunction((href) => {
      const nodes = Array.from(document.querySelectorAll('link[rel="canonical"]'));
      return nodes.length === 1 && nodes[0]?.getAttribute('href') === href;
    }, expected, { timeout: 20_000 });
  } catch (error) {
    const state = await canonicalState(page, `${label}:canonical-failure`);
    throw new Error(`${label}: canonical did not converge to one ${expected}; state=${JSON.stringify(state)}; cause=${error instanceof Error ? error.message : String(error)}`);
  }
  const state = await canonicalState(page, `${label}:canonical-pass`);
  assert(state.canonicalCount === 1, `${label}: canonical count ${state.canonicalCount}`);
  assert(state.canonicals[0]?.href === expected, `${label}: canonical ${state.canonicals[0]?.href}; expected ${expected}`);
  assert(state.canonicals[0]?.dataRh === "true", `${label}: runtime canonical is not Helmet-owned after React settled`);
  assert(state.fallbackSeoNodeCount === 0, `${label}: static fallback SEO nodes survived React ownership`);
  return { count: 1, href: expected };
}

async function findBuyerLink(page, href, label) {
  const link = page.locator(`a[href="${href}"]`).first();
  for (let attempt = 0; attempt < 16; attempt += 1) {
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded();
      if (await link.isVisible()) return link;
    }
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 0.75, 480)));
    await page.waitForTimeout(220);
  }
  throw new Error(`${label}: buyer link ${href} did not render`);
}

async function enterWatchFromHomepage(page, label, mediaRequests) {
  const response = await page.goto(`${BROWSER_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response && response.status() < 400, `${label}: homepage HTTP ${response?.status()}`);
  await canonicalState(page, `${label}:homepage-domcontentloaded`);
  await page.waitForTimeout(1_200);
  const homeCanonical = await assertSingleCanonical(page, "/", `${label}:homepage`);
  assert(mediaRequests.length === 0, `${label}: homepage requested MP4 before intent: ${mediaRequests.join(", ")}`);
  const watchLink = await findBuyerLink(page, WATCH_PATH, label);
  assert(mediaRequests.length === 0, `${label}: scrolling to watch link requested MP4 before intent`);
  await Promise.all([
    page.waitForURL((url) => url.pathname === WATCH_PATH, { timeout: 20_000 }),
    watchLink.click(),
  ]);
  assert(new URL(page.url()).origin === BROWSER_ORIGIN, `${label}: SPA watch navigation left tested artifact origin`);
  await canonicalState(page, `${label}:watch-immediately-after-spa-navigation`);
  return homeCanonical;
}

async function rectState(page) {
  return page.evaluate(() => {
    const shell = document.querySelector('[data-testid="factory-video-shell"]');
    const video = document.querySelector('[data-testid="factory-video"]');
    const shellRect = shell?.getBoundingClientRect();
    const videoRect = video?.getBoundingClientRect();
    return {
      viewport: { width: innerWidth, height: innerHeight },
      shell: shellRect ? { width: shellRect.width, height: shellRect.height, area: shellRect.width * shellRect.height } : null,
      video: videoRect ? { width: videoRect.width, height: videoRect.height, area: videoRect.width * videoRect.height } : null,
      fullscreen: Boolean(document.fullscreenElement),
      webkitFullscreen: Boolean(video && video.webkitDisplayingFullscreen),
      theater: shell?.getAttribute('data-theater') === 'true',
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    };
  });
}

function assertMeasuredEnlargement(before, after, label) {
  if (after.fullscreen || after.webkitFullscreen) return;
  assert(after.theater, `${label}: no fullscreen/native/theater state became active`);
  assert(before.shell && after.shell, `${label}: player shell geometry unavailable`);
  const areaRatio = after.shell.area / Math.max(before.shell.area, 1);
  const dimensionGrowth = after.shell.width >= before.shell.width * 1.08 || after.shell.height >= before.shell.height * 1.08;
  assert(areaRatio >= 1.25 && dimensionGrowth, `${label}: theater did not enlarge meaningfully; before=${JSON.stringify(before.shell)} after=${JSON.stringify(after.shell)} ratio=${areaRatio.toFixed(2)}`);
}

async function verifyWatchJourney(browser, label, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const mediaRequests = [];
  page.on("request", (request) => {
    if (request.url().includes(MEDIA_MARKER)) mediaRequests.push(request.url());
  });

  try {
    const homeCanonical = await enterWatchFromHomepage(page, label, mediaRequests);
    await page.getByRole("heading", { level: 1, name: /Inside the Irha Apparels Factory/i }).waitFor({ state: "visible", timeout: 20_000 });
    const watchCanonical = await assertSingleCanonical(page, WATCH_PATH, `${label}:watch`);

    const video = page.getByTestId("factory-video");
    await video.waitFor({ state: "visible", timeout: 20_000 });
    await page.getByTestId("factory-video-play").click();
    await page.waitForFunction(() => {
      const node = document.querySelector('[data-testid="factory-video"]');
      return node instanceof HTMLVideoElement && !node.paused && node.currentTime > 0.2 && node.readyState >= 2;
    }, undefined, { timeout: 25_000 });

    const playback = await video.evaluate((node) => ({
      paused: node.paused,
      currentTime: node.currentTime,
      duration: node.duration,
      readyState: node.readyState,
      videoWidth: node.videoWidth,
      videoHeight: node.videoHeight,
    }));
    assert(!playback.paused && playback.currentTime > 0.2 && playback.readyState >= 2, `${label}: Play contract failed ${JSON.stringify(playback)}`);
    assert(Number.isFinite(playback.duration) && playback.duration > 74 && playback.duration < 76, `${label}: unexpected duration ${playback.duration}`);
    assert(playback.videoWidth > 0 && playback.videoHeight > 0, `${label}: decoded dimensions unavailable`);

    const seekTarget = 8;
    await video.evaluate((node, target) => { node.currentTime = target; }, seekTarget);
    await page.waitForFunction((target) => {
      const node = document.querySelector('[data-testid="factory-video"]');
      return node instanceof HTMLVideoElement && !node.paused && node.currentTime >= target - 0.35 && node.readyState >= 2;
    }, seekTarget, { timeout: 20_000 });
    const afterSeekA = await video.evaluate((node) => node.currentTime);
    await page.waitForTimeout(700);
    const afterSeekB = await video.evaluate((node) => ({ currentTime: node.currentTime, paused: node.paused, readyState: node.readyState }));
    assert(!afterSeekB.paused && afterSeekB.readyState >= 2 && afterSeekB.currentTime > afterSeekA + 0.1, `${label}: playback did not continue after seek: ${JSON.stringify({ afterSeekA, afterSeekB })}`);

    const beforeEnlarge = await rectState(page);
    await page.getByTestId("factory-video-fullscreen").click();
    await page.waitForTimeout(1_000);
    const afterEnlarge = await rectState(page);
    assertMeasuredEnlargement(beforeEnlarge, afterEnlarge, label);
    assert(afterEnlarge.scrollWidth <= afterEnlarge.clientWidth + 2, `${label}: horizontal overflow while enlarged ${afterEnlarge.scrollWidth} > ${afterEnlarge.clientWidth}`);
    await page.getByTestId("factory-video-play").waitFor({ state: "visible", timeout: 5_000 });
    await page.getByTestId("factory-video-fullscreen").waitFor({ state: "visible", timeout: 5_000 });

    if (afterEnlarge.fullscreen) {
      await page.evaluate(async () => { if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen(); });
    } else if (afterEnlarge.webkitFullscreen) {
      await video.evaluate((node) => { if (typeof node.webkitExitFullscreen === "function") node.webkitExitFullscreen(); });
    } else {
      await page.getByTestId("factory-video-theater").click();
    }
    await page.waitForTimeout(500);
    const afterExit = await rectState(page);
    assert(!afterExit.fullscreen && !afterExit.webkitFullscreen && !afterExit.theater, `${label}: enlarged mode did not exit cleanly ${JSON.stringify(afterExit)}`);
    assert(afterExit.scrollWidth <= afterExit.clientWidth + 2, `${label}: horizontal overflow after exit`);
    assert(mediaRequests.length > 0, `${label}: Play did not request the MP4`);

    const callLink = await findBuyerLink(page, CALL_PATH, label);
    await Promise.all([
      page.waitForURL((url) => url.pathname === CALL_PATH, { timeout: 20_000 }),
      callLink.click(),
    ]);
    await canonicalState(page, `${label}:factory-call-immediately-after-spa-navigation`);
    await page.getByRole("heading", { level: 1, name: /view the factory live/i }).waitFor({ state: "visible", timeout: 20_000 });
    const callCanonical = await assertSingleCanonical(page, CALL_PATH, `${label}:factory-call`);

    const representative = {};
    for (const path of REPRESENTATIVE_PATHS) {
      await page.evaluate((nextPath) => {
        history.pushState({}, "", nextPath);
        dispatchEvent(new PopStateEvent("popstate"));
      }, path);
      await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 });
      await canonicalState(page, `${label}:${path}:immediately-after-spa-navigation`);
      representative[path] = await assertSingleCanonical(page, path, `${label}:${path}`);
    }

    const result = {
      label,
      homeCanonical,
      watchCanonical,
      callCanonical,
      representative,
      playback,
      seek: { target: seekTarget, continuedTo: afterSeekB.currentTime },
      enlargement: {
        standardFullscreen: afterEnlarge.fullscreen,
        webkitFullscreen: afterEnlarge.webkitFullscreen,
        theaterFallback: afterEnlarge.theater,
        before: beforeEnlarge,
        after: afterEnlarge,
        exit: afterExit,
      },
      homepageMp4BeforeIntent: 0,
      mediaRequestsAfterPlay: mediaRequests.length,
    };
    console.log(JSON.stringify(result));
    return result;
  } finally {
    await context.close();
  }
}

const iPhoneUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function main() {
  await verifyExactArtifact();
  await verifyRawStaticCanonicals();

  const chrome = await chromium.launch({ channel: "chrome", headless: true });
  try {
    await verifyWatchJourney(chrome, "Chrome desktop", { viewport: { width: 1440, height: 1000 } });
  } finally {
    await chrome.close();
  }

  const webkitBrowser = await webkit.launch({ headless: true });
  try {
    await verifyWatchJourney(webkitBrowser, "WebKit phone portrait emulation", {
      viewport: { width: 390, height: 844 }, screen: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: iPhoneUserAgent,
    });
    await verifyWatchJourney(webkitBrowser, "WebKit phone landscape emulation", {
      viewport: { width: 844, height: 390 }, screen: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3, userAgent: iPhoneUserAgent,
    });
  } finally {
    await webkitBrowser.close();
  }

  console.log("GP-4V-R2 browser acceptance: PASS");
}

main().catch((error) => {
  console.error(`GP-4V-R2 browser acceptance: FAIL — ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
});
