import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const sitemapPath = resolve("public/sitemap.xml");
const canonical = "https://irhaapparels.com/de/bavarian-wear";

const xml = await readFile(sitemapPath, "utf8");
if (!xml.includes(`<loc>${canonical}</loc>`)) {
  const today = new Date().toISOString().slice(0, 10);
  const entry = [
    "  <url>",
    `    <loc>${canonical}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "    <changefreq>weekly</changefreq>",
    "    <priority>0.88</priority>",
    "  </url>",
  ].join("\n");
  const next = xml.replace(/\s*<\/urlset>\s*$/i, `\n${entry}\n</urlset>\n`);
  if (next === xml) throw new Error("Could not append German Bavarian sourcing route to sitemap.xml");
  await writeFile(sitemapPath, next, "utf8");
  console.log("Added /de/bavarian-wear to sitemap.xml");
}
