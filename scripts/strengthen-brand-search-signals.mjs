import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

const INDEX_PATH = resolve("dist/index.html");
const BRAND_TITLE = "Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan";
const BRAND_H1 = "Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers";
const BRAND_DESCRIPTION = "Irha Apparels is a B2B apparel manufacturer in Sialkot, Pakistan, supplying custom Lederhosen, Dirndl, leather apparel, sportswear, streetwear and private-label clothing programs.";

function replaceRequired(source, pattern, replacement, label) {
  if (!pattern.test(source)) {
    throw new Error(`Brand search signal patch could not find ${label}`);
  }
  return source.replace(pattern, replacement);
}

function patchEntityGraph(source) {
  const scriptPattern = /<script([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = scriptPattern.exec(source)) !== null) {
    let graph;
    try {
      graph = JSON.parse(match[3]);
    } catch {
      continue;
    }

    const entities = Array.isArray(graph?.["@graph"]) ? graph["@graph"] : [];
    const organization = entities.find((item) => item?.["@id"] === "https://irhaapparels.com/#organization");
    const website = entities.find((item) => item?.["@id"] === "https://irhaapparels.com/#website");
    const webpage = entities.find((item) => item?.["@id"] === "https://irhaapparels.com/#webpage");
    if (!organization || !website || !webpage) continue;

    organization.name = "Irha Apparels";
    organization.alternateName = "Irha Apparels Sialkot";
    organization.url = "https://irhaapparels.com/";
    organization.description = "Irha Apparels is a B2B custom apparel manufacturer in Sialkot, Pakistan providing OEM, ODM and private-label manufacturing programs.";
    website.name = "Irha Apparels";
    website.url = "https://irhaapparels.com/";
    webpage.name = BRAND_TITLE;
    webpage.url = "https://irhaapparels.com/";
    webpage.description = "Irha Apparels manufactures custom apparel and private-label programs in Sialkot, Pakistan for brands, wholesalers and importers worldwide.";

    const attributes = `${match[1]}type="application/ld+json"${match[2]}`.replace(/\s+/g, " ").trim();
    const replacement = `<script ${attributes} data-irha-brand-entity>${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`;
    return `${source.slice(0, match.index)}${replacement}${source.slice(match.index + match[0].length)}`;
  }

  throw new Error("Brand search signal patch could not find the homepage Organization/WebSite/WebPage graph");
}

let html = await readFile(INDEX_PATH, "utf8");

html = replaceRequired(html, /<title>[^<]*<\/title>/, `<title>${BRAND_TITLE}</title>`, "homepage title");
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" name="description" content=")[^"]*(" \/>)/,
  `$1${BRAND_DESCRIPTION}$2`,
  "homepage meta description",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" property="og:title" content=")[^"]*(" \/>)/,
  `$1${BRAND_TITLE}$2`,
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
  `$1${BRAND_TITLE}$2`,
  "Twitter title",
);
html = replaceRequired(
  html,
  /(<meta data-irha-fallback-seo="true" name="twitter:description" content=")[^"]*(" \/>)/,
  "$1Irha Apparels manufactures custom apparel and private-label programs for global B2B buyers.$2",
  "Twitter description",
);
html = patchEntityGraph(html);
html = replaceRequired(
  html,
  />Custom Apparel Manufacturer for Global B2B Buyers<\/h1>/,
  `>${BRAND_H1}</h1>`,
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
  BRAND_TITLE,
  BRAND_H1,
  BRAND_DESCRIPTION,
  '"alternateName":"Irha Apparels Sialkot"',
  "https://irhaapparels.com/",
  "/products/bavarian-trachten-wear",
  "/products/premium-leather-apparel",
  "/products/streetwear-activewear",
]) {
  if (!html.includes(required)) throw new Error(`Missing strengthened brand signal: ${required}`);
}

await writeFile(INDEX_PATH, html, "utf8");
console.log("Strengthened exact Irha Apparels homepage brand signals and canonical category links");
