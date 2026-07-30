import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

const temporaryDirectories: string[] = [];

async function loadIndexNowModule() {
  const moduleUrl = pathToFileURL(resolve(process.cwd(), "scripts/ping-search-engines.mjs")).href;
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

async function loadSearchRouteStateModule() {
  const moduleUrl = pathToFileURL(resolve(process.cwd(), "scripts/generate-search-route-state.mjs")).href;
  return import(`${moduleUrl}?test=${Date.now()}-${Math.random()}`);
}

function createTemporaryPath(fileName: string) {
  const directory = mkdtempSync(join(tmpdir(), "irha-indexnow-"));
  temporaryDirectories.push(directory);
  return join(directory, fileName);
}

function writeSitemap(locations: string[]) {
  const path = createTemporaryPath("sitemap.xml");
  const entries = locations.map((location) => `  <url><loc>${location}</loc></url>`).join("\n");
  writeFileSync(path, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n${entries}\n</urlset>\n`, "utf8");
  return path;
}

function writeRouteState(entries: Array<{ url: string; digest: string }>) {
  const path = createTemporaryPath("search-route-state.json");
  writeFileSync(path, `${JSON.stringify({
    schemaVersion: 1,
    canonicalOrigin: "https://irhaapparels.com",
    routeCount: entries.length,
    routes: entries,
    contentDigest: `sha256:${"f".repeat(64)}`,
  }, null, 2)}\n`, "utf8");
  return path;
}

function routeDigest(character: string) {
  return `sha256:${character.repeat(64)}`;
}

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe("IndexNow canonical sitemap discovery", () => {
  it("submits canonical sitemap URLs while excluding noindex, removed and localized draft routes", async () => {
    const { resolveChangedUrls } = await loadIndexNowModule();
    const canonicalProduct = "https://irhaapparels.com/products/bavarian-trachten-wear/men/short-lederhosen/traditional-lederhosen";
    const sitemapPath = writeSitemap([
      "https://irhaapparels.com/",
      canonicalProduct,
      "https://irhaapparels.com/studio",
      "https://irhaapparels.com/intl/de/products/bavarian-trachten-wear",
      "https://irhaapparels.com/blog/dirndl-manufacturer-moq-50",
      "https://irhaapparels.com/blog/streetwear-oem-pakistan",
    ]);

    const urls = resolveChangedUrls({ args: [], env: {}, sitemapPath });

    expect(urls).toEqual([
      "https://irhaapparels.com/",
      canonicalProduct,
    ]);
  });

  it("builds a change-only notification diff from deterministic route states", async () => {
    const { resolveChangedUrls } = await loadIndexNowModule();
    const shared = "https://irhaapparels.com/";
    const changed = "https://irhaapparels.com/products/changed";
    const added = "https://irhaapparels.com/products/added";
    const removed = "https://irhaapparels.com/products/removed";
    const previousStatePath = writeRouteState([
      { url: shared, digest: routeDigest("a") },
      { url: changed, digest: routeDigest("b") },
      { url: removed, digest: routeDigest("c") },
    ]);
    const currentStatePath = writeRouteState([
      { url: shared, digest: routeDigest("a") },
      { url: changed, digest: routeDigest("d") },
      { url: added, digest: routeDigest("e") },
    ]);

    expect(resolveChangedUrls({
      args: [],
      env: {
        INDEXNOW_ROUTE_STATE: currentStatePath,
        INDEXNOW_PREVIOUS_ROUTE_STATE: previousStatePath,
      },
    })).toEqual([added, changed, removed]);
  });

  it("returns zero URLs for an unchanged release", async () => {
    const { resolveChangedUrls } = await loadIndexNowModule();
    const entries = [
      { url: "https://irhaapparels.com/", digest: routeDigest("a") },
      { url: "https://irhaapparels.com/products", digest: routeDigest("b") },
    ];
    const previousStatePath = writeRouteState(entries);
    const currentStatePath = writeRouteState(entries);

    expect(resolveChangedUrls({
      args: [],
      env: {
        INDEXNOW_ROUTE_STATE: currentStatePath,
        INDEXNOW_PREVIOUS_ROUTE_STATE: previousStatePath,
      },
    })).toEqual([]);
  });

  it("ignores timestamp-only route touches but detects buyer-visible route changes", async () => {
    const { buildSearchRouteState } = await loadSearchRouteStateModule();
    const route = {
      routeType: "individual-product",
      path: "/products/example",
      locale: "en",
      indexable: true,
      sitemap: true,
      title: "Example Product Manufacturer",
      description: "Original buyer description",
      h1: "Example Product",
      bodyText: "Original buyer body",
      lastmod: "2026-07-29T00:00:00.000Z",
      canonicalUrl: "https://irhaapparels.com/products/example",
    };
    const manifest = {
      schemaVersion: 1,
      canonicalOrigin: "https://irhaapparels.com",
      routeCount: 1,
      sitemapCount: 1,
      routes: [route],
    };

    const original = buildSearchRouteState(manifest);
    const timestampOnly = buildSearchRouteState({
      ...manifest,
      routes: [{ ...route, lastmod: "2026-07-30T00:00:00.000Z" }],
    });
    const materialChange = buildSearchRouteState({
      ...manifest,
      routes: [{ ...route, bodyText: "Materially revised buyer body" }],
    });

    expect(timestampOnly.routes[0].digest).toBe(original.routes[0].digest);
    expect(timestampOnly.contentDigest).toBe(original.contentDigest);
    expect(materialChange.routes[0].digest).not.toBe(original.routes[0].digest);
    expect(materialChange.contentDigest).not.toBe(original.contentDigest);
  });

  it("preserves localized gateway trailing-slash canonicals", async () => {
    const { resolveChangedUrls } = await loadIndexNowModule();
    const { buildSearchRouteState } = await loadSearchRouteStateModule();
    const gateways = [
      "https://irhaapparels.com/de/",
      "https://irhaapparels.com/fr/",
      "https://irhaapparels.com/nl/",
    ];
    const sitemapPath = writeSitemap(gateways);
    const routes = gateways.map((canonicalUrl, index) => ({
      routeType: "localized-market",
      path: new URL(canonicalUrl).pathname,
      locale: ["de-DE", "fr-FR", "nl-NL"][index],
      indexable: true,
      sitemap: true,
      title: `Gateway ${index}`,
      description: `Localized gateway ${index}`,
      h1: `Gateway ${index}`,
      lastmod: null,
      canonicalUrl,
    }));
    const state = buildSearchRouteState({
      schemaVersion: 1,
      canonicalOrigin: "https://irhaapparels.com",
      routeCount: routes.length,
      sitemapCount: routes.length,
      routes,
    });

    expect(resolveChangedUrls({ args: [], env: {}, sitemapPath })).toEqual(gateways);
    expect(state.routes.map((route) => route.url)).toEqual(gateways);
  });

  it("retains the legacy sitemap diff only as an explicit compatibility fallback", async () => {
    const { resolveChangedUrls } = await loadIndexNowModule();
    const previousSitemapPath = writeSitemap([
      "https://irhaapparels.com/",
      "https://irhaapparels.com/products/removed",
    ]);
    const currentSitemapPath = writeSitemap([
      "https://irhaapparels.com/",
      "https://irhaapparels.com/products/added",
    ]);

    expect(resolveChangedUrls({
      args: [],
      env: { INDEXNOW_PREVIOUS_SITEMAP: previousSitemapPath },
      sitemapPath: currentSitemapPath,
    })).toEqual([
      "https://irhaapparels.com/products/added",
      "https://irhaapparels.com/products/removed",
    ]);
  });

  it("rejects a sitemap that leaks the redirecting www host", async () => {
    const { readCanonicalSitemapUrls } = await loadIndexNowModule();
    const sitemapPath = writeSitemap(["https://www.irhaapparels.com/products"]);

    expect(() => readCanonicalSitemapUrls(sitemapPath)).toThrow(
      "IndexNow URL must use canonical origin https://irhaapparels.com",
    );
  });

  it("keeps removed and fixed-MOQ editorial routes out of the fallback notification set", async () => {
    const { DEFAULT_CHANGED_PATHS, NON_INDEXABLE_PATHS } = await loadIndexNowModule();

    expect(DEFAULT_CHANGED_PATHS).not.toContain("/blog/dirndl-manufacturer-moq-50");
    expect(DEFAULT_CHANGED_PATHS).not.toContain("/blog/streetwear-oem-pakistan");
    expect(DEFAULT_CHANGED_PATHS).not.toContain("/blog/fob-sialkot-vs-cif-pricing-explained");
    expect(NON_INDEXABLE_PATHS.has("/studio")).toBe(true);
  });
});
