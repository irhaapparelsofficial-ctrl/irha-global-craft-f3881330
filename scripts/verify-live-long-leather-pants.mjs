import { chromium } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";

const base = "https://www.irhaapparels.com";
const slugs = [
  "black-floral-piped-long-leather-pants",
  "tan-floral-embroidered-long-leather-pants",
  "distressed-brown-side-button-long-leather-pants",
  "dark-brown-panelled-long-leather-pants",
  "golden-tan-straight-leg-long-leather-pants",
  "black-contrast-piped-long-leather-pants",
  "golden-tan-contrast-piped-long-leather-pants",
  "dark-brown-contrast-piped-knee-panel-long-leather-pants",
];

const expectedNames = {
  "black-floral-piped-long-leather-pants": "Black Floral-Piped Long Leather Pants",
  "tan-floral-embroidered-long-leather-pants": "Tan Floral-Embroidered Long Leather Pants",
  "distressed-brown-side-button-long-leather-pants": "Distressed Brown Side-Button Long Leather Pants",
  "dark-brown-panelled-long-leather-pants": "Dark Brown Panelled Long Leather Pants",
  "golden-tan-straight-leg-long-leather-pants": "Golden Tan Straight-Leg Long Leather Pants",
  "black-contrast-piped-long-leather-pants": "Black Contrast-Piped Long Leather Pants",
  "golden-tan-contrast-piped-long-leather-pants": "Golden Tan Contrast-Piped Long Leather Pants",
  "dark-brown-contrast-piped-knee-panel-long-leather-pants": "Dark Brown Contrast-Piped Knee-Panel Long Leather Pants",
};

const outDir = "artifacts/live-long-leather-pants";
await mkdir(outDir, { recursive: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const results = [];
let failed = false;

for (const slug of slugs) {
  const page = await context.newPage();
  const url = `${base}/products/bavarian-trachten-wear/${slug}`;
  const expectedName = expectedNames[slug];
  const pageErrors = [];
  const consoleErrors = [];
  const failedRequests = [];

  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("requestfailed", (request) => {
    failedRequests.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown" });
  });

  let status = null;
  let navigationError = null;
  try {
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 120_000 });
    status = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 45_000 }).catch(() => {});
    await page.waitForFunction(
      (name) => document.body.innerText.includes(name),
      expectedName,
      { timeout: 60_000 },
    );
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const data = await page.evaluate((name) => {
    const text = document.body.innerText;
    const images = [...document.images].map((img) => ({
      src: img.currentSrc || img.src,
      alt: img.alt,
      complete: img.complete,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    }));
    const productImages = images.filter((img) => img.src.includes("/product-media/"));
    return {
      title: document.title,
      expectedNamePresent: text.includes(name),
      h1: [...document.querySelectorAll("h1")].map((el) => el.textContent?.trim()).filter(Boolean),
      loadingTextPresent: /Loading product|Loading collection/i.test(text),
      productImageCount: productImages.length,
      brokenProductImages: productImages.filter((img) => img.complete && img.naturalWidth === 0),
      bodyPreview: text.slice(0, 1800),
    };
  }, expectedName);

  await page.screenshot({ path: `${outDir}/${slug}.png`, fullPage: true });

  const ok =
    status !== null &&
    status >= 200 &&
    status < 400 &&
    !navigationError &&
    data.expectedNamePresent &&
    !data.loadingTextPresent &&
    data.productImageCount > 0 &&
    data.brokenProductImages.length === 0 &&
    pageErrors.length === 0;

  if (!ok) failed = true;
  results.push({
    slug,
    url,
    expectedName,
    ok,
    status,
    navigationError,
    ...data,
    pageErrors,
    consoleErrors,
    failedRequests: failedRequests.slice(0, 30),
  });
  await page.close();
}

await browser.close();
const report = { checkedAt: new Date().toISOString(), passed: !failed, results };
await writeFile(`${outDir}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (failed) process.exitCode = 1;
