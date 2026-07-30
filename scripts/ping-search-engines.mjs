// Notify IndexNow only after a verified production deployment.
// Google discovers the canonical sitemap through robots.txt and Search Console;
// its retired unauthenticated sitemap ping endpoint is intentionally not called.

import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export const ORIGIN = "https://irhaapparels.com";
export const HOST = "irhaapparels.com";
export const INDEXNOW_KEY = "19d2833c43fe6e05e2a4416f65a53cdc";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";
export const DEFAULT_SITEMAP_PATH = resolve("public/sitemap.xml");
export const DEFAULT_ROUTE_STATE_PATH = resolve("seo/search-route-state.json");

export const NON_INDEXABLE_PATHS = new Set([
  "/studio",
  "/blog/dirndl-manufacturer-moq-50",
  "/blog/streetwear-oem-pakistan",
  "/blog/leather-grades-explained",
  "/blog/fob-sialkot-vs-cif-pricing-explained",
]);

// These groups remain exported as the audited fallback contract and for
// regression coverage. Normal production notification reads the built sitemap.
export const CORE_CHANGED_PATHS = [
  "/",
  "/products",
  "/products/bavarian-trachten-wear",
  "/products/premium-leather-apparel",
  "/products/sportswear",
  "/products/streetwear-activewear",
  "/products/leisure-nightwear",
  "/catalogue",
  "/buyer-trust",
  "/factory-video-call",
  "/inquiry",
];

export const BUYER_INTENT_CHANGED_PATHS = [
  "/germany-apparel-manufacturer",
  "/de/bavarian-wear",
  "/de/bekleidungshersteller-deutschland",
  "/custom-sportswear-manufacturer-germany",
  "/de/sportbekleidung-hersteller",
  "/leather-apparel-manufacturer-germany",
  "/de/lederbekleidung-hersteller",
  "/austria-apparel-manufacturer",
  "/switzerland-apparel-manufacturer",
  "/netherlands-apparel-manufacturer",
  "/uk-custom-apparel-manufacturer",
  "/usa-private-label-clothing-manufacturer",
  "/canada-apparel-manufacturer",
  "/australia-apparel-manufacturer",
  "/new-zealand-apparel-manufacturer",
  "/lederhosen-manufacturer-germany",
  "/dirndl-manufacturer-austria",
  "/custom-sportswear-manufacturer-uk",
  "/private-label-streetwear-manufacturer-usa",
  "/custom-leather-jacket-manufacturer-canada",
  "/de/lederhosen-hersteller",
  "/de/dirndl-grosshandel",
  "/de/trachten-private-label",
  "/fr/",
  "/fr/fabricant-vetements",
  "/fr/fabricant-vetements-sport",
  "/fr/fabricant-vetements-cuir",
  "/fr/fabrication-marque-blanche",
  "/nl/",
  "/nl/kledingfabrikant",
  "/nl/sportkleding-fabrikant",
  "/nl/leren-kleding-fabrikant",
  "/nl/private-label-kleding",
];

export const MARKET_GUIDE_CHANGED_PATHS = [
  "/markets",
  "/markets/germany",
  "/markets/austria",
  "/markets/switzerland",
  "/markets/netherlands",
  "/markets/united-states",
  "/markets/united-kingdom",
  "/markets/canada",
  "/markets/australia",
  "/markets/new-zealand",
];

export const BLOG_CHANGED_PATHS = [
  "/blog",
  "/blog/why-source-sportswear-from-pakistan",
  "/blog/lederhosen-manufacturing-guide",
  "/blog/private-label-streetwear-manufacturing",
  "/blog/why-sialkot-is-global-apparel-hub",
  "/blog/oem-vs-odm-clothing-manufacturing",
  "/blog/custom-hoodies-manufacturer-pakistan-moq-50",
  "/blog/lederhosen-wholesale-germany-oktoberfest-supplier",
  "/blog/private-label-sportswear-fob-sialkot",
  "/blog/small-batch-clothing-manufacturer-pakistan",
  "/blog/streetwear-oem-pakistan",
  "/blog/dirndl-manufacturer-moq-50",
  "/blog/sublimated-jerseys-wholesale-pakistan",
  "/blog/leather-jacket-manufacturer-small-order",
  "/blog/apparel-manufacturer-for-startups-moq-50",
  "/blog/fob-sialkot-vs-cif-pricing-explained",
];

