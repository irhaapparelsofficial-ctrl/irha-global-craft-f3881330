import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const SITE_ORIGIN = "https://irhaapparels.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");
const DIST_DIR = resolve("dist");
const OWNER_EMAIL = "irhaapparelsofficial@gmail.com";
const DOMAIN_EMAIL = "info@irhaapparels.com";
const NON_INDEXABLE_PATHS = new Set(["/studio"]);
const REMOVED_BLOG_PATHS = new Set([
  "/blog/dirndl-manufacturer-moq-50",
  "/blog/streetwear-oem-pakistan",
  "/blog/leather-grades-explained",
  "/blog/fob-sialkot-vs-cif-pricing-explained",
]);

function extractLoc(block) {
  return block.match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim() ?? "";
}

function normalizeUrlPath(value) {
  try {
    const url = new URL(value);
    if (url.origin !== SITE_ORIGIN) return null;
    return url.pathname === "/" ? "/" : url.pathname.replace(/\/+$/, "");
  } catch {
    return null;
  }
}

async function enforceSitemapPolicy() {
  const source = await readFile(SITEMAP_PATH, "utf8");
  const urlBlocks = source.match(/\s*<url>[\s\S]*?<\/url>/gi) ?? [];
  if (urlBlocks.length === 0) throw new Error("sitemap.xml has no URL entries");

  const retained = [];
  const seen = new Set();
  const removed = [];

  for (const block of urlBlocks) {
    const loc = extractLoc(block);
    const pathname = normalizeUrlPath(loc);
    if (!pathname) throw new Error(`Invalid or non-canonical sitemap URL: ${loc || "<missing loc>"}`);
    if (loc.includes("www.irhaapparels.com")) throw new Error(`www host leaked into sitemap: ${loc}`);
    if (loc.includes("?") || loc.includes("#")) throw new Error(`Query or fragment leaked into sitemap: ${loc}`);
    if (seen.has(pathname)) throw new Error(`Duplicate sitemap path: ${pathname}`);
    seen.add(pathname);

    if (NON_INDEXABLE_PATHS.has(pathname) || REMOVED_BLOG_PATHS.has(pathname)) {
      removed.push(pathname);
      continue;
    }
    retained.push(block.trim());
  }

  const rebuilt = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${retained.map((block) => `  ${block.replace(/\n/g, "\n  ")}`).join("\n")}\n</urlset>\n`;
  await writeFile(SITEMAP_PATH, rebuilt, "utf8");

  const verification = await readFile(SITEMAP_PATH, "utf8");
  for (const pathname of [...NON_INDEXABLE_PATHS, ...REMOVED_BLOG_PATHS]) {
    if (verification.includes(`<loc>${SITE_ORIGIN}${pathname}</loc>`)) {
      throw new Error(`Non-indexable route still exists in sitemap: ${pathname}`);
    }
  }
  console.log(`Public index policy retained ${retained.length} sitemap URLs and removed ${removed.length} non-indexable URLs`);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(target)));
    else if (entry.isFile()) files.push(target);
  }
  return files;
}

async function enforceBuildPolicy() {
  const distStats = await stat(DIST_DIR).catch(() => null);
  if (!distStats?.isDirectory()) throw new Error("dist directory is missing");

  const files = await walk(DIST_DIR);
  const htmlFiles = files.filter((file) => file.endsWith(".html"));
  if (htmlFiles.length === 0) throw new Error("No built HTML files were found");

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf8");
    if (html.toLowerCase().includes(OWNER_EMAIL)) {
      throw new Error(`Owner Gmail leaked into public HTML: ${relative(DIST_DIR, file)}`);
    }
  }

  const coreShells = ["index.html", "products/index.html", "contact/index.html", "inquiry/index.html"];
  for (const path of coreShells) {
    const html = await readFile(resolve(DIST_DIR, path), "utf8");
    if (!html.includes(DOMAIN_EMAIL)) throw new Error(`${path} is missing the public domain email`);
  }

  const forbiddenFiles = [
    "studio/index.html",
    "blog/dirndl-manufacturer-moq-50/index.html",
    "blog/streetwear-oem-pakistan/index.html",
    "blog/leather-grades-explained/index.html",
    "blog/fob-sialkot-vs-cif-pricing-explained/index.html",
  ];
  for (const path of forbiddenFiles) {
    const exists = await stat(resolve(DIST_DIR, path)).then(() => true).catch(() => false);
    if (exists) throw new Error(`Non-indexable static route shell was generated: ${path}`);
  }

  console.log(`Verified ${htmlFiles.length} public HTML files: domain email consistent and non-indexable shells absent`);
}

const phase = process.argv[2];
if (phase === "sitemap") {
  await enforceSitemapPolicy();
} else if (phase === "build") {
  await enforceBuildPolicy();
} else {
  throw new Error("Usage: node scripts/enforce-public-index-policy.mjs <sitemap|build>");
}
