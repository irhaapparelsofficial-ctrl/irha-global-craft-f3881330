import { describe, expect, it } from "vitest";
import { BUYER_INTENT_LANDING_PAGES } from "./buyerIntentLandingPages";

describe("buyer-intent landing page SEO contracts", () => {
  it("keeps every landing page path unique and canonical-safe", () => {
    const paths = BUYER_INTENT_LANDING_PAGES.map((page) => page.path);
    expect(new Set(paths).size).toBe(paths.length);

    for (const path of paths) {
      expect(path.startsWith("/")).toBe(true);
      expect(path.startsWith("//")).toBe(false);
      expect(path.endsWith("/")).toBe(false);
      expect(path).not.toContain("..");
    }
  });

  it("provides useful, non-empty search and buyer content", () => {
    expect(BUYER_INTENT_LANDING_PAGES.length).toBeGreaterThanOrEqual(17);

    for (const page of BUYER_INTENT_LANDING_PAGES) {
      expect(page.title.length).toBeGreaterThanOrEqual(35);
      expect(page.title.length).toBeLessThanOrEqual(85);
      expect(page.description.length).toBeGreaterThanOrEqual(80);
      expect(page.description.length).toBeLessThanOrEqual(200);
      expect(page.h1.length).toBeGreaterThanOrEqual(20);
      expect(page.intro.length).toBeGreaterThanOrEqual(100);
      expect(page.sections.length).toBeGreaterThanOrEqual(4);
      expect(page.faqs.length).toBeGreaterThanOrEqual(4);
      expect(page.relatedPaths.length).toBeGreaterThanOrEqual(3);

      for (const section of page.sections) {
        expect(section.heading.trim().length).toBeGreaterThan(3);
        expect(section.body.trim().length).toBeGreaterThan(40);
        expect(section.bullets.length).toBeGreaterThanOrEqual(4);
      }

      for (const faq of page.faqs) {
        expect(faq.question.trim().endsWith("?")).toBe(true);
        expect(faq.answer.trim().length).toBeGreaterThan(40);
      }
    }
  });

  it("keeps German pages correctly identified", () => {
    const germanPages = BUYER_INTENT_LANDING_PAGES.filter((page) => page.path.startsWith("/de/"));
    expect(germanPages.length).toBe(3);
    for (const page of germanPages) {
      expect(page.locale).toBe("de-DE");
      expect(page.direction).toBe("ltr");
    }
  });

  it("uses valid internal hreflang paths", () => {
    for (const page of BUYER_INTENT_LANDING_PAGES) {
      for (const alternate of page.alternates ?? []) {
        expect(alternate.locale.trim().length).toBeGreaterThan(1);
        expect(alternate.href.startsWith("/")).toBe(true);
        expect(alternate.href.startsWith("//")).toBe(false);
      }
    }
  });
});
