import { describe, expect, it } from "vitest";
import { DEFAULT_BUSINESS_RULES } from "@/lib/businessRules";
import { createBuyerReplyDraft, suggestedReplyType } from "@/lib/buyerReplyDrafts";
import { qualifyBuyer, type LeadQualificationInput } from "@/lib/leadQualification";

const buyer: LeadQualificationInput = {
  key: "inquiry:12345678",
  kind: "inquiry",
  name: "Anna",
  company: "Alpine Retail GmbH",
  country: "Germany",
  email: "anna@example.com",
  phone: null,
  website: null,
  productInterest: "Embroidered Lederhosen",
  quantity: null,
  message: "We are reviewing a private-label Lederhosen range.",
  buyerType: "Wholesaler",
  status: "new",
  priority: "normal",
  followUpAt: null,
  quotationUrl: null,
  sampleStatus: "not_requested",
  createdAt: "2026-07-01T00:00:00.000Z",
};

const replyBuyer = {
  name: buyer.name,
  company: buyer.company,
  email: buyer.email,
  country: buyer.country,
  productInterest: buyer.productInterest,
  quantity: buyer.quantity,
  message: buyer.message,
  status: buyer.status,
};

describe("buyer reply drafts", () => {
  it("includes missing qualification questions without inventing terms", () => {
    const qualification = qualifyBuyer(buyer);
    const draft = createBuyerReplyDraft({
      type: "qualification",
      language: "en",
      buyer: replyBuyer,
      qualification,
      rules: DEFAULT_BUSINESS_RULES,
    });

    expect(draft.body).toContain("Estimated quantity per style/colour");
    expect(draft.body).toContain("confirmed only after the exact requirement is reviewed");
    expect(draft.body).not.toMatch(/\b(€|\$)\s?\d|MOQ\s+\d|delivery in \d+ days/i);
  });

  it("creates a German catalogue response with verified positioning", () => {
    const qualification = qualifyBuyer({ ...buyer, kind: "catalogue" });
    const draft = createBuyerReplyDraft({
      type: "catalogue",
      language: "de",
      buyer: replyBuyer,
      qualification,
      rules: DEFAULT_BUSINESS_RULES,
    });

    expect(draft.subject).toContain("Kataloganfrage");
    expect(draft.body).toContain("B2B-Bekleidungshersteller aus Sialkot, Pakistan");
    expect(draft.body).toContain("terminierten Live-Videoanruf aus dem Betrieb");
    expect(draft.body).not.toContain("Website wurde neu aufgebaut");
  });

  it("keeps factory call commercial details separate", () => {
    const qualification = qualifyBuyer(buyer);
    const draft = createBuyerReplyDraft({
      type: "factory_call",
      language: "en",
      buyer: replyBuyer,
      qualification,
      rules: DEFAULT_BUSINESS_RULES,
    });

    expect(draft.body).toContain("scheduled live factory video call");
    expect(draft.body).toContain("Commercial details are confirmed separately in writing");
  });

  it("suggests catalogue, qualification and follow-up types from evidence", () => {
    const incomplete = qualifyBuyer(buyer);
    expect(suggestedReplyType("new", "catalogue", incomplete)).toBe("catalogue");
    expect(suggestedReplyType("new", "inquiry", incomplete)).toBe("qualification");

    const complete = qualifyBuyer({ ...buyer, quantity: "300 pieces", website: "https://example.com", phone: "+49123" });
    expect(suggestedReplyType("contacted", "inquiry", complete)).toBe("follow_up");
  });

  it("marks a follow-up assumption instead of pretending previous contact exists", () => {
    const qualification = qualifyBuyer({ ...buyer, quantity: "300 pieces" });
    const draft = createBuyerReplyDraft({
      type: "follow_up",
      language: "en",
      buyer: replyBuyer,
      qualification,
      rules: DEFAULT_BUSINESS_RULES,
    });
    expect(draft.assumptions).toContain("Use only when previous contact is recorded in the CRM.");
  });
});
