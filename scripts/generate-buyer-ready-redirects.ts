import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const REDIRECTS_PATH = resolve("public/_redirects");
const MANIFEST_PATH = resolve("public/catalog-route-manifest.json");
const SITEMAP_PATH = resolve("public/sitemap.xml");
const START = "# BEGIN GENERATED BUYER-READY REDIRECTS";
const END = "# END GENERATED BUYER-READY REDIRECTS";
const OLD_START = "# BEGIN GENERATED TAXONOMY REDIRECTS";
const OLD_END = "# END GENERATED TAXONOMY REDIRECTS";
const PAGE_SIZE = 1000;

export type ManifestPayload = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

export type RedirectRow = {
  from_path: string;
  to_path: string;
  updated_at?: string;
};

export function cleanRedirectPath(value: string) {
  if (!value.startsWith("/")) return null;
  const path = value.split(/[?#]/, 1)[0].replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
  if (path.includes("..") || /[\r\n\t ]/.test(path)) return null;
  return path;
}

function stripBlock(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  if (from === -1) return source;
  const to = source.indexOf(end, from);
  if (to === -1) throw new Error(`Redirect block is incomplete: ${start}`);
  return `${source.slice(0, from).trimEnd()}\n${source.slice(to + end.length).trimStart()}`.trimEnd();
}

function blockLines(source: string, start: string, end: string) {
  const from = source.indexOf(start);
  const to = from === -1 ? -1 : source.indexOf(end, from);
  if (from === -1 || to === -1) return [];
  return source.slice(from + start.length, to).split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
}

function parseRedirect(line: string): RedirectRow | null {
  const [rawFrom, rawTo, status] = line.split(/\s+/);
  if (status && status !== "301") return null;
  const from_path = cleanRedirectPath(rawFrom ?? "");
  const to_path = cleanRedirectPath(rawTo ?? "");
  return from_path && to_path ? { from_path, to_path } : null;
}

export async function fetchAllApprovedRedirects(): Promise<RedirectRow[]> {
  const rows: RedirectRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/rpc/get_public_legacy_redirects`, {
      method: "POST",
      headers: {
        apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        Prefer: "count=exact",
      },
      body: "{}",
    });
    if (!response.ok) throw new Error(`Approved redirect RPC failed: ${response.status} ${await response.text()}`);
    const page = (await response.json()) as RedirectRow[];
    if (!Array.isArray(page)) throw new Error("Approved redirect RPC returned an invalid payload");
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function sitemapPaths() {
  const xml = readFileSync(SITEMAP_PATH, "utf8");
  const paths = new Set<string>();
  for (const match of xml.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const url = new URL(match[1].replace(/&amp;/g, "&"));
    const path = cleanRedirectPath(decodeURIComponent(url.pathname));
    if (path) paths.add(path);
  }
  return paths;
}

function taxonomyPaths(products: BuyerReadyCatalogRoute[]) {
  const paths = sitemapPaths();
  for (const product of products) {
    const segments = product.canonical_path.split("/").filter(Boolean);
    for (let length = 2; length < segments.length; length += 1) paths.add(`/${segments.slice(0, length).join("/")}`);
    paths.add(product.canonical_path);
  }
  return paths;
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

function localizedLegacyKey(path: string) {
  return path.match(/^\/intl\/[^/]+\/([^/?#]+)$/i)?.[1]?.toLowerCase() ?? null;
}

export function redirectLookup(products: BuyerReadyCatalogRoute[]) {
  const canonicalBySlug = new Map<string, string>();
  const canonicalByLegacyKey = new Map<string, string>();
  for (const product of products) {
    canonicalBySlug.set(product.product_slug.toLowerCase(), product.canonical_path);
    canonicalByLegacyKey.set(`${product.reference_code.toLowerCase()}-${product.product_slug.toLowerCase()}`, product.canonical_path);
  }
  return { canonicalBySlug, canonicalByLegacyKey };
}

export function resolveRedirectTarget(
  row: RedirectRow,
  validTargets: Set<string>,
  canonicalBySlug: Map<string, string>,
  canonicalByLegacyKey: Map<string, string>,
) {
  const rawTo = cleanRedirectPath(row.to_path);
  const from = cleanRedirectPath(row.from_path);
  if (!rawTo || !from) return null;
  if (validTargets.has(rawTo) && !rawTo.startsWith("/intl/")) return rawTo;

  const localizedKey = localizedLegacyKey(rawTo) ?? localizedLegacyKey(from);
  if (localizedKey) {
    const localizedCanonical = canonicalByLegacyKey.get(localizedKey);
    if (localizedCanonical) return localizedCanonical;
  }

  const targetSlug = rawTo.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  const sourceSlug = from.split("/").filter(Boolean).at(-1)?.toLowerCase() ?? "";
  const exact = canonicalBySlug.get(targetSlug) ?? canonicalBySlug.get(sourceSlug);
  if (exact) return exact;

  const explicit = explicitRetiredDestination(`${from} ${rawTo}`);
  if (explicit && validTargets.has(explicit)) return explicit;

  if (rawTo.startsWith("/products/") || rawTo.startsWith("/intl/")) return mainCategoryFallback(`${from} ${rawTo}`);
  return validTargets.has(rawTo) ? rawTo : null;
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ManifestPayload;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
    throw new Error("Buyer-ready redirect generation requires the complete 254-product manifest");
  }

  const source = readFileSync(REDIRECTS_PATH, "utf8");
  const base = stripBlock(stripBlock(source, OLD_START, OLD_END), START, END);
  const staticRedirects = new Map<string, string>();
  for (const rawLine of base.split("\n")) {
    const row = parseRedirect(rawLine.trim());
    if (!row) continue;
    const existing = staticRedirects.get(row.from_path);
    if (existing) throw new Error(`Duplicate static redirect source: ${row.from_path}`);
    staticRedirects.set(row.from_path, row.to_path);
  }

  const committedRows = [...blockLines(source, OLD_START, OLD_END), ...blockLines(source, START, END)]
    .map(parseRedirect)
    .filter((row): row is RedirectRow => Boolean(row));
  const approvedRows = await fetchAllApprovedRedirects();
  const validTargets = taxonomyPaths(manifest.products);
  const { canonicalBySlug, canonicalByLegacyKey } = redirectLookup(manifest.products);
  const redirects = new Map<string, string>();

  const add = (row: RedirectRow) => {
    const from = cleanRedirectPath(row.from_path);
    if (!from) return;
    const to = resolveRedirectTarget(row, validTargets, canonicalBySlug, canonicalByLegacyKey);
    if (!to || from === to) return;
    const staticTarget = staticRedirects.get(from);
    if (staticTarget) {
      if (staticTarget !== to) throw new Error(`Static/generated redirect conflict: ${from} -> ${staticTarget} versus ${to}`);
      return;
    }
    redirects.set(from, to);
  };

  approvedRows.forEach(add);
  committedRows.forEach(add);
  for (const product of manifest.products) {
    add({ from_path: `/products/${product.product_slug}`, to_path: product.canonical_path });
    add({ from_path: `/products/${product.main_category_slug}/${product.product_slug}`, to_path: product.canonical_path });
  }

  for (const [from, to] of redirects) {
    if (to.startsWith("/intl/")) throw new Error(`Unreviewed localized redirect target leaked: ${from} -> ${to}`);
    if (!validTargets.has(to)) throw new Error(`Generated redirect target is not current: ${from} -> ${to}`);
  }
  if (approvedRows.length < 1258) throw new Error(`Approved redirect pagination is incomplete: ${approvedRows.length}`);

  const generated = [
    START,
    `# Generated from ${approvedRows.length} approved aliases and the 254-product canonical manifest.`,
    ...[...redirects.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([from, to]) => `${from} ${to} 301`),
    END,
  ].join("\n");

  writeFileSync(REDIRECTS_PATH, `${base}\n\n${generated}\n`);
  console.log(`Generated ${redirects.size} non-overlapping one-hop redirects from ${approvedRows.length} approved rows with zero localized or dead targets`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
