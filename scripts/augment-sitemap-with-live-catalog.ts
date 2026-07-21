import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  OWNER_SUPABASE_PUBLISHABLE_KEY,
  OWNER_SUPABASE_URL,
} from "../src/integrations/supabase/ownerRuntime";

const SITE_URL = "https://irhaapparels.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");
const PAGE_SIZE = 1000;

type ProductRow = {
  canonical_path: string | null;
  image_url: string | null;
  updated_at: string | null;
};

type LocalizedRow = {
  path: string | null;
  base_route: string | null;
  updated_at: string | null;
};

type TaxonomyRow = {
  full_slug_path: string | null;
};

async function fetchAll<T>(resource: string, query: string): Promise<T[]> {
  const rows: T[] = [];
  for (let offset = 0; ; offset += PAGE_SIZE) {
    const response = await fetch(`${OWNER_SUPABASE_URL}/rest/v1/${resource}?${query}`, {
      headers: {
        apikey: OWNER_SUPABASE_PUBLISHABLE_KEY,
        Authorization: `Bearer ${OWNER_SUPABASE_PUBLISHABLE_KEY}`,
        Range: `${offset}-${offset + PAGE_SIZE - 1}`,
        "Range-Unit": "items",
      },
    });
    if (!response.ok) {
      throw new Error(`Could not fetch ${resource} for sitemap: ${response.status} ${await response.text()}`);
    }
    const page = (await response.json()) as T[];
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
  const [products, localizedPages, taxonomyNodes] = await Promise.all([
    fetchAll<ProductRow>(
      "products",
      "select=canonical_path,image_url,updated_at&source_drive_folder_id=not.is.null&is_published=eq.true&order=canonical_path.asc",
    ),
    fetchAll<LocalizedRow>(
      "seo_localized_pages",
      "select=path,base_route,updated_at&status=eq.published&noindex=eq.false&order=path.asc",
    ),
    fetchAll<TaxonomyRow>(
      "catalog_taxonomy_nodes",
      "select=full_slug_path&publish_state=eq.published&order=full_slug_path.asc",
    ),
  ]);

  const canonicalProducts = products.filter(
    (product): product is ProductRow & { canonical_path: string } => Boolean(product.canonical_path?.startsWith("/products/")),
  );
  if (canonicalProducts.length !== 254) {
    throw new Error(`Refusing stale catalogue sitemap: expected 254 published Drive products, received ${canonicalProducts.length}`);
  }

  const productByPath = new Map(canonicalProducts.map((product) => [product.canonical_path, product]));
  const taxonomyPaths = new Set(
    taxonomyNodes
      .map((node) => node.full_slug_path)
      .filter((path): path is string => Boolean(path))
      .map((path) => `/products/${path.replace(/^\/+/, "")}`),
  );
  const allowedProductPaths = new Set([
    "/products",
    "/products/all",
    ...taxonomyPaths,
    ...productByPath.keys(),
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

  for (const product of canonicalProducts) {
    preserved.set(
      product.canonical_path,
      entry(product.canonical_path, dateOnly(product.updated_at), "0.86", product.image_url),
    );
  }

  let localizedCount = 0;
  for (const page of localizedPages) {
    if (!page.path?.startsWith("/intl/") || !page.base_route) continue;
    const product = productByPath.get(page.base_route);
    if (!product) continue;
    preserved.set(page.path, entry(page.path, dateOnly(page.updated_at), "0.74", product.image_url));
    localizedCount += 1;
  }
  if (localizedCount !== 1778) {
    throw new Error(`Refusing stale localized sitemap: expected 1778 published product pages, received ${localizedCount}`);
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
  console.log(`sitemap.xml augmented with ${canonicalProducts.length} canonical Drive products and ${localizedCount} localized product pages (${ordered.length} total URLs)`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
