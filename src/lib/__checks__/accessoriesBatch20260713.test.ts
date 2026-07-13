import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();

const requiredMedia = [
  "public/media/bavarian-drive/assets/men-accessories/review-only/hats-1.webp",
  "public/media/bavarian-drive/assets/men-accessories/bavarian-leather-belt/belt-1.webp",
  "public/media/bavarian-drive/assets/men-shoes-socks/haferl-leather-shoes/shoes-1.webp",
  "public/media/bavarian-drive/assets/men-shoes-socks/haferl-leather-shoes/socks-1.webp",
  "public/media/bavarian-drive/assets/women-accessories/premium-leather-bag/bags-1.webp",
];

describe("Bavarian accessories batch 20260713", () => {
  it("is connected to the public supplemental catalogue", () => {
    const aggregator = readFileSync(resolve(root, "src/lib/supplementalCatalogBatch10.ts"), "utf8");
    expect(aggregator).toContain("createSupplementalAccessories20260713ProductsForSubcategory");
  });

  it("uses repository-backed first-party media", () => {
    for (const mediaPath of requiredMedia) {
      expect(() => readFileSync(resolve(root, mediaPath))).not.toThrow();
    }
  });
});
