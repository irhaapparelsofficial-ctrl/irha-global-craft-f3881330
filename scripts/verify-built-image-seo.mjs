import { readdir, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { createRequire } from "node:module";
import { JSDOM } from "jsdom";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const DIST_DIR = resolve(process.env.IRHA_DIST_DIR || "dist");
const SITE_URL = "https://irhaapparels.com";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const EXPECTED_SITEMAP_URLS = 411;
const EXPECTED_HTML = 417;
const EXPECTED_REDIRECTS = 1583;
const IMAGE_NAMESPACE = "http://www.google.com/schemas/sitemap-image/1.1";
const TEMPORARY_QUERY_PATTERN =
  /(?:^|[?&])(?:token|signature|expires|x-amz-[^=]*|x-goog-[^=]*|policy|key-pair-id)=/i;

function imageUrlFromPrimaryImage(value) {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") {
    return value.url || value.contentUrl || "";
  }
  return "";
}

function isTemporary(value) {
  const parsed = new URL(value);
  return TEMPORARY_QUERY_PATTERN.test(parsed.search)
    || /\/sign\/|\/signed\//i.test(parsed.pathname);
}

function requireStableAbsoluteImage(value, label) {
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error(`${label} is not absolute: ${value || "<missing>"}`);
  }
  if (parsed.protocol !== "https:") throw new Error(`${label} must use HTTPS: ${value}`);
  if (isTemporary(value)) throw new Error(`${label} is signed or expiring: ${value}`);
  return parsed.href;
}

function routeMaps(products) {
  const productByPath = new Map();
  const taxonomyByPath = new Map();
  const ordered = [...products].sort(
    (left, right) =>
      left.reference_code.localeCompare(right.reference_code, undefined, { numeric: true })
      || left.canonical_path.localeCompare(right.canonical_path),
  );

  for (const product of ordered) {
    const primary = requireStableAbsoluteImage(product.image_url, `${product.reference_code} primary image`);
    if (!Array.isArray(product.gallery) || product.gallery[0] !== primary) {
      throw new Error(`${product.reference_code} primary image is not gallery slot 1`);
    }
    const referencePrefix = product.reference_code.toLowerCase();
    const pathname = new URL(primary).pathname;
    const directory = pathname.split("/").at(-2) || "";
    const filename = pathname.split("/").at(-1) || "";
    if (!pathname.includes("/catalog/products/")
      || !directory.startsWith(`${referencePrefix}-`)
      || !filename.startsWith(`${referencePrefix}-`)
      || !/-front\.(?:avif|jpe?g|png|webp)$/i.test(filename)) {
      throw new Error(`${product.reference_code} primary image path is not deterministic: ${primary}`);
    }
    productByPath.set(product.canonical_path, { ...product, image_url: primary });

    for (const [path, label] of [
      [`/products/${product.main_category_slug}`, product.main_category_name],
      [`/products/${product.main_category_slug}/${product.audience_slug}`, `${product.audience_name} ${product.main_category_name}`],
      [`/products/${product.main_category_slug}/${product.audience_slug}/${product.product_type_slug}`, product.product_type_name],
    ]) {
      if (!taxonomyByPath.has(path)) taxonomyByPath.set(path, { product, label, image_url: primary });
    }
  }
  if (productByPath.size !== EXPECTED_PRODUCTS) throw new Error(`Product count drift: ${productByPath.size}`);
  if (taxonomyByPath.size !== EXPECTED_TAXONOMY) throw new Error(`Taxonomy count drift: ${taxonomyByPath.size}`);
  if (new Set([...productByPath.values()].map((product) => product.image_url)).size !== EXPECTED_PRODUCTS) {
    throw new Error("Published products do not have 254 distinct primary images");
  }
  return { productByPath, taxonomyByPath };
}

async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

function parseHtml(pathname, html) {
  const dom = new JSDOM(html);
  const document = dom.window.document;
  const canonical = document.querySelector('link[rel="canonical"]')?.getAttribute("href") || "";
  if (canonical !== `${SITE_URL}${pathname}`) {
    throw new Error(`Canonical mismatch for ${pathname}: ${canonical || "<missing>"}`);
  }
  return document;
}

