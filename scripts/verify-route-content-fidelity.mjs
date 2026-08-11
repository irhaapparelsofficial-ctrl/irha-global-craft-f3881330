import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { CORE_ROUTE_CONTENT, CORE_ROUTE_PATHS } from "../src/lib/routeContent.mjs";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";
import { SCCI_BUSINESS_REFERENCE } from "../src/lib/publicBusinessEvidence.mjs";
import { SITE_URL } from "../src/lib/seoSchema.js";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const DIST = join(ROOT, "dist");
const SOURCE_ROOT = ROOT;
const REPORT_DIR = join(DIST, "reports");
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const CORE_SHELL = 'data-irha-route-content="core"';
const TAXONOMY_SHELL = 'data-irha-taxonomy-content="published"';
const PRODUCT_SHELL = 'data-irha-product-content="canonical"';
const SPECIALIZED_ROUTE_TYPES = new Set([
  "home",
  "market",
  "buyer-intent",
  "localized-buyer-intent",
  "localized-taxonomy",
  "resource-article",
  "resource-hub",
  "blog",
  "blog-post",
  "utility",
  "legal",
]);

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizeWhitespace(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function stripHtml(value) {
  return normalizeWhitespace(String(value ?? "").replace(/<[^>]+>/g, " "));
}

function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  const normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return normalized.replace(/\/+$/, "") || "/";
}

const assert = (condition, message) => { if (!condition) throw new Error(message); };

function canonicalFromHtml(html) {
  const match = html.match(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i)
    ?? html.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i);
  return match?.[1] ?? null;
}

function robotsFromHtml(html) {
  const match = html.match(/<meta[^>]+name=["']robots["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']robots["']/i);
  return match?.[1] ?? "";
}

function titleFromHtml(html) {
  return stripHtml(html.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? "");
}

function descriptionFromHtml(html) {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["']/i);
  return normalizeWhitespace(match?.[1] ?? "");
}

function primaryMain(html) {
  const matches = [...html.matchAll(/<main\b[^>]*>([\s\S]*?)<\/main>/gi)];
  assert(matches.length === 1, `Expected exactly one <main>, found ${matches.length}`);
  return matches[0][1];
}

function h1Count(html) {
  return (html.match(/<h1\b/gi) || []).length;
}

function extractMainH1(html) {
  return stripHtml(primaryMain(html).match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ?? "");
}

function linkHrefs(html) {
  return [...html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
}

function sitemapPaths(xml) {
  const values = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)]
    .map((match) => match[1])
    .filter((value) => value.startsWith(SITE_URL))
    .map((value) => normalizePath(new URL(value).pathname));
  return [...new Set(values)];
}

function routeMap(products) {
  const map = new Map();
  for (const product of products) {
    for (const path of product.taxonomy_paths ?? []) {
      const normalized = normalizePath(path);
      if (!map.has(normalized)) map.set(normalized, []);
      map.get(normalized).push(product);
    }
  }
  return map;
}

function parseJsonLd(html) {
  const values = [];
  for (const match of html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      values.push(JSON.parse(match[1]));
    } catch {
      // Other CI checks own malformed JSON-LD detection; this verifier only
      // consumes valid blocks when present.
    }
  }
  return values;
}

function flattenSchema(value, output = []) {
  if (Array.isArray(value)) {
    for (const item of value) flattenSchema(item, output);
    return output;
  }
  if (!value || typeof value !== "object") return output;
  if (Array.isArray(value["@graph"])) flattenSchema(value["@graph"], output);
  output.push(value);
  return output;
}

function schemaTypes(node) {
  const type = node?.["@type"];
  if (Array.isArray(type)) return type;
  return type ? [type] : [];
}

function expectedBreadcrumbNames(pathname) {
  const content = CORE_ROUTE_CONTENT[pathname];
  if (!content) return [];
  return content.breadcrumbs.map((item) => item.label);
}

function verifyBreadcrumb(pathname, html) {
  const nodes = parseJsonLd(html).flatMap((value) => flattenSchema(value, []));
  const list = nodes.find((node) => schemaTypes(node).includes("BreadcrumbList"));
  assert(list, `${pathname} is missing BreadcrumbList schema`);
  const names = (list.itemListElement ?? []).map((item) => item?.item?.name ?? item?.name).filter(Boolean);
  const expectedNames = expectedBreadcrumbNames(pathname);
  for (const name of expectedNames) assert(names.includes(name), `${pathname} BreadcrumbList is missing ${name}`);
}

