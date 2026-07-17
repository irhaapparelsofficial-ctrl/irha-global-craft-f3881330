import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const quickQuote = read("src/components/QuoteForm.tsx");
const fullInquiry = read("src/pages/InquiryBase.tsx");
const sticky = read("src/components/sections/StickyMobileCTA.tsx");

describe("procurement-grade RFQ experience", () => {
  it("saves the quick RFQ without forcing WhatsApp", () => {
    expect(quickQuote).toContain("Save quote request");
    expect(quickQuote).toContain("WhatsApp is optional");
    expect(quickQuote).toContain("It does not automatically open WhatsApp");
    expect(quickQuote).not.toContain("window.open(");
  });

  it("captures contact preference and delivery planning context", () => {
    expect(quickQuote).toContain("preferredContact");
    expect(quickQuote).toContain("targetDeliveryDate");
    expect(quickQuote).toContain("preferred_contact");
    expect(quickQuote).toContain("target_delivery_date");
    expect(quickQuote).toContain("WhatsApp / phone (optional)");
  });

  it("routes buyers with files into the secure full RFQ", () => {
    expect(quickQuote).toContain("Use full RFQ uploader");
    expect(quickQuote).toContain("Add tech pack / full RFQ");
    expect(fullInquiry).toContain("SecureFileUpload");
    expect(fullInquiry).toContain("Attach a tech pack, logo, brief or reference photo if useful.");
  });

  it("collapses the mobile contact dock while scrolling down", () => {
    expect(sticky).toContain('window.addEventListener("scroll"');
    expect(sticky).toContain("window.requestAnimationFrame");
    expect(sticky).toContain('data-collapsed={collapsed ? "true" : "false"}');
    expect(sticky).toContain('collapsed ? "w-[112px]" : "left-3"');
    expect(sticky).toContain("min-h-[48px]");
  });
});
