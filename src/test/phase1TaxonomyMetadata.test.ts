import { describe, expect, it } from "vitest";
import { localizedTaxonomySeo } from "@/lib/taxonomyI18n";

const TEAM_UNIFORMS_DESCRIPTION = "Custom team uniform manufacturing for clubs and organisations, with private-label branding, materials and construction confirmed against the approved specification.";

describe("Phase 1 taxonomy metadata contract", () => {
  it("keeps Team Uniforms metadata complete, truthful and shared by static/runtime SEO", () => {
    const metadata = localizedTaxonomySeo({
      locale: "en",
      topName: "Custom Sportswear & Teamwear",
      audienceName: "Teams & Clubs",
      collectionName: "Team Uniforms",
    });

    expect(metadata.description).toBe(TEAM_UNIFORMS_DESCRIPTION);
    expect(metadata.description).toMatch(/[.!?]$/);
    expect(metadata.description).toContain("manufacturing");
    expect(metadata.description).toContain("private-label");
    expect(metadata.description).not.toMatch(/global buyers|worldwide|exported|customers? in|certified|accredited|oeko|gots|bsci|sedex|smeta|iso|wrap|reach|moq|lead time|capacity/i);
    expect(metadata.description).not.toMatch(/\.{3}$|…$/);
  });
});
