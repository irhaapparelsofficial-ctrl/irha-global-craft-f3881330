import {
  absolutePublicImageUrl,
  imageViewLabel,
  isTemporaryImageUrl,
  productImageAlt,
  productNameFromImageUrl,
  semanticImageAlt,
} from "@/lib/imageSeo";

const primary =
  "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog/products/p001-short-lederhosen/p001-short-lederhosen-front.webp";

describe("stable image SEO helpers", () => {
  it("keeps canonical Supabase product images absolute and stable", () => {
    expect(absolutePublicImageUrl(primary)).toBe(primary);
    expect(isTemporaryImageUrl(primary)).toBe(false);
  });

  it("rejects temporary signatures and expiry parameters", () => {
    expect(isTemporaryImageUrl(`${primary}?token=secret&expires=123`)).toBe(true);
    expect(isTemporaryImageUrl(`${primary}?X-Amz-Signature=secret`)).toBe(true);
  });

  it("derives the authoritative product name from the deterministic media path", () => {
    expect(productNameFromImageUrl(primary)).toBe("Short Lederhosen");
  });

  it("creates view-specific, non-promotional alt text", () => {
    expect(productImageAlt(primary, "Short Lederhosen")).toBe("Front view of Short Lederhosen");
    expect(
      productImageAlt(primary.replace("-front.webp", "-rear-three-quarter.webp"), "Short Lederhosen"),
    ).toBe("Rear three-quarter view of Short Lederhosen");
    expect(
      productImageAlt(primary.replace("-front.webp", "-branding-detail.webp"), "Short Lederhosen"),
    ).toBe("Branding detail of Short Lederhosen");
    expect(imageViewLabel(primary.replace("-front.webp", "-view-04.webp"))).toBe("Alternate view 4");
  });

  it("overrides legacy keyword-stuffed alt text for canonical product media", () => {
    expect(
      semanticImageAlt(primary, "Custom suede Short Lederhosen wholesale manufacturer in Sialkot Pakistan"),
    ).toBe("Front view of Short Lederhosen");
  });

  it("preserves supplied alt text for non-catalogue assets", () => {
    expect(semanticImageAlt("/assets/products-flatlay.abc123.jpg", "Irha Apparels manufacturing overview")).toBe(
      "Irha Apparels manufacturing overview",
    );
  });
});
