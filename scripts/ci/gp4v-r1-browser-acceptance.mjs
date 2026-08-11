import { chromium, webkit } from "playwright";

const TARGET_ORIGIN = (process.env.TARGET_ORIGIN || "https://irhaapparels.com").replace(/\/$/, "");
const WATCH_PATH = "/factory-capability-video";
const CALL_PATH = "/factory-video-call";
const MEDIA_MARKER = "irha-apparels-factory-capability-2026.mp4";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function verifyWatchPage(browser, label, contextOptions = {}) {
  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();
  const mediaRequests = [];
  page.on("request", (request) => {
    if (request.url().includes(MEDIA_MARKER)) mediaRequests.push(request.url());
  });

  const response = await page.goto(`${TARGET_ORIGIN}${WATCH_PATH}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response && response.status() < 400, `${label}: watch page HTTP ${response?.status()}`);

  await page.getByRole("heading", { level: 1, name: /Inside the Irha Apparels Factory/i }).waitFor({ state: "visible", timeout: 20_000 });
  const canonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  assert(canonical === `${TARGET_ORIGIN}${WATCH_PATH}`, `${label}: canonical was ${canonical}`);

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
  await page.waitForTimeout(700);
  const enlargeState = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="factory-video-shell"]');
    const node = document.querySelector('[data-testid="factory-video"]');
    const webkitVideo = node;
    return {
      fullscreen: Boolean(document.fullscreenElement),
      theater: shell?.getAttribute("data-theater") === "true",
      webkitFullscreen: Boolean(webkitVideo && webkitVideo.webkitDisplayingFullscreen),
    };
  });
  assert(enlargeState.fullscreen || enlargeState.theater || enlargeState.webkitFullscreen, `${label}: explicit Full Screen did not enlarge the player`);

  if (enlargeState.fullscreen) {
    await page.evaluate(async () => {
      if (document.fullscreenElement && document.exitFullscreen) await document.exitFullscreen();
    });
  } else if (enlargeState.theater) {
    await page.getByTestId("factory-video-theater").click();
  }
  await page.waitForTimeout(300);
  const exited = await page.evaluate(() => {
    const shell = document.querySelector('[data-testid="factory-video-shell"]');
    return !document.fullscreenElement && shell?.getAttribute("data-theater") !== "true";
  });
  assert(exited, `${label}: enlarged mode did not exit cleanly`);

  const overflow = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  assert(overflow.scrollWidth <= overflow.clientWidth + 2, `${label}: horizontal overflow ${overflow.scrollWidth} > ${overflow.clientWidth}`);
  assert(mediaRequests.length > 0, `${label}: user Play did not request the MP4`);

  const callResponse = await page.goto(`${TARGET_ORIGIN}${CALL_PATH}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(callResponse && callResponse.status() < 400, `${label}: factory call page HTTP ${callResponse?.status()}`);
  await page.getByRole("heading", { level: 1, name: /view the factory live/i }).waitFor({ state: "visible", timeout: 20_000 });
  const callCanonical = await page.locator('link[rel="canonical"]').getAttribute("href");
  assert(callCanonical === `${TARGET_ORIGIN}${CALL_PATH}`, `${label}: factory-call canonical was ${callCanonical}`);

  await context.close();
  console.log(JSON.stringify({ label, playback, seekTarget, enlargeState, overflow, mediaRequests: mediaRequests.length }));
}

async function verifyHomepageDoesNotLoadVideo(browser) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const mediaRequests = [];
  page.on("request", (request) => {
    if (request.url().includes(MEDIA_MARKER)) mediaRequests.push(request.url());
  });
  const response = await page.goto(`${TARGET_ORIGIN}/`, { waitUntil: "domcontentloaded", timeout: 45_000 });
  assert(response && response.status() < 400, `homepage HTTP ${response?.status()}`);
  await page.waitForTimeout(3_000);
  assert(mediaRequests.length === 0, `homepage requested full MP4 before buyer intent: ${mediaRequests.join(", ")}`);
  await context.close();
  console.log("Homepage initial MP4 request: NONE");
}

async function main() {
  const chrome = await chromium.launch({ channel: "chrome", headless: true });
  try {
    await verifyWatchPage(chrome, "Chrome desktop", { viewport: { width: 1440, height: 1000 } });
    await verifyHomepageDoesNotLoadVideo(chrome);
  } finally {
    await chrome.close();
  }

  const webkitBrowser = await webkit.launch({ headless: true });
  try {
    await verifyWatchPage(webkitBrowser, "WebKit mobile emulation", {
      viewport: { width: 390, height: 844 },
      screen: { width: 390, height: 844 },
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1",
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
