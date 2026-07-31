import { describe, expect, it } from "vitest";
import { isDeterministicProductPrimaryPath } from "../../scripts/lib/product-primary-image-path.mjs";

const productionHeroUrl = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog/products/p001-short-lederhosen/ia-media-e001-20260730/01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp";
const phaseHero = (code, slug, file = "01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp") =>
  `/storage/v1/object/public/site-media/catalog/products/${code.toLowerCase()}-${slug}/ia-media-e001-20260730/${file}`;

describe("IA-MEDIA-E001 deterministic primary-image paths", () => {
  it("accepts the exact production P001 URL after URL parsing and reference normalization", () => {
    const pathname = new URL(productionHeroUrl).pathname;
    expect(isDeterministicProductPrimaryPath("P001", pathname)).toBe(true);
    expect(isDeterministicProductPrimaryPath(" IRHA-P001 ", pathname)).toBe(true);
  });

  it("accepts only the exact P001-P007 immutable hero contract", () => {
    expect(isDeterministicProductPrimaryPath("P001", phaseHero("P001", "short-lederhosen"))).toBe(true);
    expect(isDeterministicProductPrimaryPath("P007", phaseHero("P007", "deer-suede-lederhosen"))).toBe(true);
    expect(isDeterministicProductPrimaryPath("P008", phaseHero("P008", "other-product"))).toBe(false);
    expect(isDeterministicProductPrimaryPath(
      "P001",
      phaseHero("P001", "short-lederhosen", "02-three_quarter-1stFYqjEuRDb0ZcJLxxqZeyWQ4Rhk0GvC.webp"),
    )).toBe(false);
    expect(isDeterministicProductPrimaryPath(
      "P001",
      "/catalog/products/p001-short-lederhosen/another-release/01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp",
    )).toBe(false);
  });

  it("preserves the existing deterministic front-file contract for all other products", () => {
    expect(isDeterministicProductPrimaryPath(
      "P008",
      "/catalog/products/p008-example/p008-example-front.webp",
    )).toBe(true);
    expect(isDeterministicProductPrimaryPath(
      "P008",
      "/catalog/products/p008-example/p008-example-side.webp",
    )).toBe(false);
  });
});
