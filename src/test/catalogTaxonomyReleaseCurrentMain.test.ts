import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("current-main explicit taxonomy public runtime", () => {
  it("uses the published owner-Supabase taxonomy with deterministic fallback", () => {
    const hook = read("src/hooks/usePublishedCatalogTaxonomy.ts");
    const page = read("src/pages/CategoryTaxonomyPage.tsx");
    const navigator = read("src/components/CategoryAudienceNavigator.tsx");

    expect(hook).toContain('.rpc("catalog_get_public_taxonomy")');
    expect(hook).toContain("buildPublishedCategoryTaxonomy");
    expect(page).toContain("publishedTaxonomy.taxonomy ?? buildCategoryTaxonomy(category)");
    expect(page).toContain("taxonomy={taxonomy}");
    expect(navigator).toContain("taxonomy: suppliedTaxonomy");
    expect(navigator).toContain("collection.products.length > 0");
  });

  it("requires a fully approved immutable mapping snapshot before publication", () => {
    const controls = read("supabase/migrations/20260717235000_catalog_taxonomy_owner_release_controls.sql");
    const review = read("supabase/migrations/20260717235100_catalog_taxonomy_verified_review_approval.sql");

    expect(controls).toContain("m.approved_count = m.assignment_count");
    expect(controls).toContain("m.proposed_count = 0");
    expect(controls).toContain("m.rejected_count = 0");
    expect(controls).toContain("p_expected_snapshot_hash");
    expect(controls).toContain("legacy_redirects_applied', false");
    expect(controls).not.toContain("set review_state = 'approved'");

    expect(review).toContain("'Complete all'");
    expect(review).toContain("assignment_count <> 86");
    expect(review).toContain("empty_leaf_count <> 0");
    expect(review).toContain("invalid_assignment_count <> 0");
    expect(review).toContain("'public_publish_performed', false");
    expect(review).not.toContain("publish_state = 'published'");
  });

  it("keeps public release reversible without deleting legacy catalogue records", () => {
    const controls = read("supabase/migrations/20260717235000_catalog_taxonomy_owner_release_controls.sql");
    expect(controls).toContain("catalog_unpublish_taxonomy");
    expect(controls).toContain("product_approvals_preserved', true");
    expect(controls).toContain("existing_product_urls_preserved', true");
    expect(controls).not.toContain("delete from public.products");
    expect(controls).not.toContain("delete from public.categories");
    expect(controls).not.toContain("delete from public.media_assets");
  });
});
