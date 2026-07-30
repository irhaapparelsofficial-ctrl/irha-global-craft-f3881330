import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { chromium } from "playwright";
import { MEDIA_VERSION, PRODUCTS } from "../ops/ia-media-e001/media-plan.mjs";

const PREVIEW_ORIGIN = process.env.IA_MEDIA_PREVIEW_ORIGIN?.replace(/\/$/, "");
const PRODUCTION_ORIGIN = (process.env.IA_MEDIA_PRODUCTION_ORIGIN ?? "https://irhaapparels.com").replace(/\/$/, "");
const EXPECTED_SHA = process.env.IA_MEDIA_EXPECTED_SHA?.trim();
const REQUIRE_RAW_HTML = process.env.IA_MEDIA_REQUIRE_RAW_HTML === "true";
const OUTPUT_ROOT = resolve(process.env.IA_MEDIA_VISUAL_OUTPUT ?? "artifacts/ia-media-e001-visual");
const FORBIDDEN_MEDIA = /(shoe|footwear|question[-_ ]?mark|placeholder|lovable)/i;
const LOGO_ALT = "Official Irha Apparels Manufacturing Specialists logo";
const COLLECTION_PATH = "/products/bavarian-trachten-wear/men/lederhosen";
const FINDER_PATH = "/products/all?q=lederhosen";
const VIEWPORTS = [
  { name: "mobile-360", width: 360, height: 800 },
  { name: "mobile-390", width: 390, height: 844 },
  { name: "iphone-393", width: 393, height: 852 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "tablet-landscape-1024", width: 1024, height: 768 },
  { name: "desktop-1280", width: 1280, height: 900 },
  { name: "desktop-1440", width: 1440, height: 1000 },
];

if (!PREVIEW_ORIGIN) throw new Error("IA_MEDIA_PREVIEW_ORIGIN is required");

const productPath = (slug) => `${COLLECTION_PATH}/${slug}`;
const productCode = (product) => product.sku.replace(/^IRHA-/, "").toLowerCase();
const productMediaRoot = (product) => `/catalog/products/${productCode(product)}-${product.slug}/${MEDIA_VERSION}/`;
const nowIso = () => new Date().toISOString();

async function ensureDir(path) {
  await mkdir(path, { recursive: true });
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(1200);
}

async function newObservedPage(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    locale: "en-US",
    extraHTTPHeaders: {
      "Cache-Control": "no-cache, no-store, max-age=0",
      Pragma: "no-cache",
    },
  });
  const page = await context.newPage();
  await page.addInitScript(() => {
    window.__iaLayoutShiftScore = 0;
    try {
      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) window.__iaLayoutShiftScore += entry.value;
        }
      });
      observer.observe({ type: "layout-shift", buffered: true });
    } catch {
      window.__iaLayoutShiftScore = 0;
    }
  });
  const failures = [];
  page.on("requestfailed", (request) => {
    if (request.resourceType() === "image") {
      failures.push({ type: "requestfailed", url: request.url(), error: request.failure()?.errorText ?? "unknown" });
    }
  });
  page.on("response", (response) => {
    if (response.request().resourceType() === "image" && response.status() >= 400) {
      failures.push({ type: "http", url: response.url(), status: response.status() });
    }
  });
  return { context, page, failures };
}

async function logoData(locator) {
  await locator.waitFor({ state: "visible" });
  return locator.evaluate((image) => ({
    src: image.currentSrc || image.src,
    alt: image.alt,
    width: image.naturalWidth,
    height: image.naturalHeight,
    visibleWidth: image.getBoundingClientRect().width,
    visibleHeight: image.getBoundingClientRect().height,
  }));
}

function validateLogo(data, location) {
  if (!data.src.includes("/irha-brand-mark.svg") || !data.src.includes(MEDIA_VERSION)) {
    throw new Error(`${location} logo did not resolve to the versioned official mark: ${data.src}`);
  }
  if (data.alt !== LOGO_ALT || data.width <= 0 || data.height <= 0 || data.visibleWidth < 100 || data.visibleHeight < 20) {
    throw new Error(`${location} official logo rendered incorrectly: ${JSON.stringify(data)}`);
  }
  if (FORBIDDEN_MEDIA.test(data.src)) throw new Error(`${location} logo resolved to forbidden branding: ${data.src}`);
  return data;
}

async function assertHeaderLogo(page) {
  return validateLogo(await logoData(page.locator(`header img[alt="${LOGO_ALT}"]`).first()), "Header");
}

async function assertFooterLogo(page) {
  return validateLogo(await logoData(page.locator(`footer img[alt="${LOGO_ALT}"]`).first()), "Footer");
}

