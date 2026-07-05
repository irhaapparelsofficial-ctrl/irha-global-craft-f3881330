// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Product & category URLs come from the live Supabase database (canonical
// source of truth). Static routes are kept below. If the DB fetch fails
// (offline build, credentials missing), we fall back to writing only the
// static routes — never fabricate stale product URLs.

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

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
  lastmod?: string;
}

const journalSlugs = [
  "craft-of-lederhosen",
  "leather-grades-explained",
  "sialkot-apparel-legacy",
  "streetwear-500gsm",
  "sustainable-cotton-program",
  "moq-economics",
];

const blogSlugs = [
  "why-source-sportswear-from-pakistan",
  "lederhosen-manufacturing-guide",
  "private-label-streetwear-manufacturing",
  "why-sialkot-is-global-apparel-hub",
  "oem-vs-odm-clothing-manufacturing",
  "custom-hoodies-manufacturer-pakistan-moq-50",
  "lederhosen-wholesale-germany-oktoberfest-supplier",
  "private-label-sportswear-fob-sialkot",
  "small-batch-clothing-manufacturer-pakistan",
  "streetwear-oem-pakistan",
  "dirndl-manufacturer-moq-50",
  "sublimated-jerseys-wholesale-pakistan",
  "leather-jacket-manufacturer-small-order",
  "apparel-manufacturer-for-startups-moq-50",
  "fob-sialkot-vs-cif-pricing-explained",
];

const countrySlugs = [
  "usa-manufacturer",
  "uk-manufacturer",
  "germany-manufacturer",
  "canada-manufacturer",
  "australia-manufacturer",
];

const seoLandingSlugs = [
  "sportswear-manufacturer-pakistan",
  "sportswear-manufacturer-sialkot",
  "private-label-sportswear-manufacturer",
  "leatherwear-manufacturer-pakistan",
  "leather-jacket-manufacturer",
  "lederhosen-manufacturer",
  "trachten-manufacturer",
  "oktoberfest-clothing-manufacturer",
  "streetwear-manufacturer-pakistan",
  "custom-apparel-manufacturer-pakistan",
  "germany-apparel-manufacturer",
  "austria-lederhosen-manufacturer",
  "uae-sportswear-manufacturer",
  "usa-private-label-clothing-manufacturer",
  "uk-custom-apparel-manufacturer",
];

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
  { path: "/de", changefreq: "weekly", priority: "0.95" },
  { path: "/connect", changefreq: "monthly", priority: "0.7" },
  { path: "/compliance", changefreq: "monthly", priority: "0.7" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
  { path: "/shipping-returns", changefreq: "yearly", priority: "0.5" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/products", changefreq: "weekly", priority: "0.9" },
  { path: "/manufacturing", changefreq: "monthly", priority: "0.8" },
  { path: "/sustainability", changefreq: "monthly", priority: "0.7" },
  { path: "/journal", changefreq: "weekly", priority: "0.7" },
  { path: "/blog", changefreq: "weekly", priority: "0.8" },
  { path: "/faq", changefreq: "monthly", priority: "0.6" },
  { path: "/inquiry", changefreq: "monthly", priority: "0.8" },
  { path: "/contact", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/catalogue", changefreq: "weekly", priority: "0.95" },
  { path: "/de/katalog", changefreq: "weekly", priority: "0.9" },
  ...seoLandingSlugs.map((slug) => ({ path: `/${slug}`, changefreq: "weekly" as const, priority: "0.95" })),
  ...catalogueSlugs.map((slug) => ({ path: `/catalogue/${slug}`, changefreq: "weekly" as const, priority: "0.9" })),
  ...catalogueSlugs.map((slug) => ({ path: `/de/katalog/${slug}`, changefreq: "weekly" as const, priority: "0.85" })),
  ...countrySlugs.map((slug) => ({ path: `/${slug}`, changefreq: "weekly" as const, priority: "0.9" })),
  ...blogSlugs.map((slug) => ({ path: `/blog/${slug}`, changefreq: "monthly" as const, priority: "0.7" })),
  ...journalSlugs.map((slug) => ({ path: `/journal/${slug}`, changefreq: "monthly" as const, priority: "0.6" })),
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
  const cats = (await catRes.json()) as Array<{ id: string; slug: string; parent_id: string | null; updated_at: string }>;
  const prods = (await prodRes.json()) as Array<{ slug: string; category_id: string; updated_at: string }>;

  const byId = new Map(cats.map((c) => [c.id, c]));
  const tops = cats.filter((c) => c.parent_id === null);

  const entries: SitemapEntry[] = [];
  for (const t of tops) {
    entries.push({
      path: `/products/${t.slug}`,
      changefreq: "weekly",
      priority: "0.85",
      lastmod: t.updated_at.slice(0, 10),
    });
  }
  for (const p of prods) {
    const cat = byId.get(p.category_id);
    if (!cat) continue;
    const top = cat.parent_id ? byId.get(cat.parent_id) : cat;
    if (!top) continue;
    entries.push({
      path: `/products/${top.slug}/${p.slug}`,
      changefreq: "monthly",
      priority: "0.7",
      lastmod: p.updated_at.slice(0, 10),
    });
  }
  return { entries, source: `db (${tops.length} categories, ${prods.length} products)` };
}

async function main() {
  let dbEntries: SitemapEntry[] = [];
  let source = "static-fallback (DB unavailable)";
  try {
    const r = await fetchDbEntries();
    dbEntries = r.entries;
    source = r.source;
  } catch (e) {
    console.warn(`sitemap: DB fetch failed — writing static routes only. ${(e as Error).message}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const all = [...staticEntries, ...dbEntries];

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...all.map((e) =>
      [
        `  <url>`,
        `    <loc>${BASE_URL}${e.path}</loc>`,
        `    <lastmod>${e.lastmod ?? today}</lastmod>`,
        e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
        e.priority ? `    <priority>${e.priority}</priority>` : null,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${all.length} entries) — source: ${source}`);
}

void main();
