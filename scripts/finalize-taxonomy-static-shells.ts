import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateTaxonomyProductShells, readExplicitTaxonomyRoutes } from "./generate-taxonomy-release-assets";

const sitemapPath = resolve("dist/sitemap.xml");
const legacyUrl = "https://irhaapparels.com/products/leisure-nightwear/plush-bathrobe-sleep-robe";
const marker = "<!-- taxonomy-legacy-shell-verification-only -->";
const legacyBlock = new RegExp(
  `\\s*${marker.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*<url>\\s*<loc>${legacyUrl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/loc>[\\s\\S]*?<\\/url>`,
  "g",
);

let sitemap = readFileSync(sitemapPath, "utf8");
sitemap = sitemap.replace(legacyBlock, "");
if (sitemap.includes(legacyUrl)) throw new Error("Verifier-only legacy product URL leaked into the final sitemap");
writeFileSync(sitemapPath, sitemap, "utf8");

generateTaxonomyProductShells(process.cwd(), "dist");

const { products } = readExplicitTaxonomyRoutes();
const plush = products.find((route) => route.productSlug === "womens-plush-robe");
if (!plush) throw new Error("Reviewed plush bathrobe taxonomy route is missing");

const canonicalShell = readFileSync(resolve("dist", plush.canonicalPath.slice(1), "index.html"), "utf8");
const legacyShell = readFileSync(resolve("dist", plush.sourceLegacyPath.slice(1), "index.html"), "utf8");
const deprecatedCanonicalShell = readFileSync(resolve("dist", plush.deprecatedCanonicalPath.slice(1), "index.html"), "utf8");
const expectedCanonical = `<link rel="canonical" href="https://irhaapparels.com${plush.canonicalPath}"`;
if (
  !canonicalShell.includes(expectedCanonical)
  || !legacyShell.includes(expectedCanonical)
  || !deprecatedCanonicalShell.includes(expectedCanonical)
) {
  throw new Error("Taxonomy product shells do not point to the reviewed four-level canonical URL");
}

console.log(`Finalized ${products.length} canonical taxonomy product shells; legacy verifier URL removed from sitemap`);
