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

function writeSitemap(locations: string[]) {
  const directory = mkdtempSync(join(tmpdir(), "irha-indexnow-"));
  temporaryDirectories.push(directory);
  const path = join(directory, "sitemap.xml");
  const entries = locations.map((location) => `  <url><loc>${location}</loc></url>`).join("\n");
  writeFileSync(path, `<?xml version="1.0" encoding="UTF-8"?>\n<urlset>\n${entries}\n</urlset>\n`, "utf8");
  return path;
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

  it("builds a change-only notification diff from the parent sitemap", async () => {
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
