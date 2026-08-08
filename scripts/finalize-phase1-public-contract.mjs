import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { CORE_ROUTE_CONTENT } from "../src/lib/routeContent.mjs";
import { PUBLIC_IDENTITY } from "../src/lib/publicIdentity.mjs";

const DIST = resolve("dist");
const MANIFEST_PATH = join(DIST, "seo-route-manifest.json");
const SITEMAP_PATH = join(DIST, "sitemap.xml");
const REDIRECTS_PATH = join(DIST, "_redirects");
const WORKER_PATH = join(DIST, "_worker.js");
const API_CATALOG_PATH = join(DIST, ".well-known", "api-catalog");
const PHASE0_INVENTORY_PATH = resolve("docs/phase-0/2026-08-08-legacy-route-inventory.csv");
const PHASE1_INVENTORY_PATH = join(DIST, "phase-1-legacy-route-inventory.csv");
const SITE_ORIGIN = "https://irhaapparels.com";
const PUBLIC_EMAIL = PUBLIC_IDENTITY.email;
const OFFICIAL_PHONE_DIGITS = "923204110066";

const BUYER_TRUST_AUTHORITY = Object.freeze({
  title: "Buyer Trust Center — Business Reference & Supplier Verification",
  description: "Verify Irha Apparels through its published business identity, SCCI directory/member reference A-101267, direct contact channels, written requirements and an appointment-based factory video call.",
  h1: "Verify the supplier before the order.",
});

const RUNTIME_AUTHORITIES = new Map([
  ["/buyer-trust", BUYER_TRUST_AUTHORITY],
  ["/buyer-information", {
    title: "Buyer Information | Irha Apparels",
    description: "Irha Apparels provides a practical information layer for private-label, OEM and ODM buyers. Every final commitment is confirmed against the actual product, material, quantity, destination and written commercial scope.",
    h1: "Clear commercial information before sampling and production.",
  }],
  ["/de", {
    title: "Irha Apparels auf Deutsch | B2B-Bekleidungshersteller",
    description: "Deutschsprachige B2B-Informationen zu Bekleidungsfertigung, Trachten, Lederhosen, Dirndl, Sportbekleidung und Lederbekleidung aus Sialkot, Pakistan.",
    h1: "B2B-Bekleidungsfertigung für deutschsprachige Einkäufer",
  }],
  ["/de/bekleidungshersteller-deutschland", {
    description: "Kundenspezifische Bekleidungsfertigung für deutsche Importeure, Großhändler, Fachhändler und Marken mit Musterentwicklung, Eigenmarken-Ausstattung und klarer Auftragsfreigabe.",
  }],
  ["/de/lederbekleidung-hersteller", {
    description: "Kundenspezifische Lederbekleidungsfertigung für deutsche Marken, Importeure und Großhändler mit abgestimmtem Leder, Futter, Beschlägen, Größen, Mustern und Etiketten.",
  }],
]);

const EXPECTED_PHASE1_REDIRECTS = new Map([
  ["/catalog", "/products"],
  ["/products/sportswear-soccer", "/products/sportswear/team-club/team-uniforms"],
  ["/products/sportswear-cricket", "/products/sportswear/team-club/team-uniforms"],
  ["/products/sportswear-baseball", "/products/sportswear/team-club/team-uniforms"],
  ["/products/sportswear-basketball", "/products/sportswear/team-club/team-uniforms"],
  ["/products/sportswear-rugby", "/products/sportswear/team-club/team-uniforms"],
  ["/products/bavarian-trachten-wear/alpine-trachten-hat", "/products/bavarian-trachten-wear/accessories/accessories/alpine-wool-hat"],
  ["/products/sportswear/athletic-onesie", "/products/sportswear/fitness-activewear/performance-activewear"],
  ["/products/sportswear/baseball-jersey", "/products/sportswear/team-club/team-uniforms/baseball-uniform"],
  ["/products/sportswear/baseball-uniform-kit", "/products/sportswear/team-club/team-uniforms/baseball-uniform"],
  ["/products/sportswear/basketball-mesh-jersey", "/products/sportswear/team-club/team-uniforms/basketball-uniform"],
  ["/products/sportswear/basketball-uniform-kit", "/products/sportswear/team-club/team-uniforms/basketball-uniform"],
  ["/products/bavarian-trachten-wear/bavarian-checkered-shirt", "/products/bavarian-trachten-wear/men/trachten-shirts/checked-trachten-shirt"],
  ["/products/bavarian-trachten-wear/bavarian-embroidered-vest", "/products/bavarian-trachten-wear/men/vests-waistcoats/wool-trachten-vest"],
]);

