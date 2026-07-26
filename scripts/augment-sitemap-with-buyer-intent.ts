import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { SEO_BUYER_INTENT_LANDING_PAGES } from "../src/lib/buyerIntentSeoPages";
import { getPublishedLocalizedRoutes, isPublishedLocalizedRoute } from "../src/lib/i18nFoundation";

const SITE_URL = "https://irhaapparels.com";
const SITEMAP_PATH = resolve("public/sitemap.xml");

function xmlEscape(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\"/g, "&quot;").replace(/'/g, "&apos;");
}

function main() {
  const sitemap = readFileSync(SITEMAP_PATH, "utf8");
  if (!sitemap.includes("</urlset>")) throw new Error("Cannot augment sitemap.xml because </urlset> is missing");
  const today = new Date().toISOString().slice(0, 10);
  const existing = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&")));

  const buyerIntentPaths = SEO_BUYER_INTENT_LANDING_PAGES
    .filter((page) => !page.path.startsWith("/de/") || isPublishedLocalizedRoute(page.path))
    .map((page) => page.path);
  // The new /de/ gateway is appended to the built sitemap after legacy 407-route
  // enrichment completes. This preserves the proven pre-finalizer route contract
  // while the shipped artifact still contains the published German entry route.
  const publishedLocalizedPaths = getPublishedLocalizedRoutes()
    .filter((route) => route.path !== "/de/")
    .map((route) => route.path);
  const paths = [...new Set([...buyerIntentPaths, ...publishedLocalizedPaths])].sort((left, right) => left.localeCompare(right));

  const additions = paths
    .filter((path) => !existing.has(`${SITE_URL}${path}`))
    .map((path) => [
      "  <url>",
      `    <loc>${xmlEscape(`${SITE_URL}${path}`)}</loc>`,
      `    <lastmod>${today}</lastmod>`,
      "    <changefreq>monthly</changefreq>",
      `    <priority>${path.startsWith("/de/") ? "0.82" : "0.86"}</priority>`,
      "  </url>",
    ].join("\n"));

  const output = sitemap.replace("</urlset>", `${additions.length > 0 ? `${additions.join("\n")}\n` : ""}</urlset>`);
  writeFileSync(SITEMAP_PATH, output);
  console.log(`Added ${additions.length} published buyer-intent and localized URLs to sitemap.xml`);
}

main();
