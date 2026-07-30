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

async function createPage(browser, viewport) {
  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
    colorScheme: "dark",
    locale: "en-US",
    extraHTTPHeaders: { "Cache-Control": "no-cache, no-store, max-age=0", Pragma: "no-cache" },
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
  return { context, page };
}

async function waitForApp(page) {
  await page.waitForLoadState("domcontentloaded");
  await page.locator("body").waitFor({ state: "visible" });
  await page.waitForTimeout(1000);
}

async function decodeImage(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  return locator.evaluate(async (image) => {
    await image.decode();
    const rect = image.getBoundingClientRect();
    return {
      src: image.currentSrc || image.src,
      srcSet: image.srcset,
      alt: image.alt,
      width: image.naturalWidth,
      height: image.naturalHeight,
      visibleWidth: rect.width,
      visibleHeight: rect.height,
      state: image.dataset.imageState,
      fallbackActive: image.dataset.fallbackActive,
      responsiveFallback: image.dataset.responsiveFallback,
    };
  });
}

async function assertImageEndpoint(page, url, label) {
  const response = await page.request.get(url, { headers: { "Cache-Control": "no-cache, no-store" } });
  const contentType = response.headers()["content-type"] ?? "";
  const bytes = (await response.body()).length;
  if (!response.ok() || !contentType.startsWith("image/webp") || bytes < 100) {
    throw new Error(`${label} endpoint failed: ${response.status()} ${contentType} ${bytes} ${url}`);
  }
  return { status: response.status(), contentType, bytes };
}

async function assertOfficialLogo(page, scope, label) {
  const data = await decodeImage(page.locator(`${scope} img[alt="${LOGO_ALT}"]`).first());
  if (!data.src.includes("/irha-brand-mark.svg")
    || !data.src.includes(MEDIA_VERSION)
    || data.alt !== LOGO_ALT
    || data.width <= 0
    || data.height <= 0
    || data.visibleWidth < 100
    || data.visibleHeight < 20
    || FORBIDDEN_MEDIA.test(data.src)) {
    throw new Error(`${label} official logo failed: ${JSON.stringify(data)}`);
  }
  return data;
}

async function captureHome(browser, origin, label, strict) {
  const { context, page } = await createPage(browser, VIEWPORTS.at(-1));
  try {
    await page.goto(`${origin}/?ia_media_e001=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForApp(page);
    const top = strict ? await assertOfficialLogo(page, "header", "Header") : null;
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-top-desktop-1440.png") });
    await page.evaluate(() => window.scrollTo(0, Math.min(900, document.documentElement.scrollHeight / 3)));
    await page.waitForTimeout(400);
    const scrolled = strict ? await assertOfficialLogo(page, "header", "Scrolled header") : null;
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-scrolled-desktop-1440.png") });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(400);
    const footer = strict ? await assertOfficialLogo(page, "footer", "Footer") : null;
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-footer-desktop-1440.png") });
    return { top, scrolled, footer };
  } finally {
    await context.close();
  }
}

async function captureMobileHeader(browser, origin, label, strict) {
  const { context, page } = await createPage(browser, VIEWPORTS.find((item) => item.name === "mobile-390"));
  try {
    await page.goto(`${origin}/?ia_media_e001_mobile=${Date.now()}`, { waitUntil: "domcontentloaded", timeout: 45_000 });
    await waitForApp(page);
    const header = strict ? await assertOfficialLogo(page, "header", "Mobile header") : null;
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-mobile-header-390.png") });
    const menuButton = page.locator('button[aria-controls="mobile-navigation"]');
    await menuButton.waitFor({ state: "visible" });
    await menuButton.click();
    await page.locator("#mobile-navigation").waitFor({ state: "visible" });
    if (strict) await assertOfficialLogo(page, "header", "Mobile menu header");
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "homepage-mobile-menu-390.png") });
    return { header };
  } finally {
    await context.close();
  }
}

async function captureBrandIcons(browser, origin, label, strict) {
  const { context, page } = await createPage(browser, { width: 512, height: 512 });
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
      const bytes = (await response.body()).length;
      evidence[name] = { status: response.status(), contentType, bytes };
      if (strict && (!response.ok() || !contentType.startsWith("image/") || bytes < 100)) {
        throw new Error(`${name} icon failed: ${JSON.stringify(evidence[name])}`);
      }
    }
    await page.goto(`${origin}/favicon.svg?v=${MEDIA_VERSION}`, { waitUntil: "load", timeout: 45_000 });
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "favicon-512.png") });
    return evidence;
  } finally {
    await context.close();
  }
}

async function captureBaselineProduct(browser, origin, label, product) {
  const { context, page } = await createPage(browser, VIEWPORTS.find((item) => item.name === "mobile-390"));
  try {
    await page.goto(`${origin}${productPath(product.slug)}?ia_media_baseline=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(page);
    await page.locator("h1").filter({ hasText: product.name }).first().waitFor({ state: "visible", timeout: 30_000 });
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, `${product.sku.toLowerCase()}-mobile-390.png`) });
    return { captured: true };
  } catch (error) {
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, `${product.sku.toLowerCase()}-mobile-390-error.png`) }).catch(() => {});
    return { captured: false, error: String(error) };
  } finally {
    await context.close();
  }
}

