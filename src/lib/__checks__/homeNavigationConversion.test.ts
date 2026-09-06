import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("homepage navigation and B2B conversion journey", () => {
  it("uses a focused desktop and mobile buyer navigation with products as the catalogue entry", () => {
    const navbar = read("src/components/layout/Navbar.tsx");
    for (const item of [
      '{ label: "Products", href: "/products" }',
      '{ label: "Manufacturing", href: "/manufacturing" }',
      '{ label: "How it works", href: "/#process", anchor: true }',
      '{ label: "Buyer trust", href: "/buyer-trust" }',
    ]) expect(navbar).toContain(item);
    expect(navbar).toContain('aria-label="Primary navigation"');
    expect(navbar).toContain('aria-label="Mobile navigation"');
    expect(navbar).toContain("Request quote");
    expect(navbar).toContain('to="/inquiry-cart"');
    expect(navbar).toContain("Review inquiry");
    expect(navbar).not.toContain("usePublicCatalogTree");
    expect(navbar).not.toContain("desktop-collections-menu");
  });

  it("keeps the original inquiry workflow while preselecting explicit CTA intent at requirements", () => {
    const entry = read("src/pages/Inquiry.tsx");
    const base = read("src/pages/InquiryBase.tsx");
    expect(entry).toContain("const nextStep =");
    expect(entry).toContain("? 2 : Math.max(2, storedStep)");
    expect(entry).toContain('categorySlug: params.get("category")');
    expect(entry).toContain("<InquiryBase />");
    expect(base).toContain("const INTENTS:");
    expect(base).toContain("<SecureFileUpload");
    expect(base).toContain("submitPublicInquiry({");
    expect(base).toContain("files: draft.files");
    expect(base).toContain("inquiry_ref: ref");
    expect(base).not.toContain('supabase.from("inquiries").insert');
  });

  it("adds category-aware RFQ actions and keeps human support and WhatsApp escalation", () => {
    const desktop = read("src/components/layout/FloatingActions.tsx");
    const mobile = read("src/components/sections/StickyMobileCTA.tsx");
    const guide = read("src/components/LiveChat.tsx");
    const humanChat = read("src/components/HumanLiveChatPro.tsx");

    for (const source of [desktop, mobile]) {
      expect(source).toContain("/inquiry?intent=rfq&category=");
      expect(source).toContain("categoryFromPath");
    }
    expect(desktop).toContain("settingsWhatsappLink(settings)");
    expect(desktop).toContain('data-track="category-quote-floating"');
    expect(mobile).toContain("utm_source=mobile-dock");
    expect(mobile).toContain('new CustomEvent("irha:open-irha-guide")');
    expect(guide).toContain('const OPEN_HUMAN_EVENT = "irha:open-human-chat"');
    expect(guide).toContain("Human Team");
    expect(humanChat).toContain("whatsappLink()");
    expect(humanChat).toContain("Urgent? WhatsApp");
  });

  it("keeps homepage entry and final calls to action on the structured RFQ route", () => {
    const hero = read("src/components/HeroCarousel.tsx");
    const finalCta = read("src/components/sections/StartProgramCTA.tsx");
    expect(hero).toContain('to="/inquiry?intent=rfq"');
    expect(finalCta).toContain('to="/inquiry?intent=rfq"');
    expect(finalCta).toContain("Upload reference");
    expect(finalCta).toContain("Request catalogue");
  });

  it("does not ship the one-time patch runner or trigger files", () => {
    expect(existsSync(resolve(root, "scripts/apply-buyer-conversion-audit.mjs"))).toBe(false);
    expect(existsSync(resolve(root, "scripts/.run-buyer-conversion-audit"))).toBe(false);
    expect(existsSync(resolve(root, ".github/workflows/apply-buyer-conversion-audit.yml"))).toBe(false);
  });
});
