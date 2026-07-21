import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const SITE = "https://irhaapparels.com";
const sitemapPath = resolve("dist/sitemap.xml");
const manifestPath = resolve("dist/catalog-route-manifest.json");

type ManifestPayload = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestPayload;
if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
  throw new Error("Buyer-ready catalogue manifest is incomplete");
}

const canonicalPaths = new Set<string>();
for (const product of manifest.products) {
  if (canonicalPaths.has(product.canonical_path)) {
    throw new Error(`Duplicate buyer-ready canonical path: ${product.canonical_path}`);
  }
  canonicalPaths.add(product.canonical_path);

  const canonicalFile = resolve("dist", product.canonical_path.slice(1), "index.html");
  const html = readFileSync(canonicalFile, "utf8");
  const expectedCanonical = `<link rel="canonical" href="${SITE}${product.canonical_path}"`;
  const required = [
    expectedCanonical,
    'data-irha-product-shell="true"',
    product.product_name,
    product.image_url,
    '"@type":"Product"',
    '"@type":"BreadcrumbList"',
  ];
  for (const token of required) {
    if (!html.includes(token)) {
      throw new Error(`Canonical product shell is incomplete (${token}): ${product.canonical_path}`);
    }
  }
}

let sitemap = readFileSync(sitemapPath, "utf8");
sitemap = sitemap.replace(
  /\s*<!-- taxonomy-legacy-shell-verification-only -->\s*<url>[\s\S]*?<\/url>/g,
  "",
);

if (/reference-style-0[23]/i.test(sitemap)) {
  throw new Error("Reference-style legacy URL leaked into the final sitemap");
}
if (/\/products\/(?:bavarian|leatherwear|streetwear|leisurewear|nightwear|sportswear-gym)\//i.test(sitemap)) {
  throw new Error("Deprecated flat catalogue URL leaked into the final sitemap");
}

for (const product of manifest.products) {
  const absolute = `${SITE}${product.canonical_path}`;
  const count = sitemap.split(`<loc>${absolute}</loc>`).length - 1;
  if (count !== 1) {
    throw new Error(`Canonical product sitemap entry count is ${count}: ${product.canonical_path}`);
  }
}

writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`Verified 254 canonical product shells, Product/Breadcrumb schema and clean sitemap output`);