// Conservative fallback used only when callers explicitly bypass sitemap discovery.
// Retain complete audited groups above, but never notify known non-indexable routes.
export const DEFAULT_CHANGED_PATHS = [
  ...CORE_CHANGED_PATHS,
  ...BUYER_INTENT_CHANGED_PATHS,
  ...MARKET_GUIDE_CHANGED_PATHS,
  ...BLOG_CHANGED_PATHS,
].filter((path) => !NON_INDEXABLE_PATHS.has(path));

function canonicalPathname(url) {
  if (url.pathname === "/" || /^\/(?:de|fr|nl)\/$/.test(url.pathname)) return url.pathname;
  return url.pathname.replace(/\/+$/, "");
}

function normalizeUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const url = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? new URL(trimmed)
    : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, ORIGIN);

  if (url.origin !== ORIGIN) {
    throw new Error(`IndexNow URL must use canonical origin ${ORIGIN}: ${url.href}`);
  }

  url.pathname = canonicalPathname(url);
  url.search = "";
  url.hash = "";
  return url.href;
}

function isIndexableCanonicalUrl(value) {
  const url = new URL(value);
  const pathname = canonicalPathname(url);
  return !NON_INDEXABLE_PATHS.has(pathname) && !pathname.startsWith("/intl/");
}

export function readCanonicalSitemapUrls(sitemapPath = DEFAULT_SITEMAP_PATH) {
  const xml = readFileSync(sitemapPath, "utf8");
  const locations = [...xml.matchAll(/<loc>([^<]+)<\/loc>/gi)].map((match) => match[1].trim());
  if (locations.length === 0) throw new Error(`Sitemap has no URL entries: ${sitemapPath}`);

  const urls = locations
    .map(normalizeUrl)
    .filter(Boolean)
    .filter(isIndexableCanonicalUrl);
  const unique = [...new Set(urls)];
  if (unique.length === 0) throw new Error(`Sitemap has no indexable canonical URLs: ${sitemapPath}`);
  return unique;
}

function readSitemapEntries(sitemapPath = DEFAULT_SITEMAP_PATH) {
  const xml = readFileSync(sitemapPath, "utf8");
  const entries = new Map();
  for (const match of xml.matchAll(/<url\b[^>]*>([\s\S]*?)<\/url>/gi)) {
    const location = match[1].match(/<loc>([^<]+)<\/loc>/i)?.[1]?.trim();
    if (!location) continue;
    const normalized = normalizeUrl(location);
    if (normalized) entries.set(normalized, match[0]);
  }
  if (entries.size === 0) throw new Error(`Sitemap has no URL entries: ${sitemapPath}`);
  return entries;
}

export function readChangedCanonicalSitemapUrls(
  sitemapPath = DEFAULT_SITEMAP_PATH,
  previousSitemapPath,
) {
  if (!previousSitemapPath) return [];
  const current = readSitemapEntries(sitemapPath);
  const previous = readSitemapEntries(previousSitemapPath);
  const candidates = new Set([...current.keys(), ...previous.keys()]);
  return [...candidates]
    .filter(isIndexableCanonicalUrl)
    .filter((url) => current.get(url) !== previous.get(url))
    .sort();
}

