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

  it("reports incomplete commercial facts instead of treating defaults as automation-ready", () => {
    const result = businessRulesReadiness(DEFAULT_BUSINESS_RULES);
    expect(result.score).toBeLessThan(100);
    expect(result.missing).toContain("Incoterms");
    expect(result.missing).toContain("Payment terms");
    expect(result.missing).toContain("Verified materials");
    expect(businessRulesApproved(DEFAULT_BUSINESS_RULES)).toBe(false);
  });

  it("requires both complete readiness and owner approval", () => {
    const complete = {
      ...DEFAULT_BUSINESS_RULES,
      status: "approved" as const,
      commercial: {
        ...DEFAULT_BUSINESS_RULES.commercial,
        incoterms: ["FOB"],
        paymentTerms: ["Owner-approved terms"],
      },
      manufacturing: {
        ...DEFAULT_BUSINESS_RULES.manufacturing,
        verifiedMaterials: ["Buyer-approved material specification"],
        packagingOptions: ["Export carton after buyer approval"],
      },
    };
    expect(businessRulesReadiness(complete).score).toBe(100);
    expect(businessRulesApproved(complete)).toBe(true);
  });

  it("detects commercial commitment language for escalation", () => {
    expect(containsHighRiskBusinessTerms("Prepare final DDP quotation and payment terms")).toBe(true);
    expect(containsHighRiskBusinessTerms("Draft a social caption for Lederhosen")).toBe(false);
  });

  it("normalizes comma and line separated rule lists", () => {
    expect(parseList("FOB, CIF\nDDP\nFOB")).toEqual(["FOB", "CIF", "DDP"]);
  });
});