async function captureHome(browser, origin, label, strict) {
  const viewport = VIEWPORTS.at(-1);
  const { context, page, failures } = await newObservedPage(browser, viewport);
  try {
    await page.goto(`${origin}/?ia_media_e001=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForApp(page);
    const header = await assertHeaderLogo(page).catch((error) => {
      if (strict) throw error;
      return { baselineError: String(error) };
    });
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-top-desktop-1440.png"), fullPage: false });
    await page.evaluate(() => window.scrollTo(0, Math.min(900, document.documentElement.scrollHeight / 3)));
    await page.waitForTimeout(600);
    const scrolledHeader = strict ? await assertHeaderLogo(page) : null;
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-scrolled-desktop-1440.png"), fullPage: false });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(500);
    const footer = await assertFooterLogo(page).catch((error) => {
      if (strict) throw error;
      return { baselineError: String(error) };
    });
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-footer-desktop-1440.png"), fullPage: false });
    const relevant = failures.filter((failure) => !String(failure.url).includes("analytics"));
    if (strict && relevant.length > 0) throw new Error(`Homepage image failures: ${JSON.stringify(relevant)}`);
    return { header, scrolledHeader, footer, failures: relevant };
  } finally {
    await context.close();
  }
}

async function captureMobileHeader(browser, origin, label, strict) {
  const viewport = VIEWPORTS.find((item) => item.name === "mobile-390");
  const { context, page, failures } = await newObservedPage(browser, viewport);
  try {
    await page.goto(`${origin}/?ia_media_e001_mobile=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForApp(page);
    const header = await assertHeaderLogo(page).catch((error) => {
      if (strict) throw error;
      return { baselineError: String(error) };
    });
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-mobile-header-390.png"), fullPage: false });
    const menuButton = page.locator('button[aria-controls="mobile-navigation"]');
    await menuButton.waitFor({ state: "visible" });
    await menuButton.click();
    await page.locator("#mobile-navigation").waitFor({ state: "visible" });
    if (strict) await assertHeaderLogo(page);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-mobile-menu-390.png"), fullPage: false });
    return { header, failures };
  } finally {
    await context.close();
  }
}

async function captureBrandIcons(browser, origin, label, strict) {
  const { context, page } = await newObservedPage(browser, { name: "icons", width: 512, height: 512 });
  const icons = [
    ["favicon", "/favicon.svg"],
    ["apple-touch", "/apple-touch-icon.png"],
    ["pwa-192", "/icon-192x192.png"],
    ["pwa-512", "/icon-512x512.png"],
  ];
  const evidence = {};
  try {
    for (const [name, path] of icons) {
      const response = await page.request.get(`${origin}${path}?v=${MEDIA_VERSION}&t=${Date.now()}`, {
        headers: { "Cache-Control": "no-cache, no-store" },
      });
      const contentType = response.headers()["content-type"] ?? "";
      evidence[name] = { status: response.status(), contentType, bytes: (await response.body()).length };
      if (strict && (!response.ok() || !contentType.startsWith("image/") || evidence[name].bytes < 100)) {
        throw new Error(`${name} icon failed identity delivery: ${JSON.stringify(evidence[name])}`);
      }
    }
    const response = await page.goto(`${origin}/favicon.svg?v=${MEDIA_VERSION}`, { waitUntil: "load", timeout: 45_000 });
    if (strict && (!response || response.status() !== 200)) throw new Error(`Favicon HTTP ${response?.status() ?? "missing"}`);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "favicon-512.png"), fullPage: false });
    return evidence;
  } finally {
    await context.close();
  }
}

async function fixedOverlapEvidence(page, heroSelector, gallerySelector) {
  return page.evaluate(({ heroSelector, gallerySelector }) => {
    const hero = document.querySelector(heroSelector)?.getBoundingClientRect();
    const gallery = document.querySelector(gallerySelector)?.getBoundingClientRect();
    const blockers = [];
    for (const element of document.querySelectorAll("body *")) {
      const style = getComputedStyle(element);
      if (style.position !== "fixed" || style.visibility === "hidden" || style.display === "none" || element.closest("header")) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width < 12 || rect.height < 12) continue;
      const intersects = (target) => Boolean(target && rect.left < target.right && rect.right > target.left && rect.top < target.bottom && rect.bottom > target.top);
      if (intersects(hero) || intersects(gallery)) {
        blockers.push({
          tag: element.tagName,
          id: element.id,
          className: typeof element.className === "string" ? element.className.slice(0, 160) : "",
          ariaLabel: element.getAttribute("aria-label"),
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom, width: rect.width, height: rect.height },
        });
      }
    }
    return blockers;
  }, { heroSelector, gallerySelector });
}

