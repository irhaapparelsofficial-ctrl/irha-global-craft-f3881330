// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
// Public URLs are generated from the committed Lovable/GitHub catalog.
// No external database or network request is required during build.

import { writeFileSync } from "fs";
import { resolve } from "path";
import { CATALOG } from "../src/lib/catalog";
import { BAVARIAN_MENS_COLLECTIONS } from "../src/lib/bavarianMensCollections";
import { BAVARIAN_WOMENS_COLLECTIONS } from "../src/lib/bavarianWomensCollections";
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

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

interface SitemapEntry {
  path: string;
  changefreq?: ChangeFrequency;
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

  for (const collection of BAVARIAN_WOMENS_COLLECTIONS) {
    entries.push({
      path: `/products/bavarian-trachten-wear/womens-trachten/${collection.slug}`,
      changefreq: "weekly",
      priority: "0.82",
    });
  }

  return entries;
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map<string, SitemapEntry>();

  for (const entry of [...staticEntries, ...catalogEntries()]) {
    if (!safePath(entry.path)) continue;
    unique.set(entry.path, { ...unique.get(entry.path), ...entry });
  }

  const ordered = Array.from(unique.values()).sort((a, b) => {
    if (a.path === "/") return -1;
    if (b.path === "/") return 1;
    return a.path.localeCompare(b.path);
  });

  const xml = [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
    ...ordered.map((entry) =>
      [
        `  <url>`,
        `    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>`,
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
  console.log(
    `sitemap.xml written (${ordered.length} canonical URLs) — committed Lovable catalog; no external database dependency`,
  );
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

main();
