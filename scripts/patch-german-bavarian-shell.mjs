import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const outputPath = resolve("dist/de/bavarian-wear/index.html");
const canonical = "https://irhaapparels.com/de/bavarian-wear";
const english = "https://irhaapparels.com/products/bavarian-trachten-wear";
const title = "Trachtenhersteller für Großhandel & Private Label | Irha Apparels";
const description = "B2B-Trachtenfertigung für Lederhosen, Dirndl und koordinierte Kollektionen aus Sialkot mit Musterfreigabe, Eigenmarken-Ausstattung und direkter Herstellerkommunikation.";
const heading = "Trachtenfertigung für Großhandel und Eigenmarken";

let html;
try {
  html = await readFile(outputPath, "utf8");
} catch (error) {
  if (error && error.code === "ENOENT") {
    console.log("Skipped: /de/bavarian-wear shell not present in sitemap");
    process.exit(0);
  }
  throw error;
}
html = html
  .replace(/<html lang="[^"]*"/i, '<html lang="de-DE"')
  .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
  .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`)
  .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
  .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`)
  .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`)
  .replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`)
  .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`)
  .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`)
  .replace(/(<main id="irha-static-crawler-shell"[\s\S]*?<h1[^>]*>)[\s\S]*?(<\/h1>)/i, `$1${heading}$2`)
  .replace(/(<main id="irha-static-crawler-shell"[\s\S]*?<h1[^>]*>[\s\S]*?<\/h1>\s*<p[^>]*>)[\s\S]*?(<\/p>)/i, `$1${description}$2`);

if (!html.includes('hreflang="de"')) {
  html = html.replace(
    "</head>",
    `    <link rel="alternate" hreflang="de" href="${canonical}" />\n    <link rel="alternate" hreflang="en" href="${english}" />\n    <link rel="alternate" hreflang="x-default" href="${english}" />\n  </head>`,
  );
}

if (!html.includes(`<title>${title}</title>`) || !html.includes(`href="${canonical}"`)) {
  throw new Error("German Bavarian crawler shell metadata patch failed");
}
await writeFile(outputPath, html, "utf8");
console.log("Localized German Bavarian crawler shell metadata");
