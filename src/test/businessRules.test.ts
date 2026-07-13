import { describe, expect, it } from "vitest";
import {
  DEFAULT_BUSINESS_RULES,
  businessRulesApproved,
  businessRulesReadiness,
  containsHighRiskBusinessTerms,
  parseList,
} from "@/lib/businessRules";

describe("AI business rules", () => {
  it("keeps high-risk and external-write actions owner controlled by default", () => {
    expect(DEFAULT_BUSINESS_RULES.authority.socialPublish).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.listingUpdate).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.finalQuotation).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.discount).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.paymentTerms).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.authority.productionCommitment).toBe("owner");
    expect(DEFAULT_BUSINESS_RULES.commercial.publicPricingAllowed).toBe(false);
  });

  it("ships complete owner-approved rules instead of a permanent plan-only default", () => {
    const result = businessRulesReadiness(DEFAULT_BUSINESS_RULES);
    expect(result.score).toBe(100);
    expect(result.missing).toEqual([]);
    expect(DEFAULT_BUSINESS_RULES.commercial.incoterms.length).toBeGreaterThan(0);
    expect(DEFAULT_BUSINESS_RULES.commercial.paymentTerms.length).toBeGreaterThan(0);
    expect(DEFAULT_BUSINESS_RULES.manufacturing.verifiedMaterials.length).toBeGreaterThan(0);
    expect(DEFAULT_BUSINESS_RULES.manufacturing.packagingOptions.length).toBeGreaterThan(0);
    expect(businessRulesApproved(DEFAULT_BUSINESS_RULES)).toBe(true);
  });

  it("still requires explicit approved status even when every rule is complete", () => {
    const draft = {
      ...DEFAULT_BUSINESS_RULES,
      status: "draft" as const,
    };
    expect(businessRulesReadiness(draft).score).toBe(100);
    expect(businessRulesApproved(draft)).toBe(false);
  });

  it("detects commercial commitment language for escalation", () => {
    expect(containsHighRiskBusinessTerms("Prepare final DDP quotation and payment terms")).toBe(true);
    expect(containsHighRiskBusinessTerms("Draft a social caption for Lederhosen")).toBe(false);
  });

  it("normalizes comma and line separated rule lists", () => {
    expect(parseList("FOB, CIF\nDDP\nFOB")).toEqual(["FOB", "CIF", "DDP"]);
  });
});
