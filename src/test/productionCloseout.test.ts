import { describe, expect, it } from "vitest";
import {
  closeoutReadiness,
  closeoutRisk,
  contributionMargin,
  contributionMarginPercent,
  costEntryBaseAmount,
  repeatOrderDueDate,
  repeatOrderPriority,
  totalVerifiedCost,
  totalUnverifiedCost,
  type CostEntry,
} from "@/lib/productionCloseout";

const verifiedCost: CostEntry = {
  category: "material",
  description: "Leather and trims",
  quantity: 10,
  unitCost: 25,
  currency: "USD",
  exchangeRateToBase: 280,
  isVerified: true,
};

const unverifiedCost: CostEntry = {
  category: "freight",
  description: "Courier estimate",
  quantity: 1,
  unitCost: 100,
  currency: "USD",
  exchangeRateToBase: 280,
  isVerified: false,
};

describe("production closeout", () => {
  it("normalizes cost and margin calculations", () => {
    expect(costEntryBaseAmount(verifiedCost)).toBe(70000);
    expect(totalVerifiedCost([verifiedCost, unverifiedCost])).toBe(70000);
    expect(totalUnverifiedCost([verifiedCost, unverifiedCost])).toBe(28000);
    expect(contributionMargin(120000, 70000)).toBe(50000);
    expect(contributionMarginPercent(120000, 70000)).toBe(41.67);
  });

  it("allows closeout only after delivery, acceptance, invoice, payment review and verified costs", () => {
    const input = {
      shipmentStatus: "delivered",
      verifiedDeliveryEvidenceCount: 1,
      acceptanceStatus: "accepted" as const,
      acceptanceReference: "Buyer email thread 123",
      acceptedAt: "2026-07-20T10:00:00Z",
      invoiceNumber: "INV-1001",
      invoiceAmount: 1200,
      invoiceCurrency: "USD",
      paymentStatus: "paid" as const,
      costs: [verifiedCost],
      openIssueCount: 0,
      openCriticalIssueCount: 0,
      lessonsLearned: "Packing labels should be generated earlier.",
    };
    const result = closeoutReadiness(input);
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
    expect(closeoutRisk(input)).toBe("clear");
  });

  it("blocks unsupported closure evidence", () => {
    const input = {
      shipmentStatus: "in_transit",
      verifiedDeliveryEvidenceCount: 0,
      acceptanceStatus: "disputed" as const,
      invoiceNumber: "",
      invoiceAmount: 0,
      invoiceCurrency: "",
      paymentStatus: "disputed" as const,
      costs: [] as CostEntry[],
      openIssueCount: 1,
      openCriticalIssueCount: 1,
    };
    const result = closeoutReadiness(input);
    expect(result.ready).toBe(false);
    expect(result.missing.join(" ")).toMatch(/delivered/i);
    expect(result.missing.join(" ")).toMatch(/critical/i);
    expect(closeoutRisk(input)).toBe("blocked");
  });

  it("warns about unverified costs without treating them as verified profit evidence", () => {
    const result = closeoutReadiness({
      shipmentStatus: "delivered",
      verifiedDeliveryEvidenceCount: 1,
      acceptanceStatus: "waived",
      invoiceNumber: "INV-1002",
      invoiceAmount: 1000,
      invoiceCurrency: "EUR",
      paymentStatus: "invoiced",
      costs: [verifiedCost, unverifiedCost],
      openIssueCount: 0,
      openCriticalIssueCount: 0,
    });
    expect(result.ready).toBe(true);
    expect(result.warnings.join(" ")).toMatch(/unverified/i);
    expect(result.warnings.join(" ")).toMatch(/waived/i);
  });

  it("prepares repeat-order dates and priorities without sending outreach", () => {
    expect(repeatOrderDueDate("2026-07-20T00:00:00Z", 30, 120)).toBe("2026-10-18");
    expect(repeatOrderPriority({ acceptanceStatus: "accepted", paymentStatus: "paid", openIssueCount: 0, marginPercent: 25 })).toBe("high");
    expect(repeatOrderPriority({ acceptanceStatus: "accepted", paymentStatus: "overdue", openIssueCount: 0, marginPercent: 25 })).toBe("blocked");
  });
});
