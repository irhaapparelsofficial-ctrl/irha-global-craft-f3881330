import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { CATALOG } from "@/lib/catalog";
import {
  LEISURE_NIGHTWEAR_SEO_OVERRIDES,
  registerLeisureNightwearSeoOverrides,
} from "@/lib/leisureNightwearSeoOverrides";
import { PRODUCT_SEO_OVERRIDES } from "@/lib/productSeoOverrides";

const root = process.cwd();

const slugify = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

registerLeisureNightwearSeoOverrides();

const leisurewearProducts =
  CATALOG.find((group) => group.slug === "leisurewear")?.subs.flatMap((sub) => sub.products) ?? [];
const nightwearProducts =
  CATALOG.find((group) => group.slug === "nightwear")?.subs.flatMap((sub) => sub.products) ?? [];
const lifestyleProducts = [...leisurewearProducts, ...nightwearProducts];

const expectedLifestyleSlugs = [
  "casual-button-up-shirt",
  "essential-v-neck-t-shirt",
  "henley-long-sleeve-shirt",
  "pique-polo-shirt",
  "premium-basic-crewneck-tee",
  "lounge-shorts",
  "premium-chino-shorts",
  "cotton-nightshirt",
  "cotton-sleep-pants",
  "sleep-shorts-set",
  "sleep-t-shirt",
  "plush-bathrobe-sleep-robe",
  "silk-nightgown-slip",
];

const unsupportedClaims = [
  "combed ring-spun",
  "bio-wash",
  "pre-shrunk",
  "160–220",
  "100 pieces",
  "30–45 days",
  "xs–5xl",
  "certified fabrics",
  "sustainable cotton",
  "cotton / modal blend",
  "certified dyes",
  "boutique-grade",
  "hospitality-program ready",
  "110–180",
  "35–45 days",
  "organic-on-request",
  "branded gift box",
];

describe("Leisurewear & Nightwear buyer-safe public copy", () => {
  it("covers all historical Leisurewear and Nightwear products without removing galleries", () => {
    expect(leisurewearProducts).toHaveLength(7);
    expect(nightwearProducts).toHaveLength(6);
    expect(lifestyleProducts).toHaveLength(13);
    expect(lifestyleProducts.map((product) => slugify(product.name)).sort()).toEqual(
      [...expectedLifestyleSlugs].sort(),
    );
    expect(Object.keys(LEISURE_NIGHTWEAR_SEO_OVERRIDES).sort()).toEqual(
      [...expectedLifestyleSlugs].sort(),
    );

    for (const product of lifestyleProducts) {
      expect(product.gallery?.length ?? 0).toBeGreaterThanOrEqual(6);
      expect(PRODUCT_SEO_OVERRIDES[slugify(product.name)]).toBeDefined();
    }
  });

  it("contains no unsupported fixed fabric, finish, timing, sizing, quantity or certification claims", () => {
    for (const slug of expectedLifestyleSlugs) {
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
    for (const slug of expectedLifestyleSlugs) {
      const override = PRODUCT_SEO_OVERRIDES[slug];
      const publicCopy = `${override.description} ${override.specs.join(" ")}`.toLowerCase();
      expect(publicCopy).toMatch(/buyer|approved sample|order specification/);
      expect(publicCopy).toContain("private-label");
    }
  });

  it("keeps construction language specific to each product family", () => {
    expect(PRODUCT_SEO_OVERRIDES["casual-button-up-shirt"].specs.join(" ")).toContain(
      "front placket",
    );
    expect(PRODUCT_SEO_OVERRIDES["premium-chino-shorts"].specs.join(" ")).toContain("fly");
    expect(PRODUCT_SEO_OVERRIDES["plush-bathrobe-sleep-robe"].specs.join(" ")).toContain(
      "belt",
    );
    expect(PRODUCT_SEO_OVERRIDES["silk-nightgown-slip"].specs.join(" ")).toContain("strap");
  });

  it("keeps historical overrides idempotent while public runtime uses the approved Supabase release", () => {
    const batch10Source = readFileSync(resolve(root, "src/lib/supplementalCatalogBatch10.ts"), "utf8");
    const publicCatalogSource = readFileSync(resolve(root, "src/hooks/usePublicCatalog.ts"), "utf8");
    const existing = PRODUCT_SEO_OVERRIDES["casual-button-up-shirt"];

    registerLeisureNightwearSeoOverrides();
    expect(PRODUCT_SEO_OVERRIDES["casual-button-up-shirt"]).toBe(existing);
    expect(batch10Source).toContain("registerLeisureNightwearSeoOverrides();");
    expect(publicCatalogSource).toContain("No local, supplemental, demo or legacy catalogue is allowed to render publicly");
    expect(publicCatalogSource).toContain('db.rpc("catalog_get_public_release")');
    expect(publicCatalogSource).toContain('db.rpc("catalog_get_public_taxonomy")');
    expect(publicCatalogSource).toContain('case "leisure-nightwear"');
    expect(publicCatalogSource).toContain("description: safe.description");
    expect(publicCatalogSource).toContain("specs: safe.specs");
  });
});
