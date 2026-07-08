// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Product and category URLs come from the live Supabase database.
// Redirects, quarantined pages and retired legacy content are intentionally excluded.

import { writeFileSync } from "fs";
import { resolve } from "path";

const BASE_URL = "https://www.irhaapparels.com";
const SUPABASE_URL =
  process.env.VITE_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  "https://mlefxgyaqoisvdmoiapq.supabase.co";
const SUPABASE_KEY =
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_PUBLISHABLE_KEY ??
  process.env.SUPABASE_ANON_KEY ??
  "sb_publishable_W8362N3MaYpOyMEMBu3Wuw_R0vJA3dw";
const REQUIRE_DB_ENTRIES = process.env.npm_lifecycle_event === "prebuild";

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const catalogueSlugs = [
  "bavarian-garments",
  "lederhosen",
  "dirndl-dresses",
  "trachten-accessories",
  "kids-trachten",
  "leather-garments",
  "sportswear",
  "activewear",
  "streetwear",
  "leisurewear",
  "nightwear",
];

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/products", changefreq: "weekly", priority: "0.95" },
  { path: "/catalogue", changefreq: "weekly", priority: "0.9" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/manufacturing", changefreq: "monthly", priority: "0.8" },
  { path: "/compliance", changefreq: "monthly", priority: "0.75" },
  { path: "/inquiry", changefreq: "monthly", priority: "0.85" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/connect", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
  ...catalogueSlugs.map((slug) => ({
    path: `/catalogue/${slug}`,
    changefreq: "weekly" as const,
    priority: "0.8",
  })),
];

async function fetchDbEntries(): Promise<{ entries: SitemapEntry[]; source: string }> {
  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
  };

  const catRes = await fetch(
    `${SUPABASE_URL}/rest/v1/categories?select=id,slug,parent_id,is_published,updated_at&is_published=eq.true`,
    { headers },
  );
  const prodRes = await fetch(
    `${SUPABASE_URL}/rest/v1/products?select=slug,category_id,updated_at,is_published&is_published=eq.true`,
    { headers },
  );

  if (!catRes.ok) throw new Error(`categories fetch failed: ${catRes.status}`);
  if (!prodRes.ok) throw new Error(`products fetch failed: ${prodRes.status}`);

  const cats = (await catRes.json()) as Array<{
    id: string;
    slug: string;
    parent_id: string | null;
    updated_at: string;
  }>;
  const prods = (await prodRes.json()) as Array<{
    slug: string;
    category_id: string;
    updated_at: string;
  }>;

  const byId = new Map(cats.map((category) => [category.id, category]));
  const tops = cats.filter((category) => category.parent_id === null);
  if (tops.length === 0) throw new Error("no published top categories returned");
  if (prods.length === 0) throw new Error("no published products returned");

  const entries: SitemapEntry[] = [];
  let productEntryCount = 0;

  for (const top of tops) {
    entries.push({
      path: `/products/${top.slug}`,
      changefreq: "weekly",
      priority: "0.9",
      lastmod: top.updated_at.slice(0, 10),
    });
  }

  for (const product of prods) {
    const category = byId.get(product.category_id);
    if (!category) continue;
    const top = category.parent_id ? byId.get(category.parent_id) : category;
    if (!top) continue;

    entries.push({
      path: `/products/${top.slug}/${product.slug}`,
      changefreq: "monthly",
      priority: "0.75",
      lastmod: product.updated_at.slice(0, 10),
    });
    productEntryCount += 1;
  }

  if (productEntryCount === 0) {
    throw new Error("published products could not be resolved to canonical product URLs");
  }

  return {
    entries,
    source: `db (${tops.length} top categories, ${productEntryCount} product URLs)`,
  };
}

async function main() {
  let dbEntries: SitemapEntry[] = [];
  let source = "static-fallback (DB unavailable)";

  try {
    const result = await fetchDbEntries();
    dbEntries = result.entries;
    source = result.source;
  } catch (error) {
    const message = (error as Error).message;
    if (REQUIRE_DB_ENTRIES) {
      throw new Error(`sitemap: refusing build without live product/category URLs. ${message}`);
    }
    console.warn(`sitemap: DB fetch failed — writing canonical static routes only. ${message}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map<string, SitemapEntry>();
  for (const entry of [...staticEntries, ...dbEntries]) unique.set(entry.path, entry);

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...Array.from(unique.values()).map((entry) =>
      [
        `  <url>`,
        `    <loc>${BASE_URL}${entry.path}</loc>`,
        `    <lastmod>${entry.lastmod ?? today}</lastmod>`,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${unique.size} entries) — source: ${source}`);
}

void main();
