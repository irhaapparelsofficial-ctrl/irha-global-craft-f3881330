import { describe, expect, it } from "vitest";
import {
  addUniqueStoredItem,
  sanitizeStoredList,
  shortlistProductPath,
  toggleStoredItem,
  type ShortlistItem,
} from "@/lib/shortlist";

function item(index: number, overrides: Partial<ShortlistItem> = {}): ShortlistItem {
  return {
    slug: `product-${index}`,
    name: `Product ${index}`,
    categorySlug: "sportswear",
    categoryName: "Sportswear",
    addedAt: index,
    ...overrides,
  };
}

describe("guest shortlist storage transforms", () => {
  it("limits compare to four newest unique products", () => {
    let values: ShortlistItem[] = [];
    for (let index = 1; index <= 5; index += 1) {
      values = addUniqueStoredItem(values, item(index), 4);
    }

    expect(values.map((value) => value.slug)).toEqual([
      "product-5",
      "product-4",
      "product-3",
      "product-2",
    ]);

    values = addUniqueStoredItem(values, item(3, { name: "Updated Product 3" }), 4);
    expect(values).toHaveLength(4);
    expect(values[0]).toMatchObject({ slug: "product-3", name: "Updated Product 3" });
    expect(values.filter((value) => value.slug === "product-3")).toHaveLength(1);
  });

  it("ignores malformed, non-array and invalid stored entries", () => {
    expect(sanitizeStoredList<ShortlistItem>({ slug: "not-an-array" })).toEqual([]);
    expect(sanitizeStoredList<ShortlistItem>([
      null,
      { name: "Missing slug" },
      { slug: "" },
      item(1),
    ])).toEqual([item(1)]);
  });

  it("toggles a product without exceeding the compare limit", () => {
    const initial = [item(4), item(3), item(2), item(1)];
    const removed = toggleStoredItem(initial, item(3), 4);
    expect(removed.map((value) => value.slug)).toEqual(["product-4", "product-2", "product-1"]);

    const added = toggleStoredItem(removed, item(5), 4);
    expect(added.map((value) => value.slug)).toEqual(["product-5", "product-4", "product-2", "product-1"]);
  });

  it("builds encoded product links and falls back safely for legacy entries", () => {
    expect(shortlistProductPath({ categorySlug: "bavarian wear", slug: "men's lederhosen" }))
      .toBe("/products/bavarian%20wear/men's%20lederhosen");
    expect(shortlistProductPath({ slug: "legacy-product" })).toBe("/products");
    expect(shortlistProductPath({ categorySlug: "sportswear", slug: "" })).toBe("/products");
  });
});
