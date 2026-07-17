import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/pages/CategoryOrProductPage.tsx"),
  "utf8",
);

describe("CategoryOrProductPage empty audience routing", () => {
  it("redirects configured audiences that have no published products", () => {
    expect(source).toContain("audience?.productCount === 0");
    expect(source).toContain("audience && audience.collections.length === 0");
    expect(source).toContain('return <Navigate to={`/products/${categorySlug}`} replace />');
  });

  it("keeps populated audience routes and canonical product routing intact", () => {
    expect(source).toContain("if (audience) return <CategoryTaxonomyPage audienceOverride={audience.slug} />");
    expect(source).toContain("return <CanonicalProductDetail />");
    expect(source).toContain('import CanonicalProductDetail from "@/pages/CanonicalProductDetail"');
  });
});
