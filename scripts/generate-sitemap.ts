// Runs before `vite dev` and `vite build`; writes the static sitemap seed.
// Product and taxonomy URLs are appended later from the owner Supabase public
// catalogue RPC. Legacy committed catalogue arrays must never define indexable
// product URLs.

import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

const BASE_URL = "https://irhaapparels.com";

type ChangeFrequency = "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";

type SitemapEntry = {
  path: string;
  changefreq?: ChangeFrequency;
  priority?: string;
  lastmod?: string;
};

const staticEntries: SitemapEntry[] = [
  { path: "/", changefreq: "weekly", priority: "1.0" },
  { path: "/products", changefreq: "weekly", priority: "0.95" },
  { path: "/about", changefreq: "monthly", priority: "0.8" },
  { path: "/manufacturing", changefreq: "monthly", priority: "0.8" },
  { path: "/buyer-trust", changefreq: "monthly", priority: "0.85" },
  { path: "/factory-video-call", changefreq: "monthly", priority: "0.82" },
  { path: "/resources", changefreq: "monthly", priority: "0.78" },
  { path: "/faq", changefreq: "monthly", priority: "0.78" },
  { path: "/compliance", changefreq: "monthly", priority: "0.75" },
  { path: "/inquiry", changefreq: "monthly", priority: "0.85" },
  { path: "/repeat-order", changefreq: "monthly", priority: "0.72" },
  { path: "/contact", changefreq: "monthly", priority: "0.7" },
  { path: "/connect", changefreq: "monthly", priority: "0.6" },
  { path: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
  { path: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
];

function safePath(value: string) {
  return value.startsWith("/") && !value.startsWith("//");
}

function absoluteUrl(path: string) {
  return path === "/" ? `${BASE_URL}/` : `${BASE_URL}${path}`;
}

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function main() {
  const today = new Date().toISOString().slice(0, 10);
  const unique = new Map<string, SitemapEntry>();

  for (const entry of staticEntries) {
    if (!safePath(entry.path)) continue;
    unique.set(entry.path, entry);
  }

  const ordered = [...unique.values()].sort((left, right) => {
    if (left.path === "/") return -1;
    if (right.path === "/") return 1;
    return left.path.localeCompare(right.path);
  });

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...ordered.map((entry) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(absoluteUrl(entry.path))}</loc>`,
        `    <lastmod>${entry.lastmod ?? today}</lastmod>`,
        entry.changefreq ? `    <changefreq>${entry.changefreq}</changefreq>` : null,
        entry.priority ? `    <priority>${entry.priority}</priority>` : null,
        "  </url>",
      ]
        .filter(Boolean)
        .join("\n"),
    ),
    "</urlset>",
  ].join("\n");

  writeFileSync(resolve("public/sitemap.xml"), `${xml}\n`);
  console.log(
    `sitemap.xml static seed written (${ordered.length} URLs); canonical catalogue and taxonomy routes are appended from owner Supabase`,
  );
}

main();
