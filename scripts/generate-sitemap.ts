// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Core category/product URLs are generated from the committed GitHub catalog,
// so the build never depends on an external database. Approved localized pages
// are included opportunistically when the active Supabase environment is reachable.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { loadEnv } from "vite";
import { CATALOG } from "../src/lib/catalog";
import { BAVARIAN_MENS_COLLECTIONS } from "../src/lib/bavarianMensCollections";
import { createSupplementalProductsForSubcategory } from "../src/lib/supplementalCatalog";
import { createSupplementalBatch02ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch02";
import { createSupplementalBatch03ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch03";
import { createSupplementalBatch04ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch04";
import { createSupplementalBatch05ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch05";
import { createSupplementalBatch06ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch06";
import { createSupplementalBatch07ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch07";
import { createSupplementalBatch08ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch08";
import { createSupplementalBatch09ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch09";
import { createSupplementalBatch10ProductsForSubcategory } from "../src/lib/supplementalCatalogBatch10";

const BASE_URL = "https://www.irhaapparels.com";
const mode = process.env.npm_lifecycle_event === "predev" ? "development" : "production";
const loadedEnv = loadEnv(mode, process.cwd(), "");
const runtimeEnv = { ...loadedEnv, ...process.env };
const SUPABASE_URL = String(runtimeEnv.VITE_SUPABASE_URL || runtimeEnv.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = String(
  runtimeEnv.VITE_SUPABASE_PUBLISHABLE_KEY
  || runtimeEnv.SUPABASE_PUBLISHABLE_KEY
  || runtimeEnv.SUPABASE_ANON_KEY
  || "",
);

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

type LocalizedRow = {
  locale: string;
  path: string;
  base_route: string;
  published_at: string | null;
  updated_at: string;
};

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
  { path: "/repeat-order", changefreq: "monthly", priority: "0.72" },
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

const TOP_SLUG_BY_LEGACY_GROUP: Record<string, string> = {
  bavarian: "bavarian-trachten-wear",
  leatherwear: "premium-leather-apparel",
  sportswear: "sportswear",
  streetwear: "streetwear-activewear",
  leisurewear: "leisure-nightwear",
  nightwear: "leisure-nightwear",
};

const TOP_CATEGORY_SLUGS = Array.from(new Set(Object.values(TOP_SLUG_BY_LEGACY_GROUP)));

const supplementalFactories = [
  createSupplementalProductsForSubcategory,
  createSupplementalBatch02ProductsForSubcategory,
  createSupplementalBatch03ProductsForSubcategory,
  createSupplementalBatch04ProductsForSubcategory,
  createSupplementalBatch05ProductsForSubcategory,
  createSupplementalBatch06ProductsForSubcategory,
  createSupplementalBatch07ProductsForSubcategory,
  createSupplementalBatch08ProductsForSubcategory,
  createSupplementalBatch09ProductsForSubcategory,
  createSupplementalBatch10ProductsForSubcategory,
];

function slugify(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function catalogEntries(): SitemapEntry[] {
  const entries: SitemapEntry[] = TOP_CATEGORY_SLUGS.map((slug) => ({
    path: `/products/${slug}`,
    changefreq: "weekly",
    priority: "0.9",
  }));

  const productSlugsByTop = new Map<string, Set<string>>();
  for (const topSlug of TOP_CATEGORY_SLUGS) productSlugsByTop.set(topSlug, new Set());

  for (const group of CATALOG) {
    const topSlug = TOP_SLUG_BY_LEGACY_GROUP[group.slug];
    if (!topSlug) continue;
    const productSlugs = productSlugsByTop.get(topSlug)!;

    for (const sub of group.subs) {
      for (const product of sub.products) productSlugs.add(slugify(product.name));

      if (group.slug === "bavarian") {
        for (const factory of supplementalFactories) {
          const supplemental = factory(topSlug, sub.slug, sub.name, `sitemap-${sub.slug}`);
          for (const product of supplemental) productSlugs.add(product.slug);
        }
      }
    }
  }

  for (const [topSlug, productSlugs] of productSlugsByTop) {
    for (const productSlug of productSlugs) {
      entries.push({
        path: `/products/${topSlug}/${productSlug}`,
        changefreq: "monthly",
        priority: "0.75",
      });
    }
  }

  for (const collection of BAVARIAN_MENS_COLLECTIONS) {
    entries.push({
      path: `/products/bavarian-trachten-wear/mens-trachten/${collection.slug}`,
      changefreq: "weekly",
      priority: "0.82",
    });
  }

  return entries;
}

async function localizedEntries(): Promise<{
  entries: SitemapEntry[];
  groups: Map<string, Alternate[]>;
  source: string;
}> {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return { entries: [], groups: new Map(), source: "localized backend environment not configured" };
  }

  const response = await fetch(
    `${SUPABASE_URL}/rest/v1/seo_localized_pages?select=locale,path,base_route,published_at,updated_at&status=eq.published&noindex=eq.false`,
    {
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
      },
      signal: AbortSignal.timeout(12_000),
    },
  );

  if (!response.ok) throw new Error(`localized pages fetch returned HTTP ${response.status}`);
  const rows = await response.json() as LocalizedRow[];
  const groups = new Map<string, Alternate[]>();

  for (const row of rows) {
    if (!safePath(row.path) || !safePath(row.base_route) || !validLocale(row.locale)) continue;
    const current = groups.get(row.base_route) ?? [];
    if (!current.some((item) => item.locale === row.locale && item.path === row.path)) {
      current.push({ locale: row.locale, path: row.path });
    }
    groups.set(row.base_route, current);
  }

  const entries = rows.flatMap((row): SitemapEntry[] => {
    if (!safePath(row.path) || !safePath(row.base_route) || !validLocale(row.locale)) return [];
    const localized = groups.get(row.base_route) ?? [];
    return [{
      path: row.path,
      changefreq: "monthly",
      priority: "0.75",
      lastmod: safeDate(row.published_at || row.updated_at),
      alternates: [{ locale: "en", path: row.base_route }, ...localized],
      xDefaultPath: row.base_route,
    }];
  });

  return {
    entries,
    groups,
    source: `${entries.length} approved localized URL${entries.length === 1 ? "" : "s"}`,
  };
}

async function main() {
  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map<string, SitemapEntry>();

  for (const entry of [...staticEntries, ...catalogEntries()]) {
    if (!safePath(entry.path)) continue;
    unique.set(entry.path, { ...unique.get(entry.path), ...entry });
  }

  let localizedSource = "localized backend not checked";
  try {
    const localized = await localizedEntries();
    localizedSource = localized.source;

    for (const [baseRoute, alternates] of localized.groups) {
      const base = unique.get(baseRoute) ?? {
        path: baseRoute,
        changefreq: "monthly" as const,
        priority: "0.7",
      };
      unique.set(baseRoute, {
        ...base,
        alternates: [{ locale: "en", path: baseRoute }, ...alternates],
        xDefaultPath: baseRoute,
      });
    }

    for (const entry of localized.entries) unique.set(entry.path, entry);
  } catch (error) {
    localizedSource = `localized pages skipped: ${error instanceof Error ? error.message : "unknown error"}`;
    console.warn(`sitemap: ${localizedSource}`);
  }

  const ordered = Array.from(unique.values()).sort((a, b) => {
    if (a.path === "/") return -1;
    if (b.path === "/") return 1;
    return a.path.localeCompare(b.path);
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">`,
    ...ordered.map((entry) =>
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
  console.log(
    `sitemap.xml written (${ordered.length} canonical URLs) — committed catalog core; ${localizedSource}`,
  );
}

function safePath(value: string) {
  return typeof value === "string" && value.startsWith("/") && !value.startsWith("//");
}

function validLocale(value: string) {
  return typeof value === "string" && /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(value);
}

function safeDate(value: string | null | undefined) {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
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
