import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { readExplicitTaxonomyRoutes } from "../../scripts/generate-taxonomy-release-assets";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("complete explicit B2B catalogue taxonomy release", () => {
  it("locks all 86 products to unique four-level canonical routes", () => {
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

  it("keeps key semantic assignments under the correct buyer group", () => {
    const { products } = readExplicitTaxonomyRoutes();
    const path = (slug: string) => products.find((route) => route.productSlug === slug)?.fullSlugPath;

    expect(path("traditional-lederhosen")).toBe("bavarian-trachten-wear/men/short-lederhosen");
    expect(path("traditional-dirndl-dress")).toBe("bavarian-trachten-wear/women/dirndl-dresses");
    expect(path("children-s-dirndl")).toBe("bavarian-trachten-wear/kids/girls-dirndl");
    expect(path("sublimated-soccer-uniform-kit")).toBe("sportswear/team-club/football-kits");
    expect(path("leather-wallet")).toBe("premium-leather-apparel/accessories/leather-wallets");
  });

  it("requires immutable owner authorization evidence before publication", () => {
    const migration = read("supabase/migrations/20260717235000_catalog_taxonomy_owner_release.sql");
    const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
      migrations: Array<{ version: string; git_blob_sha: string }>;
    };

    expect(migration).toContain("PUBLISH ' || m.assignment_count || ' PRODUCTS");
    expect(migration).toContain("p_expected_snapshot_hash");
    expect(migration).toContain("owner-chat-authorization");
    expect(migration).toContain("m.node_count = 69");
    expect(migration).toContain("m.assignment_count = 86");
    expect(migration).toContain("m.empty_leaf_count = 0");
    expect(migration).toContain("legacy_redirects_applied_by_rpc', false");
    expect(migration).toContain("catalog_unpublish_taxonomy");
    expect(manifest.migrations.find((item) => item.version === "20260717235000")?.git_blob_sha)
      .toBe("0760dbe1bc7fedfe313117b0bd76b21264f98ce1");
  });

  it("binds public collection and product routes to the published database release", () => {
    const hook = read("src/hooks/usePublishedCatalogTaxonomy.ts");
    const categoryPage = read("src/pages/CategoryTaxonomyPage.tsx");
    const productPage = read("src/pages/CanonicalProductDetail.tsx");
    const app = read("src/App.tsx");

    expect(hook).toContain('rpc("catalog_get_public_taxonomy")');
    expect(hook).toContain("buildPublishedCategoryTaxonomy");
    expect(hook).toContain("findPublishedProductRoute");
    expect(categoryPage).toContain("usePublishedCategoryTaxonomy");
    expect(categoryPage).toContain("publishedTaxonomy.taxonomy ?? buildCategoryTaxonomy(category)");
    expect(productPage).toContain("publishedRoute?.canonicalPath");
    expect(productPage).toContain("breadcrumbSchema(breadcrumbItems)");
    expect(app).toContain('/products/:categorySlug/:audienceSlug/:collectionSlug/:productSlug');
  });

  it("generates real Cloudflare redirects, sitemap canonicals and static product shells on every build", () => {
    const generator = read("scripts/generate-taxonomy-release-assets.ts");
    const vite = read("vite.config.ts");

    expect(generator).toContain("# BEGIN GENERATED TAXONOMY REDIRECTS");
    expect(generator).toContain(" 301");
    expect(generator).toContain("location.startsWith(`${SITE}/intl/`)");
    expect(generator).toContain("generateTaxonomyProductShells");
    expect(generator).toContain("Expected 86 explicit product routes");
    expect(vite).toContain("taxonomyReleaseAssets()");
    expect(vite).toContain("generateTaxonomyReleaseAssets()");
    expect(vite).toContain("generateTaxonomyProductShells()");
  });
});
