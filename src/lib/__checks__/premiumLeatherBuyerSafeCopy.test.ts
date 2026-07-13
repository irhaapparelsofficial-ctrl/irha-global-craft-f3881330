import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG } from "@/lib/catalog";
import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";

const root = process.cwd();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const leatherGroup = CATALOG.find((group) => group.slug === "leatherwear");
const leatherProducts = leatherGroup?.subs.flatMap((sub) => sub.products) ?? [];
const leatherSlugs = leatherProducts.map((product) => slugify(product.name));

const expectedLeatherSlugs = [
  "bomber-leather-jacket",
  "classic-biker-leather-jacket",
  "leather-vest-waistcoat",
  "leather-trousers",
  "full-grain-leather-belt",
  "leather-gloves",
  "leather-wallet",
  "premium-leather-bag",
];

const unsupportedClaims = [
  "full-grain",
  "ykk",
  "cowhide",
  "lambskin",
  "certified tannery",
  "vetted-certified",
  "1.0–1.4mm",
  "280–320",
  "30–50 pieces",
  "xs–4xl",
];

describe("Premium Leather Apparel buyer-safe public copy", () => {
  it("covers every existing leatherwear product without removing its gallery", () => {
    expect(leatherProducts).toHaveLength(8);
    expect([...leatherSlugs].sort()).toEqual([...expectedLeatherSlugs].sort());

    for (const product of leatherProducts) {
      expect(product.gallery?.length ?? 0).toBeGreaterThanOrEqual(6);
      expect(PRODUCT_SEO_OVERRIDES[slugify(product.name)]).toBeDefined();
    }
  });

  it("contains no unsupported material, hardware, certification or fixed-program claims", () => {
    for (const slug of expectedLeatherSlugs) {
      const override = PRODUCT_SEO_OVERRIDES[slug];
      const publicCopy = [
        override.name ?? "",
        override.description,
        override.shortDescription,
        override.seoTitle,
        override.seoDescription,
        ...override.specs,
      ]
        .join(" ")
        .toLowerCase();

      for (const claim of unsupportedClaims) {
        expect(publicCopy).not.toContain(claim);
      }
    }
  });

  it("uses buyer-approved specification language for every leather product", () => {
    for (const slug of expectedLeatherSlugs) {
      const override = PRODUCT_SEO_OVERRIDES[slug];
      const publicCopy = `${override.description} ${override.specs.join(" ")}`.toLowerCase();
      expect(publicCopy).toMatch(/buyer|approved sample|approved design|approved reference/);
      expect(publicCopy).toContain("private-label");
    }
  });

  it("applies safe display-name overrides without changing legacy product slugs", () => {
    const publicCatalogSource = readFileSync(resolve(root, "src/hooks/usePublicCatalog.ts"), "utf8");
    expect(publicCatalogSource).toContain("name: override?.name ?? product.name");
    expect(PRODUCT_SEO_OVERRIDES["full-grain-leather-belt"].name).toBe("Custom Leather Belt");
    expect(PRODUCT_SEO_OVERRIDES["premium-leather-bag"].name).toBe("Custom Leather Bag");
  });
});
