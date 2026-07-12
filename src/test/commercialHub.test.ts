import { describe, expect, it } from "vitest";
import {
  canTransitionQuotation,
  meetingEnd,
  meetingIcs,
  quotationReadiness,
  quotationTotals,
  quoteNumber,
  sampleReference,
  type QuotationItemDraft,
} from "@/lib/commercialHub";

const items: QuotationItemDraft[] = [
  {
    id: "one",
    description: "Custom Lederhosen",
    quantity: 100,
    unit: "piece",
    unitPrice: 20,
  },
  {
    id: "two",
    description: "Private-label packaging",
    quantity: 100,
    unit: "piece",
    unitPrice: 1.5,
  },
];

describe("Commercial Hub safety rules", () => {
  it("calculates quotation totals without allowing negative results", () => {
    expect(quotationTotals(items, 250, 100)).toEqual({
      subtotal: 2150,
      shipping: 250,
      discount: 100,
      total: 2300,
    });
    expect(quotationTotals(items, 0, 99999).total).toBe(0);
  });

  it("requires commercial terms and complete line items", () => {
    const result = quotationReadiness({
      buyerReference: "IRQ-12345678",
      buyerName: "Buyer",
      company: "Alpine GmbH",
      currency: "EUR",
      validUntil: "2026-08-01",
      incoterm: "FOB",
      paymentTerms: "Owner-approved terms",
      shippingScope: "Shipping excluded",
      items,
    });
    expect(result.ready).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it("blocks issue and acceptance before owner approval", () => {
    expect(canTransitionQuotation("owner_review", "approved", false)).toBe(false);
    expect(canTransitionQuotation("approved", "sent", false)).toBe(false);
    expect(canTransitionQuotation("approved", "sent", true)).toBe(true);
    expect(canTransitionQuotation("sent", "accepted", true)).toBe(true);
  });

  it("blocks invalid quotation workflow jumps", () => {
    expect(canTransitionQuotation("draft", "sent", true)).toBe(false);
    expect(canTransitionQuotation("draft", "accepted", true)).toBe(false);
    expect(canTransitionQuotation("sent", "draft", true)).toBe(false);
  });

  it("builds meeting end time and an interoperable calendar file", () => {
    const end = meetingEnd("2026-07-20T10:00:00.000Z", 45);
    expect(end).toBe("2026-07-20T10:45:00.000Z");
    const calendar = meetingIcs({
      uid: "meeting-1@irhaapparels.com",
      title: "Factory call",
      startAt: "2026-07-20T10:00:00.000Z",
      endAt: end,
      description: "Review sample; confirm requirement",
      location: "https://meet.example.com/irha",
    });
    expect(calendar).toContain("BEGIN:VEVENT");
    expect(calendar).toContain("SUMMARY:Factory call");
    expect(calendar).toContain("Review sample\\; confirm requirement");
  });

  it("creates stable human-readable commercial references", () => {
    const date = new Date("2026-07-13T00:00:00.000Z");
    expect(quoteNumber(12, date)).toBe("IA-Q-2026-00012");
    expect(sampleReference(4, date)).toBe("IA-S-2026-00004");
  });
});
