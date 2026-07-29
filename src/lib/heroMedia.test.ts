import { describe, expect, it } from "vitest";
import { CATEGORY_HERO_MEDIA, HERO_PROGRAMS, categoryHeroImage, topCategorySlugFromPath } from "./heroMedia";
import { MAIN_CATEGORY_SLUGS } from "./categoryMediaRegistry";
import { selectEditorialHeroSlides } from "@/components/HeroMediaSlideshow";

describe("sitewide hero media", () => {
  it("defines a curated hero for every live core category", () => {
    expect(Object.keys(CATEGORY_HERO_MEDIA)).toEqual([...MAIN_CATEGORY_SLUGS]);
    expect(HERO_PROGRAMS).toHaveLength(5);
    expect(HERO_PROGRAMS.every((program) => Boolean(program.image))).toBe(true);
  });

  it("resolves top-level category routes only", () => {
    expect(topCategorySlugFromPath("/products/sportswear")).toBe("sportswear");
    expect(topCategorySlugFromPath("/products/sportswear/")).toBe("sportswear");
    expect(topCategorySlugFromPath("/products/sportswear/custom-kit")).toBeNull();
    expect(topCategorySlugFromPath("/products")).toBeNull();
  });

  it("uses the curated category image before a database fallback", () => {
    expect(categoryHeroImage("sportswear", "fallback.jpg")).toBe(CATEGORY_HERO_MEDIA.sportswear);
    expect(categoryHeroImage("unknown-category", "fallback.jpg")).toBe("fallback.jpg");
  });

  it("removes contain-style product cutouts when an editorial cover is available", () => {
    expect(selectEditorialHeroSlides([
      { src: "editorial.jpg", alt: "Editorial", fit: "cover" },
      { src: "product-cutout.png", alt: "Product", fit: "contain" },
      { src: "product-cutout.png", alt: "Duplicate", fit: "contain" },
    ])).toEqual([{ src: "editorial.jpg", alt: "Editorial", fit: "cover" }]);
  });

  it("keeps contain media when it is the only usable hero source", () => {
    expect(selectEditorialHeroSlides([
      { src: "only-product.png", alt: "Only product", fit: "contain" },
    ])).toEqual([{ src: "only-product.png", alt: "Only product", fit: "contain" }]);
  });
});
