import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { getPublishedLocalizedRoutes } from "../lib/i18nFoundation";

const wave2Routes = [
  "/fr/", "/fr/fabricant-vetements", "/fr/fabricant-vetements-sport", "/fr/fabricant-vetements-cuir", "/fr/fabrication-marque-blanche", "/fr/informations-acheteurs", "/fr/matieres",
  "/nl/", "/nl/kledingfabrikant", "/nl/sportkleding-fabrikant", "/nl/leren-kleding-fabrikant", "/nl/private-label-kleding", "/nl/kopersinformatie", "/nl/materialen",
];

describe("Wave 2 raw HTML and edge contracts", () => {
  it("generates runtime-free raw HTML with canonical, hreflang and localized schema", () => {
    const generator = readFileSync("scripts/generate-buyer-intent-route-shells.ts", "utf8");
    expect(generator).toContain('data-irha-static-buyer-shell="true"');
    expect(generator).toContain('rel="canonical"');
    expect(generator).toContain('hreflang="x-default"');
    expect(generator).toContain('"@type": "FAQPage"');
    expect(generator).toContain("Application JavaScript leaked into static buyer page");
  });

  it("derives exact sitemap acceptance from the authoritative SEO route manifest", () => {
    const finalizer = readFileSync("scripts/finalize-i18n-foundation.ts", "utf8");
    const manifestBuilder = readFileSync("scripts/finalize-seo-route-manifest.ts", "utf8");
    const foundation = readFileSync("src/lib/i18nFoundation.ts", "utf8");

    expect(finalizer).toContain('const SEO_MANIFEST_PATH = join(DIST_DIR, "seo-route-manifest.json")');
    expect(finalizer).toContain("function verifySitemapExactSet");
    expect(finalizer).toContain("route.indexable && route.sitemap");
    expect(finalizer).toContain("Duplicate sitemap URLs found during i18n finalization");
    expect(finalizer).toContain("Sitemap is missing authoritative URL");
    expect(finalizer).toContain("Sitemap contains non-authoritative URL");
    expect(finalizer).toContain("Unpublished localized sitemap URLs");
    expect(finalizer).not.toMatch(/EXPECTED_SITEMAP_URLS\s*=/);

    expect(manifestBuilder).toContain("canonicalOrigin: SITE_URL");
    expect(manifestBuilder).toContain("sitemapCount: ordered.filter((route) => route.indexable && route.sitemap).length");
    expect(manifestBuilder).toContain("const sitemapRoutes = ordered.filter((route) => route.indexable && route.sitemap)");
    expect(manifestBuilder).toContain('route.path.includes("?") || route.path.includes("#")');
    expect(manifestBuilder).toContain("route.canonicalUrl !== canonicalUrl(route.path)");
    expect(manifestBuilder).toContain("addLocalizedRegistryRoutes(routes)");
    expect(manifestBuilder).toContain("addBlogRoutes(routes, blogPosts)");
    expect(manifestBuilder).toContain('routeType: "resource-article"');
    expect(manifestBuilder).toContain("equivalentGroup: null");
    expect(manifestBuilder).toContain("route.alternates.length > 0");
    expect(manifestBuilder).toContain("route.xDefault = null");
    expect(manifestBuilder).toContain("route.alternates = [{ hreflang: localeCode(route.locale)");
    expect(manifestBuilder).toContain("BUYER_INFORMATION_COPY");

    const publishedLocalized = getPublishedLocalizedRoutes();
    expect(publishedLocalized.length).toBeGreaterThan(0);
    for (const route of publishedLocalized) {
      expect(foundation).toContain(`path: "${route.path}"`);
    }
    for (const route of wave2Routes) expect(publishedLocalized.some((entry) => entry.path === route)).toBe(true);
  });

  it("keeps the localized worker patch before the authoritative seal without appending sitemap routes", () => {
    const patch = readFileSync("scripts/patch-wave2-worker-routes.mjs", "utf8");
    expect(patch).toContain('"/fr/"');
    expect(patch).toContain('"/nl/"');
    for (const route of ["/fr/informations-acheteurs", "/fr/matieres", "/nl/kopersinformatie", "/nl/materialen"]) {
      expect(patch).toContain(`"${route}"`);
    }
    expect(patch).toContain("must already appear exactly once");
    expect(patch).not.toContain("Expected 425 pre-finalizer sitemap URLs");
    expect(patch).not.toContain("new Date()");
    expect(patch).not.toContain("writeFile(sitemapPath");

    const manifest = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    for (const scriptName of ["build", "build:dev"] as const) {
      const script = manifest.scripts[scriptName];
      const localizedPatch = script.indexOf("patch-wave2-worker-routes.mjs");
      const authoritativeSeal = script.indexOf("apply-authoritative-seo-manifest.ts");
      const workerSeal = script.indexOf("seal-authoritative-worker.ts");
      expect(localizedPatch).toBeGreaterThanOrEqual(0);
      expect(authoritativeSeal).toBeGreaterThan(localizedPatch);
      expect(workerSeal).toBeGreaterThan(authoritativeSeal);
    }
  });
});
