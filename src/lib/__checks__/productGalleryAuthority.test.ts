import { describe, expect, it } from "vitest";
import { IA_MEDIA_E001_PRODUCT_MEDIA } from "@/lib/iaMediaE001Runtime";
import { PRODUCT_REAL_MEDIA } from "@/lib/productRealMedia";
import {
  productSlugFromProductMediaUrl,
  selectAuthoritativeProductGallery,
  selectAuthoritativeProductGalleryFromUrls,
  selectAuthoritativeProductImageSource,
  uniqueProductImages,
} from "@/lib/productGalleryAuthority";

describe("buyer-facing product gallery authority", () => {
  it("uses only the exact committed media set when a slug has first-party media", () => {
    const slug = "traditional-lederhosen";
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

  it("replaces legacy direct-detail URLs with the exact IA-MEDIA-E001 gallery", () => {
    const legacy = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog/products/p001-short-lederhosen/p001-short-lederhosen-front.webp";
    expect(productSlugFromProductMediaUrl(legacy)).toBe("short-lederhosen");
    expect(selectAuthoritativeProductGalleryFromUrls([legacy])).toEqual(
      IA_MEDIA_E001_PRODUCT_MEDIA["short-lederhosen"].gallery,
    );
    expect(selectAuthoritativeProductGalleryFromUrls([legacy])[0]).toContain(
      "/p001-short-lederhosen/ia-media-e001-20260730/01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp",
    );
  });

  it("replaces only legacy P001-P007 card sources and preserves exact alternate frames", () => {
    const legacy = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog/products/p002-knee-length-lederhosen/p002-knee-length-lederhosen-front.webp";
    const exact = IA_MEDIA_E001_PRODUCT_MEDIA["knee-length-lederhosen"].gallery;
    expect(selectAuthoritativeProductImageSource(legacy)).toBe(exact[0]);
    expect(selectAuthoritativeProductImageSource(exact[3])).toBe(exact[3]);
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
