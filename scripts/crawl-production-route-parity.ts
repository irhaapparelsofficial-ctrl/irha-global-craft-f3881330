import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import {
  OWNER_SUPABASE_PROJECT_ID,
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const execFileAsync = promisify(execFile);
const ORIGIN = process.env.CRAWL_ORIGIN?.replace(/\/$/, "") || "https://irhaapparels.com";
const EXPECTED_PRODUCTION_SHA = process.env.EXPECTED_PRODUCTION_SHA || "";
const OUTPUT_DIR = process.env.CRAWL_OUTPUT_DIR || "artifacts/production-route-parity";
const USER_AGENT = "IrhaRouteParity/1.0 (+https://irhaapparels.com)";
const EXPECTED_PRODUCTS = 254;
const EXPECTED_TAXONOMY = 105;
const REQUEST_TIMEOUT_MS = 20_000;
const CANONICAL_CONCURRENCY = 12;
const REDIRECT_CONCURRENCY = 16;
const BROWSER_CONCURRENCY = 4;

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
type Finding = {
  severity: Severity;
  code: string;
  path: string;
  message: string;
};

type SitemapEntry = {
  path: string;
  image_url: string | null;
  lastmod: string | null;
  entry_kind: "product" | "taxonomy";
};

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
  imageUrl: string;
};

type PageSignals = {
  title: string;
  description: string;
  h1: string;
  canonical: string;
  robots: string;
  language: string;
  hreflang: Array<{ lang: string; href: string }>;
  schemaTypes: string[];
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
  contentType: string;
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
  crawlerVisibleMainContent: string;
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
  initialTitle: string;
  renderedTitle: string;
  initialH1: string;
  renderedH1: string;
  initialCanonical: string;
  renderedCanonical: string;
  result: "pass" | "fail";
  findings: Finding[];
};

function cleanPath(value: string): string {
  if (!value) return "/";
  const parsed = value.startsWith("http") ? new URL(value) : new URL(value, ORIGIN);
  const path = decodeURIComponent(parsed.pathname).replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  return path;
}

function absoluteUrl(value: string, base = ORIGIN): string {
  return new URL(value, base).toString();
}

function decodeHtml(value: string): string {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function stripHtml(value: string): string {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
      .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<[^>]+>/g, " "),
  ).replace(/\s+/g, " ").trim();
}

function firstMatch(html: string, expression: RegExp): string {
  return decodeHtml(html.match(expression)?.[1]?.replace(/\s+/g, " ").trim() || "");
}

