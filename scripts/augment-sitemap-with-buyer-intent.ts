import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { BUYER_INTENT_LANDING_PAGES } from "../src/lib/buyerIntentLandingPages";

const SITE_URL = "https://irhaapparels.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");

function xmlEscape(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function main() {
  const sitemap = readFileSync(SITEMAP_PATH, "utf8");
  if (!sitemap.includes("</urlset>")) {
    throw new Error("Cannot augment sitemap.xml because </urlset> is missing");
  }

  const today = new Date().toISOString().slice(0, 10);
  const existing = new Set(
    [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&")),
  );

  const additions = BUYER_INTENT_LANDING_PAGES
    .filter((page) => !existing.has(`${SITE_URL}${page.path}`))
    .map((page) =>
      [
        "  <url>",
        `    <loc>${xmlEscape(`${SITE_URL}${page.path}`)}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        "    <changefreq>monthly</changefreq>",
        `    <priority>${page.path.startsWith("/de/") ? "0.82" : "0.86"}</priority>`,
        "  </url>",
      ].join("\n"),
    );

  const output = sitemap.replace(
    "</urlset>",
    `${additions.length > 0 ? `${additions.join("\n")}\n` : ""}</urlset>`,
  );

  writeFileSync(SITEMAP_PATH, output);
  console.log(`Added ${additions.length} buyer-intent URLs to sitemap.xml`);
}

main();