function verifyBase(pathname, html, expectedCanonical) {
  const canonical = canonicalFromHtml(html);
  assert(canonical === expectedCanonical, `${pathname} canonical mismatch: ${canonical} !== ${expectedCanonical}`);
  const robots = robotsFromHtml(html).toLowerCase();
  assert(!robots.includes("noindex"), `${pathname} is unexpectedly noindex`);
  assert(h1Count(primaryMain(html)) === 1, `${pathname} primary main must contain exactly one H1`);
}

function verifyCore(pathname, html, expectedCanonical) {
  const content = CORE_ROUTE_CONTENT[pathname];
  assert(content, `${pathname} has no approved core route content`);
  verifyBase(pathname, html, expectedCanonical);
  assert(html.includes(CORE_SHELL), `${pathname} is missing the controlled core-shell marker`);
  const h1 = extractMainH1(html);
  assert(normalizeWhitespace(h1).includes(normalizeWhitespace(content.h1)), `${pathname} H1 does not match approved content`);
  assert(titleFromHtml(html) === content.title, `${pathname} title does not match approved content`);
  assert(descriptionFromHtml(html) === normalizeWhitespace(content.metaDescription), `${pathname} description does not match approved content`);
  const main = primaryMain(html);
  for (const token of content.parityTokens) assert(stripHtml(main).includes(stripHtml(token)), `${pathname} shell no longer contains parity token: ${token}`);
  for (const section of content.sections) {
    assert(stripHtml(main).includes(stripHtml(section.heading)), `${pathname} is missing section heading: ${section.heading}`);
    assert(stripHtml(main).includes(stripHtml(section.body)), `${pathname} is missing section body: ${section.heading}`);
  }
  const links = linkHrefs(main);
  assert(links.includes(content.primaryCta.href), `${pathname} is missing primary CTA ${content.primaryCta.href}`);
  if (content.secondaryCta) assert(links.includes(content.secondaryCta.href), `${pathname} is missing secondary CTA ${content.secondaryCta.href}`);
  verifyBreadcrumb(pathname, html);
}

function verifyTaxonomy(pathname, html, expectedProducts, productByPath, expectedCanonical) {
  verifyBase(pathname, html, expectedCanonical);
  assert(html.includes(TAXONOMY_SHELL), `${pathname} is missing the authoritative taxonomy marker`);
  const main = primaryMain(html);
  const links = linkHrefs(main).map((href) => normalizePath(new URL(href, SITE_URL).pathname));
  const expectedPaths = new Set(expectedProducts.map((product) => normalizePath(product.canonical_path)));
  const linkedProducts = [...new Set(links.filter((href) => productByPath.has(href)))];
  assert(linkedProducts.length > 0, `${pathname} has no linked canonical products`);
  for (const href of linkedProducts) assert(expectedPaths.has(href), `${pathname} lists a child outside its authoritative assignment: ${href}`);
}

function verifyProduct(pathname, html, product, expectedCanonical) {
  verifyBase(pathname, html, expectedCanonical);
  assert(html.includes(PRODUCT_SHELL), `${pathname} is missing the canonical product marker`);
  const mainText = stripHtml(primaryMain(html));
  assert(mainText.includes(product.name), `${pathname} primary content is missing product name`);
  assert(!/loading product|loading catalogue|loading…/i.test(mainText), `${pathname} has loading-only primary product content`);
}

function authoritativeSitemapPaths(seoManifest) {
  assert(Array.isArray(seoManifest.routes), "SEO route manifest is missing routes");
  const routeByPath = new Map();
  for (const route of seoManifest.routes) {
    const pathname = normalizePath(route.path);
    assert(!routeByPath.has(pathname), `SEO route manifest has duplicate route ownership: ${pathname}`);
    routeByPath.set(pathname, route);
  }
  const paths = seoManifest.routes
    .filter((route) => route.indexable && route.sitemap)
    .map((route) => normalizePath(route.path));
  return { paths: [...new Set(paths)], routeByPath };
}

