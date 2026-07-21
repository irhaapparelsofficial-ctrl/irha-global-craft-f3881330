import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_SLUG_RENAMES, readExplicitTaxonomyRoutes } from "../../scripts/generate-taxonomy-release-assets";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("canonical explicit B2B taxonomy release", () => {
  it("locks all 86 reviewed products to unique four-level paths", () => {
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

  it("preserves critical semantic placements after approved slug cleanup", () => {
    const { products } = readExplicitTaxonomyRoutes();
    const path = (slug: string) => products.find((route) => route.productSlug === slug)?.fullSlugPath;

    expect(path("short-lederhosen")).toBe("bavarian-trachten-wear/men/short-lederhosen");
    expect(path("traditional-dirndl")).toBe("bavarian-trachten-wear/women/dirndl-dresses");
    expect(path("children-s-dirndl")).toBe("bavarian-trachten-wear/kids/girls-dirndl");
    expect(path("custom-soccer-uniform-kit")).toBe("sportswear/team-club/football-kits");
    expect(path("leather-wallet")).toBe("premium-leather-apparel/accessories/leather-wallets");
  });

  it("keeps historical product paths as one-hop aliases to the new canonicals", () => {
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

  it("extends the existing owner-approved runtime without duplicating database migrations", () => {
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

  it("generates real Cloudflare 301s, canonical sitemap entries and current plus historical route shells", () => {
    const generator = read("scripts/generate-taxonomy-release-assets.ts");
    const vite = read("vite.config.ts");

    expect(generator).toContain("# BEGIN GENERATED TAXONOMY REDIRECTS");
    expect(generator).toContain("PRODUCT_SLUG_RENAMES");
    expect(generator).toContain("sourceLegacyPath");
    expect(generator).toContain("deprecatedCanonicalPath");
    expect(generator).toContain(" 301");
    expect(generator).toContain("Expected 86 explicit product routes");
    expect(generator).toContain("location.startsWith(`${SITE}/intl/`)");
    expect(generator).toContain("route.canonicalPath");
    expect(generator).toContain("route.sourceLegacyPath");
    expect(vite).toContain("taxonomyReleaseAssets()");
    expect(vite).toContain("generateTaxonomyReleaseAssets()");
    expect(vite).toContain("generateTaxonomyProductShells()");
  });

  it("uses a verifier-only legacy route without leaking it into the final sitemap", () => {
    const prepare = read("scripts/prepare-taxonomy-shell-verification.ts");
    const finalize = read("scripts/finalize-taxonomy-static-shells.ts");
    const packageJson = read("package.json");

    expect(prepare).toContain("taxonomy-legacy-shell-verification-only");
    expect(finalize).toContain("Verifier-only legacy product URL leaked into the final sitemap");
    expect(finalize).toContain('generateTaxonomyProductShells(process.cwd(), "dist")');
    expect(finalize).toContain("Taxonomy product shells do not point to the reviewed four-level canonical URL");
    expect(packageJson).toContain("prepare-taxonomy-shell-verification.ts");
    expect(packageJson).toContain("generate-static-route-shells.ts");
    expect(packageJson).toContain("finalize-taxonomy-static-shells.ts");
    expect(packageJson.indexOf("prepare-taxonomy-shell-verification.ts"))
      .toBeLessThan(packageJson.indexOf("generate-static-route-shells.ts"));
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
