import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = "https://www.irhaapparels.com";
const targets = [
  {
    name: "category",
    url: `${base}/products/bavarian-trachten-wear`,
    expected: [
      "Vintage Brown Minimal Side-Embroidered Short Lederhosen",
      "Dark Brown Eagle-Embroidered Suspender Short Lederhosen",
      "Dark Brown Floral-Ornamental Suspender Short Lederhosen",
    ],
  },
  {
    name: "vintage-brown-minimal",
    url: `${base}/products/bavarian-trachten-wear/vintage-brown-minimal-side-embroidered-short-lederhosen`,
    expected: ["Vintage Brown Minimal Side-Embroidered Short Lederhosen"],
  },
  {
    name: "dark-brown-eagle",
    url: `${base}/products/bavarian-trachten-wear/dark-brown-eagle-embroidered-suspender-short-lederhosen`,
    expected: ["Dark Brown Eagle-Embroidered Suspender Short Lederhosen"],
  },
  {
    name: "dark-brown-floral",
    url: `${base}/products/bavarian-trachten-wear/dark-brown-floral-ornamental-suspender-short-lederhosen`,
    expected: ["Dark Brown Floral-Ornamental Suspender Short Lederhosen"],
  },
];

await mkdir("artifacts/live-short-lederhosen", { recursive: true });
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 1100 },
  deviceScaleFactor: 1,
});

const results = [];
let failed = false;

for (const target of targets) {
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const failedRequests = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") consoleErrors.push(msg.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" });
  });

  let httpStatus = null;
  let navigationError = null;
  try {
    const response = await page.goto(target.url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    httpStatus = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
    await page.waitForFunction(
      (expected) => expected.every((name) => document.body.innerText.includes(name)),
      target.expected,
      { timeout: 60_000 },
    );
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const pageData = await page.evaluate((expected) => {
    const text = document.body.innerText;
    const images = [...document.images].map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
    const brokenImages = images.filter((img) => img.complete && img.naturalWidth === 0);
    const loadingText = ["Loading product…", "Loading collection…", "Loading product...", "Loading collection..."]
      .filter((value) => text.includes(value));
    return {
      title: document.title,
      h1: [...document.querySelectorAll("h1")].map((el) => el.textContent?.trim()).filter(Boolean),
      expectedPresence: Object.fromEntries(expected.map((name) => [name, text.includes(name)])),
      bodyPreview: text.slice(0, 2500),
      imageCount: images.length,
      productMediaCount: images.filter((img) => img.src.includes("/product-media/")).length,
      brokenImages,
      loadingText,
    };
  }, target.expected);

  await page.screenshot({
    path: `artifacts/live-short-lederhosen/${target.name}.png`,
    fullPage: true,
  });

  const expectedOk = Object.values(pageData.expectedPresence).every(Boolean);
  const ok =
    httpStatus !== null &&
    httpStatus >= 200 &&
    httpStatus < 400 &&
    !navigationError &&
    expectedOk &&
    pageData.brokenImages.length === 0 &&
    pageData.loadingText.length === 0 &&
    pageErrors.length === 0;

  if (!ok) failed = true;
  results.push({
    ...target,
    ok,
    httpStatus,
    navigationError,
    ...pageData,
    consoleErrors,
    pageErrors,
    failedRequests: failedRequests.slice(0, 50),
  });

  await page.close();
}

await browser.close();
const report = {
  checkedAt: new Date().toISOString(),
  base,
  passed: !failed,
  results,
};
await writeFile("artifacts/live-short-lederhosen/report.json", JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
