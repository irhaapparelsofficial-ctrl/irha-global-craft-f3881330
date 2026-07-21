import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const SITE_URL = "https://irhaapparels.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");
const PAGE_SIZE = 1000;

type SitemapRpcRow = {
  path: string;
  image_url: string | null;
  lastmod: string | null;
  entry_kind: "product" | "localized_product" | "taxonomy";
};

async function fetchSitemapRows(): Promise<SitemapRpcRow[]> {
  const rows: SitemapRpcRow[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(
      `${OWNER_SUPABASE_URL}/rest/v1/rpc/get_public_sitemap_entries`,
      {
        method: "POST",
        headers: {
          apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
          "Content-Type": "application/json",
          Range: `${offset}-${offset + PAGE_SIZE - 1}`,
          "Range-Unit": "items",
        },
        body: "{}",
      },
    );
    if (!response.ok) {
      throw new Error(`Could not fetch public sitemap entries: ${response.status} ${await response.text()}`);
    }
    const page = (await response.json()) as SitemapRpcRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
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
    return new URL(decoded).pathname;
  } catch {
    return null;
  }
}

async function main() {
  const rows = await fetchSitemapRows();
  const products = rows.filter((row) => row.entry_kind === "product");
  const localizedPages = rows.filter((row) => row.entry_kind === "localized_product");
  const taxonomyPages = rows.filter((row) => row.entry_kind === "taxonomy");

  if (products.length !== 254) {
    throw new Error(`Refusing stale catalogue sitemap: expected 254 published Drive products, received ${products.length}`);
  }
  if (localizedPages.length !== 1778) {
    throw new Error(`Refusing stale localized sitemap: expected 1778 published product pages, received ${localizedPages.length}`);
  }

  const taxonomyPaths = new Set(taxonomyPages.map((row) => row.path));
  const productPaths = new Set(products.map((row) => row.path));
  const allowedProductPaths = new Set([
    "/products",
    "/products/all",
    ...taxonomyPaths,
    ...productPaths,
  ]);

  const current = readFileSync(SITEMAP_PATH, "utf8");
  const urlBlocks = current.match(/\s*<url>[\s\S]*?<\/url>/g) ?? [];
  const preserved = new Map<string, string>();
  for (const block of urlBlocks) {
    const path = pathFromBlock(block);
    if (!path) continue;
    const segments = path.split("/").filter(Boolean);
    const looksLikeLegacyTwoLevelProduct =
      segments[0] === "products" &&
      segments.length === 3 &&
      segments[2] !== "all-products" &&
      !allowedProductPaths.has(path);
    if (looksLikeLegacyTwoLevelProduct) continue;
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

  writeFileSync(SITEMAP_PATH, `${xml}\n`);
  console.log(
    `sitemap.xml augmented with ${products.length} canonical Drive products, ${localizedPages.length} localized product pages and ${taxonomyPages.length} taxonomy routes (${ordered.length} total URLs)`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
