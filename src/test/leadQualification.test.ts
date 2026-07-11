import { describe, expect, it } from "vitest";
import { qualifyBuyer, type LeadQualificationInput } from "@/lib/leadQualification";

function base(overrides: Partial<LeadQualificationInput> = {}): LeadQualificationInput {
  return {
    key: "inquiry:12345678",
    kind: "inquiry",
    name: "Buyer Name",
    company: "Alpine Retail GmbH",
    country: "Germany",
    email: "buyer@example.com",
    phone: "+49123456789",
    website: "https://example.com",
    productInterest: "Embroidered Lederhosen",
    quantity: "300 pieces",
    message: "We need a private-label Lederhosen program with custom embroidery, labels and export packaging.",
    buyerType: "Wholesaler",
    status: "new",
    priority: "normal",
    followUpAt: null,
    quotationUrl: null,
    sampleStatus: "not_requested",
    createdAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("evidence-based buyer qualification", () => {
  it("scores a detailed buyer as strong without calling it order probability", () => {
    const result = qualifyBuyer(base());
    expect(result.band).toBe("strong");
    expect(result.score).toBeGreaterThanOrEqual(75);
    expect(result.signals).toContain("Company identified");
    expect(result.signals).toContain("Quantity stated");
  });

  it("prioritizes a quotation brief when a quote is requested without a quotation link", () => {
    const result = qualifyBuyer(base({ status: "quote_requested", quotationUrl: null }));
    expect(result.nextAction).toBe("Prepare quotation brief");
    expect(result.actionRank).toBeGreaterThanOrEqual(95);
  });

  it("prioritizes an overdue follow-up above other actions", () => {
    const result = qualifyBuyer(base({ status: "quote_requested", followUpAt: "2020-01-01T00:00:00.000Z" }));
    expect(result.nextAction).toBe("Complete overdue follow-up");
    expect(result.actionRank).toBeGreaterThanOrEqual(100);
  });

  it("asks for a verified contact when email and phone are missing", () => {
    const result = qualifyBuyer(base({ email: null, phone: null, website: null }));
    expect(result.missing).toContain("verified contact");
    expect(result.nextAction).toBe("Verify buyer contact");
  });

  it("asks an inquiry for estimated quantity when all earlier evidence exists", () => {
    const result = qualifyBuyer(base({ quantity: null }));
    expect(result.missing).toContain("estimated quantity");
    expect(result.nextAction).toBe("Ask estimated quantity");
  });

  it("keeps closed lost records out of the active action queue", () => {
    const result = qualifyBuyer(base({ status: "lost", priority: "urgent" }));
    expect(result.nextAction).toBe("No active sales action");
    expect(result.actionReason).toContain("lost");
  });

  it("uses priority only for action order, not evidence score", () => {
    const normal = qualifyBuyer(base({ priority: "normal" }));
    const urgent = qualifyBuyer(base({ priority: "urgent" }));
    expect(urgent.score).toBe(normal.score);
    expect(urgent.actionRank).toBeGreaterThan(normal.actionRank);
  });
});