const FORBIDDEN_PUBLIC_PATTERNS = [
  /newly built website/i,
  /recently launched website/i,
  /newly launched/i,
  /our new site/i,
  /serving global B2B buyers/i,
  /serving buyers worldwide/i,
  /trusted by global brands/i,
  /global client base/i,
  /years of export experience/i,
  /Provisional Certificate of Membership/i,
  /SCCI provisional membership/i,
  /pending Executive Committee/i,
  /irhaapparelsofficial@gmail\.com/i,
  /\+?92[\s-]*334[\s-]*704[\s-]*3612/i,
  /certified factory/i,
  /audited factory/i,
  /compliant factory/i,
  /sustainability certification/i,
  /ethical certification/i,
];

const RESTRICTED_SCHEMA_TYPES = new Set(["AggregateRating", "Review", "Offer"]);
const RESTRICTED_SCHEMA_KEYS = new Set(["foundingDate", "aggregateRating", "reviewCount", "award", "awards", "priceRange", "certification"]);

function normalizePath(value) {
  if (!value || value === "/") return "/";
  return value.replace(/\/+$/, "") || "/";
}

function routeHtmlPath(pathname) {
  const normalized = normalizePath(pathname);
  return normalized === "/" ? join(DIST, "index.html") : join(DIST, normalized.slice(1), "index.html");
}

