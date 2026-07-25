import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
import { verifyRouteContentFidelity } from "./verify-route-content-fidelity.mjs";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
} from "../src/lib/taxonomyI18n";

const DIST = resolve("dist");
const SITE = "https://irhaapparels.com";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;

type Manifest = { schemaVersion: number; productCount: number; products: BuyerReadyCatalogRoute[] };
type RouteNames = {
  rootName: string;
  audienceName?: string;
  collectionName?: string;
  productCount: number;
  children: Set<string>;
};

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function upsert(routes: Map<string, RouteNames>, path: string, names: Omit<RouteNames, "productCount" | "children">) {
  const existing = routes.get(path);
  if (existing) return existing;
  const created: RouteNames = { ...names, productCount: 0, children: new Set<string>() };
  routes.set(path, created);
  return created;
}

function taxonomyRoutes(products: BuyerReadyCatalogRoute[]) {
  const routes = new Map<string, RouteNames>();
  for (const product of products) {
    const rootPath = `/products/${product.main_category_slug}`;
    const audiencePath = `${rootPath}/${product.audience_slug}`;
    const collectionPath = `${audiencePath}/${product.product_type_slug}`;
    const root = upsert(routes, rootPath, { rootName: product.main_category_name });
    const audience = upsert(routes, audiencePath, { rootName: product.main_category_name, audienceName: product.audience_name });
    const collection = upsert(routes, collectionPath, { rootName: product.main_category_name, audienceName: product.audience_name, collectionName: product.product_type_name });
    root.productCount += 1;
    audience.productCount += 1;
    collection.productCount += 1;
    root.children.add(audiencePath);
    audience.children.add(collectionPath);
    collection.children.add(product.canonical_path);
  }
  return routes;
}

function taxonomySeo(pathname: string, names: RouteNames) {
  const segments = pathname.split("/").filter(Boolean);
  return localizedTaxonomySeo({
    locale: "en",
    topName: localizedTopName("en", segments[1], names.rootName),
    audienceName: segments[2] && names.audienceName ? localizedAudienceName("en", segments[2], names.audienceName) : undefined,
    collectionName: segments[3] && names.collectionName ? localizedCollectionName("en", segments[3], names.collectionName) : undefined,
  });
}

function expectedRelatedTier(product: BuyerReadyCatalogRoute, products: BuyerReadyCatalogRoute[]) {
  const candidates = products.filter((item) => item.product_id !== product.product_id);
  const sameType = candidates.filter((item) => item.main_category_slug === product.main_category_slug
    && item.audience_slug === product.audience_slug
    && item.product_type_slug === product.product_type_slug);
  if (sameType.length) return sameType;
  const sameAudience = candidates.filter((item) => item.main_category_slug === product.main_category_slug
    && item.audience_slug === product.audience_slug);
  if (sameAudience.length) return sameAudience;
  return candidates.filter((item) => item.main_category_slug === product.main_category_slug);
}

async function verifyProduct(product: BuyerReadyCatalogRoute, products: BuyerReadyCatalogRoute[]) {
  const file = join(DIST, product.canonical_path.slice(1), "index.html");
  const html = await readFile(file, "utf8");
  const required = [
    `<title>${escapeHtml(product.seo_title || "")}</title>`,
    `<meta data-irha-fallback-seo="true" name="description" content="${escapeHtml(product.seo_description || "")}"`,
    `<link rel="canonical" href="${SITE}${product.canonical_path}"`,
    'data-irha-product-shell="true"',
    `>${escapeHtml(product.product_name)}</h1>`,
    product.image_url,
    `alt="Front view of ${escapeHtml(product.product_name)}"`,
    'aria-label="Breadcrumb"',
    '"@type":"Product"',
    '"@type":"BreadcrumbList"',
    'data-irha-related-products="true"',
  ];
  for (const token of required) if (!html.includes(token)) throw new Error(`${product.reference_code} final product shell missing: ${token}`);
  if (html.includes('data-irha-rich-route-shell="true"')) throw new Error(`${product.reference_code} product shell was overwritten by generic enrichment`);

  const expectedPool = new Set(expectedRelatedTier(product, products).map((item) => item.canonical_path));
  if (!expectedPool.size) throw new Error(`${product.reference_code} has no valid related-product fallback tier`);
  const relatedMatches = [...html.matchAll(/<a href="([^"]+)"/g)]
    .map((match) => match[1])
    .filter((path) => expectedPool.has(path));
  if (!relatedMatches.length) throw new Error(`${product.reference_code} final shell has no related canonical product from the expected fallback tier`);
}

