import { describe, expect, it } from "vitest";
import type { SalesCard } from "@/lib/salesPipeline";
import {
  buildOutreachDraft,
  normalizeWhatsAppNumber,
  outreachDraftsCsv,
  spreadsheetSafe,
} from "@/lib/outreachAutomation";

function card(overrides: Partial<SalesCard> = {}): SalesCard {
  return {
    key: "prospect:12345678",
    source: "prospect",
    sourceId: "12345678-0000-0000-0000-000000000000",
    reference: "PRO-12345678",
    stage: "qualified",
    name: "Anna Müller",
    company: "Alpine Retail GmbH",
    country: "Germany",
    email: "buyer@example.com",
    phone: "+49 151 23456789",
    website: "https://example.com",
    productInterest: "Traditional Dirndl Dresses",
    quantity: "",
    message: "",
    priority: "high",
    followUpAt: null,
    assignee: "",
    quotationUrl: "",
    sampleStatus: "not_requested",
    createdAt: "2026-07-13T00:00:00.000Z",
    updatedAt: "2026-07-13T00:00:00.000Z",
    ...overrides,
  };
}

describe("outreach automation", () => {
  it("creates personalized email and WhatsApp drafts without fixed commitments", () => {
    const draft = buildOutreachDraft(card());

    expect(draft.emailReady).toBe(true);
    expect(draft.whatsappReady).toBe(true);
    expect(draft.emailSubject).toContain("Traditional Dirndl Dresses");
    expect(draft.emailBody).toContain("Hello Anna,");
    expect(draft.emailBody).toContain("Alpine Retail GmbH");
    expect(draft.emailBody).toContain("Buyer verification can include direct contact");
    expect(draft.emailBody).toContain("appointment-based live factory call");
    expect(draft.emailBody).not.toMatch(/newly built|website is new/i);
    expect(draft.emailBody).not.toMatch(/MOQ 50|45-day|fixed price|guaranteed delivery/i);
  });

  it("blocks channel approval when verified contact information is missing", () => {
    const draft = buildOutreachDraft(card({ email: "not-an-email", phone: "123", stage: "lost" }));

    expect(draft.emailReady).toBe(false);
    expect(draft.whatsappReady).toBe(false);
    expect(draft.warnings.join(" ")).toMatch(/valid email/i);
    expect(draft.warnings.join(" ")).toMatch(/international WhatsApp/i);
    expect(draft.warnings.join(" ")).toMatch(/marked lost/i);
  });

  it("normalizes international WhatsApp numbers without guessing country codes", () => {
    expect(normalizeWhatsAppNumber("+49 (151) 234-56789")).toBe("4915123456789");
    expect(normalizeWhatsAppNumber("0044 7700 900123")).toBe("447700900123");
    expect(normalizeWhatsAppNumber("123")).toBe("");
  });

  it("protects CSV cells from spreadsheet formula injection", () => {
    expect(spreadsheetSafe("=HYPERLINK(\"bad\")")).toBe("'=HYPERLINK(\"bad\")");
    expect(spreadsheetSafe("+441234567890")).toBe("'+441234567890");
    expect(spreadsheetSafe("Normal Company")).toBe("Normal Company");

    const csv = outreachDraftsCsv([card({ company: "=1+1" })]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("'=1+1");
  });
});