function primaryLang(locale) {
  const value = String(locale || "en").toLowerCase();
  if (value.startsWith("de")) return "de";
  if (value.startsWith("fr")) return "fr";
  if (value.startsWith("nl")) return "nl";
  return "en";
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function stripTags(value) {
  return String(value)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function setTag(html, regex, replacement) {
  return regex.test(html) ? html.replace(regex, replacement) : html;
}

function sanitizePublicText(text) {
  return String(text)
    .replace(/Experienced manufacturer\.\s*Newly built website\.?/gi, "Manufacturing verification before commitment.")
    .replace(/newly built website/gi, "public website")
    .replace(/recently launched website/gi, "public website")
    .replace(/newly launched/gi, "published")
    .replace(/our new site/gi, "the website")
    .replace(/Serving global B2B buyers/gi, "Available for international B2B enquiries")
    .replace(/serving global B2B buyers/gi, "available for international B2B enquiries")
    .replace(/Export Support/gi, "International Enquiry Support")
    .replace(/Worldwide buyer programs/gi, "Destination-specific buyer requirements")
    .replace(/SCCI provisional membership/gi, "SCCI member-directory reference")
    .replace(/Provisional Certificate of Membership/gi, "SCCI member-directory reference")
    .replace(/Certificate issued:\s*[^<\n]*/gi, "Certificate date: not asserted")
    .replace(/pending Executive Committee[^<\n.]*/gi, "no committee status is asserted")
    .replace(/irhaapparelsofficial@gmail\.com/gi, PUBLIC_EMAIL)
    .replace(/\+92\s*334\s*704\s*3612/g, PUBLIC_IDENTITY.telephone)
    .replace(/\+923347043612/g, PUBLIC_IDENTITY.telephoneHref);
}

function runtimeAuthorityFor(route) {
  const normalized = normalizePath(route.path);
  const core = CORE_ROUTE_CONTENT[normalized];
  const base = core ? { title: core.title, description: core.metaDescription, h1: core.h1 } : {};
  return { ...base, ...(RUNTIME_AUTHORITIES.get(normalized) || {}) };
}

function patchRoute(route) {
  const authority = runtimeAuthorityFor(route);
  return {
    ...route,
    locale: primaryLang(route.locale),
    title: sanitizePublicText(authority.title || route.title),
    description: sanitizePublicText(authority.description || route.description),
    h1: sanitizePublicText(authority.h1 || route.h1),
  };
}

function patchHtml(html, route) {
  const canonical = escapeHtml(route.canonicalUrl);
  const title = escapeHtml(route.title);
  const description = escapeHtml(route.description);
  const h1 = escapeHtml(route.h1);
  let output = sanitizePublicText(html);
  output = output.replace(/<html\b([^>]*)>/i, (tag) => {
    if (/\blang="[^"]*"/i.test(tag)) return tag.replace(/\blang="[^"]*"/i, `lang="${primaryLang(route.locale)}"`);
    return tag.replace(/>$/, ` lang="${primaryLang(route.locale)}">`);
  });
  output = setTag(output, /<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  output = setTag(output, /<meta\b[^>]*\bname="description"[^>]*>/i, `<meta name="description" content="${description}" />`);
  output = setTag(output, /<link\b[^>]*\brel="canonical"[^>]*>/i, `<link rel="canonical" href="${canonical}" />`);
  const h1Match = output.match(/<h1\b([^>]*)>[\s\S]*?<\/h1>/i);
  if (h1Match) output = output.replace(h1Match[0], `<h1${h1Match[1]}>${h1}</h1>`);

  if (normalizePath(route.path) === "/buyer-trust") {
    output = output
      .replace(/Certificate date:\s*not asserted/gi, "No certificate issue or renewal date is asserted without separate evidence")
      .replace(/holds a SCCI member-directory reference issued by/gi, "is associated in the public member directory of")
      .replace(/This is business-membership evidence, not a product certification or final membership certificate\./gi, "This directory reference is business-identity evidence only and is not presented as product or factory certification.");
  }
  return output;
}

function assertNoForbidden(label, text) {
  for (const pattern of FORBIDDEN_PUBLIC_PATTERNS) {
    if (pattern.test(text)) throw new Error(`Phase 1 public truth guard failed for ${label}: ${pattern}`);
  }
}

function assertStructuredData(label, html) {
  for (const match of html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi)) {
    let data;
    try { data = JSON.parse(match[1]); } catch { throw new Error(`Invalid JSON-LD in ${label}`); }
    const stack = [data];
    while (stack.length) {
      const value = stack.pop();
      if (Array.isArray(value)) { stack.push(...value); continue; }
      if (!value || typeof value !== "object") continue;
      const record = value;
      const type = record["@type"];
      const types = Array.isArray(type) ? type : [type];
      for (const item of types) if (typeof item === "string" && RESTRICTED_SCHEMA_TYPES.has(item)) throw new Error(`Restricted schema type ${item} in ${label}`);
      for (const key of Object.keys(record)) if (RESTRICTED_SCHEMA_KEYS.has(key)) throw new Error(`Restricted schema key ${key} in ${label}`);
      stack.push(...Object.values(record));
    }
  }
}

function parseRedirects(text) {
  const map = new Map();
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const [from, to, status = ""] = line.split(/\s+/);
    if (status !== "301") continue;
    if (map.has(from)) throw new Error(`Duplicate 301 source in built redirects: ${from}`);
    if (to.includes("?")) throw new Error(`Redirect target must not bake a query string: ${from} -> ${to}`);
    map.set(from, to);
  }
  return map;
}

function resolveOneHopTarget(target) {
  try {
    const parsed = new URL(target, SITE_ORIGIN);
    return parsed.origin === SITE_ORIGIN ? normalizePath(parsed.pathname) : null;
  } catch { return null; }
}

function assertRedirectGraph(redirects, manifestPaths) {
  for (const [from, target] of redirects) {
    const targetPath = resolveOneHopTarget(target);
    if (!targetPath) continue;
    if (normalizePath(from) === targetPath) throw new Error(`Self redirect: ${from}`);
    if (redirects.has(targetPath)) throw new Error(`Avoidable redirect chain: ${from} -> ${targetPath} -> ${redirects.get(targetPath)}`);
    const allowedFunctional = targetPath === "/auth" || targetPath === "/admin" || targetPath === "/blog";
    if (!manifestPaths.has(targetPath) && !allowedFunctional) throw new Error(`Redirect target is not a current canonical route: ${from} -> ${targetPath}`);
  }
  for (const [from, target] of EXPECTED_PHASE1_REDIRECTS) {
    if (redirects.get(from) !== target) throw new Error(`Phase 1 redirect mismatch: ${from} -> ${redirects.get(from) || "missing"}; expected ${target}`);
  }
}

function parseCsvLine(line) {
  const values = [];
  let index = 0;
  while (index < line.length) {
    if (line[index] === '"') {
      let value = "";
      index += 1;
      while (index < line.length) {
        if (line[index] === '"' && line[index + 1] === '"') { value += '"'; index += 2; continue; }
        if (line[index] === '"') { index += 1; break; }
        value += line[index++];
      }
      if (line[index] === ",") index += 1;
      values.push(value);
    } else {
      const end = line.indexOf(",", index);
      values.push(line.slice(index, end === -1 ? line.length : end));
      index = end === -1 ? line.length : end + 1;
    }
  }
  return values;
}

function csvEscape(value) {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function writePhase1Inventory(redirects, manifestPaths) {
  const source = await readFile(PHASE0_INVENTORY_PATH, "utf8");
  const lines = source.trim().split(/\r?\n/);
  const headers = parseCsvLine(lines[0]);
  const index = Object.fromEntries(headers.map((name, i) => [name, i]));
  const groups = new Map();
  for (const line of lines.slice(1)) {
    const row = parseCsvLine(line);
    const path = normalizePath(row[index.source_path]);
    if (!groups.has(path)) groups.set(path, []);
    groups.get(path).push({ classification: row[index.classification], target: row[index.target_path] });
  }

  const output = [["source_path", "phase1_action", "final_target", "target_state", "loop_or_chain", "evidence_date"].map(csvEscape).join(",")];
  let keep = 0;
  let redirects301 = 0;
  let gone410 = 0;
  let investigate = 0;

  for (const path of [...groups.keys()].sort()) {
    const rows = groups.get(path);
    const hadLegacyAction = rows.some((row) => row.classification === "301" || row.classification === "INVESTIGATE" || row.target);
    const target = redirects.get(path) || "";
    const retiredNonConcreteRule = path === "/catalogue/*";
    const retainedAssetRewrite = path === "/favicon.ico";
    let action = "KEEP";
    let state = manifestPaths.has(path) ? "canonical-200" : "not-in-manifest";
    let chain = "no";
    if (retiredNonConcreteRule) {
      keep += 1;
      state = "retired-non-concrete-wildcard";
    } else if (retainedAssetRewrite) {
      keep += 1;
      state = "asset-rewrite-200";
    } else if (target) {
      action = "301";
      redirects301 += 1;
      const targetPath = resolveOneHopTarget(target);
      state = targetPath && manifestPaths.has(targetPath) ? "canonical-200" : "functional-or-external";
      chain = targetPath && redirects.has(targetPath) ? "yes" : "no";
    } else if (hadLegacyAction && !manifestPaths.has(path)) {
      action = "INVESTIGATE";
      investigate += 1;
    } else {
      keep += 1;
    }
    output.push([path, action, target, state, chain, "2026-08-08"].map(csvEscape).join(","));
  }

  await writeFile(PHASE1_INVENTORY_PATH, `${output.join("\n")}\n`);
  return { total: groups.size, keep, redirects301, gone410, investigate };
}

function patchCatalogRedirect(text) {
  const lines = text.split(/\r?\n/);
  const seen = new Set();
  const output = [];
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) { output.push(raw); continue; }
    const parts = line.split(/\s+/);
    if (parts[2] === "301") {
      if (parts[0] === "/catalog") parts[1] = "/products";
      if (seen.has(parts[0])) continue;
      seen.add(parts[0]);
      output.push(`${parts[0]} ${parts[1]} 301`);
    } else output.push(raw);
  }
  return `${output.join("\n").replace(/\n+$/, "")}\n`;
}

