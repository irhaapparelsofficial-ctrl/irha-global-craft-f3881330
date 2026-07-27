import { describe, expect, it } from "vitest";
import {
  isLegacyResponsive2400ObjectPath,
  legacyResponsive2400ObjectPath,
  originalImageUrl,
  RESPONSIVE_IMAGE_WIDTHS,
  responsiveImageAttributes,
  responsiveVariantObjectPath,
  responsiveVariantObjectPathsForCleanup,
  thumbnailObjectPath,
  thumbnailUrl,
} from "@/lib/imageThumbnails";

describe("image thumbnail and responsive routing", () => {
  it("maps public product media to the generated thumbnail tree", () => {
    expect(thumbnailUrl("/product-media/style/01-hero-front.webp"))
      .toBe("/thumbnails/product-media/style/01-hero-front.webp.webp");
  });

  it("does not rewrite existing thumbnail paths", () => {
    expect(thumbnailUrl("/thumbnails/product-media/style/01.webp.webp"))
      .toBe("/thumbnails/product-media/style/01.webp.webp");
    expect(thumbnailUrl("/catalogs/thumbs/master-catalogue-2026-01.jpg"))
      .toBe("/catalogs/thumbs/master-catalogue-2026-01.jpg");
  });

  it("maps public site-media URLs to deterministic thumbnail objects", () => {
    const source = "https://example.supabase.co/storage/v1/object/public/site-media/2026/07/asset.photo.jpg";
    expect(thumbnailUrl(source)).toBe(
      "https://example.supabase.co/storage/v1/object/public/site-media/thumbnails/2026/07/asset.photo.jpg.webp",
    );
  });

  it("leaves unrelated remote images unchanged", () => {
    const source = "https://cdn.example.com/images/product.jpg";
    expect(thumbnailUrl(source)).toBe(source);
  });

  it("uses 1600px as the maximum active responsive width", () => {
    expect(RESPONSIVE_IMAGE_WIDTHS).toEqual([360, 720, 1200, 1600]);
    expect(RESPONSIVE_IMAGE_WIDTHS).not.toContain(2400);
    expect(Math.max(...RESPONSIVE_IMAGE_WIDTHS)).toBe(1600);
  });

  it("builds active storage variant object paths without collisions", () => {
    expect(thumbnailObjectPath("2026/07/item.png")).toBe("thumbnails/2026/07/item.png.webp");
    expect(thumbnailObjectPath("thumbnails/2026/07/item.png.webp")).toBe("thumbnails/2026/07/item.png.webp");
    expect(responsiveVariantObjectPath("2026/07/item.png", 360)).toBe("responsive/360/2026/07/item.png.webp");
    expect(responsiveVariantObjectPath("2026/07/item.png", 720)).toBe("thumbnails/2026/07/item.png.webp");
    expect(responsiveVariantObjectPath("2026/07/item.png", 1200)).toBe("responsive/1200/2026/07/item.png.webp");
    expect(responsiveVariantObjectPath("2026/07/item.png", 1600)).toBe("responsive/1600/2026/07/item.png.webp");
  });

  it("provides browser-selectable widths without a 2400 candidate", () => {
    const result = responsiveImageAttributes("/product-media/style/01-hero-front.webp");
    expect(result.src).toBe("/thumbnails/product-media/style/01-hero-front.webp.webp");
    expect(result.srcSet).toContain("/responsive/360/product-media/style/01-hero-front.webp.webp 360w");
    expect(result.srcSet).toContain("/thumbnails/product-media/style/01-hero-front.webp.webp 720w");
    expect(result.srcSet).toContain("/responsive/1200/product-media/style/01-hero-front.webp.webp 1200w");
    expect(result.srcSet).toContain("/responsive/1600/product-media/style/01-hero-front.webp.webp 1600w");
    expect(result.srcSet).not.toContain("/responsive/2400/");
    expect(result.srcSet).not.toContain(" 2400w");
  });

  it("provides deterministic responsive storage paths for site-media", () => {
    const source = "https://example.supabase.co/storage/v1/object/public/site-media/2026/07/item.png";
    const result = responsiveImageAttributes(source);
    expect(result.src).toBe("https://example.supabase.co/storage/v1/object/public/site-media/thumbnails/2026/07/item.png.webp");
    expect(result.srcSet).toContain("site-media/responsive/360/2026/07/item.png.webp 360w");
    expect(result.srcSet).toContain("site-media/thumbnails/2026/07/item.png.webp 720w");
    expect(result.srcSet).toContain("site-media/responsive/1200/2026/07/item.png.webp 1200w");
    expect(result.srcSet).toContain("site-media/responsive/1600/2026/07/item.png.webp 1600w");
    expect(result.srcSet).not.toContain("site-media/responsive/2400/");
  });

  it("recognizes legacy 2400 objects without making them active variants", () => {
    const original = "2026/07/item.png";
    expect(legacyResponsive2400ObjectPath(original)).toBe("responsive/2400/2026/07/item.png.webp");
    expect(isLegacyResponsive2400ObjectPath("responsive/2400/2026/07/item.png.webp")).toBe(true);
    expect(isLegacyResponsive2400ObjectPath("responsive/1600/2026/07/item.png.webp")).toBe(false);
    const cleanupPaths = responsiveVariantObjectPathsForCleanup(original);
    expect(cleanupPaths).toContain("responsive/1600/2026/07/item.png.webp");
    expect(cleanupPaths).toContain("responsive/2400/2026/07/item.png.webp");
    expect(cleanupPaths.filter((path) => path.includes("responsive/2400/"))).toHaveLength(1);
  });

  it("can recover original public and site-media URLs including legacy 2400 paths", () => {
    expect(originalImageUrl("/thumbnails/product-media/style/01.webp.webp"))
      .toBe("/product-media/style/01.webp");
    expect(originalImageUrl("/responsive/1600/product-media/style/01.webp.webp"))
      .toBe("/product-media/style/01.webp");
    expect(originalImageUrl(
      "https://example.supabase.co/storage/v1/object/public/site-media/thumbnails/2026/07/item.png.webp",
    )).toBe("https://example.supabase.co/storage/v1/object/public/site-media/2026/07/item.png");
    expect(originalImageUrl(
      "https://example.supabase.co/storage/v1/object/public/site-media/responsive/2400/2026/07/item.png.webp",
    )).toBe("https://example.supabase.co/storage/v1/object/public/site-media/2026/07/item.png");
  });
});
