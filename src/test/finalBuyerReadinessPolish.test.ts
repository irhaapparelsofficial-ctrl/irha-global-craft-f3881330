import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("IA-B2B-E003 final buyer-readiness polish", () => {
  it("never exposes raw backend errors in the public inquiry flow", () => {
    const source = read("src/pages/InquiryBase.tsx");
    expect(source).toContain("SAFE_SUBMISSION_ERROR");
    expect(source).toContain("Your draft is still saved on this device");
    expect(source).not.toContain("err instanceof Error ? err.message");
    expect(source).not.toContain("description: msg");
  });

  it("moves validation focus and associates errors with inquiry fields", () => {
    const source = read("src/pages/InquiryBase.tsx");
    expect(source).toContain("data-inquiry-field");
    expect(source).toContain("aria-invalid");
    expect(source).toContain("aria-describedby");
    expect(source).toContain('role="alert"');
    expect(source).toContain("document.querySelector<HTMLElement>");
    for (const field of ["company", "country", "quantity", "sampleQty", "meetingTopic", "name", "email", "whatsapp", "consent"]) {
      expect(source).toContain(`fieldId("${field}")`);
    }
  });

  it("announces wizard state and selection without reducing touch targets", () => {
    const inquirySource = read("src/pages/InquiryBase.tsx");
    const languageSource = read("src/components/LanguageSelector.tsx");
    expect(inquirySource).toContain('aria-current={active ? "step" : undefined}');
    expect(inquirySource).toContain("aria-pressed={active}");
    expect(inquirySource).toContain("inline-flex min-h-11 items-center");
    expect(languageSource).toContain("min-h-11 min-w-11");
  });

  it("keeps localized process navigation in the selected language", () => {
    const source = read("src/components/layout/Navbar.tsx");
    expect(source).toContain('if (href === "/#process")');
    expect(source).toContain("homeHref.replace");
    expect(source).not.toContain('hrefLang={locale === "en" ? undefined : "en"}');
  });

  it("returns keyboard focus to the mobile menu trigger after Escape", () => {
    const source = read("src/components/layout/Navbar.tsx");
    expect(source).toContain("const menuButtonRef = useRef<HTMLButtonElement>(null)");
    expect(source).toContain("menuButtonRef.current?.focus()");
    expect(source).toContain("ref={menuButtonRef}");
  });

  it("preserves the exact five-division product architecture", () => {
    const source = read("src/lib/categoryMediaRegistry.ts");
    for (const slug of ["bavarian-trachten-wear", "premium-leather-apparel", "sportswear", "streetwear-activewear", "leisure-nightwear"]) {
      expect(source).toContain(slug);
    }
  });
});
