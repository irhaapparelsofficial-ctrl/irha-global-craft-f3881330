import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  PUBLIC_IDENTITY,
  buildCanonicalOrganizationSchema,
  buildCanonicalWebsiteSchema,
} from "../src/lib/publicIdentity.mjs";

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

function assertCanonicalEntityGraph(source) {
  const scriptPattern = /<script[^>]*data-irha-static-site-identity=["']true["'][^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/i;
  const match = source.match(scriptPattern);
  if (!match) {
    throw new Error("Brand search signal patch could not find the canonical Organization/WebSite graph");
  }

  let graph;
  try {
    graph = JSON.parse(match[1]);
  } catch (error) {
    throw new Error(`Canonical brand graph is invalid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }

  const entities = Array.isArray(graph?.["@graph"]) ? graph["@graph"] : [];
  const organizations = entities.filter((item) => item?.["@type"] === "Organization");
  const websites = entities.filter((item) => item?.["@type"] === "WebSite");
  if (organizations.length !== 1 || websites.length !== 1) {
    throw new Error(`Canonical brand graph must contain one Organization and one WebSite; found ${organizations.length}/${websites.length}`);
  }

  const expectedOrganization = buildCanonicalOrganizationSchema({ includeContext: false });
  const expectedWebsite = buildCanonicalWebsiteSchema({ includeContext: false });
  if (JSON.stringify(organizations[0]) !== JSON.stringify(expectedOrganization)) {
    throw new Error("Canonical Organization graph does not match publicIdentity.mjs");
  }
  if (JSON.stringify(websites[0]) !== JSON.stringify(expectedWebsite)) {
    throw new Error("Canonical WebSite graph does not match publicIdentity.mjs");
  }
  if (websites[0].publisher?.["@id"] !== PUBLIC_IDENTITY.organizationId) {
    throw new Error("Canonical WebSite publisher does not reference the Organization @id");
  }
}

let html = await readFile(INDEX_PATH, "utf8");

assertCanonicalEntityGraph(html);
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
  PUBLIC_IDENTITY.organizationId,
  PUBLIC_IDENTITY.websiteId,
  PUBLIC_IDENTITY.logoUrl,
  PUBLIC_IDENTITY.telephone,
  PUBLIC_IDENTITY.email,
  ...PUBLIC_IDENTITY.sameAs,
  "/products/bavarian-trachten-wear",
  "/products/premium-leather-apparel",
  "/products/streetwear-activewear",
]) {
  if (!html.includes(required)) throw new Error(`Missing strengthened brand signal: ${required}`);
}
if (html.includes('"alternateName"') || html.includes('"legalName"') || html.includes('"@type":"LocalBusiness"')) {
  throw new Error("Canonical homepage identity contains an unapproved entity property or type");
}

await writeFile(INDEX_PATH, html, "utf8");
console.log("Validated canonical Irha Apparels entity graph and strengthened homepage brand signals");
