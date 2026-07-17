import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const quickQuote = read("src/components/QuoteForm.tsx");
const fullInquiry = read("src/pages/InquiryBase.tsx");
const sticky = read("src/components/sections/StickyMobileCTA.tsx");

describe("procurement-grade RFQ experience", () => {
  it("saves the quick RFQ without forcing WhatsApp", () => {
    expect(quickQuote).toContain("Submit quote request");
    expect(quickQuote).toContain("WhatsApp is optional");
    expect(quickQuote).toContain("will never open automatically");
    expect(quickQuote).not.toContain("window.open(");
  });

  it("captures contact preference and delivery planning context", () => {
    expect(quickQuote).toContain("preferredContact");
    expect(quickQuote).toContain("targetDeliveryDate");
    expect(quickQuote).toContain("preferred_contact");
    expect(quickQuote).toContain("target_delivery_date");
    expect(quickQuote).toContain("WhatsApp / phone (optional)");
  });

  it("accepts buyer files directly and preserves the full RFQ fallback", () => {
    expect(quickQuote).toContain("Tech pack / reference files");
    expect(quickQuote).toContain("uploadPublicLeadFile");
    expect(quickQuote).toContain("uploaded_file_count");
    expect(quickQuote).toContain("Add more project detail");
    expect(fullInquiry).toContain("SecureFileUpload");
    expect(fullInquiry).toContain("Attach a tech pack, logo, brief or reference photo if useful.");
  });

  it("collapses the mobile contact dock while scrolling down", () => {
    expect(sticky).toContain('window.addEventListener("scroll"');
    expect(sticky).toContain("window.requestAnimationFrame");
    expect(sticky).toContain('data-compact={compact ? "true" : "false"}');
    expect(sticky).toContain('compact ? "rounded-full" : "rounded-2xl"');
    expect(sticky).toContain("min-h-11");
  });
});
