import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("canonical catalogue conversion journey", () => {
  it("uses the published category and taxonomy sources", () => {
    const collections = read("src/pages/GlobalCollectionsPage.tsx");
    expect(collections).toContain("usePublicCategories");
    expect(collections).toContain("usePublishedCategoryTaxonomy");
    expect(collections).toContain("<CategoryAudienceNavigator");
    expect(collections).toContain("Browse by category");
    expect(collections).toContain("buyer group and product type");
    expect(collections).not.toContain("CATALOGUE_GROUPS");
  });

  it("shows buyer-facing manufacturing facts from real product fields", () => {
    const product = read("src/pages/CanonicalProductDetail.tsx");
    expect(product).toContain("product.moq_display");
    expect(product).toContain("product.sample_available");
    expect(product).toContain("product.production_timeline");
    expect(product).toContain("product.primary_material");
    expect(product).toContain("product.customization");
    expect(product).toContain("Confirmed after buyer brief");
  });

  it("preserves exact selected-product context in buyer handoff", () => {
    const product = read("src/pages/CanonicalProductDetail.tsx");
    expect(product).toContain("const canonicalPath");
    expect(product).toContain("Product page: ${url}");
    expect(product).toContain("whatsappLink");
    expect(product).toContain("shortlist.has(product.slug)");
  });

  it("uses clear category and programme calls to action", () => {
    const collections = read("src/pages/GlobalCollectionsPage.tsx");
    expect(collections).toContain("Search all");
    expect(collections).toContain("Discuss a buyer program");
    expect(collections).toContain("Browse products");
  });
});
