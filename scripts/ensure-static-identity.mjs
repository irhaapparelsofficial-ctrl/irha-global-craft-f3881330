import { readFile, readdir, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import {
  PUBLIC_IDENTITY,
  buildCanonicalOrganizationSchema,
  buildCanonicalWebsiteSchema,
} from "../src/lib/publicIdentity.mjs";

const DIST = resolve("dist");
const JSON_LD_SCRIPT = /<script\b([^>]*)type=["']application\/ld\+json["']([^>]*)>([\s\S]*?)<\/script>/gi;
const canonicalGraph = {
  "@context": "https://schema.org",
  "@graph": [
    buildCanonicalOrganizationSchema({ includeContext: false }),
    buildCanonicalWebsiteSchema({ includeContext: false }),
  ],
};
const canonicalScript = `<script data-irha-static-site-identity="true" type="application/ld+json">${JSON.stringify(canonicalGraph).replace(/</g, "\\u003c")}</script>`;

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

function hasType(node, expected) {
  const type = node?.["@type"];
  return Array.isArray(type) ? type.includes(expected) : type === expected;
}

function isIrhaOrganization(node) {
  return hasType(node, "Organization") &&
    (node?.["@id"] === PUBLIC_IDENTITY.organizationId || node?.name === PUBLIC_IDENTITY.name);
}

function isCanonicalWebsite(node) {
  return hasType(node, "WebSite") && node?.["@id"] === PUBLIC_IDENTITY.websiteId;
}

function normalizeNested(value) {
  if (Array.isArray(value)) return value.map(normalizeNested);
  if (!value || typeof value !== "object") return value;
  if (isIrhaOrganization(value)) return { "@id": PUBLIC_IDENTITY.organizationId };
  if (isCanonicalWebsite(value)) return { "@id": PUBLIC_IDENTITY.websiteId };

  const output = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === "@graph" && Array.isArray(child)) {
      output[key] = child
        .filter((node) => !isIrhaOrganization(node) && !isCanonicalWebsite(node))
        .map(normalizeNested);
    } else {
      output[key] = normalizeNested(child);
    }
  }
  return output;
}

function normalizeJsonLdScripts(html, file) {
  return html.replace(JSON_LD_SCRIPT, (full, before, after, rawJson) => {
    const attributes = `${before} ${after}`;
    if (/data-irha-static-site-identity=["']true["']/i.test(attributes)) return "";

    let value;
    try {
      value = JSON.parse(rawJson);
    } catch (error) {
      throw new Error(`${file} contains invalid JSON-LD: ${error instanceof Error ? error.message : String(error)}`);
    }

    if (isIrhaOrganization(value) || isCanonicalWebsite(value)) return "";
    if (Array.isArray(value)) {
      value = value.filter((node) => !isIrhaOrganization(node) && !isCanonicalWebsite(node));
      if (value.length === 0) return "";
    }
    value = normalizeNested(value);
    if (Array.isArray(value?.["@graph"]) && value["@graph"].length === 0 && Object.keys(value).every((key) => key === "@context" || key === "@graph")) {
      return "";
    }

    return `<script${before}type="application/ld+json"${after}>${JSON.stringify(value).replace(/</g, "\\u003c")}</script>`;
  });
}

function collectNodes(value, nodes = []) {
  if (Array.isArray(value)) {
    value.forEach((item) => collectNodes(item, nodes));
    return nodes;
  }
  if (!value || typeof value !== "object") return nodes;
  if (value["@type"] || value["@id"]) nodes.push(value);
  for (const child of Object.values(value)) {
    if (child && typeof child === "object") collectNodes(child, nodes);
  }
  return nodes;
}

function verifyIdentity(html, file) {
  const scripts = [...html.matchAll(JSON_LD_SCRIPT)].map((match) => JSON.parse(match[3]));
  const nodes = scripts.flatMap((schema) => collectNodes(schema));
  const organizations = nodes.filter(isIrhaOrganization);
  const websites = nodes.filter(isCanonicalWebsite);
  if (organizations.length !== 1 || websites.length !== 1) {
    throw new Error(`${file} must contain exactly one canonical Organization and WebSite; found ${organizations.length}/${websites.length}`);
  }
  if (JSON.stringify(organizations[0]) !== JSON.stringify(buildCanonicalOrganizationSchema({ includeContext: false }))) {
    throw new Error(`${file} canonical Organization differs from publicIdentity.mjs`);
  }
  if (JSON.stringify(websites[0]) !== JSON.stringify(buildCanonicalWebsiteSchema({ includeContext: false }))) {
    throw new Error(`${file} canonical WebSite differs from publicIdentity.mjs`);
  }
}

const files = await walk(DIST);
let updated = 0;
for (const filePath of files) {
  const file = relative(DIST, filePath);
  let html = await readFile(filePath, "utf8");
  html = normalizeJsonLdScripts(html, file);
  if (!html.includes("</head>")) throw new Error(`${file} is missing </head>`);
  html = html.replace("</head>", `    ${canonicalScript}\n  </head>`);
  verifyIdentity(html, file);
  await writeFile(filePath, html, "utf8");
  updated += 1;
}

if (updated === 0) throw new Error("No static HTML files were found for canonical identity finalization");
console.log(`Finalized one canonical Organization and WebSite across ${updated} static HTML files`);
