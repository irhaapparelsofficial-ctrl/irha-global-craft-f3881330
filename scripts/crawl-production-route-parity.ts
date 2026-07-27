import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  OWNER_SUPABASE_PROJECT_ID,
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTaxonomySeo,
  localizedTopName,
} from "../src/lib/taxonomyI18n";

const execFileAsync = promisify(execFile);
const ORIGIN = (process.env.CRAWL_ORIGIN || "https://irhaapparels.com").replace(/\/$/, "");
const CANONICAL_ORIGIN = (process.env.CANONICAL_ORIGIN || "https://irhaapparels.com").replace(/\/$/, "");
const EXPECTED_SOURCE_SHA = process.env.EXPECTED_SOURCE_SHA || process.env.EXPECTED_PRODUCTION_SHA || "";
const OUTPUT_DIR = process.env.CRAWL_OUTPUT_DIR || "artifacts/production-route-parity";
const USER_AGENT = "IrhaRouteParity/2.0 (+https://irhaapparels.com)";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const EXPECTED_DYNAMIC = EXPECTED_PRODUCTS + EXPECTED_TAXONOMY;
const REQUEST_TIMEOUT_MS = 25_000;
const CANONICAL_CONCURRENCY = 12;
const REDIRECT_CONCURRENCY = 16;
const BROWSER_CONCURRENCY = 2;
const PAGE_SIZE = 1000;
const CANONICAL_TRAILING_SLASH_PATHS = new Set(["/de/", "/fr/", "/nl/"]);

const FUNCTIONAL_PATHS = [
  "/login",
  "/dashboard",
  "/admin",
  "/studio",
  "/mockup-studio",
  "/quote-studio",
  "/reset-password",
] as const;
const EXPECTED_MISSING_PATHS = [
  "/products/route-parity-missing-product",
  "/route-parity-missing-page",
] as const;

type Severity = "critical" | "high" | "medium" | "low";
type Finding = { severity: Severity; code: string; path: string; message: string };
type SitemapEntry = { path: string; image_url: string | null; lastmod: string | null; entry_kind: "product" | "taxonomy" };
type ReleaseProduct = {
  id: string;
  slug: string;
  name: string;
  sku?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  short_description?: string | null;
  description?: string | null;
  image_url?: string | null;
  gallery?: string[] | null;
  updated_at?: string | null;
};
type ReleasePayload = { products: ReleaseProduct[] };
type TaxonomyNode = {
  id: string;
  parent_id: string | null;
  depth: number;
  slug: string;
  name: string;
  full_slug_path: string;
  node_type?: string | null;
  seo_title?: string | null;
  seo_description?: string | null;
  description?: string | null;
  image_url?: string | null;
};
type TaxonomyAssignment = {
  product_id: string;
  product_slug: string;
  taxonomy_node_id: string;
  full_slug_path: string;
  canonical_path: string;
};
type TaxonomyPayload = { nodes: TaxonomyNode[]; assignments: TaxonomyAssignment[] };
type RedirectRow = { from_path: string; to_path: string; updated_at?: string | null };
type ProductExpectation = {
  product: ReleaseProduct;
  assignment: TaxonomyAssignment;
  root: TaxonomyNode;
  audience: TaxonomyNode;
  leaf: TaxonomyNode;
  expectedTitle: string;
  expectedH1: string;
  expectedDescription: string;
  imageUrl: string;
};
type TaxonomyExpectation = {
  node: TaxonomyNode;
  root: TaxonomyNode;
  audience?: TaxonomyNode;
  collection?: TaxonomyNode;
  expectedTitle: string;
  expectedH1: string;
  expectedDescription: string;
  productCount: number;
  childPaths: string[];
};
type SchemaSignals = { types: string[]; productNames: string[]; invalid: boolean; forbiddenCommerce: string[] };
type PageSignals = {
  title: string;
  description: string;
  h1: string;
  canonical: string;
  robots: string;
  language: string;
  hreflang: Array<{ lang: string; href: string }>;
  schema: SchemaSignals;
  internalLinks: string[];
  primaryImage: string;
  primaryImageAlt: string;
  visibleBreadcrumb: boolean;
  inquiryCta: boolean;
  wordCount: number;
  mainText: string;
  fingerprint: string;
  routeShell: string;
};
type CanonicalResult = {
  requestedUrl: string;
  finalUrl: string;
  path: string;
  kind: string;
  status: number;
  redirectHops: Array<{ status: number; from: string; to: string }>;
  responseTimeMs: number;
  title: string;
  metaDescription: string;
  h1: string;
  canonical: string;
  robotsMeta: string;
  xRobotsTag: string;
  language: string;
  hreflang: Array<{ lang: string; href: string }>;
  breadcrumb: boolean;
  primaryImage: string;
  primaryImageAlt: string;
  imageStatus: number | null;
  structuredDataTypes: string[];
  internalLinks: string[];
  wordCount: number;
  sourceCommit: string;
  duplicateContentFingerprint: string;
  result: "pass" | "fail";
  findings: Finding[];
};
type RedirectResult = {
  sourcePath: string;
  expectedDestination: string;
  actualDestination: string;
  status: number;
  destinationStatus: number;
  hops: number;
  result: "pass" | "fail";
  findings: Finding[];
};
type BrowserParityResult = {
  path: string;
  attempts: number;
  initialTitle: string;
  renderedTitle: string;
  initialDescription: string;
  renderedDescription: string;
  initialH1: string;
  renderedH1: string;
  initialCanonical: string;
  renderedCanonical: string;
  result: "pass" | "fail";
  findings: Finding[];
};

