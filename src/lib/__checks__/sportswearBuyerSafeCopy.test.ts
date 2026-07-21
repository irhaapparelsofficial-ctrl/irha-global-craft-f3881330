import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG } from "@/lib/catalog";
import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";

const root = process.cwd();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const sportswearGroup = CATALOG.find((group) => group.slug === "sportswear");
const sportswearProducts = sportswearGroup?.subs.flatMap((sub) => sub.products) ?? [];
const sportswearSlugs = sportswearProducts.map((product) => slugify(product.name));

const expectedSportswearSlugs = [
  "sublimated-soccer-uniform-kit",
  "cricket-jersey",
  "cricket-uniform-kit",
  "baseball-jersey",
  "baseball-uniform-kit",
  "basketball-mesh-jersey",
  "basketball-uniform-kit",
  "rugby-jersey",
  "rugby-uniform-kit",
  "athletic-onesie",
  "compression-performance-top",
  "gym-leggings",
  "gym-tank-top",
  "performance-gym-hoodie",
  "performance-sports-bra",
  "performance-tracksuit-set",
  "quarter-zip-pullover",
  "running-shorts",
  "track-pants",
  "training-shirt",
  "zip-up-fleece-jacket",
];

const unsupportedClaims = [
  "competition-grade",
  "full dye-sublimation",
  "4-way stretch",
  "moisture-wicking",
  "micro-mesh",
  "140–180",
  "50 pieces",
  "100 per jersey",
  "xs–5xl",
  "pantone match",
  "wfsgi",
  "certified fabrics",
  "pro sports",
  "federations",
  "team-pack ready",
];

describe("Sportswear buyer-safe public copy", () => {
  it("covers every historical sportswear product without removing its gallery", () => {
    expect(sportswearProducts).toHaveLength(21);
    expect([...sportswearSlugs].sort()).toEqual([...expectedSportswearSlugs].sort());

    for (const product of sportswearProducts) {
      expect(product.gallery?.length ?? 0).toBeGreaterThanOrEqual(3);
      expect(PRODUCT_SEO_OVERRIDES[slugify(product.name)]).toBeDefined();
    }
  });

  it("contains no unsupported fixed performance, certification, sizing or quantity claims", () => {
    for (const slug of expectedSportswearSlugs) {
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
    for (const slug of expectedSportswearSlugs) {
      const override = PRODUCT_SEO_OVERRIDES[slug];
      const publicCopy = `${override.description} ${override.specs.join(" ")}`.toLowerCase();
      expect(publicCopy).toMatch(/buyer|approved sample|approved set|order specification/);
      expect(publicCopy).toContain("private-label");
    }
  });

  it("keeps product-family construction language specific instead of generic", () => {
    expect(PRODUCT_SEO_OVERRIDES["sublimated-soccer-uniform-kit"].specs.join(" ")).toContain(
      "Jersey and short construction",
    );
    expect(PRODUCT_SEO_OVERRIDES["cricket-uniform-kit"].specs.join(" ")).toContain(
      "Shirt and trouser construction",
    );
    expect(PRODUCT_SEO_OVERRIDES["performance-sports-bra"].specs.join(" ")).toContain(
      "Support level",
    );
    expect(PRODUCT_SEO_OVERRIDES["zip-up-fleece-jacket"].specs.join(" ")).toContain(
      "Collar, zip, pocket",
    );
  });

  it("uses the approved Supabase release and sportswear-specific buyer-safe runtime copy", () => {
    const publicCatalogSource = readFileSync(resolve(root, "src/hooks/usePublicCatalog.ts"), "utf8");
    expect(publicCatalogSource).toContain("No local, supplemental, demo or legacy catalogue is allowed to render publicly");
    expect(publicCatalogSource).toContain('db.rpc("catalog_get_public_release")');
    expect(publicCatalogSource).toContain('db.rpc("catalog_get_public_taxonomy")');
    expect(publicCatalogSource).toContain('case "sportswear"');
    expect(publicCatalogSource).toContain("description: safe.description");
    expect(publicCatalogSource).toContain("specs: safe.specs");
    expect(PRODUCT_SEO_OVERRIDES["sublimated-soccer-uniform-kit"].seoTitle).toContain(
      "Soccer Uniform Kit",
    );
  });
});
