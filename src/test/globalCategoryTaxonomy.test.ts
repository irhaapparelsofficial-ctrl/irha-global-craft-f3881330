import { describe, expect, it } from "vitest";
import type { NormalizedCategory, NormalizedProduct, NormalizedSub } from "@/hooks/usePublicCategoryData";
import {
  buildCategoryTaxonomy,
  taxonomyAudiencePath,
  taxonomyCollectionPath,
} from "@/lib/globalCategoryTaxonomy";

function product(name: string): NormalizedProduct {
  return {
    slug: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
    name,
    image: "",
    gallery: [],
    description: `${name} B2B program`,
    specs: [],
    details: [],
  };
}

function sub(slug: string, name: string, products: NormalizedProduct[]): NormalizedSub {
  return { slug, name, short: "", products };
}

function category(slug: string, subs: NormalizedSub[]): NormalizedCategory {
  return {
    slug,
    name: slug,
    short: "",
    description: "",
    image: "",
    details: [],
    subs,
    productCount: subs.reduce((total, item) => total + item.products.length, 0),
  };
}

describe("global category taxonomy", () => {
  it("assigns Bavarian products to Men, Women, Kids and Accessories without losing products", () => {
    const input = category("bavarian-trachten-wear", [
      sub("men", "Men's Trachten", [product("Traditional Lederhosen")]),
      sub("women", "Women's Trachten", [product("Traditional Dirndl Dress")]),
      sub("kids", "Children's Trachten", [product("Children's Dirndl")]),
      sub("accessories", "Accessories", [product("Alpine Trachten Hat")]),
    ]);

    const result = buildCategoryTaxonomy(input);
    expect(result.unassignedCount).toBe(0);
    expect(result.audiences.find((item) => item.slug === "men")?.productCount).toBe(1);
    expect(result.audiences.find((item) => item.slug === "women")?.productCount).toBe(1);
    expect(result.audiences.find((item) => item.slug === "kids")?.productCount).toBe(1);
    expect(result.audiences.find((item) => item.slug === "accessories")?.productCount).toBe(1);
  });

  it("keeps a teamwear product available to club and buyer-audience programs", () => {
    const input = category("sportswear", [
      sub("teamwear", "Teamwear", [product("Custom Football Kit")]),
    ]);

    const result = buildCategoryTaxonomy(input);
    expect(result.unassignedCount).toBe(0);
    expect(result.audiences.find((item) => item.slug === "team-club")?.collections[0]?.slug).toBe("football-kits");
    expect(result.audiences.find((item) => item.slug === "kids")?.productCount).toBe(1);
  });

  it("builds stable English and localized hierarchy paths", () => {
    expect(taxonomyAudiencePath("sportswear", "kids")).toBe("/products/sportswear/kids");
    expect(taxonomyAudiencePath("sportswear", "kids", "de")).toBe("/intl/de/products/sportswear/kids");
    expect(taxonomyCollectionPath("sportswear", "kids", "football-kits", "fr")).toBe(
      "/intl/fr/products/sportswear/kids/football-kits",
    );
  });
});
