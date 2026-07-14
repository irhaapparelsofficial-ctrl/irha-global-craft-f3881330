import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("catalogue conversion upgrade", () => {
  it("uses published product imagery for catalogue group cards with safe fallbacks", () => {
    const catalogue = read("src/pages/Catalogue.tsx");
    expect(catalogue).toContain('from("products")');
    expect(catalogue).toContain('select("category_id, image_url")');
    expect(catalogue).toContain("groupImages[group.slug]");
    expect(catalogue).toContain("STATIC_GROUP_IMAGES[group.slug]");
  });

  it("shows buyer-facing manufacturing chips from real product fields", () => {
    const category = read("src/pages/CatalogueCategory.tsx");
    expect(category).toContain("function productChips(product: ProductRow)");
    expect(category).toContain("product.primary_material");
    expect(category).toContain("product.sample_available");
    expect(category).toContain("product.customization?.[key]");
    expect(category).toContain("product.moq_display");
  });

  it("preserves exact selected-product context in catalogue lead handoff", () => {
    const category = read("src/pages/CatalogueCategory.tsx");
    const form = read("src/components/CatalogueLeadForm.tsx");
    expect(category).toContain("setSelectedProduct({ name: product.name, slug: product.slug, url: productUrl })");
    expect(category).toContain("productInterest={selectedProduct?.name}");
    expect(category).toContain("productUrl={selectedProduct?.url}");
    expect(form).toContain("Selected product: ${productInterest}");
    expect(form).toContain("Product page: ${productUrl}");
  });

  it("uses clearer catalogue and bulk-requirement calls to action", () => {
    const catalogue = read("src/pages/Catalogue.tsx");
    const category = read("src/pages/CatalogueCategory.tsx");
    expect(catalogue).toContain("Get Full Catalogue");
    expect(category).toContain("Discuss Bulk Requirement");
  });
});