async function assertImageResponse(page, url, product) {
  const response = await page.request.get(url, { headers: { "Cache-Control": "no-cache, no-store" } });
  const contentType = response.headers()["content-type"] ?? "";
  if (!response.ok() || !contentType.startsWith("image/webp")) {
    throw new Error(`${product.sku} media endpoint failed: ${response.status()} ${contentType} ${url}`);
  }
  return { status: response.status(), contentType, bytes: (await response.body()).length };
}

async function inspectRelatedProducts(page, product, strict) {
  const targetSlugs = new Set(PRODUCTS.filter((item) => item.slug !== product.slug).map((item) => item.slug));
  const cards = page.locator('a[href*="/products/bavarian-trachten-wear/men/lederhosen/"] img');
  const found = [];
  for (let index = 0; index < await cards.count(); index += 1) {
    const image = cards.nth(index);
    const href = await image.locator("xpath=ancestor::a[1]").getAttribute("href");
    const slug = href?.split("/").filter(Boolean).at(-1);
    if (!slug || !targetSlugs.has(slug)) continue;
    const src = await image.evaluate((element) => element.currentSrc || element.src);
    found.push({ slug, src, alt: await image.getAttribute("alt") });
    if (strict && (!src.includes("/catalog/products/") || FORBIDDEN_MEDIA.test(src))) {
      throw new Error(`Related product ${slug} resolved to unexpected media: ${src}`);
    }
  }
  if (strict && found.length === 0) throw new Error(`${product.sku} has no verifiable related-product media`);
  return found;
}

