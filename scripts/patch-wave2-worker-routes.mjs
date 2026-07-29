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
  "/fr/informations-acheteurs",
  "/fr/matieres",
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
  "/nl/kopersinformatie",
  "/nl/materialen",
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

const sitemap = await readFile(sitemapPath, "utf8");
if (!sitemap.includes("</urlset>")) throw new Error("Built sitemap is missing </urlset>");
const locations = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].replace(/&amp;/g, "&"));
const uniqueLocations = new Set(locations);
if (uniqueLocations.size !== locations.length) {
  throw new Error(`Localized sitemap verification found ${locations.length - uniqueLocations.size} duplicate URLs`);
}
for (const route of wave2Routes) {
  const absolute = `${SITE_URL}${route}`;
  if (locations.filter((location) => location === absolute).length !== 1) {
    throw new Error(`Wave 2 sitemap route must already appear exactly once from the authoritative manifest: ${route}`);
  }
}

console.log("Patched Cloudflare worker and verified 14 authoritative French/Dutch sitemap routes without mutating the sitemap");
