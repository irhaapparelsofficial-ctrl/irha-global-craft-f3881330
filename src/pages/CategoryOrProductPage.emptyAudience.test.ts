import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/CategoryOrProductPage.tsx"),
  "utf8",
);

describe("CategoryOrProductPage empty audience routing", () => {
  it("uses published depth-one audience nodes before legacy empty-audience handling", () => {
    expect(source).toContain("usePublishedCatalogTaxonomyRelease");
    expect(source).toContain("const explicitAudience = root");
    expect(source).toContain("node.depth === 1");
    expect(source).toContain("node.parent_id === root.id");
    expect(source).toContain("<CategoryTaxonomyPage audienceOverride={explicitAudience.slug}");
    expect(source).toContain("legacyAudience?.productCount === 0");
    expect(source).toContain("legacyAudience && legacyAudience.collections.length === 0");
    expect(source).toContain('return <Navigate to={`/products/${categorySlug}`} replace />');
  });

  it("keeps populated legacy audience routes and canonical product routing intact", () => {
    expect(source).toContain("if (legacyAudience) return <CategoryTaxonomyPage audienceOverride={legacyAudience.slug} />");
    expect(source).toContain("return <CanonicalProductDetail />");
    expect(source).toContain('import CanonicalProductDetail from "@/pages/CanonicalProductDetail"');
  });
});
