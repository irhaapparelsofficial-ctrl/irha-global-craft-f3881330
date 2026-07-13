import { describe, expect, it } from "vitest";
import { buildCompareColumns, visibleCompareRows } from "@/lib/compareProducts";
import type { ShortlistItem } from "@/lib/shortlist";
import type { DbProduct } from "@/hooks/useCatalog";

function saved(slug: string, categoryName: string): ShortlistItem {
  return {
    slug,
    name: `Saved ${slug}`,
    categorySlug: categoryName.toLowerCase().replace(/\s+/g, "-"),
    categoryName,
    addedAt: 1,
  };
}

function product(slug: string): DbProduct & { categories: { name: string } } {
  return {
    id: `id-${slug}`,
    category_id: "category-id",
    slug,
    name: `Product ${slug}`,
    description: null,
    image_url: null,
    gallery: [],
    specs: [],
    details: [],
    material_specifications: null,
    seo_title: null,
    seo_description: null,
    sort_order: 1,
    is_published: true,
    primary_material: "Cotton",
    country_of_origin: null,
    categories: { name: "Database Category" },
  };
}

describe("compare column integrity", () => {
  it("keeps one aligned column per saved item even when a product is unavailable", () => {
    const items = [saved("available", "Sportswear"), saved("unavailable", "Leather")];
    const columns = buildCompareColumns(items, [product("available")]);

    expect(columns).toHaveLength(2);
    expect(columns[0].product?.slug).toBe("available");
    expect(columns[1].item.slug).toBe("unavailable");
    expect(columns[1].product).toBeUndefined();
  });

  it("uses saved category context while showing only real available specifications", () => {
    const items = [saved("available", "Sportswear"), saved("unavailable", "Leather")];
    const columns = buildCompareColumns(items, [product("available")]);
    const rows = visibleCompareRows(columns);
    const labels = rows.map((row) => row.label);

    expect(labels).toContain("Category");
    expect(labels).toContain("Primary Material");
    expect(labels).toContain("Country");
    expect(labels).not.toContain("SKU");
    expect(labels).not.toContain("GSM / Weight");

    const category = rows.find((row) => row.label === "Category");
    expect(category?.get(columns[0])).toBe("Sportswear");
    expect(category?.get(columns[1])).toBe("Leather");

    const material = rows.find((row) => row.label === "Primary Material");
    expect(material?.get(columns[0])).toBe("Cotton");
    expect(material?.get(columns[1])).toBeUndefined();
  });
});
