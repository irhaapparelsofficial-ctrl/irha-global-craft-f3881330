import { readFile, readdir } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";

const DIST = resolve("dist");
const read = (name) => readFile(join(DIST, name), "utf8");
const assert = (condition, message) => { if (!condition) throw new Error(message); };

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const target = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(target));
    else if (entry.isFile() && entry.name === "index.html") files.push(target);
  }
  return files;
}

function schemaNodes(value, nodes = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => schemaNodes(item, nodes));
    return nodes;
  }
  if (!value || typeof value !== "object") return nodes;
  if (value["@type"] || value["@id"]) nodes.push(value);
  if (Array.isArray(value["@graph"])) value["@graph"].forEach((item) => schemaNodes(item, nodes));
  for (const [key, child] of Object.entries(value)) {
    if (key === "@graph") continue;
    if (child && typeof child === "object") schemaNodes(child, nodes);
  }
  return nodes;
}

function parseSchemas(html, file) {
  return [...html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((match) => {
    try { return JSON.parse(match[1]); }
    catch (error) { throw new Error(`${file} contains invalid JSON-LD: ${error.message}`); }
  });
}

const [html, robots, sitemap, llms, llmsFull] = await Promise.all([
  read("index.html"), read("robots.txt"), read("sitemap.xml"), read("llms.txt"), read("llms-full.txt"),
]);
const canonical = "https://irhaapparels.com";
const alternateHost = "https://www.irhaapparels.com";
const forbiddenClaims = ["Since 2014", "MOQ 50", "45-day delivery", "45-Day Production", "reply within 12 hours", "BSCI Audited", "ISO 9001:2015", "SEDEX Member"];

assert(html.includes('id="root"'), "Built HTML is missing the React root");
assert(html.includes('id="irha-static-crawler-shell"'), "Built HTML is missing the progressive crawler shell");
assert(html.includes("Custom Apparel Manufacturer for Global B2B Buyers"), "Built crawler shell is missing the current homepage H1");
assert(html.includes("info@irhaapparels.com") && html.includes("+92 320 4110066"), "Built crawler shell is missing public contact details");
assert(html.includes('href="/inquiry"') && html.includes('href="/buyer-trust"') && html.includes('href="/manufacturing"'), "Built crawler shell is missing primary conversion and trust links");
assert(html.includes(`<link rel="canonical" href="${canonical}/"`), "Built HTML canonical does not use the live apex host");
assert(html.includes(`property="og:url" content="${canonical}/"`), "Built Open Graph URL does not use the live apex host");
assert(html.includes('name="robots" content="index,follow,max-image-preview:large"'), "Built HTML is missing the static robots meta tag");
for (const term of forbiddenClaims) assert(!html.toLowerCase().includes(term.toLowerCase()), `Built crawler HTML contains unverified legacy claim: ${term}`);

const htmlFiles = await walk(DIST);
const sitemapCount = [...sitemap.matchAll(/<loc>/g)].length;
assert(sitemapCount === 407, `Expected 407 sitemap URLs, found ${sitemapCount}`);
assert(htmlFiles.length >= 407, `Expected at least 407 rendered HTML files, found ${htmlFiles.length}`);

const forbiddenProperties = ["legalName", "taxID", "vatID", "foundingDate", "numberOfEmployees", "award", "aggregateRating", "review", "streetAddress", "postalCode", "geo", "openingHoursSpecification", "areaServed"];
for (const file of htmlFiles) {
  const relativePath = relative(DIST, file);
  const page = await readFile(file, "utf8");
  const nodes = parseSchemas(page, relativePath).flatMap((schema) => schemaNodes(schema));
  const organizations = nodes.filter((node) => node["@type"] === "Organization" && (node["@id"] === PUBLIC_IDENTITY.organizationId || node.name === PUBLIC_IDENTITY.name));
  assert(organizations.length === 1, `${relativePath} must contain exactly one Irha Apparels Organization node; found ${organizations.length}`);
  const organization = organizations[0];
  assert(organization["@id"] === PUBLIC_IDENTITY.organizationId, `${relativePath} Organization @id drift`);
  assert(organization.name === PUBLIC_IDENTITY.name, `${relativePath} Organization name drift`);
  assert(organization.url === PUBLIC_IDENTITY.url, `${relativePath} Organization URL drift`);
  assert(organization.logo === PUBLIC_IDENTITY.logoUrl, `${relativePath} Organization logo drift`);
  assert(organization.telephone === PUBLIC_IDENTITY.telephone, `${relativePath} Organization telephone drift`);
  assert(organization.email === PUBLIC_IDENTITY.email, `${relativePath} Organization email drift`);
  assert(organization.address?.addressLocality === PUBLIC_IDENTITY.address.locality, `${relativePath} locality drift`);
  assert(organization.address?.addressRegion === PUBLIC_IDENTITY.address.region, `${relativePath} region drift`);
  assert(organization.address?.addressCountry === PUBLIC_IDENTITY.address.country, `${relativePath} country drift`);
  assert(JSON.stringify(organization.sameAs) === JSON.stringify(PUBLIC_IDENTITY.sameAs), `${relativePath} sameAs drift`);
  for (const property of forbiddenProperties) assert(!(property in organization), `${relativePath} emits forbidden Organization property ${property}`);
  assert(!nodes.some((node) => node["@type"] === "LocalBusiness" || (Array.isArray(node["@type"]) && node["@type"].includes("LocalBusiness"))), `${relativePath} emits LocalBusiness`);
  const websites = nodes.filter((node) => node["@type"] === "WebSite" && node["@id"] === PUBLIC_IDENTITY.websiteId);
  assert(websites.length === 1, `${relativePath} must contain exactly one canonical WebSite node`);
  assert(websites[0].publisher?.["@id"] === PUBLIC_IDENTITY.organizationId, `${relativePath} WebSite publisher drift`);
  const homepages = nodes.filter((node) => node["@type"] === "WebPage" && node["@id"] === PUBLIC_IDENTITY.homepageId);
  const expectedHomepageCount = relativePath === "index.html" ? 1 : 0;
  assert(homepages.length === expectedHomepageCount, `${relativePath} must contain ${expectedHomepageCount} canonical homepage WebPage node; found ${homepages.length}`);
  if (expectedHomepageCount === 1) {
    const homepage = homepages[0];
    assert(homepage.url === PUBLIC_IDENTITY.url, "Homepage WebPage URL drift");
    assert(homepage.name === PUBLIC_IDENTITY.homepage.title, "Homepage WebPage name drift");
    assert(homepage.isPartOf?.["@id"] === PUBLIC_IDENTITY.websiteId, "Homepage WebPage WebSite reference drift");
    assert(homepage.about?.["@id"] === PUBLIC_IDENTITY.organizationId, "Homepage WebPage about reference drift");
    assert(homepage.publisher?.["@id"] === PUBLIC_IDENTITY.organizationId, "Homepage WebPage publisher drift");
  }
  for (const product of nodes.filter((node) => node["@type"] === "Product")) {
    assert(product.manufacturer?.["@id"] === PUBLIC_IDENTITY.organizationId, `${relativePath} Product manufacturer drift`);
  }
}

for (const agent of ["Googlebot", "Bingbot", "OAI-SearchBot", "ChatGPT-User", "GPTBot", "ClaudeBot", "PerplexityBot"]) assert(robots.includes(`User-agent: ${agent}`), `robots.txt is missing ${agent}`);
assert(robots.includes(`Sitemap: ${canonical}/sitemap.xml`), "robots.txt sitemap does not use the canonical apex host");
assert(!sitemap.includes(`<loc>${alternateHost}`), "sitemap still contains www URLs");
assert(sitemap.includes(`<loc>${canonical}/</loc>`), "sitemap is missing the canonical homepage");
assert(llms.includes(`${canonical}/`), "llms.txt is missing absolute canonical URLs");
assert(llmsFull.toLowerCase().includes("two production hubs"), "llms-full.txt is missing the current homepage structure");
assert(await readFile(join(DIST, "irha-brand-mark.svg"), "utf8").then((value) => value.includes("Official owner-supplied Irha Apparels")), "Canonical crest asset is missing or unverified");

console.log(`PASS ${htmlFiles.length} built HTML files with one canonical Organization, one WebSite, one homepage WebPage, ${sitemapCount} sitemap URLs, valid contact identity and preserved crawler contracts`);
