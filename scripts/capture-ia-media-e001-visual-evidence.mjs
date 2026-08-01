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
const GALLERY_SETTLE_TIMEOUT_MS = 15_000;
const GALLERY_POLL_INTERVAL_MS = 100;
const LISTING_SETTLE_TIMEOUT_MS = 30_000;
const LISTING_POLL_INTERVAL_MS = 250;
const GALLERY_TRANSITIONS = [];
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
const expectedFilenameFragment = (image) => `${String(image.displayOrder).padStart(2, "0")}-${image.role}-${image.driveFileId}.webp`;
const expectedMediaIdentity = (product, image) => `${productMediaRoot(product).replace(/^\//, "")}${expectedFilenameFragment(image)}`;
const normalizePathname = (value) => value.replace(/\/+$/, "") || "/";

function normalizeMediaIdentity(value) {
  if (!value) return "";
  try {
    const url = new URL(value, PREVIEW_ORIGIN);
    let pathname = decodeURIComponent(url.pathname);
    const marker = "/storage/v1/object/public/site-media/";
    const markerIndex = pathname.indexOf(marker);
    pathname = markerIndex >= 0 ? pathname.slice(markerIndex + marker.length) : pathname.replace(/^\/+/, "");
    pathname = pathname
      .replace(/^responsive\/(?:360|720|1200|1600)\//i, "")
      .replace(/^thumbnails\//i, "")
      .replace(/\.webp\.webp$/i, ".webp");
    return pathname;
  } catch {
    return decodeURIComponent(String(value).split(/[?#]/, 1)[0] ?? "")
      .replace(/^\/+/, "")
      .replace(/^responsive\/(?:360|720|1200|1600)\//i, "")
      .replace(/^thumbnails\//i, "")
      .replace(/\.webp\.webp$/i, ".webp");
  }
}

function srcSetCandidates(srcSet) {
  if (!srcSet) return [];
  return srcSet
    .split(",")
    .map((candidate) => candidate.trim().split(/\s+/, 1)[0])
    .filter(Boolean);
}

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
    window.__iaMediaNodeCounter = 0;
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

async function verifyAndDismissCookieConsent(page) {
  const dialog = page.locator('[aria-labelledby="cookie-consent-title"]');
  if (await dialog.count() === 0 || !(await dialog.isVisible())) {
    return { visible: false, choice: null };
  }

  const privacy = dialog.locator('a[href="/privacy-policy"]');
  const essential = dialog.getByRole("button", { name: /essential only/i });
  const optional = dialog.getByRole("button", { name: /accept optional/i });
  if (!(await privacy.isVisible()) || !(await essential.isVisible()) || !(await optional.isVisible())) {
    throw new Error("Cookie consent controls are incomplete");
  }

  await essential.click();
  await dialog.waitFor({ state: "hidden", timeout: 10_000 });
  return { visible: true, choice: "essential-only" };
}

async function decodeImage(locator) {
  await locator.scrollIntoViewIfNeeded();
  await locator.waitFor({ state: "visible", timeout: 30_000 });
  return locator.evaluate(async (image) => {
    await image.decode();
    const rect = image.getBoundingClientRect();
    return {
      src: image.currentSrc || image.src,
      declaredSrc: image.src,
      currentSrc: image.currentSrc,
      srcSet: image.srcset,
      alt: image.alt,
      width: image.naturalWidth,
      height: image.naturalHeight,
      visibleWidth: rect.width,
      visibleHeight: rect.height,
      state: image.dataset.imageState,
      fallbackActive: image.dataset.fallbackActive,
      responsiveFallback: image.dataset.responsiveFallback,
      complete: image.complete,
    };
  });
}

async function assertImageEndpoint(page, url, label) {
  const response = await page.request.get(url, { headers: { "Cache-Control": "no-cache, no-store" } });
  const contentType = response.headers()["content-type"] ?? "";
  const bytes = (await response.body()).length;
  if (!response.ok() || !contentType.startsWith("image/webp") || bytes < 100) {
    throw new Error(`${label} endpoint failed: ${response.status()} ${contentType} ${bytes} ${response.url()}`);
  }
  return { url: response.url(), status: response.status(), contentType, bytes };
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

async function gallerySnapshot(page, heroSelector) {
  return page.evaluate(({ heroSelector }) => {
    const image = document.querySelector(heroSelector);
    const gallery = document.querySelector('[aria-label="Product reference gallery"]');
    const buttons = gallery ? [...gallery.querySelectorAll('button[aria-label^="View "]')] : [];
    if (image && !image.dataset.iaEvidenceNode) {
      window.__iaMediaNodeCounter = (window.__iaMediaNodeCounter ?? 0) + 1;
      image.dataset.iaEvidenceNode = String(window.__iaMediaNodeCounter);
    }
    const rect = image?.getBoundingClientRect();
    const selectedIndices = buttons
      .map((button, index) => button.classList.contains("border-primary") ? index : -1)
      .filter((index) => index >= 0);
    return {
      heroFound: Boolean(image),
      nodeId: image?.dataset.iaEvidenceNode ?? null,
      declaredSrc: image?.src ?? "",
      currentSrc: image?.currentSrc ?? "",
      alt: image?.alt ?? "",
      srcSet: image?.srcset ?? "",
      imageState: image?.dataset.imageState ?? null,
      fallbackActive: image?.dataset.fallbackActive ?? null,
      responsiveFallback: image?.dataset.responsiveFallback ?? null,
      complete: image?.complete ?? false,
      naturalWidth: image?.naturalWidth ?? 0,
      naturalHeight: image?.naturalHeight ?? 0,
      visible: Boolean(rect && rect.width > 0 && rect.height > 0 && getComputedStyle(image).visibility !== "hidden"),
      rect: rect ? { x: rect.x, y: rect.y, width: rect.width, height: rect.height } : null,
      selectedIndices,
      selectedButtons: selectedIndices.map((index) => ({
        index,
        ariaLabel: buttons[index]?.getAttribute("aria-label") ?? null,
        className: buttons[index]?.className ?? null,
      })),
      thumbnailCount: buttons.length,
    };
  }, { heroSelector });
}

function snapshotMatchesExpected(snapshot, product, expected, index) {
  const identity = expectedMediaIdentity(product, expected);
  const root = productMediaRoot(product).replace(/^\//, "");
  const declaredIdentity = normalizeMediaIdentity(snapshot.declaredSrc);
  const currentIdentity = normalizeMediaIdentity(snapshot.currentSrc || snapshot.declaredSrc);
  const responsiveIdentities = srcSetCandidates(snapshot.srcSet).map(normalizeMediaIdentity);
  const sameResponsiveSource = responsiveIdentities.every((candidate) => candidate === identity);
  const hasExpectedSelection = snapshot.selectedIndices.length === 1 && snapshot.selectedIndices[0] === index;
  const exactAlt = snapshot.alt.trim().toLowerCase().includes(product.name.toLowerCase())
    && !/^(?:product|image|catalogue reference)$/i.test(snapshot.alt.trim());
  const identityMatches = declaredIdentity === identity || currentIdentity === identity;
  const rootMatches = declaredIdentity.startsWith(root) && currentIdentity.startsWith(root);
  return {
    settled: hasExpectedSelection
      && exactAlt
      && identityMatches
      && rootMatches
      && sameResponsiveSource
      && snapshot.naturalWidth > 0
      && snapshot.naturalHeight > 0
      && snapshot.imageState === "loaded"
      && snapshot.fallbackActive !== "true"
      && snapshot.complete
      && snapshot.visible
      && !FORBIDDEN_MEDIA.test(snapshot.declaredSrc)
      && !FORBIDDEN_MEDIA.test(snapshot.currentSrc),
    identity,
    declaredIdentity,
    currentIdentity,
    responsiveIdentities,
    hasExpectedSelection,
    exactAlt,
    identityMatches,
    rootMatches,
    sameResponsiveSource,
  };
}

async function waitForGallerySettled(page, product, viewport, index, expected, heroSelector, transition) {
  const started = Date.now();
  let lastSnapshot = await gallerySnapshot(page, heroSelector);
  let lastMatch = snapshotMatchesExpected(lastSnapshot, product, expected, index);
  while (!lastMatch.settled && Date.now() - started < GALLERY_SETTLE_TIMEOUT_MS) {
    await page.waitForTimeout(GALLERY_POLL_INTERVAL_MS);
    lastSnapshot = await gallerySnapshot(page, heroSelector);
    lastMatch = snapshotMatchesExpected(lastSnapshot, product, expected, index);
  }
  transition.elapsedTransitionMs = Date.now() - started;
  transition.settledSnapshot = lastSnapshot;
  transition.settledMatch = lastMatch;
  if (!lastMatch.settled) {
    throw new Error(`${product.sku} ${product.slug} ${viewport.name} gallery index ${index} did not settle within ${GALLERY_SETTLE_TIMEOUT_MS}ms: ${JSON.stringify({
      expectedDriveFileId: expected.driveFileId,
      expectedRole: expected.role,
      expectedIdentity: lastMatch.identity,
      actualDeclaredIdentity: lastMatch.declaredIdentity,
      actualCurrentIdentity: lastMatch.currentIdentity,
      selectedIndices: lastSnapshot.selectedIndices,
      imageState: lastSnapshot.imageState,
      fallbackActive: lastSnapshot.fallbackActive,
      naturalWidth: lastSnapshot.naturalWidth,
      naturalHeight: lastSnapshot.naturalHeight,
      srcSet: lastSnapshot.srcSet,
      nodeId: lastSnapshot.nodeId,
    })}`);
  }
  return lastSnapshot;
}

async function requireStableHeroFrame(page, product, expected, index, heroSelector) {
  const before = await gallerySnapshot(page, heroSelector);
  await page.evaluate(() => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))));
  const after = await gallerySnapshot(page, heroSelector);
  const beforeMatch = snapshotMatchesExpected(before, product, expected, index);
  const afterMatch = snapshotMatchesExpected(after, product, expected, index);
  const rectStable = before.rect && after.rect
    && Math.abs(before.rect.x - after.rect.x) < 0.5
    && Math.abs(before.rect.y - after.rect.y) < 0.5
    && Math.abs(before.rect.width - after.rect.width) < 0.5
    && Math.abs(before.rect.height - after.rect.height) < 0.5;
  if (!beforeMatch.settled || !afterMatch.settled || before.nodeId !== after.nodeId || !rectStable) {
    throw new Error(`${product.sku} gallery index ${index} hero frame was not stable: ${JSON.stringify({ before, after, beforeMatch, afterMatch, rectStable })}`);
  }
  return { nodeId: after.nodeId, rect: after.rect, currentSrc: after.currentSrc };
}

async function inspectProduct(page, product, viewport) {
  await page.locator("h1").filter({ hasText: product.name }).first().waitFor({ state: "visible", timeout: 30_000 });
  await assertOfficialLogo(page, "header", `${product.sku} header`);
  const heroSelector = 'div:has(> [aria-label="Product reference gallery"]) > div:first-child img[data-managed-image="true"]';
  const hero = page.locator(heroSelector).first();
  const thumbnails = page.locator('[aria-label="Product reference gallery"] button[aria-label^="View "]');
  const expectedImages = [...product.images].sort((a, b) => a.displayOrder - b.displayOrder);
  const count = await thumbnails.count();
  if (count !== expectedImages.length) throw new Error(`${product.sku} rendered ${count} thumbnails; expected ${expectedImages.length}`);

  const visited = [];
  for (let index = 0; index < count; index += 1) {
    const expected = expectedImages[index];
    const transition = {
      sku: product.sku,
      productSlug: product.slug,
      viewport: { name: viewport.name, width: viewport.width, height: viewport.height },
      thumbnailIndex: index,
      expectedDriveFileId: expected.driveFileId,
      expectedRole: expected.role,
      expectedCanonicalFilenameFragment: expectedFilenameFragment(expected),
      expectedMediaIdentity: expectedMediaIdentity(product, expected),
      startedAt: nowIso(),
    };
    GALLERY_TRANSITIONS.push(transition);
    transition.beforeClick = await gallerySnapshot(page, heroSelector);
    const alreadySelected = transition.beforeClick.selectedIndices.length === 1
      && transition.beforeClick.selectedIndices[0] === index;
    transition.action = alreadySelected ? "verify-existing-selection" : "click-thumbnail";
    const clickStarted = Date.now();
    if (!alreadySelected) await thumbnails.nth(index).click();
    transition.immediateAfterClick = await gallerySnapshot(page, heroSelector);
    transition.clickElapsedMs = Date.now() - clickStarted;

    await waitForGallerySettled(page, product, viewport, index, expected, heroSelector, transition);
    const data = await decodeImage(hero);
    const identity = expectedMediaIdentity(product, expected);
    const normalizedDeclared = normalizeMediaIdentity(data.declaredSrc);
    const normalizedCurrent = normalizeMediaIdentity(data.currentSrc || data.declaredSrc);
    const normalizedResponsive = srcSetCandidates(data.srcSet).map(normalizeMediaIdentity);
    if (!normalizedDeclared.startsWith(productMediaRoot(product).replace(/^\//, ""))
      || !normalizedCurrent.startsWith(productMediaRoot(product).replace(/^\//, ""))
      || (normalizedDeclared !== identity && normalizedCurrent !== identity)
      || normalizedResponsive.some((candidate) => candidate !== identity)
      || !data.alt.toLowerCase().includes(product.name.toLowerCase())
      || FORBIDDEN_MEDIA.test(data.declaredSrc)
      || FORBIDDEN_MEDIA.test(data.currentSrc)
      || data.width <= 0
      || data.height <= 0
      || data.state !== "loaded"
      || data.fallbackActive === "true") {
      throw new Error(`${product.sku} image ${index + 1} failed: ${JSON.stringify({ data, identity, normalizedDeclared, normalizedCurrent, normalizedResponsive })}`);
    }
    if (data.srcSet && /responsive\/(?:480|2400)\//.test(data.srcSet)) {
      throw new Error(`${product.sku} image ${index + 1} has retired responsive tier: ${data.srcSet}`);
    }
    data.response = await assertImageEndpoint(page, data.currentSrc || data.declaredSrc, `${product.sku} image ${index + 1}`);
    data.stableFrame = await requireStableHeroFrame(page, product, expected, index, heroSelector);
    transition.networkResponse = data.response;
    transition.stableFrame = data.stableFrame;
    transition.finishedAt = nowIso();
    visited.push({ ...data, expectedDriveFileId: expected.driveFileId, expectedRole: expected.role, normalizedIdentity: normalizedCurrent || normalizedDeclared });
  }

  if (new Set(visited.map((item) => item.normalizedIdentity)).size !== visited.length) {
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
    const consent = await verifyAndDismissCookieConsent(page);
    const evidence = await inspectProduct(page, product, viewport);
    await page.screenshot({
      path: resolve(OUTPUT_ROOT, label, `${product.sku.toLowerCase()}-${viewport.name}.png`),
      fullPage: viewport.width >= 1280,
    });
    return { ...evidence, consent };
  } finally {
    await context.close();
  }
}

async function listingSnapshot(page, expectedPathname) {
  return page.evaluate(({ expectedPathname, expectedSlugs }) => {
    const hrefs = [...document.querySelectorAll("a[href]")]
      .map((link) => {
        try {
          return new URL(link.getAttribute("href") ?? "", window.location.href).pathname;
        } catch {
          return "";
        }
      })
      .filter(Boolean);
    const presentSlugs = expectedSlugs.filter((slug) => hrefs.some((href) => href.endsWith(`/${slug}`)));
    const missingSlugs = expectedSlugs.filter((slug) => !presentSlugs.includes(slug));
    const bodyText = document.body?.innerText ?? "";
    const pathname = window.location.pathname.replace(/\/+$/, "") || "/";
    return {
      href: window.location.href,
      pathname,
      expectedPathname,
      pathnameMatches: pathname === expectedPathname,
      title: document.title,
      h1: document.querySelector("h1")?.textContent?.trim() ?? null,
      loadingTextVisible: /Loading (?:collection|products|catalogue)/i.test(bodyText),
      presentSlugs,
      missingSlugs,
      observedProductHrefs: [...new Set(hrefs.filter((href) => expectedSlugs.some((slug) => href.endsWith(`/${slug}`))))].sort(),
    };
  }, { expectedPathname, expectedSlugs: PRODUCTS.map((product) => product.slug) });
}

async function waitForListingSettled(page, path, label) {
  const expectedPathname = normalizePathname(path.split("?", 1)[0]);
  const started = Date.now();
  let snapshot = await listingSnapshot(page, expectedPathname);
  while (
    (!snapshot.pathnameMatches || snapshot.loadingTextVisible || snapshot.missingSlugs.length > 0)
    && Date.now() - started < LISTING_SETTLE_TIMEOUT_MS
  ) {
    await page.waitForTimeout(LISTING_POLL_INTERVAL_MS);
    snapshot = await listingSnapshot(page, expectedPathname);
  }
  snapshot.elapsedMs = Date.now() - started;
  if (!snapshot.pathnameMatches || snapshot.loadingTextVisible || snapshot.missingSlugs.length > 0) {
    throw new Error(`${label} did not settle within ${LISTING_SETTLE_TIMEOUT_MS}ms: ${JSON.stringify(snapshot)}`);
  }
  return snapshot;
}

async function inspectListing(browser, origin, label, path, screenshotPrefix, viewport) {
  const { context, page } = await createPage(browser, viewport);
  try {
    await page.goto(`${origin}${path}${path.includes("?") ? "&" : "?"}ia_media_e001=${Date.now()}`, {
      waitUntil: "domcontentloaded",
      timeout: 45_000,
    });
    await waitForApp(page);
    const listingState = await waitForListingSettled(page, path, `${screenshotPrefix} ${viewport.name}`);
    await assertOfficialLogo(page, "header", `${screenshotPrefix} header`);
    const cards = {};
    for (const product of PRODUCTS) {
      const link = page.locator(`a[href$="/${product.slug}"]`).first();
      if ((await link.count()) === 0) throw new Error(`${screenshotPrefix} is missing ${product.slug}: ${JSON.stringify(listingState)}`);
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
    return { cards, listingState };
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
    galleryTransitions: GALLERY_TRANSITIONS,
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
      `# IA-MEDIA-E001 Visual Acceptance\n\n- Status: **${report.status}**\n- Expected SHA: \`${report.expectedSha ?? "not supplied"}\`\n- Exact source SHA: \`${report.buildIdentity?.source_commit ?? "unavailable"}\`\n- Products: P001–P007\n- Viewports: ${VIEWPORTS.map((viewport) => `${viewport.name} (${viewport.width}×${viewport.height})`).join(", ")}\n- Raw HTML parity: ${REQUIRE_RAW_HTML ? "required" : "preview visual only"}\n- Gallery transitions recorded: ${GALLERY_TRANSITIONS.length}\n- Completed: ${report.finishedAt}\n`,
    );
    await browser.close();
  }
}

await main();
