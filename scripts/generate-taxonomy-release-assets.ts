import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ExplicitProductRoute = {
  sourceProductSlug: string;
  productSlug: string;
  productName: string;
  fullSlugPath: string;
  categorySlug: string;
  audienceSlug: string;
  collectionSlug: string;
  legacyPath: string;
  sourceLegacyPath: string;
  deprecatedCanonicalPath: string;
  canonicalPath: string;
};

export type ExplicitCategoryRoute = {
  sourceSlug: string;
  targetFullPath: string;
  sourcePath: string;
  targetPath: string;
};

const MIGRATION_PATH = "supabase/migrations/20260717230000_explicit_catalog_taxonomy_foundation.sql";
const GENERATED_REDIRECT_START = "# BEGIN GENERATED TAXONOMY REDIRECTS";
const GENERATED_REDIRECT_END = "# END GENERATED TAXONOMY REDIRECTS";
const SITE = "https://irhaapparels.com";

/**
 * Production product slugs approved during the staged catalogue rebuild.
 * The original taxonomy migration is immutable, so build assets translate the
 * historical slug into the current database slug while retaining 301 aliases.
 */
export const PRODUCT_SLUG_RENAMES: Readonly<Record<string, string>> = {
  "traditional-lederhosen": "short-lederhosen",
  "traditional-lederhosen-reference-style-02": "premium-embroidered-lederhosen",
  "traditional-lederhosen-reference-style-03": "knee-length-lederhosen",
  "bavarian-checkered-shirt": "checked-trachten-shirt",
  "traditional-dirndl-dress": "traditional-dirndl",
  "classic-biker-leather-jacket": "classic-leather-biker-jacket",
  "bomber-leather-jacket": "leather-bomber-jacket",
  "sublimated-soccer-uniform-kit": "custom-soccer-uniform-kit",
  "performance-tracksuit-set": "team-tracksuit",
  "compression-performance-top": "compression-shirt",
  "oversized-streetwear-hoodie": "oversized-pullover-hoodie",
  "plush-bathrobe-sleep-robe": "womens-plush-robe",
  "silk-nightgown-slip": "womens-silk-nightgown",
} as const;

function decodeSqlText(value: string) {
  return value.replaceAll("''", "'");
}

function valuesBlock(sql: string, expression: RegExp, label: string) {
  const match = sql.match(expression);
  if (!match?.[1]) throw new Error(`Unable to locate ${label} in ${MIGRATION_PATH}`);
  return match[1];
}

function parseRows(block: string) {
  const rows: Array<[string, string]> = [];
  const pattern = /\('((?:''|[^'])+)'\s*,\s*'((?:''|[^'])+)'(?:\s*,[^)]*)?\)/g;
  for (const match of block.matchAll(pattern)) rows.push([decodeSqlText(match[1]), decodeSqlText(match[2])]);
  return rows;
}

function titleFromSlug(slug: string) {
  return slug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
}

export function readExplicitTaxonomyRoutes(root = process.cwd()) {
  const sql = readFileSync(resolve(root, MIGRATION_PATH), "utf8");
  const productBlock = valuesBlock(
    sql,
    /with\s+mapping\(product_slug,\s*target_path\)\s+as\s*\(\s*values([\s\S]*?)\n\),\s*resolved\s+as/i,
    "product mapping block",
  );
  const products: ExplicitProductRoute[] = parseRows(productBlock).map(([sourceProductSlug, fullSlugPath]) => {
    const [categorySlug, audienceSlug, collectionSlug] = fullSlugPath.split("/");
    if (!categorySlug || !audienceSlug || !collectionSlug) throw new Error(`Invalid taxonomy path: ${fullSlugPath}`);
    const productSlug = PRODUCT_SLUG_RENAMES[sourceProductSlug] ?? sourceProductSlug;
    return {
      sourceProductSlug,
      productSlug,
      productName: titleFromSlug(productSlug),
      fullSlugPath,
      categorySlug,
      audienceSlug,
      collectionSlug,
      legacyPath: `/products/${categorySlug}/${productSlug}`,
      sourceLegacyPath: `/products/${categorySlug}/${sourceProductSlug}`,
      deprecatedCanonicalPath: `/products/${fullSlugPath}/${sourceProductSlug}`,
      canonicalPath: `/products/${fullSlugPath}/${productSlug}`,
    };
  });

  const categoryBlock = valuesBlock(
    sql,
    /with\s+category_routes\(source_slug,\s*target_full_path\)\s+as\s*\(\s*values([\s\S]*?)\n\)\s*insert\s+into\s+public\.catalog_taxonomy_migration_map/i,
    "category route block",
  );
  const categories: ExplicitCategoryRoute[] = parseRows(categoryBlock).map(([sourceSlug, targetFullPath]) => ({
    sourceSlug,
    targetFullPath,
    sourcePath: `/products/${sourceSlug}`,
    targetPath: `/products/${targetFullPath}`,
  }));

  if (products.length !== 86) throw new Error(`Expected 86 explicit product routes, found ${products.length}`);
  if (new Set(products.map((item) => item.productSlug)).size !== 86) throw new Error("Duplicate explicit product slug found");
  if (new Set(products.map((item) => item.canonicalPath)).size !== 86) throw new Error("Duplicate canonical product path found");
  return { products, categories };
}

