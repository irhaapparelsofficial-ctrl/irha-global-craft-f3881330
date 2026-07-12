import { chromium, devices } from "playwright";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.IRHA_BASE_URL || "https://www.irhaapparels.com").replace(/\/$/, "");
const OUT = process.env.IRHA_LIVE_REPORT_DIR || "live-production-r10-report";
const EXPECTED_RELEASE = "frontend-live-2026-07-12-r10";
const EXPECTED_RELEASE_TEXT = "IRHA_FRONTEND_LIVE_2026_07_12_R10";
const CONSENT_KEY = "irha_cookie_consent_v1";
const REJECTED_CONSENT = JSON.stringify({
  categories: { analytics: false, ads: false },
  ts: Date.now(),
});

const taxonomyAlternates = ({ category, audience, collection }) => {
  const suffix = [category, audience, collection].filter(Boolean).join("/");
  return {
    en: `/products/${suffix}`,
    de: `/intl/de/products/${suffix}`,
    fr: `/intl/fr/products/${suffix}`,
    es: `/intl/es/products/${suffix}`,
    "x-default": `/products/${suffix}`,
  };
};

const routes = [
  { name: "home", path: "/" },
  { name: "collections", path: "/products" },
  { name: "all-products", path: "/products/all", expectNoindex: true },
  {
    name: "bavarian-top",
    path: "/products/bavarian-trachten-wear",
    alternates: taxonomyAlternates({ category: "bavarian-trachten-wear" }),
  },
  {
    name: "leather-top",
    path: "/products/premium-leather-apparel",
    alternates: taxonomyAlternates({ category: "premium-leather-apparel" }),
  },
  {
    name: "sportswear-top",
    path: "/products/sportswear",
    alternates: taxonomyAlternates({ category: "sportswear" }),
  },
  {
    name: "streetwear-top",
    path: "/products/streetwear-activewear",
    alternates: taxonomyAlternates({ category: "streetwear-activewear" }),
  },
  {
    name: "nightwear-top",
    path: "/products/leisure-nightwear",
    alternates: taxonomyAlternates({ category: "leisure-nightwear" }),
  },
  {
    name: "bavarian-men",
    path: "/products/bavarian-trachten-wear/men",
    alternates: taxonomyAlternates({ category: "bavarian-trachten-wear", audience: "men" }),
  },
  {
    name: "dirndl-dresses",
    path: "/products/bavarian-trachten-wear/women/dirndl-dresses",
    alternates: taxonomyAlternates({ category: "bavarian-trachten-wear", audience: "women", collection: "dirndl-dresses" }),
  },
  {
    name: "girls-dirndl",
    path: "/products/bavarian-trachten-wear/kids/girls-dirndl",
    alternates: taxonomyAlternates({ category: "bavarian-trachten-wear", audience: "kids", collection: "girls-dirndl" }),
  },
  {
    name: "football-teamwear",
    path: "/products/sportswear/team-club/football-kits",
    alternates: taxonomyAlternates({ category: "sportswear", audience: "team-club", collection: "football-kits" }),
  },
  {
    name: "unisex-hoodies",
    path: "/products/streetwear-activewear/unisex/hoodies-sweatshirts",
    alternates: taxonomyAlternates({ category: "streetwear-activewear", audience: "unisex", collection: "hoodies-sweatshirts" }),
  },
  {
    name: "hospitality-robes",
    path: "/products/leisure-nightwear/family-hospitality/robes-bathrobes",
    alternates: taxonomyAlternates({ category: "leisure-nightwear", audience: "family-hospitality", collection: "robes-bathrobes" }),
  },
  {
    name: "german-lederhosen",
    path: "/intl/de/products/bavarian-trachten-wear/men/short-lederhosen",
    alternates: taxonomyAlternates({ category: "bavarian-trachten-wear", audience: "men", collection: "short-lederhosen" }),
  },
  {
    name: "french-dirndl",
    path: "/intl/fr/products/bavarian-trachten-wear/women/dirndl-dresses",
    alternates: taxonomyAlternates({ category: "bavarian-trachten-wear", audience: "women", collection: "dirndl-dresses" }),
  },
  {
    name: "spanish-football",
    path: "/intl/es/products/sportswear/team-club/football-kits",
    alternates: taxonomyAlternates({ category: "sportswear", audience: "team-club", collection: "football-kits" }),
  },
  { name: "buyer-trust", path: "/buyer-trust" },
  { name: "factory-video-call", path: "/factory-video-call" },
  { name: "inquiry", path: "/inquiry" },
  { name: "repeat-order", path: "/repeat-order" },
  { name: "catalogue", path: "/catalogue" },
];

