import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG } from "@/lib/catalog";
import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";

const root = process.cwd();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const streetwearGroup = CATALOG.find((group) => group.slug === "streetwear");
const streetwearProducts = streetwearGroup?.subs.flatMap((sub) => sub.products) ?? [];
const streetwearSlugs = streetwearProducts.map((product) => slugify(product.name));

const expectedStreetwearSlugs = [
  "bomber-jacket",
  "long-sleeve-streetwear-tee",
  "oversized-graphic-t-shirt",
  "oversized-streetwear-hoodie",
  "casual-sweatpants",
  "streetwear-shorts",
  "tactical-cargo-pants",
];

const unsupportedClaims = [
  "330–450",
  "heavyweight french terry",
  "brushed fleece",
  "garment dye",
  "box-fit",
  "screen / dtg",
  "50 pieces",
  "xs–4xl",
  "vintage wash",
  "certified fabrics",
  "grs option",
  "recycled cotton",
];

describe("Streetwear & Activewear buyer-safe public copy", () => {
  it("covers every historical streetwear product without removing its gallery", () => {
    expect(streetwearProducts).toHaveLength(7);
    expect([...streetwearSlugs].sort()).toEqual([...expectedStreetwearSlugs].sort());

    for (const product of streetwearProducts) {
      expect(product.gallery?.length ?? 0).toBeGreaterThanOrEqual(6);
      expect(PRODUCT_SEO_OVERRIDES[slugify(product.name)]).toBeDefined();
    }
  });

  it("contains no unsupported fixed fabric, finish, sizing, quantity or certification claims", () => {
    for (const slug of expectedStreetwearSlugs) {
      const override = PRODUCT_SEO_OVERRIDES[slug];
      const publicCopy = [
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

  it("uses buyer-approved specification and private-label language throughout", () => {
    for (const slug of expectedStreetwearSlugs) {
      const override = PRODUCT_SEO_OVERRIDES[slug];
      const publicCopy = `${override.description} ${override.specs.join(" ")}`.toLowerCase();
      expect(publicCopy).toMatch(/buyer|approved sample|order specification/);
      expect(publicCopy).toContain("private-label");
    }
  });

  it("keeps construction language specific to each product family", () => {
    expect(PRODUCT_SEO_OVERRIDES["bomber-jacket"].specs.join(" ")).toContain("front closure");
    expect(PRODUCT_SEO_OVERRIDES["oversized-graphic-t-shirt"].specs.join(" ")).toContain(
      "shoulder drop",
    );
    expect(PRODUCT_SEO_OVERRIDES["oversized-streetwear-hoodie"].specs.join(" ")).toContain(
      "Hood",
    );
    expect(PRODUCT_SEO_OVERRIDES["tactical-cargo-pants"].specs.join(" ")).toContain(
      "cargo pocket",
    );
  });

  it("uses the approved Supabase release and streetwear-specific buyer-safe runtime copy", () => {
    const publicCatalogSource = readFileSync(resolve(root, "src/hooks/usePublicCatalog.ts"), "utf8");
    const policySource = readFileSync(resolve(root, "src/lib/buyerReadyProductContent.ts"), "utf8");
    expect(publicCatalogSource).toContain("No local, supplemental, demo or legacy catalogue is allowed to render publicly");
    expect(publicCatalogSource).toContain('db.rpc("catalog_get_public_release")');
    expect(publicCatalogSource).toContain('db.rpc("catalog_get_public_taxonomy")');
    expect(publicCatalogSource).toContain("resolveBuyerReadyProductContent");
    expect(publicCatalogSource).toContain("description: content.description");
    expect(publicCatalogSource).toContain("specs: safe.specs");
    expect(policySource).toContain('case "streetwear-activewear"');
    expect(PRODUCT_SEO_OVERRIDES["oversized-streetwear-hoodie"].seoTitle).toContain(
      "Oversized Streetwear Hoodie",
    );
  });
});