function attribute(tag: string, name: string): string {
  const pattern = new RegExp(`${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i");
  const match = tag.match(pattern);
  return decodeHtml(match?.[1] ?? match?.[2] ?? match?.[3] ?? "");
}

function findMeta(html: string, key: string, value: string): string {
  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, key).toLowerCase() === value.toLowerCase()) return attribute(tag, "content");
  }
  return "";
}

function findLink(html: string, rel: string): string {
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (attribute(tag, "rel").split(/\s+/).map((part) => part.toLowerCase()).includes(rel.toLowerCase())) {
      return attribute(tag, "href");
    }
  }
  return "";
}

function allLinks(html: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a\b[^>]*>/gi)) {
    const href = attribute(match[0], "href");
    if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:")) continue;
    try {
      const url = new URL(href, ORIGIN);
      if (url.origin === ORIGIN) links.add(cleanPath(url.toString()));
    } catch {
      // Ignore malformed links; the missing link is surfaced through the page result rather than crashing the crawl.
    }
  }
  return [...links].sort();
}

function jsonLdTypes(html: string): string[] {
  const types = new Set<string>();
  const visit = (value: unknown) => {
    if (Array.isArray(value)) {
      value.forEach(visit);
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    const type = record["@type"];
    if (typeof type === "string") types.add(type);
    if (Array.isArray(type)) type.filter((item): item is string => typeof item === "string").forEach((item) => types.add(item));
    Object.values(record).forEach(visit);
  };
  for (const match of html.matchAll(/<script\b[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      visit(JSON.parse(match[1]));
    } catch {
      types.add("InvalidJSONLD");
    }
  }
  return [...types].sort();
}

function parsePage(html: string): PageSignals {
  const title = firstMatch(html, /<title[^>]*>([\s\S]*?)<\/title>/i);
  const description = findMeta(html, "name", "description");
  const h1 = stripHtml(html.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const canonical = findLink(html, "canonical");
  const robots = findMeta(html, "name", "robots");
  const htmlTag = html.match(/<html\b[^>]*>/i)?.[0] || "";
  const language = attribute(htmlTag, "lang");
  const hreflang: Array<{ lang: string; href: string }> = [];
  for (const match of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = match[0];
    if (!attribute(tag, "rel").toLowerCase().split(/\s+/).includes("alternate")) continue;
    const lang = attribute(tag, "hreflang");
    const href = attribute(tag, "href");
    if (lang && href) hreflang.push({ lang, href });
  }
  const mainHtml = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1] || "";
  const mainText = stripHtml(mainHtml);
  const normalized = mainText.toLowerCase().replace(/\b\d+\b/g, "#").replace(/\s+/g, " ").trim();
  const imageTag = mainHtml.match(/<img\b[^>]*>/i)?.[0] || html.match(/<img\b[^>]*>/i)?.[0] || "";
  const primaryImage = attribute(imageTag, "src") || findMeta(html, "property", "og:image");
  const primaryImageAlt = attribute(imageTag, "alt");
  const internalLinks = allLinks(html);
  return {
    title,
    description,
    h1,
    canonical,
    robots,
    language,
    hreflang,
    schemaTypes: jsonLdTypes(html),
    internalLinks,
    primaryImage,
    primaryImageAlt,
    visibleBreadcrumb: /aria-label=["']breadcrumb["']/i.test(html),
    inquiryCta: internalLinks.includes("/inquiry") || /href=["']\/inquiry(?:[?"'])/i.test(html),
    wordCount: mainText ? mainText.split(/\s+/).filter(Boolean).length : 0,
    mainText,
    fingerprint: createHash("sha256").update(normalized).digest("hex"),
    routeShell: firstMatch(html, /data-irha-route-shell=["']([^"']+)["']/i),
  };
}

async function rpc<T>(name: string): Promise<T> {
  const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/rpc/${name}`, {
    method: "POST",
    headers: {
      apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
      "Content-Type": "application/json",
      "User-Agent": USER_AGENT,
    },
    body: "{}",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error(`RPC ${name} failed: ${response.status} ${await response.text()}`);
  return (await response.json()) as T;
}

async function request(url: string, redirect: RequestRedirect = "manual", method = "GET"): Promise<{ response: Response; elapsed: number; text: string }> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    const started = performance.now();
    try {
      const response = await fetch(url, {
        method,
        redirect,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: method === "GET" ? "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8" : "*/*",
          "Cache-Control": "no-cache",
        },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
      const text = method === "HEAD" ? "" : await response.text();
      return { response, elapsed: Math.round(performance.now() - started), text };
    } catch (error) {
      lastError = error;
      if (attempt < 3) await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
  throw lastError instanceof Error ? lastError : new Error(String(lastError));
}

async function followRedirects(startUrl: string, maxHops = 5) {
  const hops: Array<{ status: number; from: string; to: string }> = [];
  let current = startUrl;
  for (let index = 0; index <= maxHops; index += 1) {
    const result = await request(current, "manual");
    const location = result.response.headers.get("location");
    if (result.response.status >= 300 && result.response.status < 400 && location) {
      const next = absoluteUrl(location, current);
      hops.push({ status: result.response.status, from: current, to: next });
      current = next;
      continue;
    }
    return { ...result, finalUrl: current, hops };
  }
  throw new Error(`Redirect loop or chain exceeded ${maxHops} hops: ${startUrl}`);
}

async function mapLimit<T, R>(items: T[], limit: number, worker: (item: T, index: number) => Promise<R>): Promise<R[]> {
  const output = new Array<R>(items.length);
  let cursor = 0;
  const runners = Array.from({ length: Math.min(limit, Math.max(items.length, 1)) }, async () => {
    while (true) {
      const index = cursor;
      cursor += 1;
      if (index >= items.length) return;
      output[index] = await worker(items[index], index);
    }
  });
  await Promise.all(runners);
  return output;
}

function parseSitemap(xml: string): Array<{ url: string; lastmod: string }> {
  const rows: Array<{ url: string; lastmod: string }> = [];
  for (const block of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const url = decodeHtml(block[1].match(/<loc>([^<]+)<\/loc>/i)?.[1] || "");
    const lastmod = block[1].match(/<lastmod>([^<]+)<\/lastmod>/i)?.[1] || "";
    if (url) rows.push({ url, lastmod });
  }
  return rows;
}

function classifyPath(path: string, dynamicKind: Map<string, string>): string {
  if (path === "/") return "homepage";
  if (dynamicKind.has(path)) return dynamicKind.get(path)!;
  if (FUNCTIONAL_PATHS.includes(path as (typeof FUNCTIONAL_PATHS)[number])) return "functional_noindex";
  if (path.startsWith("/markets/") || path.startsWith("/locations/")) return "market";
  return "static";
}

function productExpectations(release: ReleasePayload, taxonomy: TaxonomyPayload): Map<string, ProductExpectation> {
  const products = new Map(release.products.map((product) => [product.id, product]));
  const nodes = new Map(taxonomy.nodes.map((node) => [node.id, node]));
  const output = new Map<string, ProductExpectation>();
  for (const assignment of taxonomy.assignments) {
    const product = products.get(assignment.product_id);
    const leaf = nodes.get(assignment.taxonomy_node_id);
    const audience = leaf?.parent_id ? nodes.get(leaf.parent_id) : undefined;
    const root = audience?.parent_id ? nodes.get(audience.parent_id) : undefined;
    if (!product || !leaf || !audience || !root) continue;
    const imageUrl = product.image_url || product.gallery?.find(Boolean) || "";
    output.set(cleanPath(assignment.canonical_path), {
      product,
      assignment,
      leaf,
      audience,
      root,
      expectedTitle: product.seo_title || `${product.name} Wholesale Manufacturer | Irha Apparels`,
      expectedH1: product.name,
      imageUrl,
    });
  }
  return output;
}

function taxonomyCounts(taxonomy: TaxonomyPayload): Map<string, number> {
  const counts = new Map<string, number>();
  for (const node of taxonomy.nodes) {
    const count = taxonomy.assignments.filter((assignment) =>
      assignment.full_slug_path === node.full_slug_path || assignment.full_slug_path.startsWith(`${node.full_slug_path}/`),
    ).length;
    counts.set(`/products/${node.full_slug_path}`, count);
  }
  return counts;
}

async function imageStatus(url: string, cache: Map<string, number>): Promise<number | null> {
  if (!url) return null;
  const absolute = absoluteUrl(url);
  if (cache.has(absolute)) return cache.get(absolute)!;
  try {
    let result = await request(absolute, "follow", "HEAD");
    if (result.response.status === 405 || result.response.status === 403) result = await request(absolute, "follow", "GET");
    cache.set(absolute, result.response.status);
    return result.response.status;
  } catch {
    cache.set(absolute, 0);
    return 0;
  }
}

function expectedCanonical(path: string): string {
  return path === "/" ? `${ORIGIN}/` : `${ORIGIN}${path}`;
}

function add(findings: Finding[], severity: Severity, code: string, path: string, message: string) {
  findings.push({ severity, code, path, message });
}

async function crawlCanonical(
  url: string,
  kind: string,
  products: Map<string, ProductExpectation>,
  taxonomyByPath: Map<string, TaxonomyNode>,
  taxonomyProductCounts: Map<string, number>,
  buildCommit: string,
  imageCache: Map<string, number>,
): Promise<CanonicalResult> {
  const path = cleanPath(url);
  const findings: Finding[] = [];
  let status = 0;
  let finalUrl = url;
  let elapsed = 0;
  let text = "";
  let headers = new Headers();
  let hops: Array<{ status: number; from: string; to: string }> = [];
  try {
    const result = await followRedirects(url);
    status = result.response.status;
    finalUrl = result.finalUrl;
    elapsed = result.elapsed;
    text = result.text;
    headers = result.response.headers;
    hops = result.hops;
  } catch (error) {
    add(findings, "critical", "request_failed", path, String(error));
  }
  if (hops.length) add(findings, "critical", "canonical_redirect", path, `Canonical URL redirected through ${hops.length} hop(s)`);
  if (status !== 200) add(findings, "critical", "canonical_status", path, `Expected HTTP 200, received ${status}`);
  const signals = parsePage(text);
  const canonicalExpected = expectedCanonical(path);
  const canonicalActual = signals.canonical ? absoluteUrl(signals.canonical) : "";
  if (!signals.title) add(findings, "high", "missing_title", path, "Page title is missing");
  if (!signals.h1) add(findings, "critical", "missing_h1", path, "Crawler-visible H1 is missing");
  if (!signals.description) add(findings, "medium", "missing_description", path, "Meta description is missing");
  if (!canonicalActual) add(findings, "critical", "missing_canonical", path, "Canonical link is missing");
  else if (canonicalActual !== canonicalExpected) add(findings, "critical", "wrong_canonical", path, `Expected ${canonicalExpected}, received ${canonicalActual}`);
  const robots = `${signals.robots} ${headers.get("x-robots-tag") || ""}`.toLowerCase();
  if (robots.includes("noindex")) add(findings, "critical", "sitemap_noindex", path, "Sitemap URL is noindex");
  if (!signals.language) add(findings, "medium", "missing_language", path, "HTML language is missing");
  if (signals.mainText.toLowerCase().includes("0 styles")) add(findings, "critical", "zero_styles", path, "Indexable route exposes 0 styles");
  if (signals.wordCount < 20) add(findings, "high", "thin_crawler_content", path, `Crawler-visible main content has ${signals.wordCount} words`);
  if (signals.routeShell && cleanPath(signals.routeShell) !== path) add(findings, "critical", "route_shell_mismatch", path, `Route shell identifies ${signals.routeShell}`);

  const product = products.get(path);
  const taxonomyNode = taxonomyByPath.get(path);
  if (product) {
    if (signals.title !== product.expectedTitle) add(findings, "critical", "product_title_mismatch", path, `Expected title “${product.expectedTitle}”, received “${signals.title}”`);
    if (signals.h1 !== product.expectedH1) add(findings, "critical", "product_h1_mismatch", path, `Expected H1 “${product.expectedH1}”, received “${signals.h1}”`);
    if (!signals.schemaTypes.includes("Product")) add(findings, "critical", "missing_product_schema", path, "Product schema is missing");
    if (!signals.schemaTypes.includes("BreadcrumbList")) add(findings, "high", "missing_breadcrumb_schema", path, "BreadcrumbList schema is missing");
    if (!signals.visibleBreadcrumb) add(findings, "high", "missing_visible_breadcrumb", path, "Visible breadcrumb is missing");
    if (!signals.inquiryCta) add(findings, "high", "missing_inquiry_cta", path, "Product inquiry CTA is missing");
    if (!signals.primaryImage) add(findings, "critical", "missing_product_image", path, "Primary product image is missing");
    if (!signals.primaryImageAlt.toLowerCase().includes(product.product.name.toLowerCase())) {
      add(findings, "high", "product_image_alt_mismatch", path, "Primary image alt text does not identify the product");
    }
    const hierarchy = [
      `/products/${product.root.slug}`,
      `/products/${product.root.slug}/${product.audience.slug}`,
      `/products/${product.root.slug}/${product.audience.slug}/${product.leaf.slug}`,
    ];
    for (const parent of hierarchy) {
      if (!signals.internalLinks.includes(parent)) add(findings, "high", "missing_hierarchy_link", path, `Missing canonical hierarchy link to ${parent}`);
    }
  } else if (taxonomyNode) {
    const count = taxonomyProductCounts.get(path) || 0;
    if (count < 1) add(findings, "critical", "empty_taxonomy", path, "Published taxonomy route has no published products");
    if (!signals.visibleBreadcrumb && taxonomyNode.depth > 0) add(findings, "high", "missing_taxonomy_breadcrumb", path, "Taxonomy breadcrumb is missing");
  }

  const imgStatus = await imageStatus(signals.primaryImage, imageCache);
  if (signals.primaryImage && (!imgStatus || imgStatus >= 400)) add(findings, "critical", "broken_primary_image", path, `Primary image returned ${imgStatus}`);

  return {
    requestedUrl: url,
    finalUrl,
    path,
    kind,
    status,
    redirectHops: hops,
    responseTimeMs: elapsed,
    contentType: headers.get("content-type") || "",
    title: signals.title,
    metaDescription: signals.description,
    h1: signals.h1,
    canonical: canonicalActual,
    robotsMeta: signals.robots,
    xRobotsTag: headers.get("x-robots-tag") || "",
    language: signals.language,
    hreflang: signals.hreflang,
    breadcrumb: signals.visibleBreadcrumb,
    primaryImage: signals.primaryImage,
    primaryImageAlt: signals.primaryImageAlt,
    imageStatus: imgStatus,
    crawlerVisibleMainContent: signals.mainText.slice(0, 1_000),
    structuredDataTypes: signals.schemaTypes,
    internalLinks: signals.internalLinks,
    wordCount: signals.wordCount,
    sourceCommit: buildCommit,
    duplicateContentFingerprint: signals.fingerprint,
    result: findings.some((item) => item.severity === "critical" || item.severity === "high") ? "fail" : "pass",
    findings,
  };
}

function explicitRetiredDestination(path: string) {
  if (path.includes("premium-polo-shirt")) {
    return path.includes("streetwear-activewear")
      ? "/products/streetwear-activewear/unisex/tops/streetwear-premium-polo-shirt"
      : "/products/leisure-nightwear/men/shirts-tops/mens-premium-polo-shirt";
  }
  if (path.includes("premium-leather-bag")) return "/products/premium-leather-apparel/accessories/bags";
  if (path.includes("athletic-onesie")) return "/products/sportswear/fitness-activewear/performance-activewear";
  if (path.includes("performance-gym-hoodie") || path.includes("zip-up-fleece-jacket")) return "/products/sportswear/training/training-wear";
  if (path.includes("streetwear-shorts")) return "/products/streetwear-activewear/unisex/bottoms";
  return null;
}

function mainCategoryFallback(path: string) {
  if (/bavarian|trachten|lederhosen|dirndl/.test(path)) return "/products/bavarian-trachten-wear";
  if (path.includes("leather")) return "/products/premium-leather-apparel";
  if (/sportswear|uniform|jersey|training/.test(path)) return "/products/sportswear";
  if (/streetwear|hoodie|cargo/.test(path)) return "/products/streetwear-activewear";
  if (/leisure|nightwear|sleep|pajama|robe/.test(path)) return "/products/leisure-nightwear";
  return "/products";
}

function resolveRedirectTarget(row: RedirectRow, validTargets: Set<string>, canonicalBySlug: Map<string, string>) {
  const from = cleanPath(row.from_path);
  const rawTo = cleanPath(row.to_path);
  if (!rawTo.startsWith("/products/")) return rawTo;
  if (validTargets.has(rawTo)) return rawTo;
  const targetSlug = rawTo.split("/").filter(Boolean).at(-1) || "";
  const sourceSlug = from.split("/").filter(Boolean).at(-1) || "";
  const exact = canonicalBySlug.get(targetSlug) || canonicalBySlug.get(sourceSlug);
  if (exact) return exact;
  const explicit = explicitRetiredDestination(`${from} ${rawTo}`);
  if (explicit && validTargets.has(explicit)) return explicit;
  return mainCategoryFallback(`${from} ${rawTo}`);
}

async function committedRedirects(): Promise<RedirectRow[]> {
  const source = await readFile("public/_redirects", "utf8");
  const rows: RedirectRow[] = [];
  for (const rawLine of source.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("/") === false) continue;
    const [from, to, status] = line.split(/\s+/);
    if (!from || !to || from.includes("*") || to.includes(":")) continue;
    if (status && status !== "301") continue;
    if (!to.startsWith("/")) continue;
    rows.push({ from_path: cleanPath(from), to_path: cleanPath(to) });
  }
  return rows;
}

async function crawlRedirect(row: RedirectRow, canonicalInventory: Set<string>): Promise<RedirectResult> {
  const sourcePath = cleanPath(row.from_path);
  const expectedDestination = cleanPath(row.to_path);
  const findings: Finding[] = [];
  let status = 0;
  let destinationStatus = 0;
  let actualDestination = "";
  let hops = 0;
  try {
    const first = await request(`${ORIGIN}${sourcePath}`, "manual");
    status = first.response.status;
    const location = first.response.headers.get("location");
    if (status !== 301) add(findings, "high", "redirect_status", sourcePath, `Expected 301, received ${status}`);
    if (!location) add(findings, "high", "redirect_location_missing", sourcePath, "Redirect response has no Location header");
    if (location) {
      actualDestination = cleanPath(absoluteUrl(location, `${ORIGIN}${sourcePath}`));
      hops = 1;
      if (actualDestination !== expectedDestination) add(findings, "high", "redirect_destination_mismatch", sourcePath, `Expected ${expectedDestination}, received ${actualDestination}`);
      const destination = await request(`${ORIGIN}${actualDestination}`, "manual");
      destinationStatus = destination.response.status;
      if (destinationStatus >= 300 && destinationStatus < 400) add(findings, "high", "redirect_chain", sourcePath, `Destination redirects again with ${destinationStatus}`);
      else if (destinationStatus !== 200) add(findings, "high", "redirect_dead_target", sourcePath, `Destination returned ${destinationStatus}`);
    }
  } catch (error) {
    add(findings, "high", "redirect_request_failed", sourcePath, String(error));
  }
  if (sourcePath.startsWith("/products/") && actualDestination === "/") add(findings, "critical", "product_redirect_home", sourcePath, "Product alias redirects to homepage");
  if (actualDestination && !canonicalInventory.has(actualDestination)) add(findings, "high", "redirect_target_not_canonical", sourcePath, `Destination is not in the canonical inventory: ${actualDestination}`);
  return {
    sourcePath,
    expectedDestination,
    actualDestination,
    status,
    destinationStatus,
    hops,
    result: findings.some((item) => item.severity === "critical" || item.severity === "high") ? "fail" : "pass",
    findings,
  };
}

async function findChrome(): Promise<string> {
  for (const command of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]) {
    try {
      const { stdout } = await execFileAsync("which", [command]);
      if (stdout.trim()) return stdout.trim();
    } catch {
      // Try the next supported binary.
    }
  }
  return "";
}

async function dumpRenderedDom(chrome: string, url: string): Promise<string> {
  const { stdout } = await execFileAsync(chrome, [
    "--headless=new",
    "--no-sandbox",
    "--disable-gpu",
    "--disable-dev-shm-usage",
    "--hide-scrollbars",
    "--virtual-time-budget=7000",
    "--dump-dom",
    url,
  ], { timeout: 25_000, maxBuffer: 20 * 1024 * 1024 });
  return stdout;
}

function representativePaths(taxonomy: TaxonomyPayload, products: Map<string, ProductExpectation>): string[] {
  const paths = new Set<string>(["/"]);
  const roots = taxonomy.nodes.filter((node) => node.depth === 0).sort((a, b) => a.full_slug_path.localeCompare(b.full_slug_path));
  for (const root of roots) {
    paths.add(`/products/${root.full_slug_path}`);
    taxonomy.nodes
      .filter((node) => node.depth === 1 && node.full_slug_path.startsWith(`${root.full_slug_path}/`))
      .sort((a, b) => a.full_slug_path.localeCompare(b.full_slug_path))
      .slice(0, 2)
      .forEach((node) => paths.add(`/products/${node.full_slug_path}`));
    taxonomy.nodes
      .filter((node) => node.depth === 2 && node.full_slug_path.startsWith(`${root.full_slug_path}/`))
      .sort((a, b) => a.full_slug_path.localeCompare(b.full_slug_path))
      .slice(0, 2)
      .forEach((node) => paths.add(`/products/${node.full_slug_path}`));
    [...products.entries()]
      .filter(([, value]) => value.root.id === root.id)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(0, 5)
      .forEach(([path]) => paths.add(path));
  }
  return [...paths];
}

async function browserParity(path: string, chrome: string, canonicalByPath: Map<string, CanonicalResult>): Promise<BrowserParityResult> {
  const initial = canonicalByPath.get(path);
  const findings: Finding[] = [];
  let rendered = parsePage("");
  try {
    rendered = parsePage(await dumpRenderedDom(chrome, `${ORIGIN}${path}`));
  } catch (error) {
    add(findings, "high", "browser_render_failed", path, String(error));
  }
  if (!initial) add(findings, "high", "browser_initial_missing", path, "Initial crawl result is missing");
  else {
    if (rendered.title !== initial.title) add(findings, "high", "runtime_title_mismatch", path, `Initial “${initial.title}”, rendered “${rendered.title}”`);
    if (rendered.h1 !== initial.h1) add(findings, "high", "runtime_h1_mismatch", path, `Initial “${initial.h1}”, rendered “${rendered.h1}”`);
    const renderedCanonical = rendered.canonical ? absoluteUrl(rendered.canonical) : "";
    if (renderedCanonical !== initial.canonical) add(findings, "high", "runtime_canonical_mismatch", path, `Initial ${initial.canonical}, rendered ${renderedCanonical}`);
  }
  return {
    path,
    initialTitle: initial?.title || "",
    renderedTitle: rendered.title,
    initialH1: initial?.h1 || "",
    renderedH1: rendered.h1,
    initialCanonical: initial?.canonical || "",
    renderedCanonical: rendered.canonical ? absoluteUrl(rendered.canonical) : "",
    result: findings.length ? "fail" : "pass",
    findings,
  };
}

function csvCell(value: unknown): string {
  const raw = typeof value === "string" ? value : JSON.stringify(value ?? "");
  return `"${raw.replace(/"/g, '""')}"`;
}

function pagesCsv(rows: CanonicalResult[]): string {
  const headers = ["requestedUrl", "finalUrl", "path", "kind", "status", "redirectHops", "responseTimeMs", "title", "metaDescription", "h1", "canonical", "robotsMeta", "xRobotsTag", "language", "breadcrumb", "primaryImage", "imageStatus", "structuredDataTypes", "internalLinkCount", "wordCount", "sourceCommit", "duplicateContentFingerprint", "result", "findings"];
  return [headers.join(","), ...rows.map((row) => [
    row.requestedUrl, row.finalUrl, row.path, row.kind, row.status, row.redirectHops, row.responseTimeMs, row.title,
    row.metaDescription, row.h1, row.canonical, row.robotsMeta, row.xRobotsTag, row.language, row.breadcrumb,
    row.primaryImage, row.imageStatus, row.structuredDataTypes, row.internalLinks.length, row.wordCount, row.sourceCommit,
    row.duplicateContentFingerprint, row.result, row.findings,
  ].map(csvCell).join(","))].join("\n");
}

function redirectsCsv(rows: RedirectResult[]): string {
  const headers = ["sourcePath", "expectedDestination", "actualDestination", "status", "destinationStatus", "hops", "result", "findings"];
  return [headers.join(","), ...rows.map((row) => [row.sourcePath, row.expectedDestination, row.actualDestination, row.status, row.destinationStatus, row.hops, row.result, row.findings].map(csvCell).join(","))].join("\n");
}

function severityCounts(findings: Finding[]) {
  return {
    critical: findings.filter((item) => item.severity === "critical").length,
    high: findings.filter((item) => item.severity === "high").length,
    medium: findings.filter((item) => item.severity === "medium").length,
    low: findings.filter((item) => item.severity === "low").length,
  };
}

async function main() {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const [sitemapResponse, robotsResponse, buildResponse, release, taxonomy, dynamicEntries, approvedRedirectRows, staticRedirectRows] = await Promise.all([
    request(`${ORIGIN}/sitemap.xml`, "manual"),
    request(`${ORIGIN}/robots.txt`, "manual"),
    request(`${ORIGIN}/build.json`, "manual"),
    rpc<ReleasePayload>("catalog_get_public_release"),
    rpc<TaxonomyPayload>("catalog_get_public_taxonomy"),
    rpc<SitemapEntry[]>("get_public_sitemap_entries"),
    rpc<RedirectRow[]>("get_public_legacy_redirects"),
    committedRedirects(),
  ]);

  const globalFindings: Finding[] = [];
  if (sitemapResponse.response.status !== 200) add(globalFindings, "critical", "sitemap_status", "/sitemap.xml", `Received ${sitemapResponse.response.status}`);
  if (robotsResponse.response.status !== 200) add(globalFindings, "critical", "robots_status", "/robots.txt", `Received ${robotsResponse.response.status}`);
  if (buildResponse.response.status !== 200) add(globalFindings, "critical", "build_identity_status", "/build.json", `Received ${buildResponse.response.status}`);

  const buildIdentity = JSON.parse(buildResponse.text || "{}") as Record<string, unknown>;
  const buildCommit = typeof buildIdentity.source_commit === "string" ? buildIdentity.source_commit : "";
  if (!buildCommit) add(globalFindings, "critical", "build_commit_missing", "/build.json", "Production source commit is missing");
  if (EXPECTED_PRODUCTION_SHA && buildCommit !== EXPECTED_PRODUCTION_SHA) add(globalFindings, "critical", "production_commit_mismatch", "/build.json", `Expected ${EXPECTED_PRODUCTION_SHA}, received ${buildCommit}`);
  if (buildIdentity.repository !== "irhaapparelsofficial-ctrl/irha-global-craft-f3881330") add(globalFindings, "critical", "production_repository_mismatch", "/build.json", `Unexpected repository: ${String(buildIdentity.repository)}`);
  if (buildIdentity.supabase_project_id !== OWNER_SUPABASE_PROJECT_ID) add(globalFindings, "critical", "production_supabase_mismatch", "/build.json", `Unexpected Supabase project: ${String(buildIdentity.supabase_project_id)}`);
  if (buildIdentity.source_identity_state !== "verified") add(globalFindings, "critical", "production_identity_unverified", "/build.json", `Identity state: ${String(buildIdentity.source_identity_state)}`);

  const productMap = productExpectations(release, taxonomy);
  const taxonomyByPath = new Map(taxonomy.nodes.map((node) => [`/products/${node.full_slug_path}`, node]));
  const taxonomyProductCounts = taxonomyCounts(taxonomy);
  if (release.products.length !== EXPECTED_PRODUCTS) add(globalFindings, "critical", "release_product_count", "/", `Expected ${EXPECTED_PRODUCTS}, received ${release.products.length}`);
  if (productMap.size !== EXPECTED_PRODUCTS) add(globalFindings, "critical", "canonical_product_count", "/", `Expected ${EXPECTED_PRODUCTS}, received ${productMap.size}`);
  if (taxonomy.nodes.length !== EXPECTED_TAXONOMY) add(globalFindings, "critical", "taxonomy_count", "/", `Expected ${EXPECTED_TAXONOMY}, received ${taxonomy.nodes.length}`);

  const dynamicProducts = dynamicEntries.filter((entry) => entry.entry_kind === "product");
  const dynamicTaxonomy = dynamicEntries.filter((entry) => entry.entry_kind === "taxonomy");
  if (dynamicProducts.length !== EXPECTED_PRODUCTS) add(globalFindings, "critical", "sitemap_rpc_product_count", "/sitemap.xml", `Expected ${EXPECTED_PRODUCTS}, received ${dynamicProducts.length}`);
  if (dynamicTaxonomy.length !== EXPECTED_TAXONOMY) add(globalFindings, "critical", "sitemap_rpc_taxonomy_count", "/sitemap.xml", `Expected ${EXPECTED_TAXONOMY}, received ${dynamicTaxonomy.length}`);

  const sitemapRows = parseSitemap(sitemapResponse.text);
  const sitemapUrls = sitemapRows.map((row) => row.url);
  const sitemapPaths = sitemapUrls.map(cleanPath);
  const duplicateSitemapPaths = sitemapPaths.filter((path, index) => sitemapPaths.indexOf(path) !== index);
  if (duplicateSitemapPaths.length) add(globalFindings, "critical", "duplicate_sitemap_urls", "/sitemap.xml", [...new Set(duplicateSitemapPaths)].join(", "));
  const dynamicKind = new Map(dynamicEntries.map((entry) => [cleanPath(entry.path), entry.entry_kind]));
  for (const entry of dynamicEntries) {
    if (!sitemapPaths.includes(cleanPath(entry.path))) add(globalFindings, "critical", "dynamic_url_missing_from_sitemap", entry.path, `${entry.entry_kind} route missing from live sitemap`);
  }
  for (const path of sitemapPaths) {
    if (path.startsWith("/intl/")) add(globalFindings, "critical", "unreviewed_localized_sitemap_url", path, "Localized URL remains in the public sitemap");
    if (/^\/(admin|dashboard|login|auth)(\/|$)/.test(path)) add(globalFindings, "critical", "private_sitemap_url", path, "Private or functional URL is present in sitemap");
    if (path.startsWith("/catalogue/") || path.startsWith("/page/")) add(globalFindings, "critical", "obsolete_sitemap_url", path, "Obsolete route is present in sitemap");
  }
  if (!robotsResponse.text.includes("Sitemap: https://irhaapparels.com/sitemap.xml")) add(globalFindings, "high", "robots_sitemap_missing", "/robots.txt", "Canonical sitemap declaration is missing");

  const imageCache = new Map<string, number>();
  const canonicalResults = await mapLimit(sitemapUrls, CANONICAL_CONCURRENCY, async (url, index) => {
    if (index % 50 === 0) console.log(`[crawl] canonical ${index}/${sitemapUrls.length}`);
    const path = cleanPath(url);
    return crawlCanonical(url, classifyPath(path, dynamicKind), productMap, taxonomyByPath, taxonomyProductCounts, buildCommit, imageCache);
  });
  const canonicalByPath = new Map(canonicalResults.map((row) => [row.path, row]));

  const homeFingerprint = canonicalByPath.get("/")?.duplicateContentFingerprint;
  if (homeFingerprint) {
    for (const row of canonicalResults) {
      if (row.path !== "/" && row.duplicateContentFingerprint === homeFingerprint) {
        add(row.findings, "critical", "homepage_fallback", row.path, "Non-home route serves the homepage crawler content fingerprint");
        row.result = "fail";
      }
    }
  }

  const fingerprintGroups = new Map<string, CanonicalResult[]>();
  for (const row of canonicalResults) {
    if (!row.duplicateContentFingerprint) continue;
    const group = fingerprintGroups.get(row.duplicateContentFingerprint) || [];
    group.push(row);
    fingerprintGroups.set(row.duplicateContentFingerprint, group);
  }
  for (const group of fingerprintGroups.values()) {
    if (group.length < 2) continue;
    const indexable = group.filter((row) => !`${row.robotsMeta} ${row.xRobotsTag}`.toLowerCase().includes("noindex"));
    if (indexable.length > 1) {
      for (const row of indexable) add(row.findings, "high", "duplicate_crawler_content", row.path, `Shares crawler-visible content with ${indexable.filter((item) => item.path !== row.path).map((item) => item.path).join(", ")}`);
    }
  }

  const validTargets = new Set<string>(["/", ...sitemapPaths]);
  const canonicalBySlug = new Map([...productMap.entries()].map(([path, value]) => [value.product.slug, path]));
  const redirectMap = new Map<string, string>();
  const addRedirect = (row: RedirectRow) => {
    const from = cleanPath(row.from_path);
    const to = resolveRedirectTarget(row, validTargets, canonicalBySlug);
    if (from !== to) redirectMap.set(from, to);
  };
  approvedRedirectRows.forEach(addRedirect);
  staticRedirectRows.forEach(addRedirect);
  for (const [path, expectation] of productMap) {
    addRedirect({ from_path: `/products/${expectation.product.slug}`, to_path: path });
    addRedirect({ from_path: `/products/${expectation.root.slug}/${expectation.product.slug}`, to_path: path });
  }
  const redirectRows = [...redirectMap.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([from_path, to_path]) => ({ from_path, to_path }));
  const redirectResults = await mapLimit(redirectRows, REDIRECT_CONCURRENCY, async (row, index) => {
    if (index % 100 === 0) console.log(`[crawl] redirects ${index}/${redirectRows.length}`);
    return crawlRedirect(row, validTargets);
  });

  const functionalResults: CanonicalResult[] = [];
  for (const path of FUNCTIONAL_PATHS) {
    const result = await crawlCanonical(`${ORIGIN}${path}`, "functional_noindex", productMap, taxonomyByPath, taxonomyProductCounts, buildCommit, imageCache);
    const directives = `${result.robotsMeta} ${result.xRobotsTag}`.toLowerCase();
    if (result.status === 200 && !directives.includes("noindex")) add(result.findings, "critical", "functional_indexable", path, "Functional/private route is HTTP 200 without noindex");
    result.result = result.findings.some((item) => item.severity === "critical" || item.severity === "high") ? "fail" : "pass";
    functionalResults.push(result);
  }

  const missingResults: CanonicalResult[] = [];
  for (const path of EXPECTED_MISSING_PATHS) {
    const result = await crawlCanonical(`${ORIGIN}${path}`, "expected_404", productMap, taxonomyByPath, taxonomyProductCounts, buildCommit, imageCache);
    result.findings = result.findings.filter((finding) => !["canonical_status", "missing_h1", "missing_title", "missing_description", "missing_canonical", "missing_language", "thin_crawler_content"].includes(finding.code));
    if (![404, 410].includes(result.status)) add(result.findings, "critical", "missing_route_not_404", path, `Expected 404 or 410, received ${result.status}`);
    if (result.finalUrl === `${ORIGIN}/`) add(result.findings, "critical", "missing_route_home_redirect", path, "Missing route redirected to homepage");
    result.result = result.findings.some((item) => item.severity === "critical" || item.severity === "high") ? "fail" : "pass";
    missingResults.push(result);
  }

  const chrome = await findChrome();
  const browserResults: BrowserParityResult[] = [];
  if (!chrome) {
    add(globalFindings, "high", "browser_unavailable", "/", "Chrome/Chromium is unavailable for runtime parity verification");
  } else {
    const representatives = representativePaths(taxonomy, productMap).filter((path) => canonicalByPath.has(path));
    browserResults.push(...await mapLimit(representatives, BROWSER_CONCURRENCY, async (path, index) => {
      if (index % 10 === 0) console.log(`[crawl] browser parity ${index}/${representatives.length}`);
      return browserParity(path, chrome, canonicalByPath);
    }));
  }

  for (const row of canonicalResults) globalFindings.push(...row.findings);
  for (const row of redirectResults) globalFindings.push(...row.findings);
  for (const row of functionalResults) globalFindings.push(...row.findings);
  for (const row of missingResults) globalFindings.push(...row.findings);
  for (const row of browserResults) globalFindings.push(...row.findings);

  const counts = severityCounts(globalFindings);
  const inventory = {
    generatedAt: new Date().toISOString(),
    origin: ORIGIN,
    productionCommit: buildCommit,
    expectedProductionCommit: EXPECTED_PRODUCTION_SHA,
    supabaseProject: OWNER_SUPABASE_PROJECT_ID,
    sitemapUrlCount: sitemapUrls.length,
    dynamicProducts: dynamicProducts.length,
    dynamicTaxonomy: dynamicTaxonomy.length,
    staticAndMarketPages: sitemapUrls.length - dynamicEntries.length,
    approvedRedirectRegistryRows: approvedRedirectRows.length,
    redirectsVerified: redirectResults.length,
    functionalNoindexPaths: [...FUNCTIONAL_PATHS],
    expectedMissingPaths: [...EXPECTED_MISSING_PATHS],
    browserRepresentativePaths: browserResults.map((row) => row.path),
    categories: Object.fromEntries([...new Set(canonicalResults.map((row) => row.kind))].sort().map((kind) => [kind, canonicalResults.filter((row) => row.kind === kind).length])),
  };
  const report = {
    schemaVersion: 1,
    inventory,
    summary: {
      canonicalPassed: canonicalResults.filter((row) => row.result === "pass").length,
      canonicalFailed: canonicalResults.filter((row) => row.result === "fail").length,
      redirectsPassed: redirectResults.filter((row) => row.result === "pass").length,
      redirectsFailed: redirectResults.filter((row) => row.result === "fail").length,
      browserPassed: browserResults.filter((row) => row.result === "pass").length,
      browserFailed: browserResults.filter((row) => row.result === "fail").length,
      findings: counts,
    },
    buildIdentity,
    robots: robotsResponse.text,
    sitemapRows,
    canonicalResults,
    redirectResults,
    functionalResults,
    missingResults,
    browserResults,
    findings: globalFindings,
  };

  const summary = [
    "# Irha Apparels Production Route Parity",
    "",
    `- Generated: ${inventory.generatedAt}`,
    `- Production commit: \`${buildCommit}\``,
    `- Sitemap URLs: ${inventory.sitemapUrlCount}`,
    `- Products: ${dynamicProducts.length}`,
    `- Taxonomy pages: ${dynamicTaxonomy.length}`,
    `- Static/market pages: ${inventory.staticAndMarketPages}`,
    `- Redirects verified: ${redirectResults.length}`,
    `- Browser parity routes: ${browserResults.length}`,
    `- Canonical pass/fail: ${report.summary.canonicalPassed}/${report.summary.canonicalFailed}`,
    `- Redirect pass/fail: ${report.summary.redirectsPassed}/${report.summary.redirectsFailed}`,
    `- Browser pass/fail: ${report.summary.browserPassed}/${report.summary.browserFailed}`,
    `- Findings: critical ${counts.critical}, high ${counts.high}, medium ${counts.medium}, low ${counts.low}`,
    "",
    "## Blocking findings",
    "",
    ...globalFindings.filter((item) => item.severity === "critical" || item.severity === "high").slice(0, 300).map((item) => `- **${item.severity.toUpperCase()} ${item.code}** \`${item.path}\` — ${item.message}`),
  ].join("\n");

  await Promise.all([
    writeFile(`${OUTPUT_DIR}/production-route-parity.json`, `${JSON.stringify(report, null, 2)}\n`),
    writeFile(`${OUTPUT_DIR}/canonical-pages.csv`, `${pagesCsv([...canonicalResults, ...functionalResults, ...missingResults])}\n`),
    writeFile(`${OUTPUT_DIR}/redirects.csv`, `${redirectsCsv(redirectResults)}\n`),
    writeFile(`${OUTPUT_DIR}/inventory.json`, `${JSON.stringify(inventory, null, 2)}\n`),
    writeFile(`${OUTPUT_DIR}/summary.md`, `${summary}\n`),
  ]);

  console.log(summary);
  if (counts.critical > 0 || counts.high > 0) process.exitCode = 1;
}

main().catch(async (error) => {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(`${OUTPUT_DIR}/fatal-error.txt`, `${error instanceof Error ? error.stack || error.message : String(error)}\n`);
  console.error(error);
  process.exit(1);
});
