import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";
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
type RouteNames = { rootName: string; audienceName?: string; collectionName?: string };

function escapeHtml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function taxonomyRoutes(products: BuyerReadyCatalogRoute[]) {
  const routes = new Map<string, RouteNames>();
  for (const product of products) {
    const root = `/products/${product.main_category_slug}`;
    const audience = `${root}/${product.audience_slug}`;
    const collection = `${audience}/${product.product_type_slug}`;
    routes.set(root, { rootName: product.main_category_name });
    routes.set(audience, { rootName: product.main_category_name, audienceName: product.audience_name });
    routes.set(collection, { rootName: product.main_category_name, audienceName: product.audience_name, collectionName: product.product_type_name });
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

async function verifyProduct(product: BuyerReadyCatalogRoute) {
  const file = join(DIST, product.canonical_path.slice(1), "index.html");
  const html = await readFile(file, "utf8");
  const required = [
    `<title>${escapeHtml(product.seo_title || "")}</title>`,
    `<link rel="canonical" href="${SITE}${product.canonical_path}"`,
    'data-irha-product-shell="true"',
    `>${escapeHtml(product.product_name)}</h1>`,
    product.image_url,
    `alt="Front view of ${escapeHtml(product.product_name)} custom manufactured by Irha Apparels"`,
    'aria-label="Breadcrumb"',
    '"@type":"Product"',
    '"@type":"BreadcrumbList"',
  ];
  for (const token of required) {
    if (!html.includes(token)) throw new Error(`${product.reference_code} final product shell missing: ${token}`);
  }
  if (html.includes('data-irha-rich-route-shell="true"')) {
    throw new Error(`${product.reference_code} product shell was overwritten by generic enrichment`);
  }
}

async function verifyTaxonomy(pathname: string, names: RouteNames) {
  const file = join(DIST, pathname.slice(1), "index.html");
  const html = await readFile(file, "utf8");
  const seo = taxonomySeo(pathname, names);
  const required = [
    `<title>${escapeHtml(seo.title)}</title>`,
    `>${escapeHtml(seo.h1)}</h1>`,
    `<link rel="canonical" href="${SITE}${pathname}"`,
    'data-irha-rich-route-shell="true" data-irha-taxonomy-parity="true"',
    'aria-label="Breadcrumb"',
    '"@type":"CollectionPage"',
    '"@type":"BreadcrumbList"',
  ];
  for (const token of required) {
    if (!html.includes(token)) throw new Error(`Final taxonomy shell ${pathname} missing: ${token}`);
  }
  if (html.includes('data-irha-product-shell="true"')) throw new Error(`Taxonomy shell became a product shell: ${pathname}`);
}

function parseRedirects(source: string) {
  const rows: Array<{ from: string; to: string; status: string }> = [];
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [from, to, status] = line.split(/\s+/);
    if (from?.startsWith("/") && to?.startsWith("/") && status === "301") rows.push({ from, to, status });
  }
  return rows;
}

async function main() {
  const manifest = JSON.parse(await readFile(join(DIST, "catalog-route-manifest.json"), "utf8")) as Manifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== EXPECTED_PRODUCTS || manifest.products.length !== EXPECTED_PRODUCTS) {
    throw new Error("Final route parity verification requires the complete 254-product manifest");
  }
  const taxonomy = taxonomyRoutes(manifest.products);
  if (taxonomy.size !== EXPECTED_TAXONOMY) throw new Error(`Expected ${EXPECTED_TAXONOMY} taxonomy shells; received ${taxonomy.size}`);

  await Promise.all(manifest.products.map(verifyProduct));
  await Promise.all([...taxonomy].map(([path, names]) => verifyTaxonomy(path, names)));

  const validTargets = new Set<string>(["/", "/products", ...manifest.products.map((product) => product.canonical_path), ...taxonomy.keys()]);
  const sitemap = await readFile(join(DIST, "sitemap.xml"), "utf8");
  for (const match of sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)) validTargets.add(new URL(match[1].replace(/&amp;/g, "&")).pathname.replace(/\/$/, "") || "/");

  const redirectsSource = await readFile(join(DIST, "_redirects"), "utf8");
  const redirects = parseRedirects(redirectsSource);
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

  console.log(`Verified final route artifacts: ${manifest.products.length} products, ${taxonomy.size} taxonomy pages and ${redirects.length} one-hop canonical redirects`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