async function captureBaselineCollection(browser, origin, label) {
  const { context, page } = await createPage(browser, VIEWPORTS.find((item) => item.name === "mobile-390"));
  try {
    await page.goto(`${origin}${COLLECTION_PATH}?ia_media_baseline=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(page);
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, "lederhosen-collection-mobile-390.png"), fullPage: true });
    return { captured: true };
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
          ariaLabel: element.getAttribute("aria-label"),
          rect: { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom },
        });
      }
    }
    return blockers;
  }, { heroSelector, gallerySelector });
}

async function inspectRelatedProducts(page, product) {
  const targets = new Map(PRODUCTS.filter((item) => item.slug !== product.slug).map((item) => [item.slug, item]));
  const cards = page.locator('a[href*="/products/bavarian-trachten-wear/men/lederhosen/"] img');
  const found = [];
  for (let index = 0; index < await cards.count(); index += 1) {
    const image = cards.nth(index);
    const href = await image.locator("xpath=ancestor::a[1]").getAttribute("href");
    const slug = href?.split("/").filter(Boolean).at(-1);
    const target = slug ? targets.get(slug) : null;
    if (!target) continue;
    const data = await decodeImage(image);
    if (!data.src.includes(productMediaRoot(target))
      || FORBIDDEN_MEDIA.test(data.src)
      || !data.alt?.toLowerCase().includes(target.name.toLowerCase())
      || data.width <= 0
      || data.height <= 0
      || data.fallbackActive === "true") {
      throw new Error(`Related product ${slug} failed identity: ${JSON.stringify(data)}`);
    }
    data.response = await assertImageEndpoint(page, data.src, `Related product ${slug}`);
    found.push({ slug, ...data });
  }
  if (found.length === 0) throw new Error(`${product.sku} has no verifiable related-product media`);
  return found;
}

async function inspectProduct(page, product) {
  await page.locator("h1").filter({ hasText: product.name }).first().waitFor({ state: "visible", timeout: 30_000 });
  await assertOfficialLogo(page, "header", `${product.sku} header`);
  const heroSelector = `img[alt^="${product.name} custom manufacturing catalogue reference"]`;
  const hero = page.locator(heroSelector).first();
  const thumbnails = page.locator('[aria-label="Product reference gallery"] button[aria-label^="View "]');
  const expectedImages = [...product.images].sort((a, b) => a.displayOrder - b.displayOrder);
  const count = await thumbnails.count();
  if (count !== expectedImages.length) throw new Error(`${product.sku} rendered ${count} thumbnails; expected ${expectedImages.length}`);

  const visited = [];
  for (let index = 0; index < count; index += 1) {
    const expected = expectedImages[index];
    const fragment = `${String(expected.displayOrder).padStart(2, "0")}-${expected.role}-${expected.driveFileId}.webp`;
    await thumbnails.nth(index).click();
    await page.waitForFunction(
      ({ selector, expectedFragment }) => document.querySelector(selector)?.currentSrc.includes(expectedFragment),
      { selector: heroSelector, expectedFragment: fragment },
      { timeout: 15_000 },
    );
    const data = await decodeImage(hero);
    if (!data.src.includes(productMediaRoot(product))
      || !data.src.includes(fragment)
      || !data.alt.toLowerCase().includes(product.name.toLowerCase())
      || FORBIDDEN_MEDIA.test(data.src)
      || data.width <= 0
      || data.height <= 0
      || data.state !== "loaded"
      || data.fallbackActive === "true") {
      throw new Error(`${product.sku} image ${index + 1} failed: ${JSON.stringify(data)}`);
    }
    if (data.srcSet && (!data.srcSet.includes(productMediaRoot(product)) || /responsive\/(?:480|2400)\//.test(data.srcSet))) {
      throw new Error(`${product.sku} image ${index + 1} has invalid srcset: ${data.srcSet}`);
    }
    data.response = await assertImageEndpoint(page, data.src, `${product.sku} image ${index + 1}`);
    visited.push(data);
  }

  if (new Set(visited.map((item) => item.src)).size !== visited.length) {
    throw new Error(`${product.sku} gallery rendered duplicate displayed frames`);
  }
  const blockers = await fixedOverlapEvidence(page, heroSelector, '[aria-label="Product reference gallery"]');
  if (blockers.length > 0) throw new Error(`${product.sku} fixed UI overlaps product media: ${JSON.stringify(blockers)}`);
  const layoutShift = await page.evaluate(() => window.__iaLayoutShiftScore ?? 0);
  if (layoutShift > 0.25) throw new Error(`${product.sku} CLS ${layoutShift} exceeds 0.25`);
  const relatedProducts = await inspectRelatedProducts(page, product);
  return { thumbnailCount: count, visited, blockers, layoutShift, relatedProducts };
}

async function captureStrictProduct(browser, origin, label, product, viewport) {
  const { context, page } = await createPage(browser, viewport);
  try {
    await page.goto(`${origin}${productPath(product.slug)}?ia_media_e001=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(page);
    const evidence = await inspectProduct(page, product);
    await page.screenshot({
      path: resolve(OUTPUT_ROOT, label, `${product.sku.toLowerCase()}-${viewport.name}.png`),
      fullPage: viewport.width >= 1280,
    });
    return evidence;
  } finally {
    await context.close();
  }
}

async function inspectListing(browser, origin, label, path, screenshotPrefix, viewport) {
  const { context, page } = await createPage(browser, viewport);
  try {
    await page.goto(`${origin}${path}${path.includes("?") ? "&" : "?"}ia_media_e001=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(page);
    await assertOfficialLogo(page, "header", `${screenshotPrefix} header`);
    const cards = {};
    for (const product of PRODUCTS) {
      const link = page.locator(`a[href$="/${product.slug}"]`).first();
      if ((await link.count()) === 0) throw new Error(`${screenshotPrefix} is missing ${product.slug}`);
      const data = await decodeImage(link.locator("img").first());
      if (!data.src.includes(productMediaRoot(product))
        || FORBIDDEN_MEDIA.test(data.src)
        || !data.alt?.toLowerCase().includes(product.name.toLowerCase())
        || data.width <= 0
        || data.height <= 0
        || data.fallbackActive === "true"
        || /responsive\/(?:480|2400)\//.test(data.src)) {
        throw new Error(`${screenshotPrefix} card ${product.slug} failed: ${JSON.stringify(data)}`);
      }
      data.response = await assertImageEndpoint(page, data.src, `${screenshotPrefix} ${product.slug}`);
      cards[product.slug] = data;
    }
    await page.screenshot({ path: resolve(OUTPUT_ROOT, label, `${screenshotPrefix}-${viewport.name}.png`), fullPage: true });
    return { cards };
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

function imageLikeUrls(html) {
  return [...html.matchAll(/https?:\/\/[^\s"'<>]+\.(?:webp|png|jpe?g|svg)(?:\?[^\s"'<>]*)?/gi)].map((match) => match[0]);
}

async function verifyRawHtml(origin, product) {
  const response = await fetch(`${origin}${productPath(product.slug)}?raw_html_check=${Date.now()}`, {
    headers: { "Cache-Control": "no-cache, no-store", "User-Agent": "Googlebot/2.1 (+http://www.google.com/bot.html)" },
  });
  const html = await response.text();
  if (!response.ok) throw new Error(`${product.sku} raw HTML returned ${response.status}`);
  const root = productMediaRoot(product);
  const canonicalPath = `${origin}${productPath(product.slug)}`;
  const canonicalMatch = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  const exposedImages = imageLikeUrls(html);
  if (!html.includes(product.name)
    || !html.includes(root)
    || !canonicalMatch?.[1]?.startsWith(canonicalPath)
    || /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
    || exposedImages.some((url) => FORBIDDEN_MEDIA.test(url))
    || !html.includes('"@type":"Product"')
    || !html.includes('"@type":"BreadcrumbList"')) {
    throw new Error(`${product.sku} raw HTML identity/canonical/media/schema contract failed`);
  }
  return { status: response.status, bytes: Buffer.byteLength(html), mediaRoot: root, canonicalPath, exposedImageCount: exposedImages.length };
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
    beforeProduction: { products: {} },
    afterPreview: { products: {}, collections: {}, finder: null, rawHtml: {} },
    status: "running",
    errors: [],
  };

  try {
    const identity = await createPage(browser, { width: 800, height: 600 });
    report.buildIdentity = await verifyBuildIdentity(identity.page);
    await identity.context.close();

    report.beforeProduction.home = await captureHome(browser, PRODUCTION_ORIGIN, "before-production", false);
    report.beforeProduction.mobile = await captureMobileHeader(browser, PRODUCTION_ORIGIN, "before-production", false);
    report.beforeProduction.icons = await captureBrandIcons(browser, PRODUCTION_ORIGIN, "before-production", false);
    for (const product of PRODUCTS) {
      report.beforeProduction.products[product.sku] = await captureBaselineProduct(browser, PRODUCTION_ORIGIN, "before-production", product);
    }
    report.beforeProduction.collection = await captureBaselineCollection(browser, PRODUCTION_ORIGIN, "before-production");

    report.afterPreview.home = await captureHome(browser, PREVIEW_ORIGIN, "after-preview", true);
    report.afterPreview.mobile = await captureMobileHeader(browser, PREVIEW_ORIGIN, "after-preview", true);
    report.afterPreview.icons = await captureBrandIcons(browser, PREVIEW_ORIGIN, "after-preview", true);

    for (const product of PRODUCTS) {
      report.afterPreview.products[product.sku] = {};
      for (const viewport of VIEWPORTS) {
        report.afterPreview.products[product.sku][viewport.name] = await captureStrictProduct(
          browser,
          PREVIEW_ORIGIN,
          "after-preview",
          product,
          viewport,
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
      );
    }
    report.afterPreview.finder = await inspectListing(
      browser,
      PREVIEW_ORIGIN,
      "after-preview",
      FINDER_PATH,
      "product-finder-lederhosen",
      VIEWPORTS.find((item) => item.name === "desktop-1280"),
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
