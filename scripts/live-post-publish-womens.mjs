import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = process.env.IRHA_BASE_URL || "https://www.irhaapparels.com";
const OUT = process.env.IRHA_LIVE_REPORT_DIR || "live-post-publish-report";
const EXPECTED_RELEASE = "frontend-live-2026-07-12-r9";
const CONSENT_KEY = "irha_cookie_consent_v1";
const CONSENT_VALUE = JSON.stringify({ categories: { analytics: false, ads: false }, ts: Date.now() });

const routes = [
  {
    name: "home",
    path: "/",
    h1: "Custom Apparel Manufacturer for Global B2B Buyers",
    body: ["B2B", "Irha Apparels"],
  },
  {
    name: "bavarian-category",
    path: "/products/bavarian-trachten-wear",
    h1: "Custom Bavarian & Trachten Wear Manufacturer",
    body: ["Browse buyer-ready women's collections", "Dirndl Dresses", "Dirndl Blouses", "Dirndl Aprons", "Women's Trachten"],
  },
  {
    name: "dirndl-dresses-collection",
    path: "/products/bavarian-trachten-wear/womens-trachten/dirndl-dresses",
    h1: "Dirndl Dress Manufacturer for Wholesale & Private Label",
    body: ["Traditional Dirndl Dress", "1 distinct style", "Arrange Factory Video Call"],
  },
  {
    name: "dirndl-blouses-collection",
    path: "/products/bavarian-trachten-wear/womens-trachten/dirndl-blouses",
    h1: "Dirndl Blouse Manufacturer for B2B Buyers",
    body: ["Dirndl Blouse", "1 distinct style", "Arrange Factory Video Call"],
  },
  {
    name: "dirndl-aprons-collection",
    path: "/products/bavarian-trachten-wear/womens-trachten/dirndl-aprons",
    h1: "Dirndl Apron Manufacturer & Wholesale Supplier",
    body: ["Dirndl Apron", "1 distinct style", "Arrange Factory Video Call"],
  },
  {
    name: "traditional-dirndl-dress-product",
    path: "/products/bavarian-trachten-wear/traditional-dirndl-dress",
    h1: "Traditional Dirndl Dress",
    body: ["Traditional Dirndl dress for wholesale and private-label Trachten collections", "More from Women's Trachten", "Dirndl Blouse", "Dirndl Apron"],
  },
  {
    name: "dirndl-blouse-product",
    path: "/products/bavarian-trachten-wear/dirndl-blouse",
    h1: "Dirndl Blouse",
    body: ["Custom Dirndl blouse for wholesale, OEM and private-label Trachten programs", "More from Women's Trachten", "Traditional Dirndl Dress", "Dirndl Apron"],
  },
  {
    name: "dirndl-apron-product",
    path: "/products/bavarian-trachten-wear/dirndl-apron",
    h1: "Dirndl Apron",
    body: ["Coordinated Dirndl apron for wholesale and private-label Trachten collections", "More from Women's Trachten", "Traditional Dirndl Dress", "Dirndl Blouse"],
  },
];

const profiles = [
  { name: "desktop", context: { viewport: { width: 1440, height: 1100 }, deviceScaleFactor: 1, isMobile: false, hasTouch: false } },
  { name: "mobile", context: { ...devices["iPhone 13"] } },
];

const trackingPattern = /(googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net)/i;
const normalize = (value) => value.toLowerCase().replace(/\s+/g, " ").trim();
const safeFile = (value) => value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const canonicalFor = (routePath) => `${BASE}${routePath === "/" ? "/" : routePath}`;

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(500, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await wait(70);
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(800);
}

