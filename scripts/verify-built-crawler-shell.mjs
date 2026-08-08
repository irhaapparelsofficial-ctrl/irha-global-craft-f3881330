import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";

const DIST = resolve("dist");
const canonical = "https://irhaapparels.com";
const alternateHost = "https://www.irhaapparels.com";
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(path));
    else files.push(path);
  }
  return files;
}

const allFiles = await walk(DIST);
const htmlFiles = allFiles.filter((file) => file.endsWith(".html"));
const sitemap = await readFile(join(DIST, "sitemap.xml"), "utf8");
const robots = await readFile(join(DIST, "robots.txt"), "utf8");
const llms = await readFile(join(DIST, "llms.txt"), "utf8");
const llmsFull = await readFile(join(DIST, "llms-full.txt"), "utf8");
const seoManifest = JSON.parse(await readFile(join(DIST, "seo-route-manifest.json"), "utf8"));

const expectedUrls = new Set(
  seoManifest.routes
    .filter((route) => route.indexable && route.sitemap)
    .map((route) => route.canonicalUrl),
);
assert(expectedUrls.size === seoManifest.sitemapCount, "SEO manifest sitemapCount drift");

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function extractJsonLd(html) {
  const nodes = [];
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      nodes.push(JSON.parse(decodeEntities(match[1].trim())));
    } catch {
      // Other build verifiers surface malformed JSON-LD with route-specific context.
    }
  }
  return nodes.flatMap((node) => Array.isArray(node) ? node : [node]);
}