function injectApiCatalogWorker(worker, apiCatalog) {
  if (worker.includes("X-Irha-Api-Catalog\", \"linkset-json")) return worker;
  const helper = `\nconst PHASE1_API_CATALOG_BODY = ${JSON.stringify(`${JSON.stringify(apiCatalog, null, 2)}\n`)};\nfunction phase1ApiCatalogResponse(request) {\n  return new Response(request.method === \"HEAD\" ? null : PHASE1_API_CATALOG_BODY, {\n    status: 200,\n    headers: {\n      \"Content-Type\": \"application/linkset+json; charset=utf-8\",\n      \"Cache-Control\": \"public, max-age=300, must-revalidate\",\n      \"Access-Control-Allow-Origin\": \"*\",\n      \"X-Content-Type-Options\": \"nosniff\",\n      \"X-Robots-Tag\": \"noindex, follow\",\n      \"X-Irha-Api-Catalog\": \"linkset-json\"\n    }\n  });\n}\n`;
  if (!worker.includes("export default {")) throw new Error("Unable to inject Phase 1 API catalog helper into worker");
  let output = worker.replace("export default {", `${helper}\nexport default {`);
  const anchor = "    if (url.hostname === WWW_HOST) return canonicalRedirect(request, url);";
  if (!output.includes(anchor)) throw new Error("Unable to inject Phase 1 API catalog dispatch into worker");
  output = output.replace(anchor, `${anchor}\n\n    if ((request.method === \"GET\" || request.method === \"HEAD\") && pathname === \"/.well-known/api-catalog\") {\n      return phase1ApiCatalogResponse(request);\n    }`);
  return output;
}

