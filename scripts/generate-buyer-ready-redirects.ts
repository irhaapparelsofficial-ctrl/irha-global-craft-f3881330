import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const REDIRECTS_PATH = resolve("public/_redirects");
const MANIFEST_PATH = resolve("public/catalog-route-manifest.json");
const START = "# BEGIN GENERATED BUYER-READY REDIRECTS";
const END = "# END GENERATED BUYER-READY REDIRECTS";
const OLD_START = "# BEGIN GENERATED TAXONOMY REDIRECTS";
const OLD_END = "# END GENERATED TAXONOMY REDIRECTS";

type ManifestPayload = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

type RedirectRow = {
  from_path: string;
  to_path: string;
  updated_at?: string;
};

function cleanPath(value: string) {
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
  return source
    .slice(from + start.length, to)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"));
}

function parseRedirect(line: string): RedirectRow | null {
  const [rawFrom, rawTo, status] = line.split(/\s+/);
  if (status && status !== "301") return null;
  const from_path = cleanPath(rawFrom ?? "");
  const to_path = cleanPath(rawTo ?? "");
  return from_path && to_path ? { from_path, to_path } : null;
}

async function fetchApprovedRedirects(): Promise<RedirectRow[]> {
  try {
    const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/rpc/get_public_legacy_redirects`, {
      method: "POST",
      headers: {
        apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) {
      console.warn(`[redirects] approved redirect RPC unavailable (${response.status}); using committed aliases and manifest repair`);
      return [];
    }
    const rows = (await response.json()) as RedirectRow[];
    return Array.isArray(rows) ? rows : [];
  } catch (error) {
    console.warn(`[redirects] approved redirect RPC failed; using committed aliases: ${String(error)}`);
    return [];
  }
}

function taxonomyPaths(products: BuyerReadyCatalogRoute[]) {
  const paths = new Set<string>(["/", "/products", "/products/all", "/catalogue", "/resources", "/inquiry", "/contact", "/privacy-policy", "/terms-of-service"]);
  for (const product of products) {
    const segments = product.canonical_path.split("/").filter(Boolean);
    for (let length = 2; length < segments.length; length += 1) {
      paths.add(`/${segments.slice(0, length).join("/")}`);
    }
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
  if (path.includes("performance-gym-hoodie") || path.includes("zip-up-fleece-jacket")) {
    return "/products/sportswear/training/training-wear";
  }
  if (path.includes("streetwear-shorts")) return "/products/streetwear-activewear/unisex/bottoms";
  return null;
}

function mainCategoryFallback(path: string) {
  if (path.includes("bavarian") || path.includes("trachten") || path.includes("lederhosen") || path.includes("dirndl")) {
    return "/products/bavarian-trachten-wear";
  }
  if (path.includes("leather")) return "/products/premium-leather-apparel";
  if (path.includes("sportswear") || path.includes("uniform") || path.includes("jersey") || path.includes("training")) {
    return "/products/sportswear";
  }
  if (path.includes("streetwear") || path.includes("hoodie") || path.includes("cargo")) {
    return "/products/streetwear-activewear";
  }
  if (path.includes("leisure") || path.includes("nightwear") || path.includes("sleep") || path.includes("pajama") || path.includes("robe")) {
    return "/products/leisure-nightwear";
  }
  return "/products";
}

function resolveTarget(
  row: RedirectRow,
  validTargets: Set<string>,
  canonicalBySlug: Map<string, string>,
) {
  if (validTargets.has(row.to_path)) return row.to_path;
  const targetSlug = row.to_path.split("/").filter(Boolean).at(-1) ?? "";
  const sourceSlug = row.from_path.split("/").filter(Boolean).at(-1) ?? "";
  const exact = canonicalBySlug.get(targetSlug) ?? canonicalBySlug.get(sourceSlug);
  if (exact) return exact;
  const explicit = explicitRetiredDestination(`${row.from_path} ${row.to_path}`);
  if (explicit && validTargets.has(explicit)) return explicit;
  return mainCategoryFallback(`${row.from_path} ${row.to_path}`);
}

async function main() {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as ManifestPayload;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
    throw new Error("Buyer-ready redirect generation requires the complete 254-product manifest");
  }

  const source = readFileSync(REDIRECTS_PATH, "utf8");
  const committedRows = [
    ...blockLines(source, OLD_START, OLD_END),
    ...blockLines(source, START, END),
  ].map(parseRedirect).filter((row): row is RedirectRow => Boolean(row));
  const approvedRows = await fetchApprovedRedirects();
  const validTargets = taxonomyPaths(manifest.products);
  const canonicalBySlug = new Map(manifest.products.map((product) => [product.product_slug, product.canonical_path]));
  const redirects = new Map<string, string>();

  const add = (row: RedirectRow) => {
    const from = cleanPath(row.from_path);
    const rawTo = cleanPath(row.to_path);
    if (!from || !rawTo || from === rawTo) return;
    const to = rawTo.startsWith("/products/")
      ? resolveTarget({ from_path: from, to_path: rawTo }, validTargets, canonicalBySlug)
      : rawTo;
    if (to && from !== to) redirects.set(from, to);
  };

  for (const row of committedRows) add(row);
  for (const row of approvedRows) add(row);

  for (const product of manifest.products) {
    add({ from_path: `/products/${product.product_slug}`, to_path: product.canonical_path });
    add({ from_path: `/products/${product.main_category_slug}/${product.product_slug}`, to_path: product.canonical_path });
  }

  for (const [from, to] of redirects) {
    if (to.startsWith("/products/") && !validTargets.has(to)) {
      throw new Error(`Generated redirect target is not current: ${from} -> ${to}`);
    }
  }

  const base = stripBlock(stripBlock(source, OLD_START, OLD_END), START, END);
  const generated = [
    START,
    "# Generated from the 254-product buyer-ready manifest and approved redirect registry.",
    ...[...redirects.entries()]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([from, to]) => `${from} ${to} 301`),
    END,
  ].join("\n");

  writeFileSync(REDIRECTS_PATH, `${base}\n\n${generated}\n`);
  console.log(`Generated ${redirects.size} one-hop buyer-ready redirects with zero dead product targets`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
