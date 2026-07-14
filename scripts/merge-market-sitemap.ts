import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { MARKET_PAGES } from "../src/lib/marketPages";

const SITEMAP_PATH = resolve("public/sitemap.xml");
const BASE_URL = "https://irhaapparels.com";

function escapeXml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function entry(path: string, priority: string) {
  const today = new Date().toISOString().slice(0, 10);
  return [
    "  <url>",
    `    <loc>${escapeXml(`${BASE_URL}${path}`)}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    `    <priority>${priority}</priority>`,
    "  </url>",
  ].join("\n");
}

async function main() {
  let xml = await readFile(SITEMAP_PATH, "utf8");
  const paths = ["/markets", ...MARKET_PAGES.map((market) => `/markets/${market.slug}`)];

  if (paths.every((path) => xml.includes(`<loc>${BASE_URL}${path}</loc>`))) {
    console.log("market sitemap routes already present");
    return;
  }

  const additions = [
    entry("/markets", "0.90"),
    ...MARKET_PAGES.map((market) => entry(`/markets/${market.slug}`, market.slug === "germany" || market.slug === "united-states" || market.slug === "united-kingdom" ? "0.88" : "0.84")),
  ].join("\n");

  xml = xml.replace(/\s*<\/urlset>\s*$/, `\n${additions}\n</urlset>\n`);
  await writeFile(SITEMAP_PATH, xml, "utf8");
  console.log(`merged ${paths.length} market routes into sitemap.xml`);
}

void main();