async function inspectProduct(page, failures, product, strict) {
  await page.locator("h1").filter({ hasText: product.name }).first().waitFor({ state: "visible", timeout: 30_000 });
  if (strict) await assertHeaderLogo(page);

  const heroSelector = `img[alt^="${product.name} custom manufacturing catalogue reference"]`;
  const strictHero = page.locator(heroSelector).first();
  const baselineHero = page.locator('img[fetchpriority="high"], img[loading="eager"]').first();
  const hero = strict ? strictHero : ((await strictHero.count()) > 0 ? strictHero : baselineHero);
  await hero.waitFor({ state: "visible", timeout: 30_000 });
  await hero.evaluate((image) => image.decode());
  const thumbnailButtons = page.locator('[aria-label="Product reference gallery"] button[aria-label^="View "]');
  const expectedImages = [...product.images].sort((a, b) => a.displayOrder - b.displayOrder);
  const count = await thumbnailButtons.count();
  if (strict && count !== expectedImages.length) throw new Error(`${product.sku} rendered ${count} thumbnails; expected ${expectedImages.length}`);

  const visited = [];
  for (let index = 0; index < count; index += 1) {
    await thumbnailButtons.nth(index).click();
    await page.waitForTimeout(150);
    await hero.evaluate((image) => image.decode());
    const data = await hero.evaluate((image) => ({
      src: image.currentSrc || image.src,
      srcSet: image.srcset,
      alt: image.alt,
      width: image.naturalWidth,
      height: image.naturalHeight,
      state: image.dataset.imageState,
      fallbackActive: image.dataset.fallbackActive,
      responsiveFallback: image.dataset.responsiveFallback,
      rect: image.getBoundingClientRect().toJSON(),
    }));
    visited.push(data);
    if (!strict) continue;
    const expected = expectedImages[index];
    const fragment = `${String(expected.displayOrder).padStart(2, "0")}-${expected.role}-${expected.driveFileId}.webp`;
    if (!data.src.includes(productMediaRoot(product)) || !data.src.includes(fragment)) {
      throw new Error(`${product.sku} image ${index + 1} resolved to unexpected media: ${data.src}`);
    }
    if (!data.alt.toLowerCase().includes(product.name.toLowerCase()) || FORBIDDEN_MEDIA.test(data.src)) {
      throw new Error(`${product.sku} image ${index + 1} has invalid identity/alt: ${JSON.stringify(data)}`);
    }
    if (data.srcSet && (!data.srcSet.includes(productMediaRoot(product)) || /responsive\/(?:480|2400)\//.test(data.srcSet))) {
      throw new Error(`${product.sku} image ${index + 1} has invalid responsive sources: ${data.srcSet}`);
    }
    if (data.width <= 0 || data.height <= 0 || data.state !== "loaded" || data.fallbackActive === "true") {
      throw new Error(`${product.sku} image ${index + 1} failed decode/state acceptance: ${JSON.stringify(data)}`);
    }
    data.response = await assertImageResponse(page, data.src, product);
  }

  if (strict && new Set(visited.map((item) => item.src)).size !== visited.length) {
    throw new Error(`${product.sku} gallery rendered duplicate currentSrc values`);
  }
  const blockers = await fixedOverlapEvidence(page, heroSelector, '[aria-label="Product reference gallery"]');
  if (strict && blockers.length > 0) throw new Error(`${product.sku} fixed UI overlaps the garment/gallery: ${JSON.stringify(blockers)}`);
  const layoutShift = await page.evaluate(() => window.__iaLayoutShiftScore ?? 0);
  if (strict && layoutShift > 0.25) throw new Error(`${product.sku} CLS ${layoutShift} exceeds 0.25`);
  const relevantFailures = failures.filter((failure) => {
    const url = String(failure.url);
    return url.includes("supabase.co/storage") || url.includes("/catalog/products/") || url.includes("/irha-brand-mark.svg");
  });
  if (strict && relevantFailures.length > 0) throw new Error(`${product.sku} image failures: ${JSON.stringify(relevantFailures)}`);
  const relatedProducts = await inspectRelatedProducts(page, product, strict);
  return { thumbnailCount: count, visited, blockers, layoutShift, relatedProducts, failures: relevantFailures };
}

async function captureProduct(browser, origin, label, product, viewport, strict) {
  const { context, page, failures } = await newObservedPage(browser, viewport);
  try {
    await page.goto(`${origin}${productPath(product.slug)}?ia_media_e001=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForApp(page);
    const evidence = await inspectProduct(page, failures, product, strict);
    await page.screenshot({
      path: resolve(OUTPUT_ROOT, label, `${product.sku.toLowerCase()}-${viewport.name}.png`),
      fullPage: viewport.width >= 1280,
    });
    return evidence;
  } finally {
    await context.close();
  }
}

async function inspectListing(browser, origin, label, path, screenshotPrefix, viewport, strict) {
  const { context, page, failures } = await newObservedPage(browser, viewport);
  try {
    await page.goto(`${origin}${path}${path.includes("?") ? "&" : "?"}ia_media_e001=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForApp(page);
    if (strict) await assertHeaderLogo(page);
    const cards = {};
    for (const product of PRODUCTS) {
      const link = page.locator(`a[href$="/${product.slug}"]`).first();
      if (strict && (await link.count()) === 0) throw new Error(`${screenshotPrefix} is missing ${product.slug}`);
      if ((await link.count()) > 0) {
        const image = link.locator("img").first();
        await image.waitFor({ state: "visible" });
        const src = await image.evaluate((element) => element.currentSrc || element.src);
        const alt = await image.getAttribute("alt");
        cards[product.slug] = { src, alt };
        if (strict && (!src.includes(productMediaRoot(product)) || FORBIDDEN_MEDIA.test(src) || !alt?.toLowerCase().includes(product.name.toLowerCase()))) {
          throw new Error(`${screenshotPrefix} card ${product.slug} resolved incorrectly: ${JSON.stringify(cards[product.slug])}`);
        }
      }
    }
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, `${screenshotPrefix}-${viewport.name}.png`), fullPage: true });
    const relevantFailures = failures.filter((failure) => String(failure.url).includes("/catalog/products/"));
    if (strict && relevantFailures.length > 0) throw new Error(`${screenshotPrefix} image failures: ${JSON.stringify(relevantFailures)}`);
    return { cards, failures: relevantFailures };
  } finally {
    await context.close();
  }
}

