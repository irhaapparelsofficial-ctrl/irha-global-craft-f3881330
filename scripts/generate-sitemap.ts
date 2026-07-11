// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Product/category URLs and approved localized pages come from the live Supabase database.
// Redirects, drafts, noindex pages, quarantined pages and retired legacy content are excluded.

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

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
type Alternate = { locale: string; path: string };

interface SitemapEntry {
  path: string;
  changefreq?: ChangeFrequency;
  priority?: string;
  lastmod?: string;
  alternates?: Alternate[];
  xDefaultPath?: string;
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
  { path: "/buyer-trust", changefreq: "monthly", priority: "0.85" },
  { path: "/factory-video-call", changefreq: "monthly", priority: "0.82" },
  { path: "/resources", changefreq: "monthly", priority: "0.78" },
  { path: "/faq", changefreq: "monthly", priority: "0.78" },
  { path: "/compliance", changefreq: "monthly", priority: "0.75" },
  { path: "/studio", changefreq: "monthly", priority: "0.7" },
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

const headers = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
};

async function fetchCoreDbEntries(): Promise<{ entries: SitemapEntry[]; source: string }> {
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

async function fetchLocalizedEntries(): Promise<{
  entries: SitemapEntry[];
  groups: Map<string, Alternate[]>;
  source: string;
}> {
  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_localized_pages?select=locale,path,base_route,published_at,updated_at,status,noindex&status=eq.published&noindex=eq.false`,
    { headers },
  );
  if (!response.ok) {
    throw new Error(`localized pages fetch failed: ${response.status}`);
  }

  const rows = (await response.json()) as Array<{
    locale: string;
    path: string;
    base_route: string;
    published_at: string | null;
    updated_at: string;
  }>;
  const groups = new Map<string, Alternate[]>();
  for (const row of rows) {
    if (!safePath(row.path) || !safePath(row.base_route) || !row.locale) continue;
    const values = groups.get(row.base_route) ?? [];
    values.push({ locale: row.locale, path: row.path });
    groups.set(row.base_route, values);
  }

  const entries = rows.flatMap((row): SitemapEntry[] => {
    if (!safePath(row.path) || !safePath(row.base_route) || !row.locale) return [];
    const localized = groups.get(row.base_route) ?? [];
    return [{
      path: row.path,
      changefreq: "monthly",
      priority: "0.75",
      lastmod: (row.published_at ?? row.updated_at).slice(0, 10),
      alternates: [{ locale: "en", path: row.base_route }, ...localized],
      xDefaultPath: row.base_route,
    }];
  });

  return {
    entries,
    groups,
    source: `${entries.length} published localized URLs across ${groups.size} base routes`,
  };
}

async function main() {
  let coreEntries: SitemapEntry[] = [];
  let coreSource = "static-fallback (DB unavailable)";

  try {
    const result = await fetchCoreDbEntries();
    coreEntries = result.entries;
    coreSource = result.source;
  } catch (error) {
    const message = (error as Error).message;
    if (REQUIRE_DB_ENTRIES) {
      throw new Error(`sitemap: refusing build without live product/category URLs. ${message}`);
    }
    console.warn(`sitemap: core DB fetch failed — writing canonical static routes only. ${message}`);
  }

  let localizedEntries: SitemapEntry[] = [];
  let localizedGroups = new Map<string, Alternate[]>();
  let localizedSource = "0 published localized URLs";
  try {
    const result = await fetchLocalizedEntries();
    localizedEntries = result.entries;
    localizedGroups = result.groups;
    localizedSource = result.source;
  } catch (error) {
    // Localized SEO is optional during rollout/migration; core product/category sitemap remains authoritative.
    console.warn(`sitemap: localized SEO entries unavailable — continuing without them. ${(error as Error).message}`);
  }

  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map<string, SitemapEntry>();
  for (const entry of [...staticEntries, ...coreEntries]) {
    unique.set(entry.path, { ...unique.get(entry.path), ...entry });
  }

  for (const [baseRoute, localized] of localizedGroups) {
    const current = unique.get(baseRoute) ?? {
      path: baseRoute,
      changefreq: "monthly" as const,
      priority: "0.7",
      lastmod: today,
    };
    unique.set(baseRoute, {
      ...current,
      alternates: [{ locale: "en", path: baseRoute }, ...localized],
      xDefaultPath: baseRoute,
    });
  }
  for (const entry of localizedEntries) unique.set(entry.path, entry);

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...Array.from(unique.values()).map((entry) =>
      [
        `  <url>`,
        `    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>`,
        `    <lastmod>${entry.lastmod ?? today}</lastmod>`,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        ...(entry.alternates ?? []).map((alternate) =>
          `    <xhtml:link rel="alternate" hreflang="${xmlEscape(alternate.locale)}" href="${xmlEscape(absoluteUrl(alternate.path))}" />`,
        ),
        entry.xDefaultPath
          ? `    <xhtml:link rel="alternate" hreflang="x-default" href="${xmlEscape(absoluteUrl(entry.xDefaultPath))}" />`
          : null,
        `  </url>`,
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    `</urlset>`,
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), xml);
  console.log(`sitemap.xml written (${unique.size} entries) — source: ${coreSource}; localized: ${localizedSource}`);
}

function safePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function absoluteUrl(path: string) {
  return `${BASE_URL}${path === "/" ? "" : path}`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

void main();
