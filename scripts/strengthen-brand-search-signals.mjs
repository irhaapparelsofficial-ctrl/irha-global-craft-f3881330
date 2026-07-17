import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const INDEX_PATH = resolve("dist/index.html");

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Brand search signal patch could not find ${label}`);
  }
  return source.replace(pattern, replacement);
}

let html = await readFile(INDEX_PATH, "utf8");

html = replaceRequired(
  html,
  /<title>[^<]*<\/title>/,
  "<title>Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan</title>",
  "homepage title",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" name="description" content=")[^"]*(" \/>)/,
  "$1Irha Apparels is a B2B apparel manufacturer in Sialkot, Pakistan, supplying custom Lederhosen, Dirndl, leather apparel, sportswear, streetwear and private-label clothing programs.$2",
  "homepage meta description",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" property="og:title" content=")[^"]*(" \/>)/,
  "$1Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan$2",
  "Open Graph title",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" property="og:description" content=")[^"]*(" \/>)/,
  "$1Irha Apparels manufactures custom Bavarian wear, leather apparel, sportswear, streetwear and private-label clothing for global B2B buyers.$2",
  "Open Graph description",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" name="twitter:title" content=")[^"]*(" \/>)/,
  "$1Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan$2",
  "Twitter title",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" name="twitter:description" content=")[^"]*(" \/>)/,
  "$1Irha Apparels manufactures custom apparel and private-label programs for global B2B buyers.$2",
  "Twitter description",
);
html = replaceRequired(
  html,
  /"description": "B2B custom apparel manufacturer in Sialkot, Pakistan providing OEM, ODM and private-label manufacturing programs\."/,
  '"description": "Irha Apparels is a B2B custom apparel manufacturer in Sialkot, Pakistan providing OEM, ODM and private-label manufacturing programs."',
  "Organization description",
);
html = replaceRequired(
  html,
  /"name": "Irha Apparels",\n\s+"url": "https:\/\/irhaapparels\.com\/",/,
  '"name": "Irha Apparels",\n            "alternateName": "Irha Apparels Sialkot",\n            "url": "https://irhaapparels.com/",',
  "Organization alternate name",
);
html = replaceRequired(
  html,
  /"name": "Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers"/,
  '"name": "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan"',
  "WebPage name",
);
html = replaceRequired(
  html,
  />Custom Apparel Manufacturer for Global B2B Buyers<\/h1>/,
  ">Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers</h1>",
  "homepage H1",
);

const canonicalLinks = new Map([
  ["/products/bavarian-garments", "/products/bavarian-trachten-wear"],
  ["/products/leather-garments", "/products/premium-leather-apparel"],
  ["/products/streetwear", "/products/streetwear-activewear"],
]);
for (const [legacy, canonical] of canonicalLinks) {
  if (!html.includes(`href="${legacy}"`)) {
    throw new Error(`Brand search signal patch could not find legacy homepage link ${legacy}`);
  }
  html = html.replaceAll(`href="${legacy}"`, `href="${canonical}"`);
}

for (const required of [
  "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan",
  "Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers",
  "https://irhaapparels.com/",
  "/products/bavarian-trachten-wear",
  "/products/premium-leather-apparel",
  "/products/streetwear-activewear",
]) {
  if (!html.includes(required)) throw new Error(`Missing strengthened brand signal: ${required}`);
}

await writeFile(INDEX_PATH, html, "utf8");
console.log("Strengthened exact Irha Apparels homepage brand signals and canonical category links");
