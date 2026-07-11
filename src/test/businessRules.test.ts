import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_RULES,
  businessRulesReadiness,
  parseList,
} from "@/lib/businessRules";

describe("AI business rules", () => {
  it("keeps high-risk actions owner controlled by default", () => {
    expect(DEFAULT_BUSINESS_RULES.authority.finalQuotation).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.discount).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.paymentTerms).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.productionCommitment).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.commercial.publicPricingAllowed).toBe(false);
  });

  it("reports incomplete commercial facts instead of treating defaults as automation-ready", () => {
    const result = businessRulesReadiness(DEFAULT_BUSINESS_RULES);
    expect(result.score).toBeLessThan(100);
    expect(result.missing).toContain("Incoterms");
    expect(result.missing).toContain("Payment terms");
    expect(result.missing).toContain("Verified materials");
  });

  it("normalizes comma and line separated rule lists", () => {
    expect(parseList("FOB, CIF\nDDP\nFOB")).toEqual(["FOB", "CIF", "DDP"]);
  });
});
