// Notify IndexNow after a verified production deployment.
// Google discovers the canonical sitemap through robots.txt and Search Console;
// its retired unauthenticated sitemap ping endpoint is intentionally not called.

import { pathToFileURL } from "node:url";

export const ORIGIN = "https://irhaapparels.com";
export const HOST = "irhaapparels.com";
export const INDEXNOW_KEY = "19d2833c43fe6e05e2a4416f65a53cdc";
export const INDEXNOW_ENDPOINT = "https://api.indexnow.org/IndexNow";

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

export const DEFAULT_CHANGED_PATHS = [
  ...CORE_CHANGED_PATHS,
  ...BUYER_INTENT_CHANGED_PATHS,
  ...MARKET_GUIDE_CHANGED_PATHS,
  ...BLOG_CHANGED_PATHS,
];

function normalizeUrl(value) {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return null;

  const url = trimmed.startsWith("http://") || trimmed.startsWith("https://")
    ? new URL(trimmed)
    : new URL(trimmed.startsWith("/") ? trimmed : `/${trimmed}`, ORIGIN);

  if (url.origin !== ORIGIN) {
    throw new Error(`IndexNow URL must use canonical origin ${ORIGIN}: ${url.href}`);
  }

  url.hash = "";
  return url.href;
}

export function resolveChangedUrls({ args = process.argv.slice(2), env = process.env } = {}) {
  const envValues = String(env.INDEXNOW_URLS ?? "")
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter(Boolean);
  const candidates = args.length > 0 ? args : envValues.length > 0 ? envValues : DEFAULT_CHANGED_PATHS;
  const urls = candidates.map(normalizeUrl).filter(Boolean);
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
  const payload = buildIndexNowPayload();

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