function add(findings: Finding[], severity: Severity, code: string, path: string, message: string) {
  findings.push({ severity, code, path, message });
}
function cleanPath(value: string): string {
  const url = value.startsWith("http") ? new URL(value) : new URL(value, ORIGIN);
  const pathname = decodeURIComponent(url.pathname).replace(/\/{2,}/g, "/");
  if (CANONICAL_TRAILING_SLASH_PATHS.has(pathname)) return pathname;
  return pathname.replace(/\/$/, "") || "/";
}
function requestUrl(path: string) { return `${ORIGIN}${path === "/" ? "/" : path}`; }
function canonicalUrl(path: string) { return `${CANONICAL_ORIGIN}${path === "/" ? "/" : path}`; }
function decodeHtml(value: string) {
  return value.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}
function stripHtml(value: string) {
  return decodeHtml(value.replace(/<script\b[\s\S]*?<\/script>/gi, " ").replace(/<style\b[\s\S]*?<\/style>/gi, " ").replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function firstMatch(html: string, expression: RegExp) { return decodeHtml(html.match(expression)?.[1]?.replace(/\s+/g, " ").trim() || ""); }
function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}
function findMeta(html: string, key: string, value: string) {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) if (attribute(match[0], key).toLowerCase() === value.toLowerCase()) return attribute(match[0], "content");
  return "";
}
function findLink(html: string, rel: string) {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) if (attribute(match[0], "rel").toLowerCase().split(/\s+/).includes(rel.toLowerCase())) return attribute(match[0], "href");
  return "";
}
function allInternalLinks(html: string) {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(match[0], "href");
    if (!href || href.startsWith("#") || /^(?:mailto|tel|javascript):/i.test(href)) continue;
    try {
      const url = new URL(href, CANONICAL_ORIGIN);
      if (url.origin === CANONICAL_ORIGIN || url.origin === ORIGIN) links.add(cleanPath(url.toString()));
    } catch { /* invalid links are ignored here and cannot become canonical evidence */ }
  }
  return [...links].sort();
}
function schemaSignals(html: string): SchemaSignals {
  const types = new Set<string>();
  const productNames = new Set<string>();
  const forbidden = new Set<string>();
  let invalid = false;
  const visit = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(visit);
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    const list = typeof type === "string" ? [type] : Array.isArray(type) ? type.filter((item): item is string => typeof item === "string") : [];
    list.forEach((item) => types.add(item));
    if (list.includes("Product") && typeof record.name === "string") productNames.add(record.name);
    for (const key of ["aggregateRating", "review", "offers"]) if (key in record) forbidden.add(key);
    Object.values(record).forEach(visit);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try { visit(JSON.parse(match[1])); } catch { invalid = true; }
  }
  return { types: [...types].sort(), productNames: [...productNames], invalid, forbiddenCommerce: [...forbidden].sort() };
}
function parsePage(html: string): PageSignals {
  const mainHtml = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  const mainText = stripHtml(mainHtml);
  const imageTag = mainHtml.match(/<img\b[^>]*>/i)?.[0] || "";
  const normalized = mainText.toLowerCase().replace(/\b\d+\b/g, "#").replace(/\s+/g, " ").trim();
  const hreflang: Array<{ lang: string; href: string }> = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    if (!attribute(match[0], "rel").toLowerCase().split(/\s+/).includes("alternate")) continue;
    const lang = attribute(match[0], "hreflang");
    const href = attribute(match[0], "href");
    if (lang && href) hreflang.push({ lang, href });
  }
  const links = allInternalLinks(html);
  return {
    title: firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i),
    description: findMeta(html, "name", "description"),
    h1: stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || ""),
    canonical: findLink(html, "canonical"),
    robots: findMeta(html, "name", "robots"),
    language: attribute(html.match(/<html\b[^>]*>/i)?.[0] || "", "lang"),
    hreflang,
    schema: schemaSignals(html),
    internalLinks: links,
    primaryImage: attribute(imageTag, "src") || findMeta(html, "property", "og:image"),
    primaryImageAlt: attribute(imageTag, "alt"),
    visibleBreadcrumb: /aria-label=["']breadcrumb["']/i.test(html),
    inquiryCta: links.includes("/inquiry") || /href=["']\/inquiry(?:[?"'])/i.test(html),
    wordCount: mainText ? mainText.split(/\s+/).filter(Boolean).length : 0,
    mainText,
    fingerprint: createHash("sha256").update(normalized).digest("hex"),
    routeShell: firstMatch(html, /data-irha-route-shell=["']([^"']+)["']/i),
  };
}

async function rpc<T>(name: string): Promise<T> {
  const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: { apikey: OWNER_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json", "User-Agent": USER_AGENT },
    body: "{}",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`RPC ${name} failed: ${response.status} ${await response.text()}`);
  return await response.json() as T;
}
async function allApprovedRedirects(): Promise<RedirectRow[]> {
  const rows: RedirectRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/rpc/get_public_legacy_redirects`, {
      method: "POST",
      headers: { apikey: OWNER_SUPABASE_PUBLISHABLE_KEY, Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`, "Content-Type": "application/json", Range: `${offset}-${offset + PAGE_SIZE - 1}`, Prefer: "count=exact", "User-Agent": USER_AGENT },
      body: "{}",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) throw new Error(`Redirect RPC failed: ${response.status} ${await response.text()}`);
    const page = await response.json() as RedirectRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}
