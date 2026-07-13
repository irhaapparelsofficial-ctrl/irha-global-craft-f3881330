import { readFile, writeFile } from "node:fs/promises";

const sitemapPath = new URL("../public/sitemap.xml", import.meta.url);
const sitemap = await readFile(sitemapPath, "utf8");
const values = [...sitemap.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map((match) => match[1]);
const uniqueValues = [...new Set(values)];
const today = new Date().toISOString().slice(0, 10);

if (uniqueValues.length === 1 && uniqueValues[0] === today) {
  const normalized = sitemap.replace(/^\s*<lastmod>[^<]+<\/lastmod>\s*\n/gm, "");
  await writeFile(sitemapPath, normalized, "utf8");
  console.log(`Removed ${values.length} build-date lastmod tags; route dates remain omitted until source-backed timestamps exist`);
} else if (uniqueValues.length === 0) {
  console.log("Sitemap contains no lastmod tags; no normalization needed");
} else {
  console.log(`Preserved ${values.length} source-backed lastmod tags across ${uniqueValues.length} dates`);
}
