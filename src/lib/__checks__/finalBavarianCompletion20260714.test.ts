import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createSupplementalFinalCompletion20260714ProductsForSubcategory } from "@/lib/supplementalCatalogFinalCompletion20260714";

const root = process.cwd();
const categoryId = "00000000-0000-0000-0000-000000000001";

const men = createSupplementalFinalCompletion20260714ProductsForSubcategory(
  "bavarian-trachten-wear",
  "men",
  "Men's Trachten",
  categoryId,
);
const women = createSupplementalFinalCompletion20260714ProductsForSubcategory(
  "bavarian-trachten-wear",
  "women",
  "Women's Trachten",
  categoryId,
);
const kids = createSupplementalFinalCompletion20260714ProductsForSubcategory(
  "bavarian-trachten-wear",
  "kids",
  "Kids' Trachten",
  categoryId,
);
const products = [...men, ...women, ...kids];

describe("final Bavarian catalogue completion 20260714", () => {
  it("adds the verified audience counts without cross-mapping", () => {
    expect(men).toHaveLength(10);
    expect(women).toHaveLength(12);
    expect(kids).toHaveLength(10);
    expect(products).toHaveLength(32);

    expect(
      createSupplementalFinalCompletion20260714ProductsForSubcategory(
        "bavarian-trachten-wear",
        "accessories",
        "Accessories",
        categoryId,
      ),
    ).toEqual([]);
    expect(
      createSupplementalFinalCompletion20260714ProductsForSubcategory(
        "sportswear",
        "men",
        "Men",
        categoryId,
      ),
    ).toEqual([]);
  });

  it("uses unique catalogue IDs and slugs", () => {
    expect(new Set(products.map((product) => product.id)).size).toBe(products.length);
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
  });

  it("uses repository-backed first-party media for every product", () => {
    const mediaPaths = products.flatMap((product) => product.gallery ?? []);
    expect(mediaPaths).toHaveLength(32);

    for (const mediaPath of mediaPaths) {
      expect(mediaPath.startsWith("/media/bavarian-drive/assets/")).toBe(true);
      expect(() => readFileSync(resolve(root, `public${mediaPath}`))).not.toThrow();
    }
  });

  it("is connected to the public supplemental catalogue", () => {
    const aggregator = readFileSync(resolve(root, "src/lib/supplementalCatalogBatch10.ts"), "utf8");
    expect(aggregator).toContain("createSupplementalFinalCompletion20260714ProductsForSubcategory");
  });
});
