import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { readExplicitTaxonomyRoutes } from "./generate-taxonomy-release-assets";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const SITE = "https://irhaapparels.com";
const sitemapPath = resolve("dist/sitemap.xml");
const manifestPath = resolve("dist/catalog-route-manifest.json");

type ManifestPayload = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function redirectShell(targetPath: string) {
  const canonical = `${SITE}${targetPath}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex,follow" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <title>Redirecting to Irha Apparels</title>
</head>
<body>
  <p>This URL has moved. <a href="${escapeHtml(canonical)}">Open the current Irha Apparels page</a>.</p>
</body>
</html>`;
}

function writeShell(routePath: string, html: string) {
  const target = resolve("dist", routePath.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, "utf8");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as ManifestPayload;
if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
  throw new Error("Buyer-ready catalogue manifest is incomplete");
}
const manifestBySlug = new Map(manifest.products.map((product) => [product.product_slug, product]));
let sitemap = readFileSync(sitemapPath, "utf8");
const { products } = readExplicitTaxonomyRoutes();
let legacyShellCount = 0;
let resolvedProducts = 0;
let retiredProducts = 0;

for (const route of products) {
  const current = manifestBySlug.get(route.productSlug);
  const targetPath = current?.canonical_path ?? `/products/${route.categorySlug}`;

  if (current) {
    resolvedProducts += 1;
    const canonicalFile = resolve("dist", current.canonical_path.slice(1), "index.html");
    const canonicalShell = readFileSync(canonicalFile, "utf8");
    const expectedCanonical = `<link rel="canonical" href="${SITE}${current.canonical_path}"`;
    if (!canonicalShell.includes(expectedCanonical) || !canonicalShell.includes('data-irha-product-shell="true"')) {
      throw new Error(`Buyer-ready canonical shell is missing or was overwritten: ${current.canonical_path}`);
    }
  } else {
    retiredProducts += 1;
  }

  const legacyPaths = new Set([
    route.legacyPath,
    route.sourceLegacyPath,
    route.deprecatedCanonicalPath,
    route.canonicalPath,
  ]);
  legacyPaths.delete(targetPath);
  for (const legacyPath of legacyPaths) {
    writeShell(legacyPath, redirectShell(targetPath));
    legacyShellCount += 1;
    const absoluteLegacy = `${SITE}${legacyPath}`;
    sitemap = sitemap.replace(
      new RegExp(`\\s*<url>\\s*<loc>${escapeRegExp(absoluteLegacy)}<\\/loc>[\\s\\S]*?<\\/url>`, "g"),
      "",
    );
  }
}

if (/reference-style-0[23]/i.test(sitemap)) {
  throw new Error("Reference-style legacy URL leaked into the final sitemap");
}
writeFileSync(sitemapPath, sitemap, "utf8");
console.log(
  `Resolved ${resolvedProducts} historical products, retired ${retiredProducts}, and generated ${legacyShellCount} noindex redirect shells`,
);