async function inspectRoute(browser, profile, route) {
  const context = await browser.newContext(profile.context);
  await context.addInitScript(({ key, value }) => localStorage.setItem(key, value), { key: CONSENT_KEY, value: CONSENT_VALUE });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const responseErrors = [];
  const trackingRequests = [];

  page.on("console", (message) => { if (message.type() === "error") consoleErrors.push(message.text()); });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => { if (trackingPattern.test(request.url())) trackingRequests.push(request.url()); });
  page.on("requestfailed", (request) => requestFailures.push({ url: request.url(), error: request.failure()?.errorText ?? "unknown request failure" }));
  page.on("response", (response) => { if (response.status() >= 400) responseErrors.push({ url: response.url(), status: response.status() }); });

  let navigationError = null;
  let status = null;
  try {
    const response = await page.goto(`${BASE}${route.path}`, { waitUntil: "domcontentloaded", timeout: 60_000 });
    status = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => undefined);
    await page.waitForTimeout(1200);
    await scrollThrough(page);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const title = await page.title().catch(() => "");
  const h1 = await page.locator("h1").allTextContents().catch(() => []);
  const bodyText = await page.locator("body").innerText().catch(() => "");
  const normalizedBody = normalize(bodyText);
  const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href").catch(() => null);
  const metaDescriptions = await page.locator('meta[name="description"]').evaluateAll((elements) => elements.map((element) => element.getAttribute("content") || "")).catch(() => []);
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content").catch(() => null);
  const releaseMarker = await page.locator('meta[name="x-irha-release"]').first().getAttribute("content").catch(() => null);
  const jsonLd = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => []);
  const jsonLdErrors = [];
  const jsonLdTypes = [];
  for (const [index, raw] of jsonLd.entries()) {
    try {
      const parsed = JSON.parse(raw);
      for (const value of (Array.isArray(parsed) ? parsed : [parsed])) {
        if (value && typeof value === "object" && value["@type"]) jsonLdTypes.push(value["@type"]);
      }
    } catch (error) {
      jsonLdErrors.push(`JSON-LD ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const imageAudit = await page.locator("img").evaluateAll((images) => images.map((image) => {
    const rect = image.getBoundingClientRect();
    const style = window.getComputedStyle(image);
    const source = image.currentSrc || image.getAttribute("src") || "";
    const rendered = style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && Boolean(source);
    return { source, alt: image.getAttribute("alt") || "", rendered, complete: image.complete, naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight };
  }));
  const renderedImages = imageAudit.filter((image) => image.rendered);
  const brokenImages = renderedImages.filter((image) => image.complete && (image.naturalWidth === 0 || image.naturalHeight === 0));
  const dimensions = await page.evaluate(() => ({ clientWidth: document.documentElement.clientWidth, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight }));
  const horizontalOverflow = dimensions.scrollWidth > dimensions.clientWidth + 2;
  const loadingText = bodyText.split("\n").map((line) => line.trim()).filter((line) => /^(loading|please wait)(\.{0,3})$/i.test(line));

  const expectedCanonical = canonicalFor(route.path);
  const h1Ok = h1.length === 1 && normalize(h1[0]).includes(normalize(route.h1));
  const bodyPresence = Object.fromEntries(route.body.map((value) => [value, normalizedBody.includes(normalize(value))]));
  const bodyOk = Object.values(bodyPresence).every(Boolean);
  const canonicalOk = canonical === expectedCanonical || canonical === expectedCanonical.replace(/\/$/, "");
  const metaOk = metaDescriptions.length === 1 && metaDescriptions[0].trim().length >= 80;
  const releaseOk = releaseMarker === EXPECTED_RELEASE;
  const requestFailuresFiltered = requestFailures.filter((item) => !trackingPattern.test(item.url) && !/ERR_ABORTED/i.test(item.error));
  const responseErrorsFiltered = responseErrors.filter((item) => !trackingPattern.test(item.url));
  const consoleErrorsFiltered = consoleErrors.filter((message) => !/ResizeObserver loop limit exceeded/i.test(message));
  const screenshotPath = path.join(OUT, "screenshots", `${profile.name}-${safeFile(route.name)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const ok = !navigationError && status === 200 && h1Ok && bodyOk && canonicalOk && metaOk && releaseOk && jsonLdErrors.length === 0 && brokenImages.length === 0 && loadingText.length === 0 && !horizontalOverflow && consoleErrorsFiltered.length === 0 && pageErrors.length === 0 && requestFailuresFiltered.length === 0 && responseErrorsFiltered.length === 0 && trackingRequests.length === 0;
  await context.close();

  return { profile: profile.name, name: route.name, url: `${BASE}${route.path}`, ok, status, navigationError, title, h1, h1Ok, bodyPresence, canonical, expectedCanonical, canonicalOk, metaDescriptions, metaOk, robots, releaseMarker, releaseOk, jsonLdTypes, jsonLdErrors, renderedImageCount: renderedImages.length, brokenImages, loadingText, dimensions, horizontalOverflow, consoleErrors: consoleErrorsFiltered, pageErrors, requestFailures: requestFailuresFiltered, responseErrors: responseErrorsFiltered, trackingRequests, screenshotPath };
}

async function fetchText(resourcePath) {
  const response = await fetch(`${BASE}${resourcePath}?qa=${Date.now()}`, { redirect: "follow", headers: { "cache-control": "no-cache", pragma: "no-cache" }, signal: AbortSignal.timeout(30_000) });
  return { status: response.status, text: await response.text() };
}

async function main() {
  await mkdir(path.join(OUT, "screenshots"), { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const results = [];
  for (const profile of profiles) {
    for (const route of routes) {
      console.log(`Checking ${profile.name}: ${route.path}`);
      results.push(await inspectRoute(browser, profile, route));
    }
  }
  await browser.close();

  const sitemap = await fetchText("/sitemap.xml");
  const robots = await fetchText("/robots.txt");
  const build = await fetchText("/build.json");
  const release = await fetchText("/release.txt");
  const requiredSitemapPaths = [
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-dresses",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-blouses",
    "/products/bavarian-trachten-wear/womens-trachten/dirndl-aprons",
  ];
  const sitemapPresence = Object.fromEntries(requiredSitemapPaths.map((routePath) => [routePath, sitemap.text.includes(`${BASE}${routePath}`)]));
  const sitemapOk = sitemap.status === 200 && Object.values(sitemapPresence).every(Boolean);
  const robotsOk = robots.status === 200 && robots.text.includes("Disallow: /admin") && robots.text.includes("Disallow: /auth") && robots.text.includes(`Sitemap: ${BASE}/sitemap.xml`);
  const buildOk = build.status === 200 && JSON.parse(build.text).release === EXPECTED_RELEASE;
  const releaseOk = release.status === 200 && release.text.includes("IRHA_FRONTEND_LIVE_2026_07_12_R9");
  const collectionDescriptions = results.filter((result) => result.profile === "desktop" && /dirndl-(dresses|blouses|aprons)-collection/.test(result.name)).map((result) => result.metaDescriptions[0]).filter(Boolean);
  const uniqueCollectionDescriptions = new Set(collectionDescriptions).size === collectionDescriptions.length;
  const passed = results.every((result) => result.ok) && sitemapOk && robotsOk && buildOk && releaseOk && uniqueCollectionDescriptions;

  const report = { checkedAt: new Date().toISOString(), base: BASE, expectedRelease: EXPECTED_RELEASE, passed, totals: { checks: results.length, passed: results.filter((result) => result.ok).length, failed: results.filter((result) => !result.ok).length }, sitemap: { status: sitemap.status, ok: sitemapOk, presence: sitemapPresence }, robots: { status: robots.status, ok: robotsOk }, build: { status: build.status, ok: buildOk, text: build.text }, release: { status: release.status, ok: releaseOk, text: release.text }, uniqueCollectionDescriptions, results };
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  const failedLines = results.filter((result) => !result.ok).map((result) => `- ${result.profile} ${result.name}: status=${result.status}, release=${result.releaseOk}, h1=${result.h1Ok}, body=${Object.values(result.bodyPresence).every(Boolean)}, canonical=${result.canonicalOk}, meta=${result.metaOk}, brokenImages=${result.brokenImages.length}, consoleErrors=${result.consoleErrors.length}, responseErrors=${result.responseErrors.length}, trackingRequests=${result.trackingRequests.length}, overflow=${result.horizontalOverflow}`);
  const summary = [
    "# Irha Apparels R9 Post-Publish Live Verification",
    "",
    `- Checked: ${report.checkedAt}`,
    `- Result: ${passed ? "PASS" : "FAIL"}`,
    `- Browser checks: ${report.totals.passed}/${report.totals.checks} passed`,
    `- Release marker: ${buildOk && releaseOk ? "PASS" : "FAIL"}`,
    `- Sitemap: ${sitemapOk ? "PASS" : "FAIL"}`,
    `- Robots: ${robotsOk ? "PASS" : "FAIL"}`,
    `- Unique Women's collection meta descriptions: ${uniqueCollectionDescriptions ? "PASS" : "FAIL"}`,
    "",
    failedLines.length ? `## Failed checks\n\n${failedLines.join("\n")}` : "## Failed checks\n\nNone.",
  ].join("\n");
  await writeFile(path.join(OUT, "summary.md"), summary);
  console.log(summary);
  if (!passed) process.exit(1);
}

main().catch((error) => { console.error(error); process.exit(1); });
