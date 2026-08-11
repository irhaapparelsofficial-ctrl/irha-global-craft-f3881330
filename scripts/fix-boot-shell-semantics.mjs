import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const indexPath = resolve("dist/index.html");
const openingMarker = '<main class="irha-boot-main"';

let html = await readFile(indexPath, "utf8");
const openingIndex = html.indexOf(openingMarker);
if (openingIndex < 0) {
  throw new Error("Boot-shell main landmark is missing from dist/index.html");
}
if (html.indexOf(openingMarker, openingIndex + openingMarker.length) >= 0) {
  throw new Error("Boot-shell main landmark is duplicated in dist/index.html");
}

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

await writeFile(indexPath, html, "utf8");
console.log("Normalized boot shell to a non-landmark container before static route generation");