function assertExactSitemapSet(actualPaths, expectedPaths) {
  const actual = new Set(actualPaths);
  const expected = new Set(expectedPaths);
  for (const pathname of expected) assert(actual.has(pathname), `Sitemap is missing authoritative route: ${pathname}`);
  for (const pathname of actual) assert(expected.has(pathname), `Sitemap contains non-authoritative route: ${pathname}`);
  assert(actual.size === expected.size, `Sitemap size mismatch: ${actual.size} !== ${expected.size}`);
}

async function exists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

function routeFile(pathname) {
  if (pathname === "/") return join(DIST, "index.html");
  return join(DIST, pathname.slice(1), "index.html");
}

async function readRoute(pathname) {
  const path = routeFile(pathname);
  assert(await exists(path), `Canonical route shell does not exist: ${pathname}`);
  return readFile(path, "utf8");
}

async function verifyStaticIdentitySource() {
  const [aboutSource, trustSource] = await Promise.all([
    readFile(join(SOURCE_ROOT, "src/pages/About.tsx"), "utf8"),
    readFile(join(SOURCE_ROOT, "src/pages/BuyerTrust.tsx"), "utf8"),
  ]);
  assert(aboutSource.includes("PUBLIC_IDENTITY"), "/about must consume the shared public identity source");
  assert(trustSource.includes("SCCI_BUSINESS_REFERENCE"), "/buyer-trust must consume the shared public business evidence source");
}

function verifyAboutReactParity(source, content) {
  assert(source.includes("PUBLIC_IDENTITY.responsiblePerson.name"), "/about React output must source the responsible person from PUBLIC_IDENTITY");
  assert(source.includes("PUBLIC_IDENTITY.responsiblePerson.title"), "/about React output must source the responsible title from PUBLIC_IDENTITY");
  assert(source.includes("PUBLIC_IDENTITY.address.display"), "/about React output must source address from PUBLIC_IDENTITY");
  assert(source.includes("PUBLIC_IDENTITY.email"), "/about React output must source email from PUBLIC_IDENTITY");
  assert(source.includes("PUBLIC_IDENTITY.telephone"), "/about React output must source telephone from PUBLIC_IDENTITY");
  assert(content.parityTokens.includes("Daim Ali"), "/about approved content lost Daim Ali parity token");
}

function verifyBuyerTrustReactParity(source, content) {
  assert(source.includes("SCCI_BUSINESS_REFERENCE.membershipNumber"), "/buyer-trust React output must source the public SCCI identifier");
  assert(source.includes("SCCI_BUSINESS_REFERENCE.officialDirectoryUrl"), "/buyer-trust React output must source the official SCCI directory URL");
  assert(content.parityTokens.includes(SCCI_BUSINESS_REFERENCE.membershipNumber), "/buyer-trust approved content lost SCCI identifier parity token");
}

function verifyAboutStaticParity(html) {
  const main = primaryMain(html);
  for (const token of [
    PUBLIC_IDENTITY.responsiblePerson.name,
    PUBLIC_IDENTITY.responsiblePerson.title,
    PUBLIC_IDENTITY.address.display,
    PUBLIC_IDENTITY.email,
    PUBLIC_IDENTITY.telephone,
  ]) assert(main.includes(escapeHtml(token)), `/about is missing approved identity value: ${token}`);
}

