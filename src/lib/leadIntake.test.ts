import { describe, expect, it } from "vitest";
import { firstEmail, firstUrl, normalizeSheet, parseCsv, validEmail, websiteDomain } from "@/lib/leadIntake";

describe("lead intake parser", () => {
  it("parses quoted CSV cells and embedded commas", () => {
    const rows = parseCsv('Company,Notes,Email\n"Alpine, GmbH","Retail, wholesale",info@example.de\n');
    expect(rows).toEqual([
      ["Company", "Notes", "Email"],
      ["Alpine, GmbH", "Retail, wholesale", "info@example.de"],
    ]);
  });

  it("detects title rows and maps the latest Irha International 527-lead master format", () => {
    const sheet = normalizeSheet({
      name: "Master Leads",
      rows: [
        ["IRHA INTERNATIONAL — NON-LEATHER APPAREL LEAD MASTER"],
        ["527 unique public business leads"],
        ["Lead ID", "Company", "Target Category", "Buyer Type", "Professional Email", "Phone / WhatsApp", "Country", "City / Region", "Street Address", "Website", "LinkedIn", "Google Maps Search", "Email Verification", "WhatsApp Status", "Contact Name", "Designation", "Verification Source", "Source Confidence", "Completeness %", "Lead Priority", "Notes", "Retrieved Date"],
        ["458", "Active Brands Asia Ltd.", "Sportswear / Compression / Running Apparel", "Hong Kong Sports Wholesaler", "wklo@ab-asia.com", "+852 2891 1588", "Hong Kong", "Causeway Bay", "Unit A 15/F, Vulcan House", "https://ab-asia.com", "https://linkedin.com/company/active-brands-asia-ltd", "", "Publicly listed", "Not confirmed", "", "", "https://ab-asia.com | https://linkedin.com/company/active-brands-asia-ltd", "High", "1", "A", "Wholesale distributor serving retailers.", "2026-07-13"],
      ],
    });

    expect(sheet?.headerRow).toBe(3);
    expect(sheet?.rows).toHaveLength(1);
    expect(sheet?.rows[0]).toMatchObject({
      companyName: "Active Brands Asia Ltd.",
      email: "wklo@ab-asia.com",
      phone: "+852 2891 1588",
      country: "Hong Kong",
      city: "Causeway Bay",
      buyerType: "Hong Kong Sports Wholesaler",
      website: "https://ab-asia.com/",
      sourceUrl: "https://ab-asia.com/",
      sourceConfidence: "High",
      emailVerification: "Publicly listed",
      priority: "A",
    });
    expect(sheet?.rows[0].productFit).toEqual(["Sportswear", "Compression", "Running Apparel"]);
    expect(sheet?.rows[0].blockers).toEqual([]);
  });

  it("maps the deduplicated clean Trachten master used for iPhone and print", () => {
    const sheet = normalizeSheet({
      name: "Austria",
      rows: [
        ["Lead ID", "Priority", "Country", "City/Region", "Company", "Buyer Type / Segment", "Contact Name / Role", "Phone / WhatsApp", "Email / Contact Route", "Instagram / Social", "Website", "Product Fit / Best Offer", "Source URL", "Status", "Next Action", "Notes", "Source File", "Source Sheet"],
        ["IRHA-AT-0202", "P2", "Austria", "Kufstein / Zillertal", "Zillertaler Trachtenwelt", "Trachten store / branch / atelier", "", "+43 676 84995535", "shop@trachtenwelt.com", "Search: Zillertaler Trachtenwelt Instagram", "https://shop.trachtenwelt.com", "Online shop / shirts / vests / accessories", "https://shop.trachtenwelt.com/impressum/", "Not Started", "DM + Email + Call", "Impressum lists phone/email.", "Master.xlsx", "Austria"],
      ],
    });

    expect(sheet?.rows[0]).toMatchObject({
      companyName: "Zillertaler Trachtenwelt",
      country: "Austria",
      city: "Kufstein / Zillertal",
      email: "shop@trachtenwelt.com",
      phone: "+43 676 84995535",
      buyerType: "Trachten store / branch / atelier",
      sourceUrl: "https://shop.trachtenwelt.com/impressum/",
      priority: "P2",
    });
    expect(sheet?.rows[0].productFit).toEqual(["Online shop", "shirts", "vests", "accessories"]);
    expect(sheet?.rows[0].blockers).toEqual([]);
  });

  it("accepts a WhatsApp-only lead from a dedicated WhatsApp column", () => {
    const sheet = normalizeSheet({
      name: "WhatsApp leads",
      rows: [
        ["Company", "Country", "WhatsApp", "Website", "Buyer Type", "Product Fit"],
        ["WhatsApp Buyer GmbH", "Germany", "+49 151 2345 6789", "https://wa-buyer.example", "Wholesaler", "Sportswear"],
      ],
    });

    expect(sheet?.rows[0]).toMatchObject({ email: "", whatsapp: "+49 151 2345 6789" });
    expect(sheet?.rows[0].blockers).toEqual([]);
    expect(sheet?.rows[0].fingerprint).toContain("wa:4915123456789");
  });

  it("treats a combined Phone / WhatsApp column as a WhatsApp route", () => {
    const sheet = normalizeSheet({
      name: "Combined contact",
      rows: [
        ["Company", "Country", "Phone / WhatsApp", "Website", "Buyer Type", "Product Fit"],
        ["Combined Buyer GmbH", "Germany", "+49 151 9999 2222", "https://combined-buyer.example", "Distributor", "Teamwear"],
      ],
    });

    expect(sheet?.rows[0].phone).toBe("+49 151 9999 2222");
    expect(sheet?.rows[0].whatsapp).toBe("+49 151 9999 2222");
    expect(sheet?.rows[0].blockers).toEqual([]);
  });

  it("normalizes WhatsApp formatting in the dedupe fingerprint", () => {
    const sheet = normalizeSheet({
      name: "Duplicate routes",
      rows: [
        ["Company", "Country", "WhatsApp", "Website", "Buyer Type", "Product Fit"],
        ["Same Buyer", "Germany", "+49 151 2345 6789", "https://same-buyer.example", "Retailer", "Activewear"],
        ["Same Buyer", "Germany", "+49 (151) 2345-6789", "https://same-buyer.example", "Retailer", "Activewear"],
      ],
    });

    expect(sheet?.rows[0].fingerprint).toBe(sheet?.rows[1].fingerprint);
  });

  it("extracts the first valid email and URL without treating contact-route prose as verified data", () => {
    expect(firstEmail("info@example.de / contact form")).toBe("info@example.de");
    expect(firstEmail("Use contact form; email protected")).toBe("");
    expect(validEmail("buyer@example.com")).toBe(true);
    expect(firstUrl("https://example.com/contact | LinkedIn")).toBe("https://example.com/contact");
    expect(websiteDomain("https://www.example.com/contact")).toBe("example.com");
  });

  it("keeps incomplete companies in needs-review instead of pretending they are strict-ready", () => {
    const sheet = normalizeSheet({
      name: "Leads",
      rows: [
        ["Company", "Country", "Website", "Source URL"],
        ["Missing Contact Buyer", "Germany", "https://example.de", "https://example.de/contact"],
      ],
    });
    expect(sheet?.rows[0].blockers).toEqual(["valid business email or WhatsApp", "buyer type", "product fit"]);
  });
});
