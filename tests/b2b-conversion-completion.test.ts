import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("B2B conversion completion", () => {
  it("submits the quick RFQ without forcing WhatsApp", () => {
    const form = read("src/components/QuoteForm.tsx");
    expect(form).toContain("Submit quote request");
    expect(form).toContain("preferred_contact");
    expect(form).toContain("target_delivery_date");
    expect(form).toContain("Tech pack / reference files");
    expect(form).toContain("uploadPublicLeadFile");
    expect(form).toContain("Optional WhatsApp follow-up");
    expect(form).not.toContain("window.open(");
  });

  it("keeps the mobile conversion dock out of inquiry and admin workflows", () => {
    const dock = read("src/components/sections/StickyMobileCTA.tsx");
    expect(dock).toContain('pathname.startsWith("/admin")');
    expect(dock).toContain('pathname.startsWith("/inquiry")');
    expect(dock).toContain("data-compact");
    expect(dock).toContain('window.addEventListener("scroll"');
    expect(dock).toContain("supportOpened");
  });
});
