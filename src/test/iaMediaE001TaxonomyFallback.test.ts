import { describe, expect, it } from "vitest";
import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import {
  buildIaMediaE001CollectionFallback,
  hasCompleteIaMediaE001Collection,
  IA_MEDIA_E001_PRODUCT_SLUGS,
  isIaMediaE001CollectionPath,
} from "@/hooks/usePublishedCatalogTaxonomy";

function categoryWithProducts(productSlugs = [...IA_MEDIA_E001_PRODUCT_SLUGS]): NormalizedCategory {
  return {
    slug: "bavarian-trachten-wear",
    name: "Bavarian & Trachten Wear",
    short: "Bavarian manufacturing programs",
    description: "Bavarian manufacturing programs",
    image: "/category.webp",
    originalImage: "/category.webp",
    details: [],
    productCount: productSlugs.length,
    subs: [
      {
        slug: "lederhosen",
        name: "Lederhosen",
        short: "Lederhosen programs",
        products: productSlugs.map((slug, index) => ({
          id: `product-${index + 1}`,
          slug,
          name: slug,
          image: `/products/${slug}.webp`,
          originalImage: `/products/${slug}.webp`,
          gallery: [`/products/${slug}.webp`],
          description: `${slug} manufacturing reference`,
          specs: [],
          details: [],
        })),
      },
    ],
  } as unknown as NormalizedCategory;
}

describe("IA-MEDIA-E001 canonical collection fallback", () => {
  it("activates only for the exact Lederhosen collection path", () => {
    expect(isIaMediaE001CollectionPath("/products/bavarian-trachten-wear/men/lederhosen")).toBe(true);
    expect(isIaMediaE001CollectionPath("/products/bavarian-trachten-wear/men/lederhosen/")).toBe(true);
    expect(isIaMediaE001CollectionPath("/products/leisure-nightwear/hospitality/matching-sets")).toBe(false);
    expect(isIaMediaE001CollectionPath("/products/bavarian-trachten-wear/men")).toBe(false);
  });

  it("preserves the canonical men/lederhosen route and all seven products", () => {
    const fallback = buildIaMediaE001CollectionFallback(categoryWithProducts());

    expect(fallback).not.toBeNull();
    expect(fallback?.audiences).toHaveLength(1);
    expect(fallback?.audiences[0]?.slug).toBe("men");
    expect(fallback?.audiences[0]?.collections).toHaveLength(1);
    expect(fallback?.audiences[0]?.collections[0]?.slug).toBe("lederhosen");
    expect(fallback?.audiences[0]?.collections[0]?.products.map((product) => product.slug)).toEqual(
      IA_MEDIA_E001_PRODUCT_SLUGS,
    );
    expect(hasCompleteIaMediaE001Collection(fallback)).toBe(true);
  });

  it("fails closed instead of publishing an incomplete seven-product collection", () => {
    const incomplete = categoryWithProducts(IA_MEDIA_E001_PRODUCT_SLUGS.slice(1));
    expect(buildIaMediaE001CollectionFallback(incomplete)).toBeNull();
  });

  it("rejects a legacy heuristic collection shape that lacks the canonical Lederhosen leaf", () => {
    const legacyShape = {
      categorySlug: "bavarian-trachten-wear",
      audiences: [
        {
          slug: "men",
          name: "Men",
          keyword: "manufacturer",
          description: "legacy",
          collections: [
            {
              slug: "short-lederhosen",
              name: "Short Lederhosen",
              keyword: "manufacturer",
              description: "legacy",
              products: [],
            },
          ],
          productCount: 0,
        },
      ],
      unassignedCount: 7,
    };

    expect(hasCompleteIaMediaE001Collection(legacyShape as never)).toBe(false);
  });
});
