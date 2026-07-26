import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITE_URL = "https://irhaapparels.com";
const workerPath = resolve("dist/_worker.js");
const sitemapPath = resolve("dist/sitemap.xml");
const wave2Routes = [
  "/fr/",
  "/fr/fabricant-vetements",
  "/fr/fabricant-vetements-sport",
  "/fr/fabricant-vetements-cuir",
  "/fr/fabrication-marque-blanche",
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
];

let worker = await readFile(workerPath, "utf8");
if (!worker.includes('  "/fr",') || !worker.includes('  "/nl",')) {
  worker = worker.replace('  "/de",\n', '  "/de",\n  "/fr",\n  "/nl",\n');
}
if (!worker.includes('  "/fr/",') || !worker.includes('  "/nl/",')) {
  worker = worker.replace('  "/de/",\n', '  "/de/",\n  "/fr/",\n  "/nl/",\n');
}
for (const required of ['  "/fr",', '  "/nl",', '  "/fr/",', '  "/nl/",']) {
  if (!worker.includes(required)) throw new Error(`Wave 2 worker route patch failed: ${required}`);
}
await writeFile(workerPath, worker, "utf8");

let sitemap = await readFile(sitemapPath, "utf8");
if (!sitemap.includes("</urlset>")) throw new Error("Built sitemap is missing </urlset>");
const existing = new Set([...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&")));
const today = new Date().toISOString().slice(0, 10);
const additions = wave2Routes
  .filter((route) => !existing.has(`${SITE_URL}${route}`))
  .map((route) => [
    "  <url>",
    `    <loc>${SITE_URL}${route}</loc>`,
    `    <lastmod>${today}</lastmod>`,
    "    <changefreq>monthly</changefreq>",
    "    <priority>0.82</priority>",
    "  </url>",
  ].join("\n"));
sitemap = sitemap.replace("</urlset>", `${additions.length ? `${additions.join("\n")}\n` : ""}</urlset>`);
const finalLocations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&"));
for (const route of wave2Routes) {
  const absolute = `${SITE_URL}${route}`;
  if (finalLocations.filter((location) => location === absolute).length !== 1) {
    throw new Error(`Wave 2 sitemap route must appear exactly once: ${route}`);
  }
}
if (finalLocations.length !== 417) throw new Error(`Expected 417 pre-finalizer sitemap URLs after Wave 2 append; found ${finalLocations.length}`);
await writeFile(sitemapPath, sitemap, "utf8");

console.log("Patched Cloudflare worker and appended 10 French/Dutch sitemap routes");
