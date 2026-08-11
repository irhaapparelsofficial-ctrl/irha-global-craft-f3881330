import { chromium, webkit } from "playwright";

const BROWSER_ORIGIN = (process.env.BROWSER_ORIGIN || "https://irha-apparels.pages.dev").replace(/\/$/, "");
const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || "https://irhaapparels.com").replace(/\/$/, "");
const EXPECTED_SHA = process.env.EXPECTED_SHA || "";
const WATCH_PATH = "/factory-capability-video";
const CALL_PATH = "/factory-video-call";
const MANUFACTURING_PATH = "/manufacturing";
const BUYER_TRUST_PATH = "/buyer-trust";
const CATEGORY_PATH = "/products/sportswear";
const MEDIA_MARKER = "irha-apparels-factory-capability-2026.mp4";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyExactProductionArtifact() {
  assert(/^[0-9a-f]{40}$/.test(EXPECTED_SHA), `EXPECTED_SHA must be the exact 40-character production commit; received ${EXPECTED_SHA || "<empty>"}`);

  const cacheBust = `${EXPECTED_SHA.slice(0, 12)}-${Date.now()}`;
  const response = await fetch(`${BROWSER_ORIGIN}/build.json?gp4v_r1_acceptance=${cacheBust}`, {
    headers: { "Cache-Control": "no-cache" },
  });
  assert(response.status === 200, `exact production artifact build.json HTTP ${response.status}`);

  const build = await response.json();
  assert(build?.source_commit === EXPECTED_SHA, `browser origin source_commit was ${build?.source_commit || "<missing>"}; expected ${EXPECTED_SHA}`);
  assert(build?.source_identity_state === "verified", `browser origin source_identity_state was ${build?.source_identity_state || "<missing>"}`);
  assert(typeof build?.build_fingerprint === "string" && /^[0-9a-f]{64}$/.test(build.build_fingerprint), "browser origin build fingerprint is missing or invalid");

  console.log(JSON.stringify({
    check: "exact-production-artifact",
    browserOrigin: BROWSER_ORIGIN,
    canonicalOrigin: CANONICAL_ORIGIN,
    sourceCommit: build.source_commit,
    sourceIdentityState: build.source_identity_state,
    buildFingerprint: build.build_fingerprint,
  }));
}

async function assertSingleCanonical(page, expectedHref, label) {
  await page.waitForFunction((href) => {
    const nodes = Array.from(document.querySelectorAll('link[rel="canonical"]'));
    return nodes.length === 1 && nodes[0]?.getAttribute("href") === href;
  }, expectedHref, { timeout: 20_000 });

  const canonicals = page.locator('link[rel="canonical"]');
  const count = await canonicals.count();
  const href = count === 1 ? await canonicals.first().getAttribute("href") : null;
  assert(count === 1, `${label}: expected exactly one canonical, found ${count}`);
  assert(href === expectedHref, `${label}: canonical was ${href}; expected ${expectedHref}`);
  return { count, href };
}

async function findBuyerLink(page, href, label) {
  const link = page.locator(`a[href="${href}"]`).first();
  for (let attempt = 0; attempt < 14; attempt += 1) {
    if (await link.count()) {
      await link.scrollIntoViewIfNeeded();
      await link.waitFor({ state: "visible", timeout: 10_000 });
      return link;
    }
    await page.evaluate(() => window.scrollBy(0, Math.max(window.innerHeight * 0.8, 520)));
    await page.waitForTimeout(250);
  }
  throw new Error(`${label}: buyer link ${href} did not render after progressive homepage scroll`);
}

async function navigateSpaRoute(page, path, label) {
  await page.evaluate((nextPath) => {
    window.history.pushState({}, "", nextPath);
    window.dispatchEvent(new PopStateEvent("popstate"));
  }, path);
  await page.waitForURL((url) => url.pathname === path, { timeout: 20_000 });
  const canonical = await assertSingleCanonical(page, `${CANONICAL_ORIGIN}${path}`, `${label}: ${path}`);
  console.log(`${label}: representative SPA canonical ${path} -> ${canonical.href}`);
  return canonical;
}

