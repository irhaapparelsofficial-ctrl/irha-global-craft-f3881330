import { describe, expect, it } from "vitest";

import { CATALOG, findProduct, slugify } from "@/lib/catalog";
import {
  BASE_PRODUCT_SEARCH_NAMES,
  TOP_CATEGORY_SEARCH_NAMES,
  keywordLedProductName,
} from "@/lib/catalogSearchNames";

describe("keyword-led catalog naming", () => {
  const products = CATALOG.flatMap((group) =>
    group.subs.flatMap((sub) =>
      sub.products.map((product) => ({
        groupSlug: group.slug,
        originalName: product.name,
        stableSlug: slugify(product.name),
      })),
    ),
  );

  it("keeps the complete committed 64-product base catalog covered", () => {
    expect(products).toHaveLength(64);
    expect(Object.keys(BASE_PRODUCT_SEARCH_NAMES)).toHaveLength(64);

    for (const product of products) {
      expect(BASE_PRODUCT_SEARCH_NAMES[product.stableSlug]).toBeTruthy();
    }
  });

  it("keeps every old canonical product slug resolvable after display-name enrichment", () => {
    for (const product of products) {
      expect(findProduct(product.groupSlug, product.stableSlug)?.name).toBe(product.originalName);
      expect(keywordLedProductName(product.stableSlug, product.originalName)).toBe(
        BASE_PRODUCT_SEARCH_NAMES[product.stableSlug],
      );
    }
  });

  it("does not create duplicate canonical product slugs inside a top category", () => {
    for (const group of CATALOG) {
      const slugs = group.subs.flatMap((sub) =>
        sub.products.map((product) => slugify(product.name)),
      );
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("publishes the required keyword-led top category names without changing their slugs", () => {
    expect(TOP_CATEGORY_SEARCH_NAMES["bavarian-trachten-wear"].name).toBe(
      "Bavarian & Trachten Wear",
    );
    expect(TOP_CATEGORY_SEARCH_NAMES["premium-leather-apparel"].name).toBe(
      "Premium Leather Apparel",
    );
    expect(TOP_CATEGORY_SEARCH_NAMES.sportswear.name).toBe(
      "Custom Sportswear & Teamwear",
    );
    expect(TOP_CATEGORY_SEARCH_NAMES["streetwear-activewear"].name).toBe(
      "Streetwear & Activewear",
    );
    expect(TOP_CATEGORY_SEARCH_NAMES["leisure-nightwear"].name).toBe(
      "Leisurewear & Nightwear",
    );
  });

  it("preserves genuinely owner-authored database names", () => {
    expect(
      keywordLedProductName("bomber-leather-jacket", "Heritage Capsule Flight Jacket"),
    ).toBe("Heritage Capsule Flight Jacket");
  });
});
