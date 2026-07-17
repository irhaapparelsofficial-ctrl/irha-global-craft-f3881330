import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const studio = readFileSync(resolve(process.cwd(), "src/pages/Studio.tsx"), "utf8");

describe("Studio buyer-truth contract", () => {
  it("positions the tool as a non-binding visual requirement builder", () => {
    expect(studio).toContain("Build a non-binding visual direction");
    expect(studio).toContain("Requirements Reviewed Before Quotation");
    expect(studio).toContain("Concept preview only — non-binding");
    expect(studio).toContain("confirmed only after requirement review and written quotation");
  });

  it("does not publish fixed commercial, certification or render-time claims", () => {
    for (const claim of [
      "Flexible MOQ",
      "MOQ 50",
      "45-Day Production",
      "FOB Sialkot",
      "factory-approved base color",
      "~6–10s",
      "regenerating in the background",
      "finished mockup",
      "OEKO-TEX",
      "BSCI",
      "SEDEX",
      "ISO 9001",
      "GOTS",
      "WRAP",
      "REACH",
    ]) {
      expect(studio).not.toContain(claim);
    }
  });

  it("keeps buyer conversion paths available without auto-sending", () => {
    expect(studio).toContain("Generate Mockup");
    expect(studio).toContain("Send Requirements to WhatsApp");
    expect(studio).toContain("target=\"_blank\"");
    expect(studio).not.toContain("send_email");
    expect(studio).not.toContain("whatsapp_messages");
  });
});