async function enterWatchPageFromHomepage(page, label, mediaRequests) {
  const response = await page.goto(`${BROWSER_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response && response.status() < 400, `${label}: homepage HTTP ${response?.status()}`);

  await page.waitForTimeout(1_500);
  const homeCanonical = await assertSingleCanonical(page, `${CANONICAL_ORIGIN}/`, `${label}: homepage`);
  assert(homeCanonical.count === 1, `${label}: homepage canonical count was ${homeCanonical.count}`);
  assert(mediaRequests.length === 0, `${label}: homepage requested full MP4 before buyer watch intent: ${mediaRequests.join(", ")}`);

  const watchLink = await findBuyerLink(page, WATCH_PATH, label);
  assert(mediaRequests.length === 0, `${label}: revealing the poster section requested full MP4 before buyer watch intent`);

  await Promise.all([
    page.waitForURL((url) => url.pathname === WATCH_PATH, { timeout: 20_000 }),
    watchLink.click(),
  ]);

  assert(new URL(page.url()).origin === BROWSER_ORIGIN, `${label}: client-side watch navigation left exact production artifact origin`);
  console.log(`${label}: exact production SPA watch navigation: homepage buyer link -> ${WATCH_PATH}`);
}

async function verifyWatchPage(browser, label, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const mediaRequests = [];
  page.on("request", (request) => {
    if (request.url().includes(MEDIA_MARKER)) mediaRequests.push(request.url());
  });

  await enterWatchPageFromHomepage(page, label, mediaRequests);

  await page.getByRole("heading", { level: 1, name: /Inside the Irha Apparels Factory/i }).waitFor({ state: "visible", timeout: 20_000 });
  const watchCanonical = await assertSingleCanonical(page, `${CANONICAL_ORIGIN}${WATCH_PATH}`, `${label}: watch page`);

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
  assert(Number.isFinite(playback.duration) && playback.duration > 74 && playback.duration < 76, `${label}: unexpected duration ${playback.duration}`);
  assert(playback.videoWidth > 0 && playback.videoHeight > 0, `${label}: decoded video dimensions unavailable`);

  const seekTarget = 8;
  await video.evaluate((node, target) => {
    node.currentTime = target;
  }, seekTarget);
  await page.waitForFunction((target) => {
    const node = document.querySelector('[data-testid="factory-video"]');
    return node instanceof HTMLVideoElement && node.currentTime >= target - 0.4 && node.readyState >= 2;
  }, seekTarget, { timeout: 20_000 });

  await page.getByTestId("factory-video-fullscreen").click();
  await page.waitForTimeout(900);
  const enlargeState = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="factory-video-shell"]');
    const node = document.querySelector('[data-testid="factory-video"]');
    return {
      fullscreen: Boolean(document.fullscreenElement),
      theater: shell?.getAttribute("data-theater") === "true",
      webkitFullscreen: Boolean(node && node.webkitDisplayingFullscreen),
    };
  });
  assert(enlargeState.fullscreen || enlargeState.theater || enlargeState.webkitFullscreen, `${label}: explicit Full Screen did not enlarge the player`);

  if (enlargeState.fullscreen) {
    await page.evaluate(async () => {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    });
  } else if (enlargeState.webkitFullscreen) {
    await video.evaluate((node) => {
      if (typeof node.webkitExitFullscreen === "function") node.webkitExitFullscreen();
    });
  } else if (enlargeState.theater) {
    await page.getByTestId("factory-video-theater").click();
  }
  await page.waitForTimeout(400);
  const exited = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="factory-video-shell"]');
    const node = document.querySelector('[data-testid="factory-video"]');
    return !document.fullscreenElement && !node?.webkitDisplayingFullscreen && shell?.getAttribute("data-theater") !== "true";
  });
  assert(exited, `${label}: enlarged mode did not exit cleanly`);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(overflow.scrollWidth <= overflow.clientWidth + 2, `${label}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`);
  assert(mediaRequests.length > 0, `${label}: user Play did not request the MP4`);

  const callLink = await findBuyerLink(page, CALL_PATH, label);
  await Promise.all([
    page.waitForURL((url) => url.pathname === CALL_PATH, { timeout: 20_000 }),
    callLink.click(),
  ]);
  await page.getByRole("heading", { level: 1, name: /view the factory live/i }).waitFor({ state: "visible", timeout: 20_000 });
  const callCanonical = await assertSingleCanonical(page, `${CANONICAL_ORIGIN}${CALL_PATH}`, `${label}: factory call`);

  const representativeCanonicals = {
    manufacturing: await navigateSpaRoute(page, MANUFACTURING_PATH, label),
    buyerTrust: await navigateSpaRoute(page, BUYER_TRUST_PATH, label),
    category: await navigateSpaRoute(page, CATEGORY_PATH, label),
  };

  await context.close();
  console.log(JSON.stringify({
    label,
    browserOrigin: BROWSER_ORIGIN,
    canonicalOrigin: CANONICAL_ORIGIN,
    navigationMode: "homepage-client-route",
    watchCanonical,
    callCanonical,
    representativeCanonicals,
    playback,
    seekTarget,
    enlargeState,
    exited,
    overflow,
    mediaRequests: mediaRequests.length,
  }));
}

async function verifyHomepageDoesNotLoadVideo(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const mediaRequests = [];
  page.on("request", (request) => {
    if (request.url().includes(MEDIA_MARKER)) mediaRequests.push(request.url());
  });
  const response = await page.goto(`${BROWSER_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response && response.status() < 400, `homepage HTTP ${response?.status()}`);
  await page.waitForTimeout(1_500);
  await assertSingleCanonical(page, `${CANONICAL_ORIGIN}/`, "homepage no-MP4 check");
  await page.waitForTimeout(1_500);
  assert(mediaRequests.length === 0, `homepage requested full MP4 before buyer intent: ${mediaRequests.join(", ")}`);
  await context.close();
  console.log(`Homepage initial MP4 request on exact production artifact (${BROWSER_ORIGIN}): NONE`);
}

const iPhoneUserAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";

async function main() {
  await verifyExactProductionArtifact();

  const chrome = await chromium.launch({ channel: "chrome", headless: true });
  try {
    await verifyWatchPage(chrome, "Chrome desktop", { viewport: { width: 1440, height: 1000 } });
    await verifyHomepageDoesNotLoadVideo(chrome);
  } finally {
    await chrome.close();
  }

  const webkitBrowser = await webkit.launch({ headless: true });
  try {
    await verifyWatchPage(webkitBrowser, "WebKit phone portrait emulation", {
      viewport: { width: 390, height: 844 },
      screen: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: iPhoneUserAgent,
    });
    await verifyWatchPage(webkitBrowser, "WebKit phone landscape emulation", {
      viewport: { width: 844, height: 390 },
      screen: { width: 844, height: 390 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: iPhoneUserAgent,
    });
  } finally {
    await webkitBrowser.close();
  }

  console.log("GP-4V-R1 live browser acceptance: PASS");
}

main().catch((error) => {
  console.error(`GP-4V-R1 live browser acceptance: FAIL — ${error instanceof Error ? error.stack || error.message : String(error)}`);
  process.exit(1);
});
