import { describe, expect, it } from "vitest";
import {
  originalImageUrl,
  thumbnailObjectPath,
  thumbnailUrl,
} from "@/lib/imageThumbnails";

describe("image thumbnail routing", () => {
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

  it("builds storage thumbnail object paths without collisions", () => {
    expect(thumbnailObjectPath("2026/07/item.png")).toBe("thumbnails/2026/07/item.png.webp");
    expect(thumbnailObjectPath("thumbnails/2026/07/item.png.webp")).toBe("thumbnails/2026/07/item.png.webp");
  });

  it("can recover original public and site-media URLs", () => {
    expect(originalImageUrl("/thumbnails/product-media/style/01.webp.webp"))
      .toBe("/product-media/style/01.webp");
    expect(originalImageUrl(
      "https://example.supabase.co/storage/v1/object/public/site-media/thumbnails/2026/07/item.png.webp",
    )).toBe("https://example.supabase.co/storage/v1/object/public/site-media/2026/07/item.png");
  });
});
