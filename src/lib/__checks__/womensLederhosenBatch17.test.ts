import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSupplementalBatch17ProductsForSubcategory } from "@/lib/supplementalCatalogBatch17";

const root = process.cwd();
const categoryId = "00000000-0000-0000-0000-000000000001";

const products = createSupplementalBatch17ProductsForSubcategory(
  "bavarian-trachten-wear",
  "women",
  "Women's Trachten",
  categoryId,
);

describe("Women Lederhosen catalogue batch 17", () => {
  it("maps only to the Bavarian women audience", () => {
    expect(products).toHaveLength(6);
    expect(
      createSupplementalBatch17ProductsForSubcategory(
        "bavarian-trachten-wear",
        "men",
        "Men's Trachten",
        categoryId,
      ),
    ).toEqual([]);
  });

  it("uses unique catalogue IDs and slugs", () => {
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
  });

  it("uses existing repository-backed first-party media", () => {
    const mediaPaths = products.flatMap((product) => product.gallery ?? []);
    expect(mediaPaths).toHaveLength(19);

    for (const mediaPath of mediaPaths) {
      expect(mediaPath.startsWith("/media/bavarian-drive/assets/women-lederhosen/")).toBe(true);
      expect(() => readFileSync(resolve(root, `public${mediaPath}`))).not.toThrow();
    }
  });

  it("is connected to the public supplemental catalogue", () => {
    const aggregator = readFileSync(resolve(root, "src/lib/supplementalCatalogBatch10.ts"), "utf8");
    expect(aggregator).toContain("createSupplementalBatch17ProductsForSubcategory");
  });
});
