// Runs before `vite dev` and `vite build`; writes public/sitemap.xml.
import { writeFileSync } from "fs";
import { resolve } from "path";
import { CATALOG } from "../src/lib/catalog";

const BASE_URL = "https://www.irhaapparels.com";

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const productEntries: { categorySlug: string; productSlug: string }[] = [];
for (const group of CATALOG) {
  for (const sub of group.subs) {
    for (const p of sub.products) {
      productEntries.push({
        categorySlug: group.slug,
        productSlug: slugify(p.name),
      });
    }
  }
}


interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
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
];

// Only slugs that have actual SeoLandingPage data in src/lib/seoPages.ts
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
  // Country pages
  "germany-apparel-manufacturer",
  "austria-lederhosen-manufacturer",
  "uae-sportswear-manufacturer",
  "usa-private-label-clothing-manufacturer",
  "uk-custom-apparel-manufacturer",
];

const categorySlugs = ["bavarian", "sportswear", "leatherwear", "streetwear", "leisurewear", "nightwear"];

const entries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
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
  ...seoLandingSlugs.map((slug) => ({ path: `/${slug}`, changefreq: "weekly" as const, priority: "0.95" })),
  ...categorySlugs.map((slug) => ({ path: `/products/${slug}`, changefreq: "weekly" as const, priority: "0.85" })),
  ...blogSlugs.map((slug) => ({ path: `/blog/${slug}`, changefreq: "monthly" as const, priority: "0.7" })),
  ...journalSlugs.map((slug) => ({ path: `/journal/${slug}`, changefreq: "monthly" as const, priority: "0.6" })),
];

const today = new Date().toISOString().slice(0, 10);

const xml = [
  `<?xml version="1.0" encoding="UTF-8"?>`,
  `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
  ...entries.map((e) =>
    [
      `  <url>`,
      `    <loc>${BASE_URL}${e.path}</loc>`,
      `    <lastmod>${today}</lastmod>`,
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
console.log(`sitemap.xml written (${entries.length} entries)`);
