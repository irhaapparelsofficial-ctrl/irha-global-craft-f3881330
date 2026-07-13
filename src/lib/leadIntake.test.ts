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

  it("detects a real header after title rows and maps the international master format", () => {
    const sheet = normalizeSheet({
      name: "Master Leads",
      rows: [
        ["IRHA INTERNATIONAL — NON-LEATHER APPAREL LEAD MASTER"],
        ["322 unique public business leads"],
        ["Lead ID", "Company", "Target Category", "Buyer Type", "Professional Email", "Phone / WhatsApp", "Country", "City / Region", "Website", "LinkedIn", "Email Verification", "Source Confidence", "Lead Priority", "Notes", "Verification Source"],
        ["1", "KitKing", "Sportswear / Teamwear", "Teamwear Retailer / Distributor", "sales@kitking.co.uk", "0116 262 7332", "United Kingdom", "Loughborough", "https://kitking.co.uk", "https://linkedin.com/company/kitking", "Publicly listed", "High", "A", "Relevant buyer", "https://kitking.co.uk/contact"],
      ],
    });

    expect(sheet?.headerRow).toBe(3);
    expect(sheet?.rows).toHaveLength(1);
    expect(sheet?.rows[0]).toMatchObject({
      companyName: "KitKing",
      email: "sales@kitking.co.uk",
      country: "United Kingdom",
      buyerType: "Teamwear Retailer / Distributor",
      website: "https://kitking.co.uk/",
      sourceUrl: "https://kitking.co.uk/contact",
      priority: "A",
    });
    expect(sheet?.rows[0].productFit).toEqual(["Sportswear", "Teamwear"]);
    expect(sheet?.rows[0].blockers).toEqual([]);
  });

  it("maps the deduplicated Trachten master column names", () => {
    const sheet = normalizeSheet({
      name: "Master Leads",
      rows: [
        ["Lead ID", "Priority", "Country", "City/Region", "Company", "Buyer Type / Segment", "Phone / WhatsApp", "Email / Contact Route", "Website", "Product Fit / Best Offer", "Source URL", "Notes"],
        ["IRHA-DE-0001", "P1", "Germany", "Munich", "Almliebe München", "Trachten store", "+49 89 24217592", "kundenservice@almliebe.com", "https://almliebe.com", "Dirndl | shirts | accessories", "https://almliebe.com/pages/contact", "Official contact page"],
      ],
    });

    expect(sheet?.rows[0].companyName).toBe("Almliebe München");
    expect(sheet?.rows[0].city).toBe("Munich");
    expect(sheet?.rows[0].email).toBe("kundenservice@almliebe.com");
    expect(sheet?.rows[0].productFit).toEqual(["Dirndl", "shirts", "accessories"]);
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
    expect(sheet?.rows[0].blockers).toEqual(["valid business email", "buyer type", "product fit"]);
  });
});