function exactMeta(document, selector, expected, pathname) {
  const nodes = [...document.querySelectorAll(selector)];
  if (nodes.length !== 1) throw new Error(`${pathname} has ${nodes.length} matches for ${selector}`);
  const actual = nodes[0].getAttribute("content");
  if (actual !== expected) throw new Error(`${pathname} ${selector} mismatch: ${actual || "<missing>"}`);
}

function routeSchemas(document, pathname) {
  return [...document.querySelectorAll('script[data-irha-route-jsonld="true"][type="application/ld+json"]')]
    .map((node) => {
      try {
        return JSON.parse(node.textContent || "");
      } catch (error) {
        throw new Error(`Invalid route JSON-LD for ${pathname}: ${error instanceof Error ? error.message : String(error)}`);
      }
    });
}

function schemaByType(schemas, type, pathname) {
  const found = schemas.filter((schema) => schema?.["@type"] === type);
  if (found.length !== 1) throw new Error(`${pathname} has ${found.length} ${type} schemas`);
  return found[0];
}

async function verifyProduct(pathname, product, sitemapImage) {
  if (sitemapImage !== product.image_url) throw new Error(`${product.reference_code} sitemap image conflicts with manifest`);
  const htmlPath = join(DIST_DIR, pathname.slice(1), "index.html");
  const document = parseHtml(pathname, await readFile(htmlPath, "utf8"));
  const image = [...document.querySelectorAll("img")].find((node) => node.getAttribute("src") === product.image_url);
  if (!image) throw new Error(`${product.reference_code} primary <img> missing from initial HTML`);

  const expectedAlt = `Digital catalogue reference for ${product.product_name}, view 1`;
  if (image.getAttribute("alt") !== expectedAlt) throw new Error(`${product.reference_code} primary alt mismatch`);
  if (image.getAttribute("loading") !== "eager") throw new Error(`${product.reference_code} primary image is not eager`);
  if (image.getAttribute("fetchpriority") !== "high") throw new Error(`${product.reference_code} primary image lacks high fetch priority`);
  if (!image.getAttribute("width") || !image.getAttribute("height")) throw new Error(`${product.reference_code} primary dimensions missing`);

  exactMeta(document, 'meta[property="og:image"]', product.image_url, pathname);
  exactMeta(document, 'meta[property="og:image:alt"]', expectedAlt, pathname);
  exactMeta(document, 'meta[name="twitter:image"]', product.image_url, pathname);
  exactMeta(document, 'meta[name="twitter:image:alt"]', expectedAlt, pathname);

  const schemas = routeSchemas(document, pathname);
  const productSchema = schemaByType(schemas, "Product", pathname);
  const webPage = schemaByType(schemas, "WebPage", pathname);
  schemaByType(schemas, "BreadcrumbList", pathname);

  if (productSchema.name !== product.product_name || productSchema.url !== `${SITE_URL}${pathname}`) {
    throw new Error(`${product.reference_code} Product schema identity mismatch`);
  }
  const productImages = Array.isArray(productSchema.image) ? productSchema.image : [productSchema.image];
  if (productImages[0] !== product.image_url) throw new Error(`${product.reference_code} Product.image primary mismatch`);
  if (imageUrlFromPrimaryImage(webPage.primaryImageOfPage) !== product.image_url) {
    throw new Error(`${product.reference_code} WebPage.primaryImageOfPage mismatch`);
  }
  if (webPage.mainEntity?.["@id"] !== `${SITE_URL}${pathname}#product`) {
    throw new Error(`${product.reference_code} WebPage.mainEntity mismatch`);
  }
  if (document.querySelector('[style*="background-image"]')?.getAttribute("style")?.includes(product.image_url)) {
    throw new Error(`${product.reference_code} primary image relies on CSS background-image`);
  }
}

