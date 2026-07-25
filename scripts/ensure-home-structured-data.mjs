import { readFile, writeFile } from "node:fs/promises";
import {
  PUBLIC_IDENTITY,
  buildCanonicalHomepageWebPageSchema,
  buildCanonicalOrganizationSchema,
  buildCanonicalWebsiteSchema,
} from "../src/lib/publicIdentity.mjs";

const indexUrl = new URL("../dist/index.html", import.meta.url);
let html = await readFile(indexUrl, "utf8");

const graph = {
  "@context": "https://schema.org",
  "@graph": [
    buildCanonicalOrganizationSchema({ includeContext: false }),
    buildCanonicalWebsiteSchema({ includeContext: false }),
    buildCanonicalHomepageWebPageSchema({ includeContext: false }),
  ],
};
const script = `<script data-irha-static-site-identity="true" type="application/ld+json">${JSON.stringify(graph).replace(/</g, "\\u003c")}</script>`;

html = html
  .replace(/\s*<script[^>]*data-irha-static-site-identity="true"[^>]*>[\s\S]*?<\/script>/gi, "")
  .replace("<!-- irha-static-site-identity -->", script);

if (!html.includes('data-irha-static-site-identity="true"')) {
  html = html.replace("</head>", `    ${script}\n  </head>`);
}

const scriptMatches = [...html.matchAll(/<script[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)];
let organizationCount = 0;
let homepageCount = 0;
for (const match of scriptMatches) {
  const value = JSON.parse(match[1]);
  const nodes = Array.isArray(value?.["@graph"]) ? value["@graph"] : [value];
  organizationCount += nodes.filter((node) => node?.["@type"] === "Organization").length;
  homepageCount += nodes.filter((node) => node?.["@type"] === "WebPage" && node?.["@id"] === PUBLIC_IDENTITY.homepageId).length;
}
if (organizationCount !== 1) throw new Error(`Expected exactly one static Organization node, found ${organizationCount}`);
if (homepageCount !== 1) throw new Error(`Expected exactly one canonical homepage WebPage node, found ${homepageCount}`);

for (const required of [
  PUBLIC_IDENTITY.organizationId,
  PUBLIC_IDENTITY.websiteId,
  PUBLIC_IDENTITY.homepageId,
  PUBLIC_IDENTITY.logoUrl,
  PUBLIC_IDENTITY.telephone,
  PUBLIC_IDENTITY.email,
  ...PUBLIC_IDENTITY.sameAs,
]) {
  if (!html.includes(required.replace(/&/g, "&amp;")) && !html.includes(required)) {
    throw new Error(`Static identity output is missing ${required}`);
  }
}

await writeFile(indexUrl, html, "utf8");
await import("./strengthen-brand-search-signals.mjs");
console.log("PASS canonical Organization, WebSite and homepage WebPage identity injected from publicIdentity.mjs");
