import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_SLUG_RENAMES, readExplicitTaxonomyRoutes } from "../../scripts/generate-taxonomy-release-assets";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("canonical explicit B2B taxonomy release", () => {
  it("retains the historical 86-product map only as migration evidence", () => {
    const { products, categories } = readExplicitTaxonomyRoutes();

    expect(products).toHaveLength(86);
    expect(new Set(products.map((route) => route.productSlug)).size).toBe(86);
    expect(new Set(products.map((route) => route.canonicalPath)).size).toBe(86);
    expect(categories.length).toBeGreaterThanOrEqual(20);
    for (const route of products) {
      expect(route.fullSlugPath.split("/")).toHaveLength(3);
      expect(route.legacyPath).toBe(`/products/${route.categorySlug}/${route.productSlug}`);
      expect(route.canonicalPath).toBe(`/products/${route.categorySlug}/${route.audienceSlug}/${route.collectionSlug}/${route.productSlug}`);
    }
  });

  it("preserves critical historical semantic placements for redirect migration", () => {
    const { products } = readExplicitTaxonomyRoutes();
    const path = (slug: string) => products.find((route) => route.productSlug === slug)?.fullSlugPath;

    expect(path("short-lederhosen")).toBe("bavarian-trachten-wear/men/short-lederhosen");
    expect(path("traditional-dirndl")).toBe("bavarian-trachten-wear/women/dirndl-dresses");
    expect(path("children-s-dirndl")).toBe("bavarian-trachten-wear/kids/girls-dirndl");
    expect(path("custom-soccer-uniform-kit")).toBe("sportswear/team-club/football-kits");
    expect(path("leather-wallet")).toBe("premium-leather-apparel/accessories/leather-wallets");
  });

  it("preserves historical product slug aliases as migration inputs", () => {
    const { products } = readExplicitTaxonomyRoutes();
    expect(Object.keys(PRODUCT_SLUG_RENAMES)).toHaveLength(13);

    for (const [sourceSlug, targetSlug] of Object.entries(PRODUCT_SLUG_RENAMES)) {
      const route = products.find((candidate) => candidate.sourceProductSlug === sourceSlug);
      expect(route?.productSlug).toBe(targetSlug);
      expect(route?.sourceLegacyPath).toContain(`/${sourceSlug}`);
      expect(route?.deprecatedCanonicalPath).toContain(`/${sourceSlug}`);
      expect(route?.canonicalPath.endsWith(`/${targetSlug}`)).toBe(true);
    }
  });

  it("keeps owner-controlled taxonomy publication migrations registered once", () => {
    const controls = read("supabase/migrations/20260717235000_catalog_taxonomy_owner_release_controls.sql");
    const approval = read("supabase/migrations/20260717235100_catalog_taxonomy_verified_review_approval.sql");
    const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
      migrations: Array<{ version: string; name: string }>;
    };

    expect(controls).toContain("m.node_count = 69");
    expect(controls).toContain("m.assignment_count = 86");
    expect(controls).toContain("m.empty_leaf_count = 0");
    expect(controls).toContain("p_expected_snapshot_hash");
    expect(controls).toContain("catalog_unpublish_taxonomy");
    expect(approval).toContain("'Complete all'");
    expect(approval).toContain("assignment_count <> 86");
    expect(approval).toContain("public_publish_performed', false");
    expect(manifest.migrations.filter((item) => item.version === "20260717235000")).toHaveLength(1);
    expect(manifest.migrations.filter((item) => item.version === "20260717235100")).toHaveLength(1);
    expect(manifest.migrations.filter((item) => item.version === "20260722103000")).toHaveLength(1);
    expect(manifest.migrations.filter((item) => item.version === "20260722111000")).toHaveLength(1);
  });

  it("resolves canonical product pages through the published Supabase taxonomy", () => {
    const hook = read("src/hooks/usePublishedCatalogTaxonomy.ts");
    const productPage = read("src/pages/CanonicalProductDetail.tsx");
    const legacyResolver = read("src/pages/CategoryOrProductPage.tsx");
    const app = read("src/App.tsx");

    expect(hook).toContain('rpc("catalog_get_public_taxonomy")');
    expect(hook).toContain("findPublishedProductRoute");
    expect(hook).toContain("usePublishedCatalogTaxonomyRelease");
    expect(productPage).toContain("publishedRoute?.canonicalPath");
    expect(productPage).toContain("breadcrumbSchema(breadcrumbItems)");
    expect(legacyResolver).toContain("return <CanonicalProductDetail />");
    expect(app).toContain('/products/:categorySlug/:audienceSlug/:collectionSlug/:productSlug');
  });

  it("uses one 254-product manifest for runtime, sitemap, HTML shells and redirects", () => {
    const manifest = read("scripts/generate-buyer-ready-catalog-manifest.ts");
    const redirects = read("scripts/generate-buyer-ready-redirects.ts");
    const shells = read("scripts/generate-static-route-shells.ts");
    const sitemap = read("scripts/augment-sitemap-with-live-catalog.ts");
    const vite = read("vite.config.ts");
    const packageJson = read("package.json");

    expect(manifest).toContain("const EXPECTED_PRODUCTS = 254");
    expect(manifest).toContain("row.gallery[0] !== row.image_url");
    expect(manifest).toContain('fetchRpc<ReleasePayload>("catalog_get_public_release")');
    expect(manifest).toContain('fetchRpc<TaxonomyPayload>("catalog_get_public_taxonomy")');
    expect(shells).toContain('data-irha-product-shell="true"');
    expect(shells).toContain('"@type": "Product"');
    expect(shells).toContain('"@type": "BreadcrumbList"');
    expect(sitemap).toContain("manifest.products");
    expect(redirects).toContain("BEGIN GENERATED BUYER-READY REDIRECTS");
    expect(redirects).toContain("get_public_legacy_redirects");
    expect(redirects).toContain("zero dead product targets");
    expect(vite).not.toContain("taxonomyReleaseAssets()");
    expect(vite).not.toContain("generateTaxonomyProductShells()");
    expect(packageJson).toContain("generate-buyer-ready-catalog-manifest.ts");
    expect(packageJson).toContain("generate-buyer-ready-redirects.ts");
  });

  it("verifies exactly 254 canonical shells and excludes legacy sitemap routes", () => {
    const finalize = read("scripts/finalize-taxonomy-static-shells.ts");
    const packageJson = read("package.json");

    expect(finalize).toContain("manifest.productCount !== 254");
    expect(finalize).toContain('data-irha-product-shell="true"');
    expect(finalize).toContain('"@type":"Product"');
    expect(finalize).toContain('"@type":"BreadcrumbList"');
    expect(finalize).toContain("Reference-style legacy URL leaked into the final sitemap");
    expect(finalize).not.toContain("generateTaxonomyProductShells");
    expect(packageJson).not.toContain("prepare-taxonomy-shell-verification.ts");
    expect(packageJson.indexOf("generate-buyer-ready-catalog-manifest.ts"))
      .toBeLessThan(packageJson.indexOf("generate-buyer-ready-redirects.ts"));
    expect(packageJson.indexOf("generate-static-route-shells.ts"))
      .toBeLessThan(packageJson.indexOf("finalize-taxonomy-static-shells.ts"));
  });

  it("keeps unreviewed localized taxonomy drafts out of indexable alternates", () => {
    const seo = read("src/components/SEO.tsx");
    expect(seo).toContain("VITE_TAXONOMY_TRANSLATIONS_RELEASED");
    expect(seo).toContain("isUnreviewedLocalizedTaxonomy");
    expect(seo).toContain("noindex,follow,max-image-preview:large");
    expect(seo).toContain("alternates.filter");
  });
});
