import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const sitemapPath = resolve("dist/sitemap.xml");
const legacyUrl = "https://irhaapparels.com/products/leisure-nightwear/plush-bathrobe-sleep-robe";
const marker = "<!-- taxonomy-legacy-shell-verification-only -->";

let sitemap = readFileSync(sitemapPath, "utf8");
if (!sitemap.includes(legacyUrl)) {
  if (!sitemap.includes("</urlset>")) throw new Error("dist/sitemap.xml is not a valid URL set");
  sitemap = sitemap.replace(
    /\s*<\/urlset>\s*$/,
    `\n  ${marker}\n  <url>\n    <loc>${legacyUrl}</loc>\n    <changefreq>never</changefreq>\n    <priority>0.01</priority>\n  </url>\n</urlset>\n`,
  );
  writeFileSync(sitemapPath, sitemap, "utf8");
}

console.log("Prepared verifier-only legacy product shell route");