async function verifyTaxonomy(pathname, entry, sitemapImage) {
  if (sitemapImage !== entry.image_url) throw new Error(`Taxonomy sitemap image conflicts with representative product: ${pathname}`);
  const document = parseHtml(pathname, await readFile(join(DIST_DIR, pathname.slice(1), "index.html"), "utf8"));
  const image = document.querySelector('figure[data-irha-taxonomy-primary-image="true"] img');
  if (!image || image.getAttribute("src") !== entry.image_url) throw new Error(`Taxonomy primary <img> missing: ${pathname}`);
  const expectedAlt = `Digital catalogue reference for ${entry.product.product_name} representing ${entry.label}`;
  if (image.getAttribute("alt") !== expectedAlt) throw new Error(`Taxonomy alt mismatch: ${pathname}`);
  if (image.getAttribute("loading") !== "eager" || image.getAttribute("fetchpriority") !== "high") {
    throw new Error(`Taxonomy image priority mismatch: ${pathname}`);
  }
  exactMeta(document, 'meta[property="og:image"]', entry.image_url, pathname);
  exactMeta(document, 'meta[property="og:image:alt"]', expectedAlt, pathname);
  exactMeta(document, 'meta[name="twitter:image"]', entry.image_url, pathname);
  exactMeta(document, 'meta[name="twitter:image:alt"]', expectedAlt, pathname);

  const schemas = routeSchemas(document, pathname);
  const collection = schemaByType(schemas, "CollectionPage", pathname);
  schemaByType(schemas, "BreadcrumbList", pathname);
  if (collection.image !== entry.image_url) throw new Error(`CollectionPage.image mismatch: ${pathname}`);
  if (imageUrlFromPrimaryImage(collection.primaryImageOfPage) !== entry.image_url) {
    throw new Error(`CollectionPage.primaryImageOfPage mismatch: ${pathname}`);
  }
}

function parseSitemap(xml) {
  let dom;
  try {
    dom = new JSDOM(xml, { contentType: "text/xml" });
  } catch (error) {
    throw new Error(`Malformed sitemap XML: ${error instanceof Error ? error.message : String(error)}`);
  }
  const document = dom.window.document;
  const root = document.documentElement;
  if (root.localName !== "urlset") throw new Error(`Unexpected sitemap root: ${root.localName}`);
  if (root.namespaceURI !== "http://www.sitemaps.org/schemas/sitemap/0.9") {
    throw new Error(`Sitemap root namespace mismatch: ${root.namespaceURI || "<missing>"}`);
  }
  if (root.getAttribute("xmlns:image") !== IMAGE_NAMESPACE) throw new Error("Image sitemap namespace is missing");

  const urlNodes = [...document.getElementsByTagNameNS("http://www.sitemaps.org/schemas/sitemap/0.9", "url")];
  if (urlNodes.length !== EXPECTED_SITEMAP_URLS) throw new Error(`Sitemap count drift: ${urlNodes.length}`);

  const imageByPath = new Map();
  const seen = new Set();
  for (const node of urlNodes) {
    const loc = node.getElementsByTagNameNS("http://www.sitemaps.org/schemas/sitemap/0.9", "loc")[0]?.textContent?.trim() || "";
    const page = new URL(loc);
    if (page.origin !== SITE_URL) throw new Error(`Wrong sitemap page host: ${loc}`);
    const pathname = page.pathname === "/" ? "/" : page.pathname.replace(/\/+$/, "");
    if (seen.has(pathname)) throw new Error(`Duplicate sitemap page: ${pathname}`);
    seen.add(pathname);
    const imageNodes = [...node.getElementsByTagNameNS(IMAGE_NAMESPACE, "loc")];
    if (imageNodes.length > 1) throw new Error(`Competing sitemap primary images: ${pathname}`);
    if (imageNodes.length === 1) {
      imageByPath.set(pathname, requireStableAbsoluteImage(imageNodes[0].textContent?.trim() || "", `Sitemap image for ${pathname}`));
    }
  }
  return { imageByPath, pageCount: seen.size };
}

async function verifyImageEndpoint(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const response = await fetch(url, {
        method: "HEAD",
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Irha-Image-SEO-Release-Verification/1.0" },
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      if (!contentType.toLowerCase().startsWith("image/")) throw new Error(`Content-Type ${contentType || "<missing>"}`);
      return;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Image endpoint failed: ${url} (${lastError instanceof Error ? lastError.message : String(lastError)})`);
}

async function verifyEndpoints(urls) {
  if (process.env.IRHA_SKIP_IMAGE_HTTP === "1") {
    console.log(`Skipped HTTP image verification for ${urls.length} URLs by explicit local-test flag`);
    return;
  }
  const queue = [...urls];
  const workers = Array.from({ length: Math.min(12, queue.length) }, async () => {
    while (queue.length) {
      const url = queue.shift();
      if (url) await verifyImageEndpoint(url);
    }
  });
  await Promise.all(workers);
}

async function verifyGalleryEndpoint(url) {
  let lastError;
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: controller.signal,
        headers: { "User-Agent": "Irha-Gallery-Integrity-Release-Verification/1.0" },
      });
      const contentType = response.headers.get("content-type") || "";
      if (response.status !== 200) throw new Error(`HTTP ${response.status}`);
      if (!contentType.toLowerCase().startsWith("image/webp")) {
        throw new Error(`Content-Type ${contentType || "<missing>"}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());
      const metadata = await sharp(buffer, { failOn: "error" }).metadata();
      if (metadata.format !== "webp") throw new Error(`Decoded format ${metadata.format || "<missing>"}`);
      if (!metadata.width || !metadata.height) throw new Error("Decoded dimensions are missing");
      return;
    } catch (error) {
      lastError = error;
    } finally {
      clearTimeout(timeout);
    }
  }
  throw new Error(`Gallery image endpoint failed: ${url} (${lastError instanceof Error ? lastError.message : String(lastError)})`);
}