async function verifyTaxonomy(pathname: string, names: RouteNames) {
  const file = join(DIST, pathname.slice(1), "index.html");
  const html = await readFile(file, "utf8");
  const seo = taxonomySeo(pathname, names);
  const required = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `<meta data-irha-fallback-seo="true" name="description" content="${escapeHtml(seo.description)}"`,
    `>${escapeHtml(seo.h1)}</h1>`,
    `<link rel="canonical" href="${SITE}${pathname}"`,
    'data-irha-route-content="taxonomy"',
    'data-irha-taxonomy-parity="true"',
    'data-irha-taxonomy-children="true"',
    `data-irha-product-count="${names.productCount}"`,
    'aria-label="Breadcrumb"',
    '"@type":"CollectionPage"',
    '"@type":"BreadcrumbList"',
  ];
  for (const token of required) if (!html.includes(token)) throw new Error(`Final taxonomy shell ${pathname} missing: ${token}`);
  for (const child of names.children) if (!html.includes(`href="${child}"`)) throw new Error(`Final taxonomy shell ${pathname} missing child: ${child}`);
  if (html.includes('data-irha-product-shell="true"')) throw new Error(`Taxonomy shell became a product shell: ${pathname}`);
  if (html.includes('data-irha-rich-route-shell="true"')) throw new Error(`Taxonomy shell retained the generic universal shell: ${pathname}`);
}

function parseRedirects(source: string) {
  const rows: Array<{ from: string; to: string }> = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [from, to, status] = line.split(/\s+/);
    if (from?.startsWith("/") && to?.startsWith("/") && status === "301") rows.push({ from, to });
  }
  return rows;
}

async function main() {
  await verifyRouteContentFidelity();

  const manifest = JSON.parse(await readFile(join(DIST, "catalog-route-manifest.json"), "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== EXPECTED_PRODUCTS || manifest.products.length !== EXPECTED_PRODUCTS) throw new Error("Final route parity verification requires the complete 254-product manifest");
  const taxonomy = taxonomyRoutes(manifest.products);
  if (taxonomy.size !== EXPECTED_TAXONOMY) throw new Error(`Expected ${EXPECTED_TAXONOMY} taxonomy shells; received ${taxonomy.size}`);
  for (const [path, names] of taxonomy) if (names.productCount < 1 || names.children.size < 1) throw new Error(`Empty final taxonomy route: ${path}`);

  await Promise.all(manifest.products.map((product) => verifyProduct(product, manifest.products)));
  await Promise.all([...taxonomy].map(([path, names]) => verifyTaxonomy(path, names)));

  const validTargets = new Set<string>(["/", "/products", ...manifest.products.map((product) => product.canonical_path), ...taxonomy.keys()]);
  const sitemap = await readFile(join(DIST, "sitemap.xml"), "utf8");
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) validTargets.add(new URL(match[1].replace(/&amp;/g, "&")).pathname.replace(/\/$/, "") || "/");

  const redirects = parseRedirects(await readFile(join(DIST, "_redirects"), "utf8"));
  const fromPaths = new Set<string>();
  for (const row of redirects) {
    const from = row.from.replace(/\/$/, "") || "/";
    const to = row.to.replace(/\/$/, "") || "/";
    if (fromPaths.has(from)) throw new Error(`Duplicate final redirect source: ${from}`);
    fromPaths.add(from);
    if (to.startsWith("/intl/")) throw new Error(`Unreviewed localized redirect target leaked: ${from} -> ${to}`);
    if (!validTargets.has(to)) throw new Error(`Final redirect target is not canonical: ${from} -> ${to}`);
    if (to === "/" && from.startsWith("/products/")) throw new Error(`Product alias redirects to homepage: ${from}`);
  }

  const worker = await readFile(join(DIST, "_worker.js"), "utf8");
  if (worker.includes("/products/leisure-nightwear/plush-bathrobe-sleep-robe")) throw new Error("Final worker contains the dead plush robe target");
  if (!worker.includes("/products/leisure-nightwear/women/robes/womens-plush-robe")) throw new Error("Final worker is missing the verified plush robe canonical");

  console.log(`Verified final route artifacts: ${manifest.products.length} products, ${taxonomy.size} non-empty taxonomy pages and ${redirects.length} one-hop canonical redirects`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
