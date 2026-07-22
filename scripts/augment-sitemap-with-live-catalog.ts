import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";
import type { BuyerReadyCatalogRoute } from "./generate-buyer-ready-catalog-manifest";

const SITE_URL = "https://irhaapparels.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");
const MANIFEST_PATH = resolve("public/catalog-route-manifest.json");
const PAGE_SIZE = 1000;
const MAX_PAGES = 10;

type SitemapRpcRow = {
  path: string;
  image_url: string | null;
  lastmod: string | null;
  entry_kind: "product" | "localized_product" | "taxonomy";
};

type BuyerReadyManifest = {
  schemaVersion: number;
  productCount: number;
  products: BuyerReadyCatalogRoute[];
};

function sitemapRowKey(row: SitemapRpcRow) {
  return `${row.entry_kind}:${row.path}`;
}

async function fetchSitemapRows(): Promise<SitemapRpcRow[]> {
  const rows = new Map<string, SitemapRpcRow>();
  let offset = 0;
  let paginationComplete = false;

  for (let pageNumber = 0; pageNumber < MAX_PAGES; pageNumber += 1) {
    const endpoint = new URL(`${OWNER_SUPABASE_URL}/rest/v1/rpc/get_public_sitemap_entries`);
    endpoint.searchParams.set("select", "path,image_url,lastmod,entry_kind");
    endpoint.searchParams.set("order", "entry_kind.asc,path.asc");
    endpoint.searchParams.set("limit", String(PAGE_SIZE));
    endpoint.searchParams.set("offset", String(offset));

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
        "Content-Type": "application/json",
      },
      body: "{}",
    });
    if (!response.ok) {
      throw new Error(`Could not fetch public sitemap entries: ${response.status} ${await response.text()}`);
    }

    const page = (await response.json()) as SitemapRpcRow[];
    if (page.length === 0) {
      paginationComplete = true;
      break;
    }

    let added = 0;
    for (const row of page) {
      if (!row.path || !row.entry_kind) throw new Error("Public sitemap RPC returned an invalid row");
      const key = sitemapRowKey(row);
      if (rows.has(key)) continue;
      rows.set(key, row);
      added += 1;
    }

    if (added === 0) {
      throw new Error(`Public sitemap RPC pagination made no progress at offset ${offset}`);
    }

    offset += page.length;
    if (page.length < PAGE_SIZE) {
      paginationComplete = true;
      break;
    }
  }

  if (!paginationComplete) {
    throw new Error(`Public sitemap RPC exceeded the safe ${MAX_PAGES}-page pagination limit`);
  }

  return [...rows.values()];
}

function absoluteUrl(path: string) {
  return path === "/" ? `${SITE_URL}/` : `${SITE_URL}${path}`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function dateOnly(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

function entry(path: string, lastmod: string, priority: string, image?: string | null) {
  const lines = [
    "  <url>",
    `    <loc>${xmlEscape(absoluteUrl(path))}</loc>`,
    `    <lastmod>${lastmod}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    `    <priority>${priority}</priority>`,
  ];
  if (image) {
    lines.push(
      "    <image:image>",
      `      <image:loc>${xmlEscape(image)}</image:loc>`,
      "    </image:image>",
    );
  }
  lines.push("  </url>");
  return lines.join("\n");
}

function pathFromBlock(block: string) {
  const match = block.match(/<loc>([^<]+)<\/loc>/);
  if (!match) return null;
  const decoded = match[1]
    .replace(/&amp;/g, "&")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  try {
    return new URL(decoded).pathname.replace(/\/+$/, "") || "/";
  } catch {
    return null;
  }
}

function readManifest(): BuyerReadyManifest {
  const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf8")) as BuyerReadyManifest;
  if (manifest.schemaVersion !== 1 || manifest.productCount !== 254 || manifest.products.length !== 254) {
    throw new Error("Buyer-ready route manifest is incomplete");
  }
  return manifest;
}

async function main() {
  const manifest = readManifest();
  const rows = await fetchSitemapRows();
  const products = rows.filter((row) => row.entry_kind === "product");
  const localizedPages = rows.filter((row) => row.entry_kind === "localized_product");
  const taxonomyPages = rows.filter((row) => row.entry_kind === "taxonomy");

  if (products.length !== 254) {
    throw new Error(`Refusing stale catalogue sitemap: expected 254 published Drive products, received ${products.length}`);
  }

  // Localized page count is intentionally dynamic. The database review gate is
  // the source of truth: only native-review-approved, non-noindex pages may be
  // returned by get_public_sitemap_entries(). Zero is valid while review is pending.
  const localizedPaths = new Set(localizedPages.map((row) => row.path));
  if (localizedPaths.size !== localizedPages.length) {
    throw new Error("Localized sitemap paths are not unique");
  }
  for (const row of localizedPages) {
    if (!row.path.startsWith("/intl/")) {
      throw new Error(`Localized sitemap entry is outside /intl/: ${row.path}`);
    }
  }

  const manifestPaths = new Set(manifest.products.map((row) => row.canonical_path));
  const sitemapProductPaths = new Set(products.map((row) => row.path));
  if (manifestPaths.size !== 254 || sitemapProductPaths.size !== 254) {
    throw new Error("Canonical product paths are not unique");
  }
  for (const path of manifestPaths) {
    if (!sitemapProductPaths.has(path)) throw new Error(`Sitemap is missing canonical product path: ${path}`);
  }

  const taxonomyPaths = new Set(taxonomyPages.map((row) => row.path));
  const allowedProductPaths = new Set([
    "/products",
    "/products/all",
    "/products/all-products",
    ...taxonomyPaths,
    ...manifestPaths,
  ]);

  const current = readFileSync(SITEMAP_PATH, "utf8");
  const urlBlocks = current.match(/\s*<url>[\s\S]*?<\/url>/g) ?? [];
  const preserved = new Map<string, string>();
  for (const block of urlBlocks) {
    const path = pathFromBlock(block);
    if (!path) continue;
    if ((path === "/products" || path.startsWith("/products/")) && !allowedProductPaths.has(path)) continue;
    preserved.set(path, block.trim());
  }

  for (const row of [...taxonomyPages, ...products, ...localizedPages]) {
    const priority = row.entry_kind === "product" ? "0.86" : row.entry_kind === "localized_product" ? "0.74" : "0.82";
    preserved.set(row.path, entry(row.path, dateOnly(row.lastmod), priority, row.image_url));
  }

  const ordered = [...preserved.entries()].sort(([a], [b]) => {
    if (a === "/") return -1;
    if (b === "/") return 1;
    return a.localeCompare(b);
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">',
    ...ordered.map(([, block]) => block),
    "</urlset>",
  ].join("\n");

  for (const forbidden of ["reference-style-02", "reference-style-03", "loading-product"] as const) {
    if (xml.includes(forbidden)) throw new Error(`Legacy catalogue token leaked into sitemap: ${forbidden}`);
  }

  writeFileSync(SITEMAP_PATH, `${xml}\n`);
  console.log(
    `sitemap.xml locked to ${products.length} canonical products, ${localizedPages.length} review-approved localized product pages and ${taxonomyPages.length} taxonomy routes (${ordered.length} total URLs)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
