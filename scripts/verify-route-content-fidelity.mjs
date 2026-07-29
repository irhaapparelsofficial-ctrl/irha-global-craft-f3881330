import { access, readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_ROUTE_CONTENT, CORE_ROUTE_PATHS, MAIN_CATEGORY_LINKS } from "../src/lib/routeContent.mjs";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";

const DIST = resolve(process.env.IRHA_DIST_DIR || "dist");
const SOURCE_ROOT = resolve(process.env.IRHA_SOURCE_ROOT || ".");
const SITE = "https://irhaapparels.com";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const PRODUCT_SHELL = 'data-irha-product-shell="true"';
const CORE_SHELL = 'data-irha-route-content="core"';
const TAXONOMY_SHELL = 'data-irha-route-content="taxonomy"';
const GENERIC_MARKER = 'data-irha-rich-route-shell="true"';
const SPECIALIZED_ROUTE_TYPES = new Set([
  "localized-market",
  "resource-index",
  "resource-article",
  "materials",
  "buyer-information",
  "about",
  "manufacturing",
  "inquiry-rfq",
  "legal",
]);
const UNIVERSAL_FINGERPRINTS = [
  "Experienced manufacturer. Newly built website.",
  "Five specialist apparel categories.",
  "From requirement to shipping review.",
  "What buyers usually need to confirm.",
];
const UNSUPPORTED_CLAIMS = [
  "all production in-house",
  "produced in-house",
  "worldwide",
  "global supplier",
  "exported to",
  "production capacity",
  "employee count",
  "fixed moq",
  "fixed lead time",
  "bsci audited",
  "iso 9001",
  "sedex member",
  "45-day production",
  "moq 50",
];
const LEGACY_INTERNAL_LINKS = [
  "/products/bavarian-garments",
  "/products/leather-garments",
  "/products/streetwear",
];

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function cleanPath(pathname) {
  if (pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function escapeHtml(value) {
  return String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function stripHtml(value) {
  return value.replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function primaryMain(html) {
  return html.match(/<main id="irha-static-crawler-shell"[^>]*>[\s\S]*?<\/main>/i)?.[0] ?? "";
}

function titleOf(html) {
  return stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function h1Of(html) {
  return stripHtml(html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
}

function canonicalOf(html) {
  return html.match(/<link rel="canonical" href="([^"]+)"/i)?.[1] ?? "";
}

function sitemapPaths(xml) {
  const paths = [];
  for (const block of xml.matchAll(/<url>[\s\S]*?<\/url>/g)) {
    const match = block[0].match(/<loc>([^<]+)<\/loc>/);
    if (!match) continue;
    const url = new URL(match[1].replace(/&amp;/g, "&"));
    assert(url.origin === SITE, `Sitemap contains non-canonical host: ${url.href}`);
    paths.push(cleanPath(url.pathname));
  }
  return paths;
}

function authoritativeSitemapPaths(manifest) {
  assert(manifest?.schemaVersion === 1 && Array.isArray(manifest.routes), "Authoritative SEO route manifest is missing or invalid");
  const eligible = manifest.routes.filter((route) => route.indexable && route.sitemap);
  assert(eligible.length === manifest.sitemapCount, `SEO manifest sitemap count drift: ${manifest.sitemapCount} vs ${eligible.length}`);
  const urls = eligible.map((route) => route.canonicalUrl);
  assert(new Set(urls).size === urls.length, "Authoritative SEO manifest contains duplicate sitemap URLs");
  const paths = urls.map((value) => {
    const url = new URL(value);
    assert(url.origin === SITE, `Authoritative route uses a non-canonical host: ${value}`);
    assert(!url.search && !url.hash, `Authoritative sitemap route contains query or fragment: ${value}`);
    return cleanPath(url.pathname);
  });
  assert(new Set(paths).size === paths.length, "Authoritative SEO manifest contains duplicate canonical paths");
  return { paths, routeByPath: new Map(eligible.map((route) => [cleanPath(new URL(route.canonicalUrl).pathname), route])) };
}

function assertExactSitemapSet(actualPaths, expectedPaths) {
  assert(new Set(actualPaths).size === actualPaths.length, "Sitemap contains duplicate canonical paths");
  const actual = new Set(actualPaths);
  const expected = new Set(expectedPaths);
  assert(actual.size === expected.size, `Expected ${expected.size} authoritative sitemap URLs, found ${actual.size}`);
  for (const path of expected) assert(actual.has(path), `Sitemap is missing authoritative route: ${path}`);
  for (const path of actual) assert(expected.has(path), `Sitemap contains non-authoritative route: ${path}`);
}

function routeMap(products) {
  const routes = new Map();
  const upsert = (path, data) => {
    const existing = routes.get(path);
    if (existing) return existing;
    const created = { ...data, productCount: 0, children: new Set(), products: new Set() };
    routes.set(path, created);
    return created;
  };
  for (const product of products) {
    const rootPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${rootPath}/${product.audience_slug}`;
    const collectionPath = `${audiencePath}/${product.product_type_slug}`;
    const root = upsert(rootPath, { kind: "root", rootName: product.main_category_name });
    const audience = upsert(audiencePath, { kind: "audience", rootName: product.main_category_name, audienceName: product.audience_name });
    const collection = upsert(collectionPath, { kind: "collection", rootName: product.main_category_name, audienceName: product.audience_name, collectionName: product.product_type_name });
    for (const node of [root, audience, collection]) {
      node.productCount += 1;
      node.products.add(product.canonical_path);
    }
    root.children.add(audiencePath);
    audience.children.add(collectionPath);
    collection.children.add(product.canonical_path);
  }
  return routes;
}

function hrefsWithin(source) {
  return new Set([...source.matchAll(/<a\s+[^>]*href="([^"]+)"/gi)].map((match) => match[1].replace(/&amp;/g, "&")));
}

function childSection(html) {
  return html.match(/<section data-irha-taxonomy-children="true"[\s\S]*?<\/section>/i)?.[0] ?? "";
}

function schemas(html) {
  return [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)].map((match) => JSON.parse(match[1]));
}

function schemaNodes(value, output = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => schemaNodes(item, output));
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (value["@type"] || value["@id"]) output.push(value);
  for (const child of Object.values(value)) if (child && typeof child === "object") schemaNodes(child, output);
  return output;
}

async function exists(path) {
  try { await access(path); return true; } catch { return false; }
}

async function readRoute(pathname) {
  return readFile(pathname === "/" ? join(DIST, "index.html") : join(DIST, pathname.slice(1), "index.html"), "utf8");
}

function verifyBase(pathname, html) {
  const expectedCanonical = pathname === "/" ? `${SITE}/` : `${SITE}${pathname}`;
  assert(titleOf(html), `${pathname} is missing a title`);
  assert(h1Of(html), `${pathname} is missing an H1`);
  assert(canonicalOf(html) === expectedCanonical, `${pathname} canonical mismatch: ${canonicalOf(html)}`);
  const main = primaryMain(html);
  assert(main, `${pathname} is missing the primary static main`);
  assert(!main.includes(GENERIC_MARKER), `${pathname} retained the former generic shell marker`);
}

function verifyCore(pathname, html) {
  const content = CORE_ROUTE_CONTENT[pathname];
  assert(content, `Missing core content model for ${pathname}`);
  verifyBase(pathname, html);
  const main = primaryMain(html);
  assert(main.includes(CORE_SHELL), `${pathname} is missing the core route-content marker`);
  assert(titleOf(html) === content.title, `${pathname} title differs from the approved route content`);
  assert(h1Of(html) === content.h1, `${pathname} H1 differs from the approved route content`);
  assert(stripHtml(main).includes(content.intro), `${pathname} primary introduction differs from the approved route content`);
  assert(main.includes('aria-label="Breadcrumb"'), `${pathname} is missing visible breadcrumbs`);
  assert(main.includes(content.primaryCta.href.replace(/&/g, "&amp;")) || main.includes(content.primaryCta.href), `${pathname} is missing its primary CTA`);
  const nodes = schemas(html).flatMap((schema) => schemaNodes(schema));
  assert(nodes.some((node) => node["@type"] === content.pageType && node.url === `${SITE}${pathname}`), `${pathname} is missing matching ${content.pageType} schema`);
  assert(nodes.some((node) => node["@type"] === "BreadcrumbList"), `${pathname} is missing BreadcrumbList schema`);
  for (const fingerprint of UNIVERSAL_FINGERPRINTS) assert(!main.includes(fingerprint), `${pathname} retained universal shell text: ${fingerprint}`);
  for (const legacy of LEGACY_INTERNAL_LINKS) assert(!main.includes(`href="${legacy}"`), `${pathname} links through legacy path ${legacy}`);
  const lower = main.toLowerCase();
  for (const claim of UNSUPPORTED_CLAIMS) assert(!lower.includes(claim), `${pathname} contains unsupported claim text: ${claim}`);
}

function verifyTaxonomy(pathname, html, node, productByPath) {
  verifyBase(pathname, html);
  const main = primaryMain(html);
  assert(main.includes(TAXONOMY_SHELL), `${pathname} is missing the taxonomy route-content marker`);
  assert(main.includes('data-irha-taxonomy-parity="true"'), `${pathname} is missing taxonomy parity marker`);
  assert(main.includes(`data-irha-product-count="${node.productCount}"`), `${pathname} product count mismatch`);
  assert(main.includes('aria-label="Breadcrumb"'), `${pathname} is missing visible breadcrumbs`);
  const section = childSection(main);
  assert(section, `${pathname} is missing its canonical child section`);
  const actual = hrefsWithin(section);
  assert(actual.size === node.children.size, `${pathname} child-link count mismatch: expected ${node.children.size}, found ${actual.size}`);
  for (const child of node.children) assert(actual.has(child), `${pathname} is missing authoritative child ${child}`);
  for (const child of actual) {
    assert(node.children.has(child), `${pathname} lists a child outside its authoritative assignment: ${child}`);
    if (node.kind === "collection") assert(productByPath.has(child), `${pathname} lists a non-product child: ${child}`);
  }
  const segments = pathname.split("/").filter(Boolean);
  assert(main.includes(`href="/products/${segments[1]}"`) || node.kind === "root", `${pathname} is missing its main-category breadcrumb link`);
  if (node.kind === "collection") assert(main.includes(`href="/products/${segments[1]}/${segments[2]}"`), `${pathname} is missing its audience hierarchy link`);
  const nodes = schemas(html).flatMap((schema) => schemaNodes(schema));
  assert(nodes.some((item) => item["@type"] === "CollectionPage" && item.url === `${SITE}${pathname}`), `${pathname} is missing matching CollectionPage schema`);
  assert(nodes.some((item) => item["@type"] === "BreadcrumbList"), `${pathname} is missing BreadcrumbList schema`);
  for (const fingerprint of UNIVERSAL_FINGERPRINTS) assert(!main.includes(fingerprint), `${pathname} retained universal shell text: ${fingerprint}`);
  for (const legacy of LEGACY_INTERNAL_LINKS) assert(!main.includes(`href="${legacy}"`), `${pathname} links through legacy path ${legacy}`);
  const lower = main.toLowerCase();
  for (const claim of UNSUPPORTED_CLAIMS) assert(!lower.includes(claim), `${pathname} contains unsupported claim text: ${claim}`);
}

function verifyProduct(pathname, html, product) {
  verifyBase(pathname, html);
  const main = primaryMain(html);
  assert(main.includes(PRODUCT_SHELL), `${pathname} is missing the product shell marker`);
  assert(!/Loading product/i.test(main), `${pathname} exposes loading-only primary product content`);
  assert(h1Of(html) === (product.seo_h1 || product.product_name), `${pathname} product H1 mismatch`);
  assert(main.includes(escapeHtml(product.product_name)), `${pathname} is missing the exact product name`);
  assert(main.includes(product.image_url), `${pathname} is missing the primary product image`);
  assert(main.includes(`/products/${product.main_category_slug}/${product.audience_slug}/${product.product_type_slug}`), `${pathname} is missing the product-type relationship`);
  const nodes = schemas(html).flatMap((schema) => schemaNodes(schema));
  assert(nodes.some((node) => node["@type"] === "Product" && node.name === product.product_name), `${pathname} is missing matching Product schema`);
  assert(nodes.some((node) => node["@type"] === "BreadcrumbList"), `${pathname} is missing BreadcrumbList schema`);
}

function normalizeJsxText(value) {
  return value.replace(/\{\/\*[\s\S]*?\*\/\}/g, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").replace(/\s+([.,!?;:])/g, "$1").trim();
}

function reactH1Of(source) {
  return normalizeJsxText(source.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
}

function verifyAboutReactParity(source, content) {
  assert(/import\s*\{\s*PUBLIC_IDENTITY\s*\}\s*from\s*["']@\/lib\/publicIdentity\.mjs["'];?/.test(source), "/about React source must import PUBLIC_IDENTITY from the canonical identity source");
  const accountabilityItems = [...source.matchAll(/<AccountabilityItem\b[\s\S]*?\/>/g)].map((match) => match[0]);
  const responsiblePersonBlock = accountabilityItems.find((item) => item.includes('label="Responsible person"')) ?? "";
  assert(responsiblePersonBlock, "/about React source is missing the visible responsible-person block");
  assert(responsiblePersonBlock.includes("value={PUBLIC_IDENTITY.responsiblePerson.name}"), "/about responsible-person block must visibly render PUBLIC_IDENTITY.responsiblePerson.name");
  assert(responsiblePersonBlock.includes("PUBLIC_IDENTITY.responsiblePerson.title"), "/about responsible-person block must visibly render PUBLIC_IDENTITY.responsiblePerson.title");
  assert(responsiblePersonBlock.includes("PUBLIC_IDENTITY.name"), "/about responsible-person block must retain the canonical organization context");
  assert(reactH1Of(source) === content.h1, `/about React H1 differs from the approved static H1: ${reactH1Of(source)}`);
  assert(!source.includes(PUBLIC_IDENTITY.responsiblePerson.name), "/about must not duplicate the responsible-person name outside publicIdentity.mjs");
  assert(!source.includes(PUBLIC_IDENTITY.responsiblePerson.title), "/about must not duplicate the responsible-person title outside publicIdentity.mjs");
}

async function verifyStaticIdentitySource() {
  const sourcePath = join(SOURCE_ROOT, "src/lib/routeContent.mjs");
  const source = await readFile(sourcePath, "utf8");
  assert(/import\s*\{\s*PUBLIC_IDENTITY\s*\}\s*from\s*["']\.\/publicIdentity\.mjs["'];?/.test(source), "routeContent.mjs must import PUBLIC_IDENTITY from publicIdentity.mjs");
  const aboutDefinition = source.match(/"\/about":\s*route\(\{([\s\S]*?)\n\s*\}\),\n\s*"\/contact":/)?.[1] ?? "";
  assert(aboutDefinition, "routeContent.mjs is missing the controlled /about definition");
  assert(aboutDefinition.includes("PUBLIC_IDENTITY.responsiblePerson.display"), "Static /about content must derive the responsible-person identity from PUBLIC_IDENTITY");
}

function verifyAboutStaticParity(html) {
  const content = CORE_ROUTE_CONTENT["/about"];
  const main = primaryMain(html);
  const accountability = content.sections.find((section) => section.heading === "Public accountability");
  assert(accountability, "/about route content is missing the approved accountability section");
  assert(h1Of(html) === content.h1, "/about static H1 differs from the approved route-content H1");
  assert(main.includes(escapeHtml(accountability.heading)), "/about static output is missing the public-accountability heading");
  assert(main.includes(escapeHtml(accountability.body)), "/about static output is missing the approved accountable-person context");
  for (const token of [
    PUBLIC_IDENTITY.responsiblePerson.name,
    PUBLIC_IDENTITY.responsiblePerson.title,
    PUBLIC_IDENTITY.address.display,
    PUBLIC_IDENTITY.email,
    PUBLIC_IDENTITY.telephone,
  ]) assert(main.includes(escapeHtml(token)), `/about is missing approved identity value: ${token}`);
}

async function verifyReactParity() {
  let checked = 0;
  await verifyStaticIdentitySource();
  for (const pathname of CORE_ROUTE_PATHS) {
    const content = CORE_ROUTE_CONTENT[pathname];
    const sourcePath = join(SOURCE_ROOT, content.sourceFile);
    if (!await exists(sourcePath)) continue;
    const source = await readFile(sourcePath, "utf8");
    if (pathname === "/about") {
      const importedIdentityValues = new Set([PUBLIC_IDENTITY.responsiblePerson.name, PUBLIC_IDENTITY.responsiblePerson.title]);
      for (const token of content.parityTokens) if (!importedIdentityValues.has(token)) assert(source.includes(token), `${pathname} React source no longer contains parity token: ${token}`);
      verifyAboutReactParity(source, content);
    } else {
      for (const token of content.parityTokens) assert(source.includes(token), `${pathname} React source no longer contains parity token: ${token}`);
    }
    checked += 1;
  }
  if (await exists(join(SOURCE_ROOT, "src/pages/CategoryTaxonomyPage.tsx"))) {
    const source = await readFile(join(SOURCE_ROOT, "src/pages/CategoryTaxonomyPage.tsx"), "utf8");
    for (const token of ["localizedTaxonomySeo", "taxonomyUi", "breadcrumbItems", "usePublishedCategoryTaxonomy"]) assert(source.includes(token), `CategoryTaxonomyPage lost shared taxonomy parity source: ${token}`);
    checked += 1;
  }
  return checked;
}

export async function verifyRouteContentFidelity() {
  const [sitemap, seoManifestText, catalogManifestText] = await Promise.all([
    readFile(join(DIST, "sitemap.xml"), "utf8"),
    readFile(join(DIST, "seo-route-manifest.json"), "utf8"),
    readFile(join(DIST, "catalog-route-manifest.json"), "utf8"),
  ]);
  const paths = sitemapPaths(sitemap);
  const seoManifest = JSON.parse(seoManifestText);
  const { paths: expectedPaths, routeByPath } = authoritativeSitemapPaths(seoManifest);
  assertExactSitemapSet(paths, expectedPaths);

  const manifest = JSON.parse(catalogManifestText);
  assert(manifest.schemaVersion === 1 && manifest.productCount === EXPECTED_PRODUCTS && manifest.products.length === EXPECTED_PRODUCTS, "Expected the complete 254-product manifest");
  const productByPath = new Map(manifest.products.map((product) => [product.canonical_path, product]));
  const taxonomy = routeMap(manifest.products);
  assert(taxonomy.size === EXPECTED_TAXONOMY, `Expected ${EXPECTED_TAXONOMY} taxonomy routes, found ${taxonomy.size}`);
  assert(CORE_ROUTE_PATHS.length === 14, `Expected 14 controlled core routes, found ${CORE_ROUTE_PATHS.length}`);

  const localizedArticles = seoManifest.routes.filter((route) => route.routeType === "resource-article" && route.locale !== "en" && route.indexable);
  assert(localizedArticles.length === 0, `Untranslated localized resource articles are indexable: ${localizedArticles.map((route) => route.path).join(", ")}`);

  const owned = { homepage: 0, core: 0, taxonomy: 0, product: 0, specialized: 0 };
  const coreBodies = new Map();
  for (const pathname of paths) {
    const html = await readRoute(pathname);
    if (pathname === "/") {
      verifyBase(pathname, html);
      owned.homepage += 1;
      continue;
    }
    if (CORE_ROUTE_CONTENT[pathname]) {
      verifyCore(pathname, html);
      coreBodies.set(pathname, stripHtml(primaryMain(html)));
      owned.core += 1;
      continue;
    }
    if (taxonomy.has(pathname)) {
      verifyTaxonomy(pathname, html, taxonomy.get(pathname), productByPath);
      owned.taxonomy += 1;
      continue;
    }
    if (productByPath.has(pathname)) {
      verifyProduct(pathname, html, productByPath.get(pathname));
      owned.product += 1;
      continue;
    }
    verifyBase(pathname, html);
    const main = primaryMain(html);
    const route = routeByPath.get(pathname);
    assert(route, `Canonical route is missing from authoritative ownership manifest: ${pathname}`);
    assert(SPECIALIZED_ROUTE_TYPES.has(route.routeType), `Canonical route has no accepted content owner: ${pathname} (${route.routeType})`);
    assert(!main.includes(CORE_SHELL) && !main.includes(TAXONOMY_SHELL) && !main.includes(PRODUCT_SHELL), `${pathname} has conflicting route ownership markers`);
    owned.specialized += 1;
  }

  assert(owned.homepage === 1, `Expected one homepage, found ${owned.homepage}`);
  assert(owned.core === 14, `Expected 14 core routes, found ${owned.core}`);
  assert(owned.taxonomy === EXPECTED_TAXONOMY, `Expected ${EXPECTED_TAXONOMY} taxonomy routes, found ${owned.taxonomy}`);
  assert(owned.product === EXPECTED_PRODUCTS, `Expected ${EXPECTED_PRODUCTS} product routes, found ${owned.product}`);
  assert(Object.values(owned).reduce((sum, value) => sum + value, 0) === paths.length, "Not every authoritative sitemap URL has an explicit content owner");

  const bodyValues = [...coreBodies.values()];
  assert(new Set(bodyValues).size === bodyValues.length, "Two core routes expose identical primary static content");
  const productsHtml = await readRoute("/products");
  for (const category of MAIN_CATEGORY_LINKS) assert(productsHtml.includes(`href="${category.href}"`), `/products is missing direct canonical category link ${category.href}`);
  const mainCategoryBodies = [];
  for (const category of MAIN_CATEGORY_LINKS) {
    const categoryHtml = await readRoute(category.href);
    const body = stripHtml(primaryMain(categoryHtml));
    assert(body.includes(category.label), `${category.href} does not identify its main product group`);
    mainCategoryBodies.push(body);
  }
  assert(new Set(mainCategoryBodies).size === MAIN_CATEGORY_LINKS.length, "Two main-category routes expose identical primary static content");

  verifyAboutStaticParity(await readRoute("/about"));
  const manufacturing = stripHtml(primaryMain(await readRoute("/manufacturing")));
  for (const token of ["Requirement review", "sample discussion", "Material and construction alignment", "Quality review", "Packing and dispatch planning"]) assert(manufacturing.includes(token), `/manufacturing is missing process content: ${token}`);
  const buyerTrust = stripHtml(primaryMain(await readRoute("/buyer-trust")));
  for (const token of ["Published public contact identity", "Requirement-led quotation review", "Sample and specification discussion", "factory video-call request", "Written product, branding and packaging review"]) assert(buyerTrust.includes(token), `/buyer-trust is missing verification content: ${token}`);
  const factory = stripHtml(primaryMain(await readRoute("/factory-video-call"))).toLowerCase();
  assert(factory.includes("not an automatic booking") && factory.includes("confirming availability"), "Factory Video Call does not state request and confirmation requirements");
  const inquiry = stripHtml(primaryMain(await readRoute("/inquiry")));
  for (const token of ["Quotation request", "Sample request", "Catalogue request", "tech-pack upload", "Meeting or factory-call request"]) assert(inquiry.includes(token), `/inquiry is missing intent: ${token}`);
  const privacy = stripHtml(primaryMain(await readRoute("/privacy-policy"))).toLowerCase();
  assert(privacy.includes("analytics") && privacy.includes("uploaded") && privacy.includes("inquiry drafts"), "Privacy Policy is missing privacy-specific primary content");

  const paritySourcesChecked = await verifyReactParity();
  console.log(`PASS route-content fidelity: ${paths.length} authoritative sitemap URLs; ${owned.core} core, ${owned.taxonomy} taxonomy, ${owned.product} product and ${owned.specialized} specialized routes; ${paritySourcesChecked} React parity sources checked`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  verifyRouteContentFidelity().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
