import { readFile, writeFile } from "node:fs/promises";

const sitemapPath = new URL("../public/sitemap.xml", import.meta.url);
const apex = "https://irhaapparels.com";
const canonical = "https://www.irhaapparels.com";

const sitemap = await readFile(sitemapPath, "utf8");
const normalized = sitemap.replaceAll(apex, canonical);

if (!normalized.includes(`<loc>${canonical}/</loc>`)) {
  throw new Error("Generated sitemap is missing the canonical www homepage URL");
}

if (normalized.includes(`<loc>${apex}`)) {
  throw new Error("Generated sitemap still contains apex URLs after normalization");
}

await writeFile(sitemapPath, normalized, "utf8");
console.log(`Normalized sitemap origin to ${canonical}`);
