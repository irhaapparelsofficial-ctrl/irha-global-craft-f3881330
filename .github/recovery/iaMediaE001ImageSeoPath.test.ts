import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const runContract = (referenceCode: string, pathname: string) => {
  const helperUrl = new URL("../../scripts/lib/product-primary-image-path.mjs", import.meta.url).href;
  const source = `
    import { isDeterministicProductPrimaryPath } from ${JSON.stringify(helperUrl)};
    const result = isDeterministicProductPrimaryPath(
      ${JSON.stringify(referenceCode)},
      ${JSON.stringify(pathname)},
    );
    process.stdout.write(JSON.stringify(result));
  `;
  return JSON.parse(execFileSync(process.execPath, ["--input-type=module", "--eval", source], {
    encoding: "utf8",
  })) as boolean;
};

const productionHeroUrl = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media/catalog/products/p001-short-lederhosen/ia-media-e001-20260730/01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp";
const phaseHero = (code: string, slug: string, file = "01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp") =>
  `/storage/v1/object/public/site-media/catalog/products/${code.toLowerCase()}-${slug}/ia-media-e001-20260730/${file}`;

describe("IA-MEDIA-E001 deterministic primary-image paths", () => {
  it("accepts the exact production P001 URL after URL parsing and reference normalization", () => {
    const pathname = new URL(productionHeroUrl).pathname;
    expect(runContract("P001", pathname)).toBe(true);
    expect(runContract(" IRHA-P001 ", pathname)).toBe(true);
  });

  it("accepts only the exact P001-P007 immutable hero contract", () => {
    expect(runContract("P001", phaseHero("P001", "short-lederhosen"))).toBe(true);
    expect(runContract("P007", phaseHero("P007", "deer-suede-lederhosen"))).toBe(true);
    expect(runContract("P008", phaseHero("P008", "other-product"))).toBe(false);
    expect(runContract(
      "P001",
      phaseHero("P001", "short-lederhosen", "02-three_quarter-1stFYqjEuRDb0ZcJLxxqZeyWQ4Rhk0GvC.webp"),
    )).toBe(false);
    expect(runContract(
      "P001",
      "/catalog/products/p001-short-lederhosen/another-release/01-hero-1VlsVH6GCmMwD1RAQppOnWJmKnwop0mmY.webp",
    )).toBe(false);
  });

  it("preserves the existing deterministic front-file contract for all other products", () => {
    expect(runContract(
      "P008",
      "/catalog/products/p008-example/p008-example-front.webp",
    )).toBe(true);
    expect(runContract(
      "P008",
      "/catalog/products/p008-example/p008-example-side.webp",
    )).toBe(false);
  });
});
