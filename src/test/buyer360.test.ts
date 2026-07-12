import { describe, expect, it } from "vitest";
import {
  compareBuyerIdentity,
  emailDomain,
  findDuplicateSuggestions,
  linkPairKey,
  normalizeCompany,
  normalizePhone,
  websiteDomain,
} from "@/lib/buyer360";
import type { SalesCard } from "@/lib/salesPipeline";

function card(key: string, overrides: Partial<SalesCard> = {}): SalesCard {
  const [source, id] = key.split(":");
  return {
    key,
    source: source as SalesCard["source"],
    sourceId: id,
    reference: `REF-${id.slice(0, 4)}`,
    stage: "new",
    name: "Buyer",
    company: "Alpine Retail GmbH",
    country: "Germany",
    email: "buyer@alpine.example",
    phone: "+49 123 456 789",
    website: "https://www.alpine.example/about",
    productInterest: "Lederhosen",
    quantity: "300",
    message: "",
    priority: "normal",
    followUpAt: null,
    assignee: "",
    quotationUrl: "",
    sampleStatus: "not_requested",
    createdAt: "2026-07-01T00:00:00.000Z",
    updatedAt: "2026-07-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("Buyer 360 identity review", () => {
  it("normalizes common company suffixes without fuzzy guessing", () => {
    expect(normalizeCompany("Alpine Retail GmbH")).toBe("alpine retail");
    expect(normalizeCompany("ALPINE Retail Limited")).toBe("alpine retail");
  });

  it("normalizes phone and domains", () => {
    expect(normalizePhone("+49 (123) 456-789")).toBe("49123456789");
    expect(websiteDomain("alpine.example/path")).toBe("alpine.example");
    expect(emailDomain("Buyer@Alpine.Example")).toBe("alpine.example");
  });

  it("returns strong evidence when exact email and phone match", () => {
    const result = compareBuyerIdentity(
      card("inquiry:11111111"),
      card("catalogue:22222222"),
    );
    expect(result?.score).toBe(100);
    expect(result?.signals).toContain("email");
    expect(result?.signals).toContain("phone");
  });

  it("does not flag weak company-only evidence across countries", () => {
    const result = compareBuyerIdentity(
      card("inquiry:11111111", { email: "one@gmail.com", phone: "", website: "", country: "Germany" }),
      card("prospect:22222222", { email: "two@gmail.com", phone: "", website: "", country: "Austria" }),
    );
    expect(result).toBeNull();
  });

  it("finds each duplicate pair once", () => {
    const suggestions = findDuplicateSuggestions([
      card("inquiry:11111111"),
      card("catalogue:22222222"),
      card("prospect:33333333", { email: "other@example.net", phone: "+1 555 000 0000", website: "https://other.example.net", company: "Other Inc", country: "USA" }),
    ]);
    expect(suggestions).toHaveLength(1);
  });

  it("creates the same record-link key regardless of order", () => {
    expect(linkPairKey("inquiry", "a", "prospect", "b")).toBe(linkPairKey("prospect", "b", "inquiry", "a"));
  });
});