async function verifyGalleryEndpoints(products) {
  const galleryUrls = products.flatMap((product) => {
    if (!Array.isArray(product.gallery) || product.gallery.length === 0) {
      throw new Error(`${product.reference_code} gallery is missing`);
    }
    return product.gallery.map((url) => requireStableAbsoluteImage(url, `${product.reference_code} gallery image`));
  });
  if (process.env.IRHA_SKIP_IMAGE_HTTP === "1") {
    console.log(`Skipped gallery decode verification for ${galleryUrls.length} URLs by explicit local-test flag`);
    return galleryUrls.length;
  }
  const queue = [...galleryUrls];
  const workers = Array.from({ length: Math.min(12, queue.length) }, async () => {
    while (queue.length) {
      const url = queue.shift();
      if (url) await verifyGalleryEndpoint(url);
    }
  });
  await Promise.all(workers);
  return galleryUrls.length;
}

async function verifyRedirects() {
  const lines = (await readFile(join(DIST_DIR, "_redirects"), "utf8"))
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
  const exact301 = lines.filter((line) => {
    const [source, , status] = line.split(/\s+/);
    return status === "301" && !source.includes("*");
  });
  const wildcard301 = lines.filter((line) => {
    const [source, , status] = line.split(/\s+/);
    return status === "301" && source.includes("*");
  });
  if (exact301.length !== EXPECTED_REDIRECTS || wildcard301.length !== 1) {
    throw new Error(`Redirect drift: exact=${exact301.length}, wildcard=${wildcard301.length}`);
  }
}

async function main() {
  const files = await walk(DIST_DIR);
  const htmlCount = files.filter((file) => file.endsWith(".html")).length;
  if (htmlCount !== EXPECTED_HTML) throw new Error(`Generated HTML count drift: ${htmlCount}`);

  const manifest = JSON.parse(await readFile(join(DIST_DIR, "catalog-route-manifest.json"), "utf8"));
  if (manifest.schemaVersion !== 1 || manifest.productCount !== EXPECTED_PRODUCTS || manifest.products?.length !== EXPECTED_PRODUCTS) {
    throw new Error("Built manifest is incomplete");
  }
  const { productByPath, taxonomyByPath } = routeMaps(manifest.products);
  const { imageByPath, pageCount } = parseSitemap(await readFile(join(DIST_DIR, "sitemap.xml"), "utf8"));

  if (imageByPath.size !== EXPECTED_PRODUCTS + EXPECTED_TAXONOMY) {
    throw new Error(`Image sitemap entry drift: ${imageByPath.size}`);
  }
  for (const [pathname, product] of productByPath) {
    const image = imageByPath.get(pathname);
    if (!image) throw new Error(`Product sitemap image missing: ${pathname}`);
    await verifyProduct(pathname, product, image);
  }
  for (const [pathname, entry] of taxonomyByPath) {
    const image = imageByPath.get(pathname);
    if (!image) throw new Error(`Taxonomy sitemap image missing: ${pathname}`);
    await verifyTaxonomy(pathname, entry, image);
  }

  await verifyRedirects();
  await verifyEndpoints([...new Set([...productByPath.values()].map((product) => product.image_url))]);
  const galleryCount = await verifyGalleryEndpoints(manifest.products);

  console.log(
    `Image SEO contract passed: products=${productByPath.size}, taxonomy=${taxonomyByPath.size}, sitemap=${pageCount}, html=${htmlCount}, images=${imageByPath.size}, gallery=${galleryCount}, broken=0`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
