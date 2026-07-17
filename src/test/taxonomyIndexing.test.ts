import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import {
  parseTaxonomyPath,
  shouldNoIndexTaxonomyPath,
} from "@/lib/taxonomyIndexing";

function streetwearCategory(productNames: string[]): NormalizedCategory {
  return {
    slug: "streetwear-activewear",
    name: "Streetwear & Activewear",
    short: "",
    description: "",
    image: "/category.webp",
    originalImage: "/category.webp",
    details: [],
    productCount: productNames.length,
    subs: [
      {
        slug: "streetwear-tops",
        name: "Streetwear Tops",
        short: "",
        products: productNames.map((name, index) => ({
          slug: `product-${index + 1}`,
          name,
          image: `/product-${index + 1}.webp`,
          originalImage: `/product-${index + 1}.webp`,
          gallery: [`/product-${index + 1}.webp`],
          description: `${name} private-label program`,
          specs: [],
          details: [],
        })) as NormalizedCategory["subs"][number]["products"],
      },
    ],
  };
}

describe("taxonomy thin-page indexing", () => {
  it("parses English and localized audience or collection paths", () => {
    expect(parseTaxonomyPath("/products/streetwear-activewear/unisex")).toEqual({
      categorySlug: "streetwear-activewear",
      audienceSlug: "unisex",
      collectionSlug: undefined,
    });
    expect(parseTaxonomyPath("/intl/de/products/sportswear/team-club/football-kits")).toEqual({
      categorySlug: "sportswear",
      audienceSlug: "team-club",
      collectionSlug: "football-kits",
    });
    expect(parseTaxonomyPath("/products/streetwear-activewear")).toBeNull();
  });

  it("noindexes a defined audience when it has no matching products", () => {
    const category = streetwearCategory(["Men's Heavyweight Hoodie"]);
    expect(
      shouldNoIndexTaxonomyPath(
        "/products/streetwear-activewear/unisex",
        [category],
      ),
    ).toBe(true);
    expect(
      shouldNoIndexTaxonomyPath(
        "/intl/de/products/streetwear-activewear/unisex",
        [category],
      ),
    ).toBe(true);
  });

  it("keeps populated audiences indexable and ignores product-detail lookalikes", () => {
    const category = streetwearCategory(["Oversized Hoodie"]);
    expect(
      shouldNoIndexTaxonomyPath(
        "/products/streetwear-activewear/unisex",
        [category],
      ),
    ).toBe(false);
    expect(
      shouldNoIndexTaxonomyPath(
        "/products/streetwear-activewear/product-1",
        [category],
      ),
    ).toBe(false);
  });

  it("renders the guard after page content so empty-route robots metadata wins", () => {
    const layout = readFileSync(
      resolve(process.cwd(), "src/components/layout/Layout.tsx"),
      "utf8",
    );
    const guard = readFileSync(
      resolve(process.cwd(), "src/components/TaxonomyIndexingGuard.tsx"),
      "utf8",
    );

    expect(layout.indexOf("{children}")).toBeLessThan(
      layout.indexOf("<TaxonomyIndexingGuard />"),
    );
    expect(guard).toContain(
      '<meta name="robots" content="noindex,follow,max-image-preview:large" />',
    );
  });
});
