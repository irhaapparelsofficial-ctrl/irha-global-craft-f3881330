import { describe, expect, it } from "vitest";
import {
  EMPTY_QUOTATION_BRIEF,
  quotationBriefText,
  quotationReadiness,
  type QuotationBrief,
} from "@/lib/quotationReadiness";

function complete(overrides: Partial<QuotationBrief> = {}): QuotationBrief {
  return {
    ...EMPTY_QUOTATION_BRIEF,
    buyerReference: "IRQ-12345678",
    buyerName: "Anna Buyer",
    company: "Alpine Retail GmbH",
    product: "Embroidered Lederhosen",
    material: "Buyer-approved goat suede specification",
    quantity: "300 pieces",
    sizeRange: "EU 46–58; split pending confirmation",
    colours: "Brown and black",
    branding: "Embroidery and woven labels",
    labelsTags: "Woven neck/brand label and hang tag",
    packaging: "Individual polybag and export carton",
    destination: "Germany",
    shippingScope: "Door-delivery review requested",
    incoterm: "DDP",
    currency: "EUR",
    targetTiming: "Buyer target to be reviewed by factory",
    sampleRequirement: "One pre-production sample requested",
    referenceFiles: "Tech pack received",
    notes: "Owner to approve final commercial terms.",
    ...overrides,
  };
}

describe("quotation readiness", () => {
  it("blocks owner pricing review when technical requirements are missing", () => {
    const result = quotationReadiness(EMPTY_QUOTATION_BRIEF);
    expect(result.readyForOwnerPricingReview).toBe(false);
    expect(result.requiredMissing).toContain("product/style");
    expect(result.requiredMissing).toContain("estimated quantity");
    expect(result.requiredMissing).toContain("Incoterm");
  });

  it("marks complete scope ready only for owner pricing review", () => {
    const result = quotationReadiness(complete());
    expect(result.readyForOwnerPricingReview).toBe(true);
    expect(result.requiredMissing).toEqual([]);
    expect(result.score).toBe(100);
  });

  it("keeps recommended gaps visible without hiding required readiness", () => {
    const brief = complete({ colours: "", packaging: "", sampleRequirement: "" });
    const result = quotationReadiness(brief);
    expect(result.readyForOwnerPricingReview).toBe(true);
    expect(result.recommendedMissing).toContain("colour breakdown");
    expect(result.recommendedMissing).toContain("packaging");
    expect(result.score).toBeLessThan(100);
  });

  it("exports a brief without unit price or automatic commitment", () => {
    const text = quotationBriefText(complete());
    expect(text).toContain("OWNER REVIEW REQUIRED BEFORE");
    expect(text).toContain("Unit price or total value");
    expect(text).toContain("Production/delivery commitment");
    expect(text).not.toMatch(/Grand Total|Unit Price:\s*\d|Total Value:\s*\d/i);
  });
});
