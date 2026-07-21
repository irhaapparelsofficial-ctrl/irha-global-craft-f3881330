import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { readExplicitTaxonomyRoutes } from "./generate-taxonomy-release-assets";

const SITE = "https://irhaapparels.com";
const sitemapPath = resolve("dist/sitemap.xml");

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function redirectShell(canonicalPath: string) {
  const canonical = `${SITE}${canonicalPath}`;
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="robots" content="noindex,follow" />
  <meta http-equiv="refresh" content="0;url=${escapeHtml(canonical)}" />
  <link rel="canonical" href="${escapeHtml(canonical)}" />
  <title>Redirecting to the canonical Irha Apparels product page</title>
</head>
<body>
  <p>This product URL has moved. <a href="${escapeHtml(canonical)}">Open the canonical product page</a>.</p>
</body>
</html>`;
}

function writeShell(routePath: string, html: string) {
  const target = resolve("dist", routePath.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, "utf8");
}

let sitemap = readFileSync(sitemapPath, "utf8");
const { products } = readExplicitTaxonomyRoutes();
let legacyShellCount = 0;

for (const route of products) {
  const canonicalFile = resolve("dist", route.canonicalPath.slice(1), "index.html");
  const canonicalShell = readFileSync(canonicalFile, "utf8");
  const expectedCanonical = `<link rel="canonical" href="${SITE}${route.canonicalPath}"`;
  if (!canonicalShell.includes(expectedCanonical) || !canonicalShell.includes('data-irha-product-shell="true"')) {
    throw new Error(`Buyer-ready canonical shell is missing or was overwritten: ${route.canonicalPath}`);
  }

  const legacyPaths = new Set([
    route.legacyPath,
    route.sourceLegacyPath,
    route.deprecatedCanonicalPath,
  ]);
  legacyPaths.delete(route.canonicalPath);
  for (const legacyPath of legacyPaths) {
    writeShell(legacyPath, redirectShell(route.canonicalPath));
    legacyShellCount += 1;
    const absoluteLegacy = `${SITE}${legacyPath}`;
    sitemap = sitemap.replace(
      new RegExp(`\\s*<url>\\s*<loc>${absoluteLegacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>[\\s\\S]*?<\\/url>`, "g"),
      "",
    );
  }
}

if (/reference-style-0[23]/i.test(sitemap)) {
  throw new Error("Reference-style legacy URL leaked into the final sitemap");
}
writeFileSync(sitemapPath, sitemap, "utf8");
console.log(`Preserved ${products.length} buyer-ready canonical shells and generated ${legacyShellCount} noindex legacy redirect shells`);
