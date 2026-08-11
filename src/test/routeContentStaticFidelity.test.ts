import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { SCCI_BUSINESS_REFERENCE } from "@/lib/publicBusinessEvidence.mjs";
import { CORE_ROUTE_CONTENT, CORE_ROUTE_PATHS, MAIN_CATEGORY_LINKS } from "@/lib/routeContent.mjs";

const read = (path: string) => readFileSync(resolve(path), "utf8");

const requiredCoreRoutes = [
  "/about",
  "/contact",
  "/manufacturing",
  "/factory-capability-video",
  "/buyer-trust",
  "/factory-video-call",
  "/inquiry",
  "/privacy-policy",
  "/compliance",
  "/products",
  "/faq",
  "/resources",
  "/terms-of-service",
  "/repeat-order",
  "/connect",
] as const;

describe("route-specific static content architecture", () => {
  it("keeps one controlled content model for every core canonical route", () => {
    expect(CORE_ROUTE_PATHS).toEqual(requiredCoreRoutes);
    expect(new Set(CORE_ROUTE_PATHS).size).toBe(CORE_ROUTE_PATHS.length);
    for (const path of requiredCoreRoutes) {
      const content = CORE_ROUTE_CONTENT[path];
      expect(content.route).toBe(path);
      expect(content.title.length).toBeGreaterThan(20);
      expect(content.metaDescription.length).toBeGreaterThan(60);
      expect(content.h1.length).toBeGreaterThan(10);
      expect(content.intro.length).toBeGreaterThan(40);
      expect(content.sections.length).toBeGreaterThan(0);
      expect(content.primaryCta.href).toMatch(/^(\/|https?:|mailto:)/);
      expect(content.sourceFile).toMatch(/^src\/pages\/.+\.tsx$/);
      expect(content.parityTokens.length).toBeGreaterThanOrEqual(4);
    }
  });

  it("keeps SCCI directory evidence specific, qualified and crawlable", () => {
    const trust = CORE_ROUTE_CONTENT["/buyer-trust"];
    const serialized = JSON.stringify(trust);
    expect(SCCI_BUSINESS_REFERENCE.membershipNumber).toBe("A-101267");
    expect(SCCI_BUSINESS_REFERENCE.status).toBe("Directory reference only");
    expect(SCCI_BUSINESS_REFERENCE.issuedDateLabel).toBe("not asserted");
    expect(serialized).toContain("SCCI member directory");
    expect(serialized).toContain(SCCI_BUSINESS_REFERENCE.membershipNumber);
    expect(serialized).toContain(SCCI_BUSINESS_REFERENCE.officialDirectoryUrl);
    expect(serialized).toMatch(/does not establish|does not prove|not presented as/i);
    expect(serialized).not.toMatch(/provisional membership|Executive Committee|registered company|certified manufacturer|final membership certificate issued/i);
  });

  it("links the products hub directly to the five canonical main categories", () => {
    expect(MAIN_CATEGORY_LINKS.map((item) => item.href)).toEqual([
      "/products/bavarian-trachten-wear",
      "/products/premium-leather-apparel",
      "/products/sportswear",
      "/products/streetwear-activewear",
      "/products/leisure-nightwear",
    ]);
  });

  it("makes generic enrichment route-aware and fail-closed", () => {
    const source = read("scripts/enrich-generic-static-route-shells.mjs");
    expect(source).toContain("CORE_ROUTE_CONTENT");
    expect(source).toContain("Canonical route has no approved route-content source");
    expect(source).toContain("taxonomyShellsDeferred !== EXPECTED_TAXONOMY_SHELLS");
    expect(source).toContain("productShellsPreserved !== EXPECTED_PRODUCT_SHELLS");
    expect(source).not.toContain("function richShell");
  });

  it("derives taxonomy HTML from the authoritative manifest and shared runtime SEO helpers", () => {
    const source = read("scripts/align-taxonomy-route-shells.ts");
    expect(source).toContain("localizedTaxonomySeo");
    expect(source).toContain("taxonomyUi");
    expect(source).toContain("manifest.products");
    expect(source).toContain('data-irha-route-content="taxonomy"');
    expect(source).not.toContain('data-irha-rich-route-shell="true" data-irha-taxonomy-parity="true"');
  });

  it("runs the structural final-artifact gate from the existing final parity verifier", () => {
    const finalVerifier = read("scripts/verify-route-parity-build.ts");
    const routeVerifier = read("scripts/verify-route-content-fidelity.mjs");
    expect(finalVerifier).toContain("verifyRouteContentFidelity");
    expect(routeVerifier).toContain('readFile(join(DIST, "seo-route-manifest.json")');
    expect(routeVerifier).toContain("authoritativeSitemapPaths");
    expect(routeVerifier).toContain("assertExactSitemapSet");
    expect(routeVerifier).toContain("route.indexable && route.sitemap");
    expect(routeVerifier).toContain("Sitemap is missing authoritative route");
    expect(routeVerifier).toContain("Sitemap contains non-authoritative route");
    expect(routeVerifier).toContain("Untranslated localized resource articles are indexable");
    expect(routeVerifier).not.toMatch(/EXPECTED_SITEMAP\s*=/);
    expect(routeVerifier).toContain("lists a child outside its authoritative assignment");
    expect(routeVerifier).toContain("Canonical route has no accepted content owner");
    expect(routeVerifier).toContain("loading-only primary product content");
  });

  it("keeps the runtime SEO dependency aligned with the exact lockfile", () => {
    const packageJson = JSON.parse(read("package.json")) as {
      dependencies?: Record<string, string>;
    };
    const lockfile = JSON.parse(read("package-lock.json")) as {
      packages?: Record<string, { dependencies?: Record<string, string> }>;
    };
    const packageRange = packageJson.dependencies?.["react-helmet-async"];
    const lockRange = lockfile.packages?.[""]?.dependencies?.["react-helmet-async"];
    expect(packageRange).toBe("^3.0.0");
    expect(lockRange).toBe(packageRange);
  });
});
