import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import {
  filterProductFinder,
  flattenProductCatalog,
} from "@/lib/productFinder";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

const categories = [
  {
    slug: "sportswear",
    name: "Sportswear",
    subs: [
      {
        slug: "football",
        name: "Football Kits",
        products: [
          {
            slug: "pro-football-kit",
            name: "Pro Football Team Kit",
            sku: "SP-100",
            description: "Custom team uniform with buyer-approved branding",
            specs: ["Shirt and shorts program"],
            image: "/football.webp",
            gallery: [],
            details: [],
            created_at: "2026-07-10T00:00:00Z",
          },
        ],
      },
    ],
  },
  {
    slug: "bavarian-trachten-wear",
    name: "Bavarian Trachten Wear",
    subs: [
      {
        slug: "lederhosen",
        name: "Lederhosen",
        products: [
          {
            slug: "brown-deer-lederhosen",
            name: "Brown Deer Embroidered Lederhosen",
            sku: "BV-200",
            description: "Traditional buyer-specified embroidery program",
            specs: ["Private-label trims"],
            image: "/lederhosen.webp",
            gallery: [],
            details: [],
            created_at: "2026-07-12T00:00:00Z",
          },
          {
            slug: "black-classic-lederhosen",
            name: "Black Classic Lederhosen",
            sku: "BV-201",
            description: "Classic wholesale style",
            specs: [],
            image: "/black.webp",
            gallery: [],
            details: [],
            created_at: "2026-07-11T00:00:00Z",
          },
        ],
      },
    ],
  },
] as unknown as NormalizedCategory[];

describe("all-products catalogue discovery", () => {
  const items = flattenProductCatalog(categories);

  it("flattens products while preserving category and sub-category identity", () => {
    expect(items).toHaveLength(3);
    expect(items[0]).toMatchObject({
      categorySlug: "sportswear",
      subSlug: "football",
    });
  });

  it("supports multi-word product discovery and exact SKU priority", () => {
    expect(filterProductFinder(items, { query: "deer lederhosen" }).map((item) => item.product.slug)).toEqual([
      "brown-deer-lederhosen",
    ]);
    expect(filterProductFinder(items, { query: "BV-201" })[0]?.product.slug).toBe(
      "black-classic-lederhosen",
    );
  });

  it("filters by category and sorts newest products deterministically", () => {
    const bavarian = filterProductFinder(items, {
      categorySlug: "bavarian-trachten-wear",
      sort: "newest",
    });
    expect(bavarian.map((item) => item.product.slug)).toEqual([
      "brown-deer-lederhosen",
      "black-classic-lederhosen",
    ]);
  });

  it("ships a dedicated URL-synced finder instead of reusing the long collections page", () => {
    const page = read("src/pages/AllProductsPage.tsx");
    expect(page).not.toContain('import Products from "./Products"');
    expect(page).toContain("useSearchParams");
    expect(page).toContain('updateParam("category"');
    expect(page).toContain('updateParam("sort"');
    expect(page).toContain("PAGE_SIZE = 24");
    expect(page).toContain("shortlist.toggle(storedProduct)");
    expect(page).toContain("compare.toggle(storedProduct)");
    expect(page).toContain("Show more");
  });
});