function extractCanonical(html) {
  const match = html.match(/<link\b[^>]*rel=["']canonical["'][^>]*href=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*rel=["']canonical["'][^>]*>/i);
  return match?.[1] ? decodeEntities(match[1]) : null;
}

function extractMeta(html, name) {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const byName = new RegExp(`<meta\\b[^>]*name=["']${escaped}["'][^>]*content=["']([^"']*)["'][^>]*>`, "i");
  const reversed = new RegExp(`<meta\\b[^>]*content=["']([^"']*)["'][^>]*name=["']${escaped}["'][^>]*>`, "i");
  const match = html.match(byName) ?? html.match(reversed);
  return match?.[1] ? decodeEntities(match[1]) : null;
}

const canonicalByHtml = new Map();
const organizationNodes = [];
const websiteNodes = [];
const homepageNodes = [];

for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relativePath = relative(DIST, file).replaceAll("\\", "/");
  const canonicalUrl = extractCanonical(html);
  if (canonicalUrl) {
    assert(canonicalUrl.startsWith(`${canonical}/`) || canonicalUrl === `${canonical}/`, `${relativePath} canonical host drift: ${canonicalUrl}`);
    assert(!canonicalUrl.startsWith(`${alternateHost}/`), `${relativePath} canonical uses www`);
    const existing = canonicalByHtml.get(canonicalUrl) ?? [];
    existing.push(relativePath);
    canonicalByHtml.set(canonicalUrl, existing);
  }

  const sourceCommit = extractMeta(html, "x-irha-source-commit");
  if (sourceCommit) assert(/^[0-9a-f]{40}$/.test(sourceCommit), `${relativePath} source commit marker is invalid`);

  for (const node of extractJsonLd(html)) {
    if (node?.["@type"] === "Organization") organizationNodes.push({ node, relativePath });
    if (node?.["@type"] === "WebSite") websiteNodes.push({ node, relativePath });
    if (node?.["@type"] === "WebPage" && node?.url === PUBLIC_IDENTITY.url) homepageNodes.push({ node, relativePath });
  }
}

for (const [url, files] of canonicalByHtml) {
  assert(files.length === 1 || !expectedUrls.has(url), `Authoritative canonical has competing HTML shells: ${url} -> ${files.join(", ")}`);
}

assert(organizationNodes.length > 0, "Built site has no canonical Organization JSON-LD");
assert(websiteNodes.length > 0, "Built site has no canonical WebSite JSON-LD");
const organizationIdentity = new Map(organizationNodes.map(({ node }) => [node["@id"], JSON.stringify(node)]));
const websiteIdentity = new Map(websiteNodes.map(({ node }) => [node["@id"], JSON.stringify(node)]));
assert(organizationIdentity.size === 1 && organizationIdentity.has(PUBLIC_IDENTITY.organizationId), "Built site has competing Organization identities");
assert(websiteIdentity.size === 1 && websiteIdentity.has(PUBLIC_IDENTITY.websiteId), "Built site has competing WebSite identities");

for (const { node, relativePath } of organizationNodes) {
  assert(node.url === PUBLIC_IDENTITY.url, `${relativePath} Organization URL drift`);
  assert(node.name === PUBLIC_IDENTITY.name, `${relativePath} Organization name drift`);
  assert(node.email === PUBLIC_IDENTITY.email, `${relativePath} Organization email drift`);
  assert(node.telephone === PUBLIC_IDENTITY.telephone, `${relativePath} Organization telephone drift`);
}
for (const { node, relativePath } of websiteNodes) {
  assert(node.url === PUBLIC_IDENTITY.url, `${relativePath} WebSite URL drift`);
  assert(node.name === PUBLIC_IDENTITY.name, `${relativePath} WebSite name drift`);
  assert(node.publisher?.["@id"] === PUBLIC_IDENTITY.organizationId, `${relativePath} WebSite publisher drift`);
}

const homepageGraphs = homepageNodes.filter(({ node }) => node["@id"] === PUBLIC_IDENTITY.homepageId);
assert(homepageGraphs.length === 1, `Expected one homepage WebPage, found ${homepageGraphs.length}`);
for (const { node: homepage } of homepageGraphs) {
  assert(homepage.url === PUBLIC_IDENTITY.url, "Homepage WebPage URL drift");
  assert(homepage.name === PUBLIC_IDENTITY.homepage.title, "Homepage WebPage name drift");
  assert(homepage.isPartOf?.["@id"] === PUBLIC_IDENTITY.websiteId, "Homepage WebPage WebSite reference drift");
  assert(homepage.about?.["@id"] === PUBLIC_IDENTITY.organizationId, "Homepage WebPage about reference drift");
  assert(homepage.publisher?.["@id"] === PUBLIC_IDENTITY.organizationId, "Homepage WebPage publisher drift");
}
for (const file of htmlFiles) {
  const html = await readFile(file, "utf8");
  const relativePath = relative(DIST, file).replaceAll("\\", "/");
  const nodes = extractJsonLd(html);
  for (const product of nodes.filter((node) => node["@type"] === "Product")) {
    assert(product.manufacturer?.["@id"] === PUBLIC_IDENTITY.organizationId, `${relativePath} Product manufacturer drift`);
  }
}

for (const agent of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "PerplexityBot"]) assert(robots.includes(`User-agent: ${agent}`), `robots.txt is missing ${agent}`);
assert(robots.includes(`Sitemap: ${canonical}/sitemap.xml`), "robots.txt sitemap does not use the canonical apex host");
assert(!sitemap.includes(`<loc>${alternateHost}`), "sitemap still contains www URLs");
assert(sitemap.includes(`<loc>${canonical}/</loc>`), "sitemap is missing the canonical homepage");
assert(llms.includes(`${canonical}/`), "llms.txt is missing absolute canonical URLs");
const llmsFullLower = llmsFull.toLowerCase();
assert(llmsFull.includes("## Product divisions"), "llms-full.txt is missing the current homepage product-division structure");
assert(llmsFullLower.includes("main category, relevant audience or buyer group, product type and individual product page"), "llms-full.txt is missing the current catalogue hierarchy");
assert(llmsFullLower.includes("appointment-based live factory-view video call"), "llms-full.txt is missing the current request-based factory verification path");
assert(!llmsFullLower.includes("two production hubs"), "llms-full.txt still contains the retired production-hub claim");
const builtBrandMaster = await readFile(join(DIST, "brand/irha-apparels-official-master.png"));
assert(createHash("sha256").update(builtBrandMaster).digest("hex") === "32eee79bc7038c53cff36bab46193c77e78702d7eef7883e8f94b145999a1b87", "Built official brand master SHA-256 drift");
assert((await stat(join(DIST, "brand/irha-apparels-official-runtime-512.png"))).size > 0, "Built official runtime crest is missing");

console.log(`PASS ${htmlFiles.length} built HTML files with one canonical Organization, one WebSite, one homepage WebPage, ${expectedUrls.size} authoritative sitemap URLs, valid contact identity and preserved crawler contracts`);