function verifyBuyerTrustStaticParity(html) {
  const main = primaryMain(html);
  assert(main.includes(escapeHtml(SCCI_BUSINESS_REFERENCE.membershipNumber)), "/buyer-trust static output is missing the verified SCCI directory identifier");
  assert(main.includes("SCCI member-directory reference"), "/buyer-trust static output is missing the SCCI directory-reference label");
  assert(main.includes("business-identity evidence only"), "/buyer-trust static output is missing the SCCI scope qualification");
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
    } else if (pathname === "/buyer-trust") {
      const importedEvidenceValues = new Set([SCCI_BUSINESS_REFERENCE.membershipNumber]);
      for (const token of content.parityTokens) if (!importedEvidenceValues.has(token)) assert(source.includes(token), `${pathname} React source no longer contains parity token: ${token}`);
      verifyBuyerTrustReactParity(source, content);
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

  const catalogManifest = JSON.parse(catalogManifestText);
  assert(catalogManifest.schemaVersion === 1 && catalogManifest.productCount === EXPECTED_PRODUCTS && catalogManifest.products.length === EXPECTED_PRODUCTS, "Expected the complete 254-product manifest");
  const productByPath = new Map(catalogManifest.products.map((product) => [product.canonical_path, product]));
  const taxonomy = routeMap(catalogManifest.products);
  assert(taxonomy.size === EXPECTED_TAXONOMY, `Expected ${EXPECTED_TAXONOMY} taxonomy routes, found ${taxonomy.size}`);
  assert(CORE_ROUTE_PATHS.length === 15, `Expected 15 controlled core route definitions, found ${CORE_ROUTE_PATHS.length}`);
  const expectedIndexableCorePaths = CORE_ROUTE_PATHS.filter((path) => routeByPath.has(path));
  assert(expectedIndexableCorePaths.length > 0, "Authoritative manifest contains no indexable controlled core routes");

  const localizedArticles = seoManifest.routes.filter((route) => route.routeType === "resource-article" && route.locale !== "en" && route.indexable);
  assert(localizedArticles.length === 0, `Untranslated localized resource articles are indexable: ${localizedArticles.map((route) => route.path).join(", ")}`);

  const owned = { homepage: 0, core: 0, taxonomy: 0, product: 0, specialized: 0 };
  const coreBodies = new Map();
  for (const pathname of paths) {
    const route = routeByPath.get(pathname);
    assert(route, `Canonical route is missing from authoritative ownership manifest: ${pathname}`);
    const expectedCanonical = route.canonicalUrl;
    const html = await readRoute(pathname);
    if (pathname === "/") {
      verifyBase(pathname, html, expectedCanonical);
      owned.homepage += 1;
      continue;
    }
    if (CORE_ROUTE_CONTENT[pathname]) {
      verifyCore(pathname, html, expectedCanonical);
      coreBodies.set(pathname, stripHtml(primaryMain(html)));
      owned.core += 1;
      continue;
    }
    if (taxonomy.has(pathname)) {
      verifyTaxonomy(pathname, html, taxonomy.get(pathname), productByPath, expectedCanonical);
      owned.taxonomy += 1;
      continue;
    }
    if (productByPath.has(pathname)) {
      verifyProduct(pathname, html, productByPath.get(pathname), expectedCanonical);
      owned.product += 1;
      continue;
    }
    verifyBase(pathname, html, expectedCanonical);
    const main = primaryMain(html);
    assert(SPECIALIZED_ROUTE_TYPES.has(route.routeType), `Canonical route has no accepted content owner: ${pathname} (${route.routeType})`);
    assert(!main.includes(CORE_SHELL) && !main.includes(TAXONOMY_SHELL) && !main.includes(PRODUCT_SHELL), `${pathname} has conflicting route ownership markers`);
    owned.specialized += 1;
  }

  assert(owned.homepage === 1, `Expected one homepage, found ${owned.homepage}`);
  assert(owned.core === expectedIndexableCorePaths.length, `Expected ${expectedIndexableCorePaths.length} indexable core routes, found ${owned.core}`);
  assert(owned.taxonomy === EXPECTED_TAXONOMY, `Expected ${EXPECTED_TAXONOMY} owned taxonomy routes, found ${owned.taxonomy}`);
  assert(owned.product === EXPECTED_PRODUCTS, `Expected ${EXPECTED_PRODUCTS} owned product routes, found ${owned.product}`);

  for (const [pathname, text] of coreBodies) {
    if (pathname === "/about") verifyAboutStaticParity(await readRoute(pathname));
    if (pathname === "/buyer-trust") verifyBuyerTrustStaticParity(await readRoute(pathname));
    assert(text.length > 180, `${pathname} primary content is too thin for a controlled route shell`);
  }

  const reactParity = await verifyReactParity();
  await mkdir(REPORT_DIR, { recursive: true });
  await writeFile(join(REPORT_DIR, "route-content-fidelity.json"), `${JSON.stringify({
    generatedAt: new Date().toISOString(),
    authoritativeSitemapRoutes: expectedPaths.length,
    ...owned,
    controlledCoreDefinitions: CORE_ROUTE_PATHS.length,
    reactParitySources: reactParity,
    taxonomyRoutes: taxonomy.size,
    products: productByPath.size,
  }, null, 2)}\n`);

  console.log(`Route-content fidelity passed: sitemap=${expectedPaths.length}, core=${owned.core}/${CORE_ROUTE_PATHS.length}, taxonomy=${owned.taxonomy}, product=${owned.product}, specialized=${owned.specialized}, react=${reactParity}`);
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  verifyRouteContentFidelity().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