async function collectHtml(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectHtml(path));
    else if (entry.isFile() && entry.name.endsWith(".html")) files.push(path);
  }
  return files;
}

const manifest = JSON.parse(await readFile(MANIFEST_PATH, "utf8"));
manifest.routes = manifest.routes.map(patchRoute);
manifest.routeCount = manifest.routes.length;
manifest.sitemapCount = manifest.routes.filter((route) => route.indexable !== false && route.sitemap !== false).length;
await writeFile(MANIFEST_PATH, `${JSON.stringify(manifest, null, 2)}\n`);

const routeByPath = new Map(manifest.routes.map((route) => [normalizePath(route.path), route]));
const manifestPaths = new Set(routeByPath.keys());

for (const route of manifest.routes) {
  if (route.indexable === false) continue;
  const path = routeHtmlPath(route.path);
  let html;
  try { html = await readFile(path, "utf8"); } catch { throw new Error(`Missing built HTML for indexable route ${route.path}`); }
  const patched = patchHtml(html, route);
  assertNoForbidden(route.path, patched);
  assertStructuredData(route.path, patched);
  const title = stripTags(patched.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "");
  const h1 = stripTags(patched.match(/<h1\b[^>]*>([\s\S]*?)<\/h1>/i)?.[1] || "");
  const lang = patched.match(/<html\b[^>]*\blang="([^"]+)"/i)?.[1] || "";
  const canonical = patched.match(/<link\b[^>]*\brel="canonical"[^>]*\bhref="([^"]+)"/i)?.[1] || "";
  if (title !== route.title) throw new Error(`Title parity failed for ${route.path}: ${title} != ${route.title}`);
  if (h1 !== route.h1) throw new Error(`H1 parity failed for ${route.path}: ${h1} != ${route.h1}`);
  if (lang !== primaryLang(route.locale)) throw new Error(`HTML lang parity failed for ${route.path}: ${lang}`);
  if (canonical !== route.canonicalUrl) throw new Error(`Canonical parity failed for ${route.path}: ${canonical}`);
  await writeFile(path, patched);
}

let redirectsText = patchCatalogRedirect(await readFile(REDIRECTS_PATH, "utf8"));
await writeFile(REDIRECTS_PATH, redirectsText);
const redirects = parseRedirects(redirectsText);
assertRedirectGraph(redirects, manifestPaths);