export function readSearchRouteStateEntries(statePath = DEFAULT_ROUTE_STATE_PATH) {
  const state = JSON.parse(readFileSync(statePath, "utf8"));
  if (state?.schemaVersion !== 1 || state?.canonicalOrigin !== ORIGIN || !Array.isArray(state?.routes)) {
    throw new Error(`Invalid search route state: ${statePath}`);
  }
  if (state.routeCount !== state.routes.length || state.routes.length === 0) {
    throw new Error(`Search route state count mismatch: ${statePath}`);
  }

  const entries = new Map();
  for (const route of state.routes) {
    const url = normalizeUrl(route?.url);
    const digest = String(route?.digest ?? "");
    if (!url || !/^sha256:[0-9a-f]{64}$/.test(digest)) {
      throw new Error(`Invalid search route state entry: ${statePath}`);
    }
    if (!isIndexableCanonicalUrl(url)) {
      throw new Error(`Search route state contains a non-indexable URL: ${url}`);
    }
    if (entries.has(url)) throw new Error(`Duplicate search route state URL: ${url}`);
    entries.set(url, digest);
  }
  return entries;
}

export function readChangedCanonicalRouteStateUrls(
  statePath = DEFAULT_ROUTE_STATE_PATH,
  previousStatePath,
) {
  if (!previousStatePath) return [];
  const current = readSearchRouteStateEntries(statePath);
  const previous = readSearchRouteStateEntries(previousStatePath);
  const candidates = new Set([...current.keys(), ...previous.keys()]);
  return [...candidates]
    .filter(isIndexableCanonicalUrl)
    .filter((url) => current.get(url) !== previous.get(url))
    .sort();
}

export function resolveChangedUrls({
  args = process.argv.slice(2),
  env = process.env,
  sitemapPath = DEFAULT_SITEMAP_PATH,
} = {}) {
  const routeStatePath = String(env.INDEXNOW_ROUTE_STATE ?? "").trim();
  const previousRouteStatePath = String(env.INDEXNOW_PREVIOUS_ROUTE_STATE ?? "").trim();
  const previousSitemapPath = String(env.INDEXNOW_PREVIOUS_SITEMAP ?? "").trim();
  const envValues = String(env.INDEXNOW_URLS ?? "")
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);

  let candidates;
  if (args.length > 0) candidates = args;
  else if (envValues.length > 0) candidates = envValues;
  else if (previousRouteStatePath) {
    candidates = readChangedCanonicalRouteStateUrls(
      routeStatePath || DEFAULT_ROUTE_STATE_PATH,
      previousRouteStatePath,
    );
  } else if (previousSitemapPath) {
    candidates = readChangedCanonicalSitemapUrls(sitemapPath, previousSitemapPath);
  } else candidates = readCanonicalSitemapUrls(sitemapPath);

  const urls = candidates.map(normalizeUrl).filter(Boolean).filter(isIndexableCanonicalUrl);
  return [...new Set(urls)];
}

export function buildIndexNowPayload(urlList = resolveChangedUrls()) {
  if (urlList.length === 0) throw new Error("No canonical URLs were supplied to IndexNow");
  if (urlList.length > 10_000) throw new Error("IndexNow accepts at most 10,000 URLs per request");

  return {
    host: HOST,
    key: INDEXNOW_KEY,
    keyLocation: `${ORIGIN}/${INDEXNOW_KEY}.txt`,
    urlList,
  };
}

async function submitIndexNow(payload) {
  const response = await fetch(INDEXNOW_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/json; charset=utf-8" },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(15_000),
  });

  const body = await response.text().catch(() => "");
  console.log(`[indexnow] status=${response.status} urls=${payload.urlList.length}`);
  if (body) console.log(`[indexnow] response=${body.slice(0, 500)}`);

  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow rejected the request with HTTP ${response.status}`);
  }
}

export async function main() {
  const urlList = resolveChangedUrls();
  if (urlList.length === 0) {
    console.log("[indexnow] no material canonical URL changes; submission skipped");
    return;
  }
  const payload = buildIndexNowPayload(urlList);

  if (process.env.INDEXNOW_DRY_RUN === "1") {
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  await submitIndexNow(payload);
}

const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectRun) {
  main().catch((error) => {
    console.error(`[indexnow] ${(error && error.message) || error}`);
    process.exitCode = process.env.INDEXNOW_STRICT === "1" ? 1 : 0;
  });
}
