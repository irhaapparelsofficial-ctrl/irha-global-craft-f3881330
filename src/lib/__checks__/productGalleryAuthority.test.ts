import { describe, expect, it } from "vitest";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";
import {
  selectAuthoritativeProductGallery,
  uniqueProductImages,
} from "@/lib/productGalleryAuthority";

describe("buyer-facing product gallery authority", () => {
  it("uses only the exact committed media set when a slug has first-party media", () => {
    const slug = "classic-biker-leather-jacket";
    const exact = PRODUCT_REAL_MEDIA[slug]?.gallery ?? [];
    expect(exact.length).toBeGreaterThan(0);

    const gallery = selectAuthoritativeProductGallery(slug, [
      "/wrong-product/front.jpg",
      "/wrong-product/back.jpg",
    ]);

    expect(gallery).toEqual(uniqueProductImages(exact));
    expect(gallery).not.toContain("/wrong-product/front.jpg");
    expect(gallery).not.toContain("/wrong-product/back.jpg");
  });

  it("deduplicates and limits database fallback galleries to six images", () => {
    const gallery = selectAuthoritativeProductGallery("database-only-reference-style", [
      "/media/hero.jpg",
      "/media/hero.jpg",
      "/media/02.jpg",
      "/media/03.jpg",
      "/media/04.jpg",
      "/media/05.jpg",
      "/media/06.jpg",
      "/media/07.jpg",
    ]);

    expect(gallery).toEqual([
      "/media/hero.jpg",
      "/media/02.jpg",
      "/media/03.jpg",
      "/media/04.jpg",
      "/media/05.jpg",
      "/media/06.jpg",
    ]);
  });

  it("keeps the authoritative first image as the hero candidate", () => {
    const gallery = selectAuthoritativeProductGallery("database-only-product", [
      "/media/primary.jpg",
      "/media/detail.jpg",
    ]);

    expect(gallery[0]).toBe("/media/primary.jpg");
  });
});
