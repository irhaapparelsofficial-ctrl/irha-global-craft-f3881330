import { describe, expect, it, vi } from "vitest";
import {
  auditProductUrls,
  nextAvailableProductSlug,
  normalizeProductReferenceCode,
  productPublicUrl,
  productReferencePrefix,
  rollbackUploadedProductMedia,
  slugifyProductName,
  suggestProductReferenceCode,
  taxonomyNodeMatchesCategory,
  taxonomyProductPublicUrl,
} from "./productPublishing";

describe("product publishing helpers", () => {
  const categories = [
    { id: "parent", slug: "bavarian-trachten-wear", parent_id: null },
    { id: "child", slug: "lederhosen", parent_id: "parent" },
  ];

  it("creates stable slugs and resolves category collisions", () => {
    expect(slugifyProductName(" Premium Lederhosen — Brown ")).toBe("premium-lederhosen-brown");
    const existing = [
      { id: "1", category_id: "child", slug: "premium-lederhosen" },
      { id: "2", category_id: "child", slug: "premium-lederhosen-2" },
      { id: "3", category_id: "other", slug: "premium-lederhosen-3" },
    ];
    expect(nextAvailableProductSlug("", "Premium Lederhosen", "child", existing)).toBe("premium-lederhosen-3");
    expect(nextAvailableProductSlug("premium-lederhosen", "Ignored", "child", existing, "1")).toBe("premium-lederhosen");
  });

  it("generates the legacy-compatible product URL from the top-level category", () => {
    expect(productPublicUrl(categories, "child", "premium-lederhosen")).toBe(
      "https://irhaapparels.com/products/bavarian-trachten-wear/premium-lederhosen",
    );
    expect(productPublicUrl(categories, "missing", "premium-lederhosen")).toBeNull();
  });

  it("generates canonical four-level URLs only from valid product-type leaves", () => {
    const leaf = {
      id: "leaf",
      node_type: "product_type",
      depth: 2,
      slug: "lederhosen",
      full_slug_path: "bavarian-trachten-wear/men/lederhosen",
    };
    expect(taxonomyProductPublicUrl(leaf, "premium-lederhosen")).toBe(
      "https://irhaapparels.com/products/bavarian-trachten-wear/men/lederhosen/premium-lederhosen",
    );
    expect(taxonomyProductPublicUrl({ ...leaf, depth: 1 }, "premium-lederhosen")).toBeNull();
    expect(taxonomyNodeMatchesCategory(leaf, categories, "child")).toBe(true);
    expect(taxonomyNodeMatchesCategory({ ...leaf, full_slug_path: "sportswear/team-club/football-uniforms" }, categories, "child")).toBe(false);
  });

  it("creates stable category-aware reference codes without changing existing codes", () => {
    expect(productReferencePrefix("bavarian-trachten-wear/men/lederhosen")).toBe("IRHA-BAV-LDH");
    expect(suggestProductReferenceCode(
      "bavarian-trachten-wear/men/lederhosen",
      ["IRHA-BAV-LDH-0001", "IRHA-BAV-LDH-0007", "IRHA-SPT-FBJ-0009"],
    )).toBe("IRHA-BAV-LDH-0008");
    expect(normalizeProductReferenceCode(" irha bav ldh 0042 ")).toBe("IRHA-BAV-LDH-0042");
  });

  it("audits missing product and image URLs without external requests", () => {
    expect(auditProductUrls([
      { slug: "ready", category_id: "child", image_url: "https://image/cover.webp", gallery: ["https://image/1.webp"] },
      { slug: "", category_id: "child", image_url: null, gallery: [] },
    ], categories)).toEqual({
      total: 2,
      missingProductUrl: 1,
      missingCoverUrl: 1,
      missingGalleryUrl: 1,
      complete: 1,
    });
  });

  it("rolls back metadata and every uploaded storage object", async () => {
    const metadataIn = vi.fn().mockResolvedValue({ error: null });
    const metadataDelete = vi.fn(() => ({ in: metadataIn }));
    const remove = vi.fn().mockResolvedValue({ error: null });
    const client = {
      from: vi.fn(() => ({ delete: metadataDelete })),
      storage: { from: vi.fn(() => ({ remove })) },
    } as any;

    await rollbackUploadedProductMedia(client, [
      { publicUrl: "https://image/1", mediaAssetId: "media-1", objectPaths: ["a", "a-360"] },
      { publicUrl: "https://image/2", mediaAssetId: "media-2", objectPaths: ["b", "b-360"] },
    ]);

    expect(metadataIn).toHaveBeenCalledWith("id", ["media-1", "media-2"]);
    expect(remove).toHaveBeenCalledWith(["a", "a-360", "b", "b-360"]);
  });
});