for (const route of manifest.routes) {
  const canonicalPath = resolveOneHopTarget(route.canonicalUrl);
  if (canonicalPath && redirects.has(canonicalPath)) throw new Error(`Canonical points to a redirect: ${route.path} -> ${canonicalPath}`);
  for (const alternate of route.alternates || []) {
    const alternatePath = resolveOneHopTarget(alternate.url);
    if (alternatePath && !manifestPaths.has(alternatePath)) throw new Error(`Hreflang target missing from manifest: ${route.path} -> ${alternate.url}`);
    if (alternatePath && redirects.has(alternatePath)) throw new Error(`Hreflang target redirects: ${route.path} -> ${alternate.url}`);
  }
}

const sitemap = await readFile(SITEMAP_PATH, "utf8");
const sitemapPaths = new Set([...sitemap.matchAll(/<loc>(https:\/\/irhaapparels\.com(?:\/[^<]*)?)<\/loc>/g)].map((match) => normalizePath(new URL(match[1]).pathname)));
const expectedSitemap = new Set(manifest.routes.filter((route) => route.indexable !== false && route.sitemap !== false).map((route) => normalizePath(route.path)));
if (sitemapPaths.size !== expectedSitemap.size || [...sitemapPaths].some((path) => !expectedSitemap.has(path))) throw new Error(`Sitemap/manifest equality failed: sitemap=${sitemapPaths.size} manifest=${expectedSitemap.size}`);
for (const path of sitemapPaths) if (redirects.has(path)) throw new Error(`Redirected URL remains in sitemap: ${path}`);

for (const machineFile of [join(DIST, "llms.txt"), join(DIST, "llms-full.txt")]) {
  const text = sanitizePublicText(await readFile(machineFile, "utf8"));
  assertNoForbidden(machineFile, text);
  await writeFile(machineFile, text);
}

const allHtml = await collectHtml(DIST);
for (const path of allHtml) {
  const text = await readFile(path, "utf8");
  assertNoForbidden(path, text);
}

const publicText = `${await readFile(join(DIST, "llms.txt"), "utf8")}\n${await readFile(join(DIST, "llms-full.txt"), "utf8")}`;
if (!publicText.includes(PUBLIC_EMAIL)) throw new Error("Current public email is missing from AI-search summaries");
if (!publicText.includes(PUBLIC_IDENTITY.telephone)) throw new Error("Official phone is missing from AI-search summaries");
if (publicText.replace(/\D/g, "").includes("923347043612")) throw new Error("Superseded phone leaked into AI-search summaries");
if (OFFICIAL_PHONE_DIGITS !== PUBLIC_IDENTITY.telephoneHref.replace(/\D/g, "")) throw new Error("Public identity phone drift detected");

const apiCatalog = JSON.parse(await readFile(API_CATALOG_PATH, "utf8"));
if (!Array.isArray(apiCatalog.linkset) || apiCatalog.linkset.length === 0) throw new Error("API catalog is not a non-empty Linkset JSON document");
let worker = await readFile(WORKER_PATH, "utf8");
worker = injectApiCatalogWorker(worker, apiCatalog);
if (!worker.includes("application/linkset+json; charset=utf-8") || !worker.includes("X-Irha-Api-Catalog")) throw new Error("API catalog worker contract was not sealed");
await writeFile(WORKER_PATH, worker);

const inventory = await writePhase1Inventory(redirects, manifestPaths);
if (inventory.investigate !== 0) throw new Error(`Phase 1 legacy inventory still has ${inventory.investigate} unresolved paths`);

console.log(JSON.stringify({
  phase: "phase-1",
  routeCount: manifest.routes.length,
  sitemapCount: expectedSitemap.size,
  htmlCount: allHtml.length,
  redirectCount: redirects.size,
  knownRedirectConflictsResolved: EXPECTED_PHASE1_REDIRECTS.size,
  legacyInventory: inventory,
  publicEmail: PUBLIC_EMAIL,
  officialPhone: PUBLIC_IDENTITY.telephoneHref,
  apiCatalog: "application/linkset+json",
}, null, 2));