import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const path = resolve("dist/de/bavarian-wear/index.html");
let html = await readFile(path, "utf8");
const title = "Trachten & Lederhosen Hersteller für Großhandel | Irha Apparels";
const description = "B2B Hersteller für Lederhosen, Dirndl und Trachtenbekleidung in Sialkot. OEM, Private Label und Export für Deutschland, Österreich und die Schweiz.";
const canonical = "https://irhaapparels.com/de/bavarian-wear";

html = html
  .replace(/<html lang="[^"]*"/i, '<html lang="de-DE"')
  .replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`)
  .replace(/<meta data-irha-fallback-seo="true" name="description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="description" content="${description}" />`)
  .replace(/<link rel="canonical" href="[^"]*"\s*\/?>/i, `<link rel="canonical" href="${canonical}" />`)
  .replace(/<meta data-irha-fallback-seo="true" property="og:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:title" content="${title}" />`)
  .replace(/<meta data-irha-fallback-seo="true" property="og:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:description" content="${description}" />`)
  .replace(/<meta data-irha-fallback-seo="true" property="og:url" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" property="og:url" content="${canonical}" />`)
  .replace(/<meta data-irha-fallback-seo="true" name="twitter:title" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:title" content="${title}" />`)
  .replace(/<meta data-irha-fallback-seo="true" name="twitter:description" content="[^"]*"\s*\/?>/i, `<meta data-irha-fallback-seo="true" name="twitter:description" content="${description}" />`);

if (!html.includes(`<title>${title}</title>`) || !html.includes(`<link rel="canonical" href="${canonical}"`)) {
  throw new Error("German Bavarian static shell metadata could not be verified");
}
if (/lovable\.app|www\.irhaapparels\.com/i.test(html)) {
  throw new Error("A non-canonical host leaked into the German route shell");
}

await writeFile(path, html, "utf8");
console.log("German Bavarian route shell metadata verified");