async function request(url: string, redirect: RequestRedirect = "manual", method = "GET") {
  let error: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(url, { method, redirect, headers: { "User-Agent": USER_AGENT, Accept: method === "GET" ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" : "*/*", "Cache-Control": "no-cache" }, signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
      return { response, elapsed: Math.round(performance.now() - started), text: method === "HEAD" ? "" : await response.text() };
    } catch (caught) {
      error = caught;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 600));
    }
  }
  throw error instanceof Error ? error : new Error(String(error));
}
async function followRedirects(startUrl: string, maxHops = 5) {
  const hops: Array<{ status: number; from: string; to: string }> = [];
  let current = startUrl;
  for (let index = 0; index <= maxHops; index += 1) {
    const result = await request(current, "manual");
    const location = result.response.headers.get("location");
    if (result.response.status >= 300 && result.response.status < 400 && location) {
      const next = new URL(location, current).toString();
      hops.push({ status: result.response.status, from: current, to: next });
      current = next;
      continue;
    }
    return { ...result, finalUrl: current, hops };
  }
  throw new Error(`Redirect chain exceeded ${maxHops}: ${startUrl}`);
}
async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>) {
  const output = new Array<R>(items.length);
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (true) {
      const index = cursor++;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  }));
  return output;
}
function parseSitemap(xml: string) {
  const rows: Array<{ url: string; path: string; lastmod: string }> = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const url = decodeHtml(block[1].match(/<loc>([^<]+)<\/loc>/i)?.[1] || "");
    const lastmod = block[1].match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1] || "";
    if (url) rows.push({ url, path: cleanPath(url), lastmod });
  }
  return rows;
}
function productExpectations(release: ReleasePayload, taxonomy: TaxonomyPayload) {
  const products = new Map(release.products.map((item) => [item.id, item]));
  const nodes = new Map(taxonomy.nodes.map((item) => [item.id, item]));
  const result = new Map<string, ProductExpectation>();
  for (const assignment of taxonomy.assignments) {
    const product = products.get(assignment.product_id);
    const leaf = nodes.get(assignment.taxonomy_node_id);
    const audience = leaf?.parent_id ? nodes.get(leaf.parent_id) : undefined;
    const root = audience?.parent_id ? nodes.get(audience.parent_id) : undefined;
    if (!product || !leaf || !audience || !root) continue;
    const fallback = `${product.name} custom B2B manufacturing by Irha Apparels in Sialkot. OEM, ODM and private-label requirements are reviewed before quotation and production commitments.`;
    result.set(cleanPath(assignment.canonical_path), {
      product, assignment, leaf, audience, root,
      expectedTitle: product.seo_title?.trim() || `${product.name} Wholesale Manufacturer | Sialkot Garment Factory`,
      expectedH1: product.name,
      expectedDescription: product.seo_description?.trim() || product.description?.slice(0, 158) || fallback,
      imageUrl: product.image_url || product.gallery?.find(Boolean) || "",
    });
  }
  return result;
}
function taxonomyExpectations(taxonomy: TaxonomyPayload) {
  const nodes = new Map(taxonomy.nodes.map((node) => [node.id, node]));
  const children = new Map<string, TaxonomyNode[]>();
  for (const node of taxonomy.nodes) if (node.parent_id) children.set(node.parent_id, [...(children.get(node.parent_id) || []), node]);
  const result = new Map<string, TaxonomyExpectation>();
  for (const node of taxonomy.nodes) {
    const audience = node.depth === 1 ? node : node.depth === 2 && node.parent_id ? nodes.get(node.parent_id) : undefined;
    const root = node.depth === 0 ? node : audience?.parent_id ? nodes.get(audience.parent_id) : undefined;
    if (!root) continue;
    const collection = node.depth === 2 ? node : undefined;
    const topName = localizedTopName("en", root.slug, root.name);
    const audienceName = audience ? localizedAudienceName("en", audience.slug, audience.name) : undefined;
    const collectionName = collection ? localizedCollectionName("en", collection.slug, collection.name) : undefined;
    const seo = localizedTaxonomySeo({ locale: "en", topName, audienceName, collectionName });
    const productCount = taxonomy.assignments.filter((assignment) => assignment.full_slug_path === node.full_slug_path || assignment.full_slug_path.startsWith(`${node.full_slug_path}/`)).length;
    const childPaths = node.depth < 2
      ? (children.get(node.id) || []).map((child) => `/products/${child.full_slug_path}`).sort()
      : taxonomy.assignments.filter((assignment) => assignment.taxonomy_node_id === node.id).map((assignment) => cleanPath(assignment.canonical_path)).sort();
    result.set(`/products/${node.full_slug_path}`, { node, root, audience, collection, expectedTitle: seo.title, expectedH1: seo.h1, expectedDescription: seo.description, productCount, childPaths });
  }
  return result;
}
async function imageStatus(url: string, cache: Map<string, number>) {
  if (!url) return null;
  const absolute = new URL(url, CANONICAL_ORIGIN).toString();
  if (cache.has(absolute)) return cache.get(absolute)!;
  try {
    let result = await request(absolute, "follow", "HEAD");
    if ([403, 405].includes(result.response.status)) result = await request(absolute, "follow", "GET");
    cache.set(absolute, result.response.status);
    return result.response.status;
  } catch { cache.set(absolute, 0); return 0; }
}
function classify(path: string, kinds: Map<string, string>) {
  if (path === "/") return "homepage";
  if (kinds.has(path)) return kinds.get(path)!;
  if (path.startsWith("/markets/") || path === "/markets") return "market";
  return "static";
}
async function crawlCanonical(path: string, kind: string, product: ProductExpectation | undefined, taxonomy: TaxonomyExpectation | undefined, sourceCommit: string, imageCache: Map<string, number>): Promise<CanonicalResult> {
  const findings: Finding[] = [];
  let status = 0, responseTimeMs = 0, finalUrl = requestUrl(path), text = "";
  let headers = new Headers();
  let hops: Array<{ status: number; from: string; to: string }> = [];
  try {
    const result = await followRedirects(requestUrl(path));
    status = result.response.status; responseTimeMs = result.elapsed; finalUrl = result.finalUrl; text = result.text; headers = result.response.headers; hops = result.hops;
  } catch (error) { add(findings, "critical", "request_failed", path, String(error)); }
  if (hops.length) add(findings, "critical", "canonical_redirect", path, `Canonical URL redirected through ${hops.length} hop(s)`);
  if (status !== 200) add(findings, "critical", "canonical_status", path, `Expected 200, received ${status}`);
  const signals = parsePage(text);
  const canonical = signals.canonical ? new URL(signals.canonical, CANONICAL_ORIGIN).toString() : "";
  const directives = `${signals.robots} ${headers.get("x-robots-tag") || ""}`.toLowerCase();
  if (!signals.title) add(findings, "high", "missing_title", path, "Title is missing");
  if (!signals.description) add(findings, "high", "missing_description", path, "Meta description is missing");
  if (!signals.h1) add(findings, "critical", "missing_h1", path, "Crawler-visible H1 is missing");
  if (canonical !== canonicalUrl(path)) add(findings, "critical", "wrong_canonical", path, `Expected ${canonicalUrl(path)}, received ${canonical || "missing"}`);
  if (directives.includes("noindex")) add(findings, "critical", "sitemap_noindex", path, "Indexable canonical is noindex");
  if (!signals.language) add(findings, "medium", "missing_language", path, "HTML language is missing");
  if (signals.schema.invalid) add(findings, "critical", "invalid_jsonld", path, "Invalid JSON-LD is present");
  if (signals.schema.forbiddenCommerce.length) add(findings, "critical", "unsupported_commerce_schema", path, `Unsupported commerce fields: ${signals.schema.forbiddenCommerce.join(", ")}`);
  if (signals.mainText.toLowerCase().includes("0 styles")) add(findings, "critical", "zero_styles", path, "Indexable route exposes 0 styles");
  if (signals.wordCount < 20) add(findings, "high", "thin_crawler_content", path, `Only ${signals.wordCount} crawler-visible words`);
  if (signals.routeShell && cleanPath(signals.routeShell) !== path) add(findings, "critical", "route_shell_mismatch", path, `Shell identifies ${signals.routeShell}`);

  if (path === "/") {
    for (const type of ["Organization", "WebSite", "WebPage"]) if (!signals.schema.types.includes(type)) add(findings, "high", "homepage_schema_missing", path, `${type} schema is missing`);
  }
  if (product) {
    if (signals.title !== product.expectedTitle) add(findings, "critical", "product_title_mismatch", path, `Expected “${product.expectedTitle}”, received “${signals.title}”`);
    if (signals.description !== product.expectedDescription) add(findings, "high", "product_description_mismatch", path, "Product meta description differs from runtime source");
    if (signals.h1 !== product.expectedH1) add(findings, "critical", "product_h1_mismatch", path, `Expected “${product.expectedH1}”, received “${signals.h1}”`);
    if (!signals.schema.types.includes("Product")) add(findings, "critical", "missing_product_schema", path, "Product schema is missing");
    if (!signals.schema.types.includes("BreadcrumbList")) add(findings, "high", "missing_breadcrumb_schema", path, "BreadcrumbList schema is missing");
    if (signals.schema.productNames.length && !signals.schema.productNames.includes(product.product.name)) add(findings, "high", "product_schema_name_mismatch", path, "Product schema name differs from visible product name");
    if (!signals.visibleBreadcrumb) add(findings, "high", "missing_visible_breadcrumb", path, "Visible breadcrumb is missing");
    if (!signals.inquiryCta) add(findings, "high", "missing_inquiry_cta", path, "Product inquiry CTA is missing");
    if (!signals.primaryImage) add(findings, "critical", "missing_product_image", path, "Primary product image is missing");
    if (!signals.primaryImageAlt.toLowerCase().includes(product.product.name.toLowerCase())) add(findings, "high", "product_image_alt_mismatch", path, "Primary image alt does not identify the product");
    const hierarchy = [`/products/${product.root.slug}`, `/products/${product.root.slug}/${product.audience.slug}`, `/products/${product.root.slug}/${product.audience.slug}/${product.leaf.slug}`];
    for (const parent of hierarchy) if (!signals.internalLinks.includes(parent)) add(findings, "high", "missing_hierarchy_link", path, `Missing hierarchy link ${parent}`);
    const hasRelated = signals.internalLinks.some((link) => link !== path && link.startsWith(`/products/${product.root.slug}/${product.audience.slug}/${product.leaf.slug}/`));
    if (!hasRelated) add(findings, "high", "missing_related_product_link", path, "No related canonical product link is crawler-visible");
  }
  if (taxonomy) {
    if (signals.title !== taxonomy.expectedTitle) add(findings, "critical", "taxonomy_title_mismatch", path, `Expected “${taxonomy.expectedTitle}”, received “${signals.title}”`);
    if (signals.description !== taxonomy.expectedDescription) add(findings, "high", "taxonomy_description_mismatch", path, "Taxonomy description differs from runtime source");
    if (signals.h1 !== taxonomy.expectedH1) add(findings, "critical", "taxonomy_h1_mismatch", path, `Expected “${taxonomy.expectedH1}”, received “${signals.h1}”`);
    if (taxonomy.productCount < 1) add(findings, "critical", "empty_taxonomy", path, "Published taxonomy has no products");
    if (!signals.schema.types.includes("CollectionPage")) add(findings, "high", "missing_collection_schema", path, "CollectionPage schema is missing");
    if (!signals.schema.types.includes("BreadcrumbList")) add(findings, "high", "missing_taxonomy_breadcrumb_schema", path, "Taxonomy BreadcrumbList schema is missing");
    if (!signals.visibleBreadcrumb) add(findings, "high", "missing_taxonomy_breadcrumb", path, "Visible taxonomy breadcrumb is missing");
    for (const child of taxonomy.childPaths) if (!signals.internalLinks.includes(child)) add(findings, "high", "missing_taxonomy_child_link", path, `Missing canonical child link ${child}`);
  }
  const imgStatus = await imageStatus(signals.primaryImage, imageCache);
  if (signals.primaryImage && (!imgStatus || imgStatus >= 400)) add(findings, "critical", "broken_primary_image", path, `Primary image returned ${imgStatus}`);
  return {
    requestedUrl: requestUrl(path), finalUrl, path, kind, status, redirectHops: hops, responseTimeMs,
    title: signals.title, metaDescription: signals.description, h1: signals.h1, canonical,
    robotsMeta: signals.robots, xRobotsTag: headers.get("x-robots-tag") || "", language: signals.language,
    hreflang: signals.hreflang, breadcrumb: signals.visibleBreadcrumb, primaryImage: signals.primaryImage,
    primaryImageAlt: signals.primaryImageAlt, imageStatus: imgStatus, structuredDataTypes: signals.schema.types,
    internalLinks: signals.internalLinks, wordCount: signals.wordCount, sourceCommit,
    duplicateContentFingerprint: signals.fingerprint,
    result: findings.some((item) => item.severity === "critical" || item.severity === "high") ? "fail" : "pass",
    findings,
  };
}
function parseCommittedRedirects(source: string) {
  const map = new Map<string, string>();
  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [fromRaw, toRaw, status] = line.split(/\s+/);
    if (status !== "301" || !fromRaw?.startsWith("/") || !toRaw?.startsWith("/") || fromRaw.includes("*") || toRaw.includes(":")) continue;
    const from = cleanPath(fromRaw), to = cleanPath(toRaw);
    if (from !== to) map.set(from, to);
  }
  return map;
}
async function crawlRedirect(sourcePath: string, expectedDestination: string, canonicalInventory: Set<string>): Promise<RedirectResult> {
  const findings: Finding[] = [];
  let status = 0, destinationStatus = 0, actualDestination = "", hops = 0;
  try {
    const first = await request(requestUrl(sourcePath), "manual");
    status = first.response.status;
    const location = first.response.headers.get("location");
    if (status !== 301) add(findings, "high", "redirect_status", sourcePath, `Expected 301, received ${status}`);
    if (!location) add(findings, "high", "redirect_location_missing", sourcePath, "Location header is missing");
    if (location) {
      actualDestination = cleanPath(new URL(location, requestUrl(sourcePath)).toString());
      hops = 1;
      if (actualDestination !== expectedDestination) add(findings, "high", "redirect_destination_mismatch", sourcePath, `Expected ${expectedDestination}, received ${actualDestination}`);
      const destination = await request(requestUrl(actualDestination), "manual");
      destinationStatus = destination.response.status;
      if (destinationStatus >= 300 && destinationStatus < 400) add(findings, "high", "redirect_chain", sourcePath, `Destination redirects again with ${destinationStatus}`);
      else if (destinationStatus !== 200) add(findings, "high", "redirect_dead_target", sourcePath, `Destination returned ${destinationStatus}`);
    }
  } catch (error) { add(findings, "high", "redirect_request_failed", sourcePath, String(error)); }
  if (sourcePath.startsWith("/products/") && actualDestination === "/") add(findings, "critical", "product_redirect_home", sourcePath, "Product alias redirects to homepage");
  if (actualDestination && !canonicalInventory.has(actualDestination)) add(findings, "high", "redirect_target_not_canonical", sourcePath, `Target is not canonical: ${actualDestination}`);
  return { sourcePath, expectedDestination, actualDestination, status, destinationStatus, hops, result: findings.length ? "fail" : "pass", findings };
}
async function functionalResult(path: string, sourceCommit: string): Promise<CanonicalResult> {
  const findings: Finding[] = [];
  const result = await followRedirects(requestUrl(path));
  const signals = parsePage(result.text);
  const directives = `${signals.robots} ${result.response.headers.get("x-robots-tag") || ""}`.toLowerCase();
  if (![200, 404, 410].includes(result.response.status)) add(findings, "high", "functional_status", path, `Unexpected functional status ${result.response.status}`);
  if (!directives.includes("noindex")) add(findings, "critical", "functional_indexable", path, "Functional/private route lacks noindex protection");
  return {
    requestedUrl: requestUrl(path), finalUrl: result.finalUrl, path, kind: "functional_noindex", status: result.response.status,
    redirectHops: result.hops, responseTimeMs: result.elapsed, title: signals.title, metaDescription: signals.description,
    h1: signals.h1, canonical: signals.canonical ? new URL(signals.canonical, CANONICAL_ORIGIN).toString() : "",
    robotsMeta: signals.robots, xRobotsTag: result.response.headers.get("x-robots-tag") || "", language: signals.language,
    hreflang: signals.hreflang, breadcrumb: signals.visibleBreadcrumb, primaryImage: signals.primaryImage,
    primaryImageAlt: signals.primaryImageAlt, imageStatus: null, structuredDataTypes: signals.schema.types,
    internalLinks: signals.internalLinks, wordCount: signals.wordCount, sourceCommit,
    duplicateContentFingerprint: signals.fingerprint, result: findings.length ? "fail" : "pass", findings,
  };
}
async function missingResult(path: string, sourceCommit: string): Promise<CanonicalResult> {
  const findings: Finding[] = [];
  const result = await followRedirects(requestUrl(path));
  const signals = parsePage(result.text);
  const directives = `${signals.robots} ${result.response.headers.get("x-robots-tag") || ""}`.toLowerCase();
  if (![404, 410].includes(result.response.status)) add(findings, "critical", "missing_route_not_404", path, `Expected 404/410, received ${result.response.status}`);
  if (cleanPath(result.finalUrl) === "/") add(findings, "critical", "missing_route_home_redirect", path, "Missing route redirected to homepage");
  if (!directives.includes("noindex")) add(findings, "high", "missing_route_indexable", path, "Missing route lacks noindex");
  return {
    requestedUrl: requestUrl(path), finalUrl: result.finalUrl, path, kind: "expected_404", status: result.response.status,
    redirectHops: result.hops, responseTimeMs: result.elapsed, title: signals.title, metaDescription: signals.description,
    h1: signals.h1, canonical: signals.canonical ? new URL(signals.canonical, CANONICAL_ORIGIN).toString() : "",
    robotsMeta: signals.robots, xRobotsTag: result.response.headers.get("x-robots-tag") || "", language: signals.language,
    hreflang: signals.hreflang, breadcrumb: signals.visibleBreadcrumb, primaryImage: signals.primaryImage,
    primaryImageAlt: signals.primaryImageAlt, imageStatus: null, structuredDataTypes: signals.schema.types,
    internalLinks: signals.internalLinks, wordCount: signals.wordCount, sourceCommit,
    duplicateContentFingerprint: signals.fingerprint, result: findings.length ? "fail" : "pass", findings,
  };
}
async function chromeBinary() {
  for (const command of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try { const { stdout } = await execFileAsync("which", [command]); if (stdout.trim()) return stdout.trim(); } catch { /* try next */ }
  }
  return "";
}
async function renderedDom(chrome: string, url: string) {
  let last = "";
  let error: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const { stdout } = await execFileAsync(chrome, ["--headless=new", "--no-sandbox", "--disable-gpu", "--disable-dev-shm-usage", "--hide-scrollbars", "--virtual-time-budget=10000", "--dump-dom", url], { timeout: 35_000, maxBuffer: 25 * 1024 * 1024 });
      last = stdout;
      const signals = parsePage(stdout);
      if (signals.title && signals.h1 && signals.canonical) return { html: stdout, attempts: attempt };
    } catch (caught) { error = caught; }
    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
  }
  if (!last && error) throw error;
  return { html: last, attempts: 3 };
}
function representativePaths(taxonomy: TaxonomyPayload, products: Map<string, ProductExpectation>) {
  const paths = new Set<string>(["/"]);
  const roots = taxonomy.nodes.filter((node) => node.depth === 0).sort((a, b) => a.full_slug_path.localeCompare(b.full_slug_path));
  for (const root of roots) {
    paths.add(`/products/${root.full_slug_path}`);
    taxonomy.nodes.filter((node) => node.depth === 1 && node.full_slug_path.startsWith(`${root.full_slug_path}/`)).sort((a, b) => a.full_slug_path.localeCompare(b.full_slug_path)).slice(0, 2).forEach((node) => paths.add(`/products/${node.full_slug_path}`));
    taxonomy.nodes.filter((node) => node.depth === 2 && node.full_slug_path.startsWith(`${root.full_slug_path}/`)).sort((a, b) => a.full_slug_path.localeCompare(b.full_slug_path)).slice(0, 2).forEach((node) => paths.add(`/products/${node.full_slug_path}`));
    [...products].filter(([, value]) => value.root.id === root.id).sort(([a], [b]) => a.localeCompare(b)).slice(0, 5).forEach(([path]) => paths.add(path));
  }
  return [...paths];
}
async function browserParity(path: string, chrome: string, initial: CanonicalResult): Promise<BrowserParityResult> {
  const findings: Finding[] = [];
  let rendered = parsePage("");
  let attempts = 0;
  try { const result = await renderedDom(chrome, requestUrl(path)); attempts = result.attempts; rendered = parsePage(result.html); }
  catch (error) { add(findings, "high", "browser_render_failed", path, String(error)); }
  if (!rendered.title || !rendered.h1 || !rendered.canonical) add(findings, "high", "browser_dom_incomplete", path, `Rendered DOM remained incomplete after ${attempts || 3} attempt(s)`);
  if (rendered.title !== initial.title) add(findings, "high", "runtime_title_mismatch", path, `Initial “${initial.title}”, rendered “${rendered.title}”`);
  if (rendered.description !== initial.metaDescription) add(findings, "high", "runtime_description_mismatch", path, "Initial and rendered meta descriptions differ");
  if (rendered.h1 !== initial.h1) add(findings, "high", "runtime_h1_mismatch", path, `Initial “${initial.h1}”, rendered “${rendered.h1}”`);
  const renderedCanonical = rendered.canonical ? new URL(rendered.canonical, CANONICAL_ORIGIN).toString() : "";
  if (renderedCanonical !== initial.canonical) add(findings, "high", "runtime_canonical_mismatch", path, `Initial ${initial.canonical}, rendered ${renderedCanonical}`);
  return { path, attempts, initialTitle: initial.title, renderedTitle: rendered.title, initialDescription: initial.metaDescription, renderedDescription: rendered.description, initialH1: initial.h1, renderedH1: rendered.h1, initialCanonical: initial.canonical, renderedCanonical, result: findings.length ? "fail" : "pass", findings };
}
function csv(value: unknown) { const raw = typeof value === "string" ? value : JSON.stringify(value ?? ""); return `"${raw.replace(/"/g, '""')}"`; }
function severityCounts(findings: Finding[]) { return { critical: findings.filter((x) => x.severity === "critical").length, high: findings.filter((x) => x.severity === "high").length, medium: findings.filter((x) => x.severity === "medium").length, low: findings.filter((x) => x.severity === "low").length }; }

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const [sitemapResponse, robotsResponse, buildResponse, release, taxonomy, dynamicEntries, approvedRedirectRows] = await Promise.all([
    request(`${ORIGIN}/sitemap.xml`, "manual"), request(`${ORIGIN}/robots.txt`, "manual"), request(`${ORIGIN}/build.json`, "manual"),
    rpc<ReleasePayload>("catalog_get_public_release"), rpc<TaxonomyPayload>("catalog_get_public_taxonomy"), rpc<SitemapEntry[]>("get_public_sitemap_entries"), allApprovedRedirects(),
  ]);
  const findings: Finding[] = [];
  if (sitemapResponse.response.status !== 200) add(findings, "critical", "sitemap_status", "/sitemap.xml", `Received ${sitemapResponse.response.status}`);
  if (robotsResponse.response.status !== 200) add(findings, "critical", "robots_status", "/robots.txt", `Received ${robotsResponse.response.status}`);
  if (buildResponse.response.status !== 200) add(findings, "critical", "build_identity_status", "/build.json", `Received ${buildResponse.response.status}`);
  const buildIdentity = JSON.parse(buildResponse.text || "{}") as Record<string, unknown>;
  const sourceCommit = typeof buildIdentity.source_commit === "string" ? buildIdentity.source_commit : "";
  if (EXPECTED_SOURCE_SHA && sourceCommit !== EXPECTED_SOURCE_SHA) add(findings, "critical", "source_commit_mismatch", "/build.json", `Expected ${EXPECTED_SOURCE_SHA}, received ${sourceCommit}`);
  if (buildIdentity.repository !== "irhaapparelsofficial-ctrl/irha-global-craft-f3881330") add(findings, "critical", "repository_mismatch", "/build.json", String(buildIdentity.repository));
  if (buildIdentity.supabase_project_id !== OWNER_SUPABASE_PROJECT_ID) add(findings, "critical", "supabase_project_mismatch", "/build.json", String(buildIdentity.supabase_project_id));
  if (buildIdentity.source_identity_state !== "verified") add(findings, "critical", "source_identity_unverified", "/build.json", String(buildIdentity.source_identity_state));

  const products = productExpectations(release, taxonomy);
  const taxonomies = taxonomyExpectations(taxonomy);
  if (products.size !== EXPECTED_PRODUCTS) add(findings, "critical", "canonical_product_count", "/", `Expected ${EXPECTED_PRODUCTS}, received ${products.size}`);
  if (taxonomies.size !== EXPECTED_TAXONOMY) add(findings, "critical", "taxonomy_count", "/", `Expected ${EXPECTED_TAXONOMY}, received ${taxonomies.size}`);
  if (approvedRedirectRows.length < 1258) add(findings, "critical", "approved_redirect_pagination", "/", `Expected at least 1258 approved rows, received ${approvedRedirectRows.length}`);

  const sitemapRows = parseSitemap(sitemapResponse.text);
  const sitemapPaths = sitemapRows.map((row) => row.path);
  const sitemapSet = new Set(sitemapPaths);
  if (sitemapSet.size !== sitemapPaths.length) add(findings, "critical", "duplicate_sitemap_urls", "/sitemap.xml", `${sitemapPaths.length - sitemapSet.size} duplicates`);
  const dynamicKind = new Map(dynamicEntries.map((entry) => [cleanPath(entry.path), entry.entry_kind]));
  if (dynamicEntries.length !== EXPECTED_DYNAMIC) add(findings, "critical", "dynamic_sitemap_count", "/sitemap.xml", `Expected ${EXPECTED_DYNAMIC}, received ${dynamicEntries.length}`);
  for (const entry of dynamicEntries) if (!sitemapSet.has(cleanPath(entry.path))) add(findings, "critical", "dynamic_url_missing_from_sitemap", entry.path, `${entry.entry_kind} route is missing`);
  for (const row of sitemapRows) {
    if (row.url !== canonicalUrl(row.path)) add(findings, "critical", "sitemap_origin_mismatch", row.path, `Expected ${canonicalUrl(row.path)}, received ${row.url}`);
    if (row.path.startsWith("/intl/")) add(findings, "critical", "unreviewed_localized_sitemap_url", row.path, "Localized URL leaked into sitemap");
    if (/^\/(?:admin|dashboard|login|auth)(?:\/|$)/.test(row.path)) add(findings, "critical", "private_sitemap_url", row.path, "Private route leaked into sitemap");
    if (row.lastmod && (Number.isNaN(Date.parse(row.lastmod)) || Date.parse(row.lastmod) > Date.now() + 300_000)) add(findings, "high", "invalid_sitemap_lastmod", row.path, row.lastmod);
  }
  if (!robotsResponse.text.includes(`Sitemap: ${CANONICAL_ORIGIN}/sitemap.xml`)) add(findings, "high", "robots_sitemap_missing", "/robots.txt", "Canonical sitemap declaration is missing");

  const imageCache = new Map<string, number>();
  const canonicalResults = await mapLimit(sitemapPaths, CANONICAL_CONCURRENCY, async (path, index) => {
    if (index % 50 === 0) console.log(`[crawl] canonical ${index}/${sitemapPaths.length}`);
    return crawlCanonical(path, classify(path, dynamicKind), products.get(path), taxonomies.get(path), sourceCommit, imageCache);
  });
  const canonicalByPath = new Map(canonicalResults.map((row) => [row.path, row]));
  const homeFingerprint = canonicalByPath.get("/")?.duplicateContentFingerprint;
  for (const row of canonicalResults) if (row.path !== "/" && homeFingerprint && row.duplicateContentFingerprint === homeFingerprint) { add(row.findings, "critical", "homepage_fallback", row.path, "Route serves homepage crawler content"); row.result = "fail"; }
  const fingerprints = new Map<string, CanonicalResult[]>();
  for (const row of canonicalResults) { const list = fingerprints.get(row.duplicateContentFingerprint) || []; list.push(row); fingerprints.set(row.duplicateContentFingerprint, list); }
  for (const group of fingerprints.values()) if (group.length > 1) for (const row of group) { add(row.findings, "high", "duplicate_crawler_content", row.path, `Shares content with ${group.filter((x) => x.path !== row.path).map((x) => x.path).join(", ")}`); row.result = "fail"; }

  const redirectsSource = await readFile("public/_redirects", "utf8");
  const redirectMap = parseCommittedRedirects(redirectsSource);
  for (const approved of approvedRedirectRows) {
    const source = cleanPath(approved.from_path);
    if (!redirectMap.has(source)) add(findings, "high", "approved_redirect_missing", source, "Approved alias is absent from generated redirects");
  }
  const redirectResults = await mapLimit([...redirectMap], REDIRECT_CONCURRENCY, async ([source, target], index) => {
    if (index % 100 === 0) console.log(`[crawl] redirects ${index}/${redirectMap.size}`);
    return crawlRedirect(source, target, sitemapSet);
  });

  const functionalResults = await mapLimit([...FUNCTIONAL_PATHS], 4, (path) => functionalResult(path, sourceCommit));
  const missingResults = await mapLimit([...EXPECTED_MISSING_PATHS], 2, (path) => missingResult(path, sourceCommit));
  for (const row of [...FUNCTIONAL_PATHS, ...EXPECTED_MISSING_PATHS]) if (sitemapSet.has(row)) add(findings, "critical", "noncanonical_sitemap_url", row, "Functional or missing path is present in sitemap");

  const browserResults: BrowserParityResult[] = [];
  const chrome = await chromeBinary();
  if (!chrome) add(findings, "high", "browser_unavailable", "/", "Chrome/Chromium is unavailable");
  else {
    const paths = representativePaths(taxonomy, products).filter((path) => canonicalByPath.has(path));
    browserResults.push(...await mapLimit(paths, BROWSER_CONCURRENCY, async (path, index) => {
      if (index % 10 === 0) console.log(`[crawl] browser ${index}/${paths.length}`);
      return browserParity(path, chrome, canonicalByPath.get(path)!);
    }));
  }

  for (const row of canonicalResults) findings.push(...row.findings);
  for (const row of redirectResults) findings.push(...row.findings);
  for (const row of functionalResults) findings.push(...row.findings);
  for (const row of missingResults) findings.push(...row.findings);
  for (const row of browserResults) findings.push(...row.findings);
  const counts = severityCounts(findings);
  const inventory = {
    generatedAt: new Date().toISOString(), origin: ORIGIN, canonicalOrigin: CANONICAL_ORIGIN, sourceCommit,
    expectedSourceCommit: EXPECTED_SOURCE_SHA, supabaseProject: OWNER_SUPABASE_PROJECT_ID,
    sitemapUrlCount: sitemapRows.length, dynamicProducts: [...dynamicKind.values()].filter((x) => x === "product").length,
    dynamicTaxonomy: [...dynamicKind.values()].filter((x) => x === "taxonomy").length,
    staticAndMarketPages: sitemapRows.length - dynamicEntries.length, approvedRedirectRegistryRows: approvedRedirectRows.length,
    redirectsVerified: redirectResults.length, browserRepresentativePaths: browserResults.map((row) => row.path),
  };
  const summary = {
    canonicalPassed: canonicalResults.filter((x) => x.result === "pass").length,
    canonicalFailed: canonicalResults.filter((x) => x.result === "fail").length,
    redirectsPassed: redirectResults.filter((x) => x.result === "pass").length,
    redirectsFailed: redirectResults.filter((x) => x.result === "fail").length,
    functionalPassed: functionalResults.filter((x) => x.result === "pass").length,
    functionalFailed: functionalResults.filter((x) => x.result === "fail").length,
    missingPassed: missingResults.filter((x) => x.result === "pass").length,
    missingFailed: missingResults.filter((x) => x.result === "fail").length,
    browserPassed: browserResults.filter((x) => x.result === "pass").length,
    browserFailed: browserResults.filter((x) => x.result === "fail").length,
    findings: counts,
  };
  const report = { schemaVersion: 2, inventory, summary, buildIdentity, robots: robotsResponse.text, sitemapRows, canonicalResults, redirectResults, functionalResults, missingResults, browserResults, findings };
  const pageHeaders = ["path", "kind", "status", "finalUrl", "title", "metaDescription", "h1", "canonical", "robotsMeta", "xRobotsTag", "language", "breadcrumb", "primaryImage", "imageStatus", "structuredDataTypes", "internalLinkCount", "wordCount", "sourceCommit", "fingerprint", "result", "findings"];
  const pageCsv = [pageHeaders.join(","), ...[...canonicalResults, ...functionalResults, ...missingResults].map((row) => [row.path, row.kind, row.status, row.finalUrl, row.title, row.metaDescription, row.h1, row.canonical, row.robotsMeta, row.xRobotsTag, row.language, row.breadcrumb, row.primaryImage, row.imageStatus, row.structuredDataTypes, row.internalLinks.length, row.wordCount, row.sourceCommit, row.duplicateContentFingerprint, row.result, row.findings].map(csv).join(","))].join("\n");
  const redirectCsv = ["sourcePath,expectedDestination,actualDestination,status,destinationStatus,hops,result,findings", ...redirectResults.map((row) => [row.sourcePath, row.expectedDestination, row.actualDestination, row.status, row.destinationStatus, row.hops, row.result, row.findings].map(csv).join(","))].join("\n");
  const markdown = [
    "# Irha Apparels Route Parity", "", `- Generated: ${inventory.generatedAt}`, `- Crawled origin: \`${ORIGIN}\``,
    `- Canonical origin: \`${CANONICAL_ORIGIN}\``, `- Source commit: \`${sourceCommit}\``, `- Sitemap URLs: ${inventory.sitemapUrlCount}`,
    `- Products: ${inventory.dynamicProducts}`, `- Taxonomy: ${inventory.dynamicTaxonomy}`, `- Static/market: ${inventory.staticAndMarketPages}`,
    `- Approved redirect rows: ${inventory.approvedRedirectRegistryRows}`, `- Redirects verified: ${inventory.redirectsVerified}`,
    `- Canonical pass/fail: ${summary.canonicalPassed}/${summary.canonicalFailed}`, `- Redirect pass/fail: ${summary.redirectsPassed}/${summary.redirectsFailed}`,
    `- Browser pass/fail: ${summary.browserPassed}/${summary.browserFailed}`, `- Findings: critical ${counts.critical}, high ${counts.high}, medium ${counts.medium}, low ${counts.low}`,
    "", "## Blocking findings", "", ...findings.filter((x) => x.severity === "critical" || x.severity === "high").slice(0, 500).map((x) => `- **${x.severity.toUpperCase()} ${x.code}** \`${x.path}\` — ${x.message}`),
  ].join("\n");
  await Promise.all([
    writeFile(`${OUTPUT_DIR}/production-route-parity.json`, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(`${OUTPUT_DIR}/canonical-pages.csv`, `${pageCsv}\n`), writeFile(`${OUTPUT_DIR}/redirects.csv`, `${redirectCsv}\n`),
    writeFile(`${OUTPUT_DIR}/inventory.json`, `${JSON.stringify(inventory, null, 2)}\n`), writeFile(`${OUTPUT_DIR}/summary.md`, `${markdown}\n`),
  ]);
  console.log(markdown);
  if (counts.critical || counts.high) process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(`${OUTPUT_DIR}/fatal-error.txt`, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  console.error(error);
  process.exit(1);
});
