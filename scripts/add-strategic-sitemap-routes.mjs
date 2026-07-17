import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const SITEMAP_PATH = resolve("public/sitemap.xml");
const SITE = "https://irhaapparels.com";
const ROUTES = [
  {
    path: "/de/bavarian-wear",
    changefreq: "weekly",
    priority: "0.88",
  },
];

const source = await readFile(SITEMAP_PATH, "utf8");
let output = source;
const today = new Date().toISOString().slice(0, 10);

for (const route of ROUTES) {
  const loc = `${SITE}${route.path}`;
  if (output.includes(`<loc>${loc}</loc>`)) continue;
  const block = `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${route.changefreq}</changefreq>\n    <priority>${route.priority}</priority>\n  </url>\n`;
  output = output.replace(/<\/urlset>\s*$/i, `${block}</urlset>\n`);
}

if (!output.includes(`<loc>${SITE}/de/bavarian-wear</loc>`)) {
  throw new Error("German Bavarian sourcing route was not added to sitemap.xml");
}
if (/lovable\.app|www\.irhaapparels\.com/i.test(output)) {
  throw new Error("A non-canonical host leaked into sitemap.xml");
}

await writeFile(SITEMAP_PATH, output, "utf8");
console.log("Strategic B2B sitemap routes verified");
