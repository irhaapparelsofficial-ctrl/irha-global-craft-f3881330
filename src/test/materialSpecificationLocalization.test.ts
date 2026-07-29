import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MATERIALS } from "@/data/buyerCapabilities";
import { MATERIAL_TECHNICAL_SOURCE_COUNT, localizedMaterialSpecification } from "@/data/materialSpecificationCopy";

const localized = ["de", "fr", "nl"] as const;
const generatorSource = readFileSync(resolve("scripts/generate-buyer-confidence-route-shells.ts"), "utf8");

describe("localized material technical specifications", () => {
  it("covers every unique composition and weight source string", () => {
    const sourceValues = new Set(MATERIALS.flatMap((material) => [material.composition, material.weight]));
    expect(MATERIAL_TECHNICAL_SOURCE_COUNT).toBe(sourceValues.size);
  });

  it("provides complete German, French and Dutch composition and weight text", () => {
    for (const material of MATERIALS) {
      const english = localizedMaterialSpecification(material, "en");
      for (const locale of localized) {
        const value = localizedMaterialSpecification(material, locale);
        expect(value.composition.trim()).not.toBe("");
        expect(value.weight.trim()).not.toBe("");
        expect(value.composition).not.toBe(english.composition);
        expect(value.weight).not.toBe(english.weight);
        expect(`${value.composition} ${value.weight}`).not.toMatch(/\bTypically\b|\bby order\b|\bconfirmed from\b/i);
      }
    }
  });

  it("uses localized technical values in all eight static route shells", () => {
    expect(generatorSource).toContain("localizedMaterialSpecification(material, locale)");
    expect(generatorSource).toContain("Generated 8 source-backed buyer-confidence static route shells");
  });
});