const profiles = [
  {
    name: "desktop",
    context: {
      viewport: { width: 1440, height: 1100 },
      deviceScaleFactor: 1,
      isMobile: false,
      hasTouch: false,
    },
  },
  { name: "mobile", context: { ...devices["iPhone 13"] } },
];

const trackingPattern = /(googletagmanager\.com|google-analytics\.com|googlesyndication\.com|doubleclick\.net)/i;
const ignorableConsole = /ResizeObserver loop limit exceeded/i;
const normalizeUrl = (value) => value?.replace(/\/$/, "") || "";
const safeFile = (value) => value.replace(/[^a-z0-9-]+/gi, "-").replace(/^-|-$/g, "").toLowerCase();
const expectedCanonical = (routePath) => `${BASE}${routePath === "/" ? "" : routePath}`;

async function scrollThrough(page) {
  await page.evaluate(async () => {
    const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
    const step = Math.max(500, Math.floor(window.innerHeight * 0.75));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await wait(60);
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(700);
}

async function inspectRoute(browser, profile, route) {
  const context = await browser.newContext(profile.context);
  await context.addInitScript(
    ({ key, value }) => localStorage.setItem(key, value),
    { key: CONSENT_KEY, value: REJECTED_CONSENT },
  );
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const requestFailures = [];
  const responseErrors = [];
  const trackingRequests = [];

  page.on("console", (message) => {
    if (message.type() === "error" && !ignorableConsole.test(message.text())) {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  page.on("request", (request) => {
    if (trackingPattern.test(request.url())) trackingRequests.push(request.url());
  });
  page.on("requestfailed", (request) => {
    const error = request.failure()?.errorText || "unknown request failure";
    if (!trackingPattern.test(request.url()) && !/ERR_ABORTED/i.test(error)) {
      requestFailures.push({ url: request.url(), error });
    }
  });
  page.on("response", (response) => {
    if (response.status() >= 400 && !trackingPattern.test(response.url())) {
      responseErrors.push({ url: response.url(), status: response.status() });
    }
  });

  let navigationError = null;
  let status = null;
  try {
    const response = await page.goto(`${BASE}${route.path}`, {
      waitUntil: "domcontentloaded",
      timeout: 60_000,
    });
    status = response?.status() ?? null;
    await page.waitForLoadState("networkidle", { timeout: 35_000 }).catch(() => undefined);
    await page.waitForTimeout(1000);
    await scrollThrough(page);
  } catch (error) {
    navigationError = error instanceof Error ? error.message : String(error);
  }

  const title = await page.title().catch(() => "");
  const h1 = await page.locator("h1").allTextContents().catch(() => []);
  const canonical = await page.locator('link[rel="canonical"]').first().getAttribute("href").catch(() => null);
  const metaDescriptions = await page
    .locator('meta[name="description"]')
    .evaluateAll((elements) => elements.map((element) => element.getAttribute("content") || ""))
    .catch(() => []);
  const robots = await page.locator('meta[name="robots"]').first().getAttribute("content").catch(() => null);
  const releaseMarker = await page.locator('meta[name="x-irha-release"]').first().getAttribute("content").catch(() => null);
  const alternates = await page
    .locator('link[rel="alternate"][hreflang]')
    .evaluateAll((elements) => Object.fromEntries(elements.map((element) => [element.getAttribute("hreflang"), element.getAttribute("href")])))
    .catch(() => ({}));
  const jsonLdRaw = await page.locator('script[type="application/ld+json"]').allTextContents().catch(() => []);
  const jsonLdErrors = [];
  const jsonLdTypes = [];
  for (const [index, raw] of jsonLdRaw.entries()) {
    try {
      const parsed = JSON.parse(raw);
      for (const value of Array.isArray(parsed) ? parsed : [parsed]) {
        if (value && typeof value === "object" && value["@type"]) jsonLdTypes.push(value["@type"]);
      }
    } catch (error) {
      jsonLdErrors.push(`JSON-LD ${index + 1}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const imageAudit = await page.locator("img").evaluateAll((images) =>
    images.map((image) => {
      const rect = image.getBoundingClientRect();
      const style = window.getComputedStyle(image);
      const source = image.currentSrc || image.getAttribute("src") || "";
      const rendered = style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0 && Boolean(source);
      return {
        source,
        alt: image.getAttribute("alt") || "",
        rendered,
        complete: image.complete,
        naturalWidth: image.naturalWidth,
        naturalHeight: image.naturalHeight,
      };
    }),
  );
  const renderedImages = imageAudit.filter((image) => image.rendered);
  const brokenImages = renderedImages.filter((image) => image.complete && (image.naturalWidth === 0 || image.naturalHeight === 0));
  const missingAltImages = renderedImages.filter((image) => !image.alt.trim());
  const dimensions = await page.evaluate(() => ({
    clientWidth: document.documentElement.clientWidth,
    scrollWidth: document.documentElement.scrollWidth,
    scrollHeight: document.documentElement.scrollHeight,
  }));
  const horizontalOverflow = dimensions.scrollWidth > dimensions.clientWidth + 2;
  const screenshotPath = path.join(OUT, "screenshots", `${profile.name}-${safeFile(route.name)}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });

  const canonicalOk = normalizeUrl(canonical) === normalizeUrl(expectedCanonical(route.path));
  const metaOk = metaDescriptions.length === 1 && metaDescriptions[0].trim().length >= 70;
  const h1Ok = h1.length === 1 && h1[0].trim().length > 4;
  const noindexOk = route.expectNoindex ? /noindex/i.test(robots || "") : !/noindex/i.test(robots || "");
  const releaseOk = releaseMarker === EXPECTED_RELEASE;
  const alternateChecks = route.alternates
    ? Object.fromEntries(
        Object.entries(route.alternates).map(([locale, routePath]) => [
          locale,
          normalizeUrl(alternates[locale]) === normalizeUrl(`${BASE}${routePath}`),
        ]),
      )
    : {};
  const alternatesOk = Object.values(alternateChecks).every(Boolean);
  const ok =
    !navigationError &&
    status === 200 &&
    title.trim().length > 10 &&
    h1Ok &&
    canonicalOk &&
    metaOk &&
    noindexOk &&
    releaseOk &&
    alternatesOk &&
    jsonLdErrors.length === 0 &&
    brokenImages.length === 0 &&
    !horizontalOverflow &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0 &&
    requestFailures.length === 0 &&
    responseErrors.length === 0 &&
    trackingRequests.length === 0;

  await context.close();
  return {
    profile: profile.name,
    name: route.name,
    url: `${BASE}${route.path}`,
    ok,
    status,
    navigationError,
    title,
    h1,
    h1Ok,
    canonical,
    expectedCanonical: expectedCanonical(route.path),
    canonicalOk,
    metaDescriptions,
    metaOk,
    robots,
    noindexOk,
    releaseMarker,
    releaseOk,
    alternates,
    alternateChecks,
    alternatesOk,
    jsonLdTypes,
    jsonLdErrors,
    renderedImageCount: renderedImages.length,
    brokenImages,
    missingAltImageCount: missingAltImages.length,
    dimensions,
    horizontalOverflow,
    consoleErrors,
    pageErrors,
    requestFailures,
    responseErrors,
    trackingRequests,
    screenshotPath,
  };
}

async function fetchText(resourcePath) {
  const response = await fetch(`${BASE}${resourcePath}?qa=${Date.now()}`, {
    redirect: "follow",
    headers: { "cache-control": "no-cache", pragma: "no-cache" },
    signal: AbortSignal.timeout(30_000),
  });
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

  const requiredSitemapPaths = routes
    .filter((route) => route.alternates && !route.expectNoindex)
    .map((route) => route.path);
  const forbiddenSitemapPaths = [
    "/products/all",
    "/admin",
    "/auth",
    "/blog",
    "/journal",
    "/seo-indexing",
    "/sustainability",
    "/shipping-returns",
  ];
  const sitemapRequired = Object.fromEntries(
    requiredSitemapPaths.map((routePath) => [routePath, sitemap.text.includes(`<loc>${BASE}${routePath}</loc>`)]),
  );
  const sitemapForbidden = Object.fromEntries(
    forbiddenSitemapPaths.map((routePath) => [routePath, !sitemap.text.includes(`<loc>${BASE}${routePath}</loc>`)]),
  );
  const sitemapOk = sitemap.status === 200 && Object.values(sitemapRequired).every(Boolean) && Object.values(sitemapForbidden).every(Boolean);
  const robotsOk =
    robots.status === 200 &&
    robots.text.includes("Disallow: /admin") &&
    robots.text.includes("Disallow: /auth") &&
    robots.text.includes(`Sitemap: ${BASE}/sitemap.xml`);

  let buildJson = null;
  try {
    buildJson = JSON.parse(build.text);
  } catch {
    buildJson = null;
  }
  const buildOk = build.status === 200 && buildJson?.release === EXPECTED_RELEASE;
  const releaseOk = release.status === 200 && release.text.includes(EXPECTED_RELEASE_TEXT);
  const passed = results.every((result) => result.ok) && sitemapOk && robotsOk && buildOk && releaseOk;

  const report = {
    checkedAt: new Date().toISOString(),
    base: BASE,
    expectedRelease: EXPECTED_RELEASE,
    passed,
    totals: {
      checks: results.length,
      passed: results.filter((result) => result.ok).length,
      failed: results.filter((result) => !result.ok).length,
    },
    sitemap: { status: sitemap.status, ok: sitemapOk, required: sitemapRequired, forbidden: sitemapForbidden },
    robots: { status: robots.status, ok: robotsOk },
    build: { status: build.status, ok: buildOk, parsed: buildJson, text: build.text },
    release: { status: release.status, ok: releaseOk, text: release.text },
    results,
  };
  await writeFile(path.join(OUT, "report.json"), JSON.stringify(report, null, 2));

  const failures = results
    .filter((result) => !result.ok)
    .map(
      (result) =>
        `- ${result.profile} ${result.name}: status=${result.status}, release=${result.releaseOk}, h1=${result.h1Ok}, canonical=${result.canonicalOk}, meta=${result.metaOk}, noindex=${result.noindexOk}, hreflang=${result.alternatesOk}, brokenImages=${result.brokenImages.length}, consoleErrors=${result.consoleErrors.length}, requestFailures=${result.requestFailures.length}, responseErrors=${result.responseErrors.length}, trackingRequests=${result.trackingRequests.length}, overflow=${result.horizontalOverflow}`,
    );
  const summary = [
    "# Irha Apparels R10 Live Production Verification",
    "",
    `- Checked: ${report.checkedAt}`,
    `- Result: ${passed ? "PASS" : "FAIL"}`,
    `- Browser checks: ${report.totals.passed}/${report.totals.checks} passed`,
    `- Release marker: ${buildOk && releaseOk ? "PASS" : "FAIL"}`,
    `- Sitemap: ${sitemapOk ? "PASS" : "FAIL"}`,
    `- Robots: ${robotsOk ? "PASS" : "FAIL"}`,
    "",
    failures.length ? `## Failed checks\n\n${failures.join("\n")}` : "## Failed checks\n\nNone.",
  ].join("\n");
  await writeFile(path.join(OUT, "summary.md"), summary);
  console.log(summary);

  if (!passed) process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
