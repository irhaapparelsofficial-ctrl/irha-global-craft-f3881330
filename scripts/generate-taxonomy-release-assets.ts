import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export type ExplicitProductRoute = {
  productSlug: string;
  productName: string;
  fullSlugPath: string;
  categorySlug: string;
  audienceSlug: string;
  collectionSlug: string;
  legacyPath: string;
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

function productNames(sql: string) {
  const names = new Map<string, string>();
  const block = valuesBlock(
    sql,
    /with\s+mapping\(product_slug,\s*target_path\)\s+as\s*\(\s*values([\s\S]*?)\n\),\s*resolved\s+as/i,
    "product mapping block",
  );
  for (const [productSlug] of parseRows(block)) names.set(productSlug, productSlug.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" "));
  return names;
}

export function readExplicitTaxonomyRoutes(root = process.cwd()) {
  const sql = readFileSync(resolve(root, MIGRATION_PATH), "utf8");
  const nameBySlug = productNames(sql);
  const productBlock = valuesBlock(
    sql,
    /with\s+mapping\(product_slug,\s*target_path\)\s+as\s*\(\s*values([\s\S]*?)\n\),\s*resolved\s+as/i,
    "product mapping block",
  );
  const products: ExplicitProductRoute[] = parseRows(productBlock).map(([productSlug, fullSlugPath]) => {
    const [categorySlug, audienceSlug, collectionSlug] = fullSlugPath.split("/");
    if (!categorySlug || !audienceSlug || !collectionSlug) throw new Error(`Invalid taxonomy path: ${fullSlugPath}`);
    return {
      productSlug,
      productName: nameBySlug.get(productSlug) ?? productSlug,
      fullSlugPath,
      categorySlug,
      audienceSlug,
      collectionSlug,
      legacyPath: `/products/${categorySlug}/${productSlug}`,
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

export function generateTaxonomyRedirects(root = process.cwd()) {
  const { products, categories } = readExplicitTaxonomyRoutes(root);
  const redirectPath = resolve(root, "public/_redirects");
  const current = readFileSync(redirectPath, "utf8");
  const generated = [
    GENERATED_REDIRECT_START,
    "# Owner-reviewed Main Category → Audience/Buyer Group → Product Type → Product canonicals.",
    ...categories.map((route) => `${route.sourcePath} ${route.targetPath} 301`),
    "/products/nightwear /products/leisure-nightwear 301",
    ...products.map((route) => `${route.legacyPath} ${route.canonicalPath} 301`),
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
  const oldLocations = new Set(products.flatMap((route) => [`${SITE}${route.legacyPath}`, `${SITE}${route.canonicalPath}`]));
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
    writeProductShell(outputRoot, route.canonicalPath, html);
    writeProductShell(outputRoot, route.legacyPath, html);
  }
}

export function generateTaxonomyReleaseAssets(root = process.cwd()) {
  generateTaxonomyRedirects(root);
  generateTaxonomySitemapEntries(root);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (invokedPath === fileURLToPath(import.meta.url)) generateTaxonomyReleaseAssets();