function withoutGeneratedRedirects(source: string) {
  const start = source.indexOf(GENERATED_REDIRECT_START);
  if (start === -1) return source.trimEnd();
  const end = source.indexOf(GENERATED_REDIRECT_END, start);
  if (end === -1) throw new Error("Generated taxonomy redirect block is incomplete");
  return `${source.slice(0, start).trimEnd()}\n${source.slice(end + GENERATED_REDIRECT_END.length).trimStart()}`.trimEnd();
}

function productRedirectLines(route: ExplicitProductRoute) {
  const sources = new Set([route.legacyPath, route.sourceLegacyPath, route.deprecatedCanonicalPath]);
  sources.delete(route.canonicalPath);
  return [...sources].map((source) => `${source} ${route.canonicalPath} 301`);
}

export function generateTaxonomyRedirects(root = process.cwd()) {
  const { products, categories } = readExplicitTaxonomyRoutes(root);
  const redirectPath = resolve(root, "public/_redirects");
  const current = readFileSync(redirectPath, "utf8");
  const generated = [
    GENERATED_REDIRECT_START,
    "# Owner-reviewed Main Category → Audience/Buyer Group → Product Type → Product canonicals.",
    ...categories.map((route) => `${route.sourcePath} ${route.targetPath} 301`),
    "/products/nightwear /products/leisure-nightwear 301",
    ...products.flatMap(productRedirectLines),
    GENERATED_REDIRECT_END,
  ].join("\n");
  writeFileSync(redirectPath, `${withoutGeneratedRedirects(current)}\n\n${generated}\n`, "utf8");
}

function removeUrlBlocks(xml: string, predicate: (location: string) => boolean) {
  return xml.replace(/\s*<url>\s*<loc>([^<]+)<\/loc>[\s\S]*?<\/url>/g, (block, location: string) => predicate(location) ? "" : block);
}

export function generateTaxonomySitemapEntries(root = process.cwd()) {
  const { products } = readExplicitTaxonomyRoutes(root);
  const sitemapPath = resolve(root, "public/sitemap.xml");
  let xml = readFileSync(sitemapPath, "utf8");
  const oldLocations = new Set(products.flatMap((route) => [
    `${SITE}${route.legacyPath}`,
    `${SITE}${route.sourceLegacyPath}`,
    `${SITE}${route.deprecatedCanonicalPath}`,
    `${SITE}${route.canonicalPath}`,
  ]));
  xml = removeUrlBlocks(xml, (location) => oldLocations.has(location) || location.startsWith(`${SITE}/intl/`));
  const entries = products.map((route) => [
    "  <url>",
    `    <loc>${SITE}${route.canonicalPath}</loc>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>0.80</priority>",
    "  </url>",
  ].join("\n")).join("\n");
  if (!xml.includes("</urlset>")) throw new Error("public/sitemap.xml is not a valid URL set");
  xml = xml.replace(/\s*<\/urlset>\s*$/, `\n${entries}\n</urlset>\n`);
  writeFileSync(sitemapPath, xml, "utf8");
}

function escapeHtml(value: string) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

function writeProductShell(outputRoot: string, routePath: string, html: string) {
  const target = resolve(outputRoot, routePath.replace(/^\//, ""), "index.html");
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, html, "utf8");
}

export function generateTaxonomyProductShells(root = process.cwd(), outputDir = "dist") {
  const { products } = readExplicitTaxonomyRoutes(root);
  const outputRoot = resolve(root, outputDir);
  const template = readFileSync(resolve(outputRoot, "index.html"), "utf8");
  for (const route of products) {
    const title = `${route.productName} Wholesale Manufacturer | Irha Apparels`;
    const description = `${route.productName} custom manufacturing for wholesale, OEM, ODM and private-label buyers. Specifications are confirmed after buyer and factory review.`;
    const canonical = `${SITE}${route.canonicalPath}`;
    const html = template
      .replace(/<title>[\s\S]*?<\/title>/i, `<title>${escapeHtml(title)}</title>`)
      .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${escapeHtml(description)}" />`)
      .replace(/\s*<link rel="canonical"[^>]*>/gi, "")
      .replace("</head>", `  <link rel="canonical" href="${canonical}" />\n</head>`);
    const shellPaths = new Set([
      route.canonicalPath,
      route.legacyPath,
      route.sourceLegacyPath,
      route.deprecatedCanonicalPath,
    ]);
    for (const shellPath of shellPaths) writeProductShell(outputRoot, shellPath, html);
  }
}

export function generateTaxonomyReleaseAssets(root = process.cwd()) {
  generateTaxonomyRedirects(root);
  generateTaxonomySitemapEntries(root);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) generateTaxonomyReleaseAssets();
