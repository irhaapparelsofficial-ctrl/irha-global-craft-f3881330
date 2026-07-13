import { readFile, writeFile } from "node:fs/promises";

const sitemapPath = new URL("../public/sitemap.xml", import.meta.url);
const wwwOrigin = "https://www.irhaapparels.com";
const canonical = "https://irhaapparels.com";

const sitemap = await readFile(sitemapPath, "utf8");
const normalized = sitemap.replaceAll(wwwOrigin, canonical);

if (!normalized.includes(`<loc>${canonical}/</loc>`)) {
  throw new Error("Generated sitemap is missing the canonical apex homepage URL");
}

if (normalized.includes(`<loc>${wwwOrigin}`)) {
  throw new Error("Generated sitemap still contains www URLs after normalization");
}

await writeFile(sitemapPath, normalized, "utf8");
console.log(`Normalized sitemap origin to ${canonical}`);
