import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const indexPath = resolve("dist/index.html");
const openingMarker = '<main class="irha-boot-main"';
const sourceFallbackCanonical = '<link rel="canonical" href="https://irhaapparels.com/" />';
const markedFallbackCanonical = '<link data-irha-fallback-seo="true" rel="canonical" href="https://irhaapparels.com/" />';

let html = await readFile(indexPath, "utf8");
const openingIndex = html.indexOf(openingMarker);
if (openingIndex < 0) {
  throw new Error("Boot-shell main landmark is missing from dist/index.html");
}
if (html.indexOf(openingMarker, openingIndex + openingMarker.length) >= 0) {
  throw new Error("Boot-shell main landmark is duplicated in dist/index.html");
}

const fallbackCanonicalCount = html.split(sourceFallbackCanonical).length - 1;
const markedFallbackCanonicalCount = html.split(markedFallbackCanonical).length - 1;
if (fallbackCanonicalCount !== 1 || markedFallbackCanonicalCount !== 0) {
  throw new Error(`Expected exactly one unmarked static homepage fallback canonical before SPA ownership; found unmarked=${fallbackCanonicalCount}, marked=${markedFallbackCanonicalCount}`);
}
html = html.replace(sourceFallbackCanonical, markedFallbackCanonical);

const openingEnd = html.indexOf(">", openingIndex);
const closingIndex = html.indexOf("</main>", openingEnd);
if (openingEnd < 0 || closingIndex < 0) {
  throw new Error("Boot-shell main landmark is malformed in dist/index.html");
}

html = `${html.slice(0, openingIndex)}<div${html.slice(openingIndex + "<main".length, closingIndex)}</div>${html.slice(closingIndex + "</main>".length)}`;

if (html.includes(openingMarker)) {
  throw new Error("Boot-shell main landmark was not removed");
}
if (!/<main\b[^>]*id=["']irha-static-crawler-shell["']/i.test(html)) {
  throw new Error("Crawler route main landmark is missing after boot-shell normalization");
}
if ((html.split(markedFallbackCanonical).length - 1) !== 1) {
  throw new Error("Static homepage fallback canonical was not marked exactly once for SPA cleanup");
}

await writeFile(indexPath, html, "utf8");
console.log("Normalized boot shell and marked the static fallback canonical before SPA SEO ownership");
