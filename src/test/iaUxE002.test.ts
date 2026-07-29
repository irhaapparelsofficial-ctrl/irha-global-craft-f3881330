import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { NormalizedProduct } from "@/hooks/usePublicCategoryData";
import {
  CATEGORY_MEDIA_REGISTRY,
  MAIN_CATEGORY_SLUGS,
  resolveCanonicalCategoryMediaMap,
} from "@/lib/categoryMediaRegistry";
import { curateCategorySlides } from "@/lib/categorySlideshow";

const repositoryFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

function product(slug: string, name: string, image: string): NormalizedProduct {
  return {
    slug,
    name,
    image,
    originalImage: image,
    gallery: [image],
    description: "",
    specs: [],
    details: [],
  } as NormalizedProduct;
}

describe("IA-UX-E002 canonical category media registry", () => {
  it("registers all five divisions with unique stable identities and approved homepage roles", () => {
    expect(MAIN_CATEGORY_SLUGS).toHaveLength(5);
    const entries = MAIN_CATEGORY_SLUGS.map((slug) => CATEGORY_MEDIA_REGISTRY[slug]);
    expect(new Set(entries.map((entry) => entry.id)).size).toBe(5);
    expect(new Set(entries.map((entry) => entry.homepageRole)).size).toBe(5);
    expect(entries.every((entry) => entry.provenance === "homepage-approved")).toBe(true);
    expect(entries.every((entry) => entry.childMediaPolicy === "curate-from-exact-route-products")).toBe(true);
  });

  it("contains no placeholder, question-mark or public Drive source", () => {
    for (const entry of Object.values(CATEGORY_MEDIA_REGISTRY)) {
      expect(entry.src).not.toMatch(/placeholder\.svg|question[-_ ]?mark/i);
      expect(entry.fallbackSrc).not.toMatch(/placeholder\.svg|question[-_ ]?mark/i);
      expect(entry.src).not.toMatch(/drive\.google\.com/i);
      expect(entry.fallbackSrc).not.toMatch(/drive\.google\.com/i);
    }
  });

  it("keeps the stable media identity when an approved homepage source changes", () => {
    const before = resolveCanonicalCategoryMediaMap();
    const after = resolveCanonicalCategoryMediaMap({
      category_sportswear: "https://example.invalid/approved-sportswear.webp",
    });
    expect(after.sportswear.id).toBe(before.sportswear.id);
    expect(after.sportswear.src).toBe("https://example.invalid/approved-sportswear.webp");
    expect(after["premium-leather-apparel"].src).toBe(before["premium-leather-apparel"].src);
  });
});

describe("IA-UX-E002 slideshow curation", () => {
  it("starts a main category with its canonical image and excludes footwear from garment-led slides", () => {
    const products = [
      product("bavarian-boots", "Bavarian Boots", "/media/boots.webp"),
      product("premium-embroidered-lederhosen", "Premium Embroidered Lederhosen", "/media/lederhosen.webp"),
      product("long-dirndl", "Long Dirndl", "/media/dirndl.webp"),
      product("checked-trachten-shirt", "Checked Trachten Shirt", "/media/shirt.webp"),
    ];
    const slides = curateCategorySlides({
      categorySlug: "bavarian-trachten-wear",
      products,
      scope: "category",
    });
    expect(slides[0]?.src).toBe(CATEGORY_MEDIA_REGISTRY["bavarian-trachten-wear"].src);
    expect(slides.map((slide) => slide.src)).toContain("/media/lederhosen.webp");
    expect(slides.map((slide) => slide.src)).toContain("/media/dirndl.webp");
    expect(slides.map((slide) => slide.src)).not.toContain("/media/boots.webp");
  });

  it("uses only exact route products on audience and collection slideshows", () => {
    const products = [
      product("soccer-home-kit", "Soccer Home Kit", "/media/soccer.webp"),
      product("basketball-uniform", "Basketball Uniform", "/media/basketball.webp"),
    ];
    const slides = curateCategorySlides({
      categorySlug: "sportswear",
      products,
      scope: "collection",
    });
    expect(slides.map((slide) => slide.src)).toEqual(["/media/soccer.webp", "/media/basketball.webp"]);
    expect(slides.every((slide) => products.some((item) => item.originalImage === slide.src))).toBe(true);
  });

  it("deduplicates repeated media identities and keeps the strongest matching product first", () => {
    const products = [
      product("cargo-pants", "Cargo Pants", "/media/shared.webp"),
      product("oversized-t-shirt", "Heavyweight Oversized T Shirt", "/media/tee.webp"),
      product("duplicate-cargo", "Cargo Pants Alternate", "/media/shared.webp"),
    ];
    const slides = curateCategorySlides({
      categorySlug: "streetwear-activewear",
      products,
      scope: "collection",
    });
    expect(slides[0]?.src).toBe("/media/tee.webp");
    expect(slides.filter((slide) => slide.src === "/media/shared.webp")).toHaveLength(1);
  });
});

describe("IA-UX-E002 public renderer contract", () => {
  const home = repositoryFile("src/components/sections/HomeCategoryUniverse.tsx");
  const products = repositoryFile("src/pages/GlobalCollectionsPage.tsx");
  const taxonomy = repositoryFile("src/pages/CategoryTaxonomyPage.tsx");
  const categoryData = repositoryFile("src/hooks/usePublicCategoryData.ts");

  it("makes homepage and All Products consume the same canonical resolver", () => {
    expect(home).toContain("useCanonicalCategoryMedia");
    expect(products).toContain("useCanonicalCategoryMedia");
    expect(home).toContain("data-category-media-id");
    expect(products).toContain("data-category-media-id");
    expect(products).not.toContain("category.image}\n");
  });

  it("uses the registry as the static catalogue fallback and never promotes category media to a product front", () => {
    expect(categoryData).toContain("canonicalCategoryMedia(top.slug)");
    expect(categoryData).toContain("selectAuthoritativeProductGallery");
    expect(taxonomy).toContain("product.image");
    expect(taxonomy).toContain("product.originalImage");
    expect(taxonomy).not.toContain("image={category.image}\n                      originalImage={category.originalImage}");
  });

  it("curates taxonomy slides instead of taking the first sorted product or mapping every image", () => {
    expect(taxonomy).toContain("curateCategorySlides");
    expect(taxonomy).not.toContain("firstHeroProduct");
    expect(taxonomy).not.toContain("heroProducts.map((product)");
    expect(taxonomy).toContain('scope: collection ? "collection" : audience ? "audience" : "category"');
  });

  it("keeps EN, DE, FR and NL on one media-producing component", () => {
    expect(taxonomy).toContain("TAXONOMY_LOCALES");
    expect(taxonomy).toContain("mediaBySlug[category.slug]");
    expect(taxonomy).not.toMatch(/locale\s*===\s*["'](?:de|fr|nl)["'].*(?:image|media)/);
  });
});