async function verifyBuildIdentity(page) {
  const response = await page.request.get(`${PREVIEW_ORIGIN}/build.json?ia_media_e001=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache, no-store" },
  });
  if (!response.ok()) throw new Error(`Build identity returned HTTP ${response.status()}`);
  const identity = await response.json();
  if (EXPECTED_SHA && identity.source_commit !== EXPECTED_SHA) {
    throw new Error(`source_commit ${identity.source_commit} does not equal expected ${EXPECTED_SHA}`);
  }
  return identity;
}

async function verifyRawHtml(origin, product) {
  const response = await fetch(`${origin}${productPath(product.slug)}?raw_html_check=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache, no-store", "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`${product.sku} raw HTML returned ${response.status}`);
  const root = productMediaRoot(product);
  const canonicalPath = `${origin}${productPath(product.slug)}`;
  if (!html.includes(product.name)
    || !html.includes(root)
    || !html.includes(`rel="canonical" href="${canonicalPath}`)
    || /<meta[^>]+name=["']robots["'][^>]+noindex/i.test(html)
    || FORBIDDEN_MEDIA.test(html)) {
    throw new Error(`${product.sku} raw HTML identity/canonical/media contract failed`);
  }
  return { status: response.status, bytes: Buffer.byteLength(html), mediaRoot: root, canonicalPath };
}

async function main() {
  await ensureDir(resolve(OUTPUT_ROOT, "before-production"));
  await ensureDir(resolve(OUTPUT_ROOT, "after-preview"));
  const browser = await chromium.launch({ headless: true });
  const report = {
    executionId: "IA-MEDIA-E001",
    startedAt: nowIso(),
    previewOrigin: PREVIEW_ORIGIN,
    productionOrigin: PRODUCTION_ORIGIN,
    expectedSha: EXPECTED_SHA ?? null,
    requireRawHtml: REQUIRE_RAW_HTML,
    buildIdentity: null,
    beforeProduction: {},
    afterPreview: { products: {}, collections: {}, finder: null, rawHtml: {} },
    status: "running",
    errors: [],
  };

  try {
    const identityContext = await browser.newContext();
    const identityPage = await identityContext.newPage();
    report.buildIdentity = await verifyBuildIdentity(identityPage);
    await identityContext.close();

    report.beforeProduction.home = await captureHome(browser, PRODUCTION_ORIGIN, "before-production", false);
    report.beforeProduction.mobile = await captureMobileHeader(browser, PRODUCTION_ORIGIN, "before-production", false);
    report.beforeProduction.icons = await captureBrandIcons(browser, PRODUCTION_ORIGIN, "before-production", false);
    for (const product of PRODUCTS) {
      report.beforeProduction[product.sku] = await captureProduct(
        browser,
        PRODUCTION_ORIGIN,
        "before-production",
        product,
        VIEWPORTS.find((item) => item.name === "mobile-390"),
        false,
      );
    }
    report.beforeProduction.collection = await inspectListing(
      browser,
      PRODUCTION_ORIGIN,
      "before-production",
      COLLECTION_PATH,
      "lederhosen-collection",
      VIEWPORTS.find((item) => item.name === "mobile-390"),
      false,
    );

    report.afterPreview.home = await captureHome(browser, PREVIEW_ORIGIN, "after-preview", true);
    report.afterPreview.mobile = await captureMobileHeader(browser, PREVIEW_ORIGIN, "after-preview", true);
    report.afterPreview.icons = await captureBrandIcons(browser, PREVIEW_ORIGIN, "after-preview", true);

    for (const product of PRODUCTS) {
      report.afterPreview.products[product.sku] = {};
      for (const viewport of VIEWPORTS) {
        report.afterPreview.products[product.sku][viewport.name] = await captureProduct(
          browser,
          PREVIEW_ORIGIN,
          "after-preview",
          product,
          viewport,
          true,
        );
      }
      if (REQUIRE_RAW_HTML) report.afterPreview.rawHtml[product.sku] = await verifyRawHtml(PREVIEW_ORIGIN, product);
    }

    for (const viewport of VIEWPORTS) {
      report.afterPreview.collections[viewport.name] = await inspectListing(
        browser,
        PREVIEW_ORIGIN,
        "after-preview",
        COLLECTION_PATH,
        "lederhosen-collection",
        viewport,
        true,
      );
    }
    report.afterPreview.finder = await inspectListing(
      browser,
      PREVIEW_ORIGIN,
      "after-preview",
      FINDER_PATH,
      "product-finder-lederhosen",
      VIEWPORTS.find((item) => item.name === "desktop-1280"),
      true,
    );
    report.status = "passed";
  } catch (error) {
    report.status = "failed";
    report.errors.push(error instanceof Error ? { message: error.message, stack: error.stack } : { message: String(error) });
    throw error;
  } finally {
    report.finishedAt = nowIso();
    await writeFile(resolve(OUTPUT_ROOT, "visual-acceptance-report.json"), `${JSON.stringify(report, null, 2)}\n`);
    await writeFile(
      resolve(OUTPUT_ROOT, "visual-acceptance-summary.md"),
      `# IA-MEDIA-E001 Visual Acceptance\n\n- Status: **${report.status}**\n- Expected SHA: \`${report.expectedSha ?? "not supplied"}\`\n- Exact source SHA: \`${report.buildIdentity?.source_commit ?? "unavailable"}\`\n- Products: P001–P007\n- Viewports: ${VIEWPORTS.map((viewport) => `${viewport.name} (${viewport.width}×${viewport.height})`).join(", ")}\n- Raw HTML parity: ${REQUIRE_RAW_HTML ? "required" : "preview visual only"}\n- Completed: ${report.finishedAt}\n`,
    );
    await browser.close();
  }
}

await main();
