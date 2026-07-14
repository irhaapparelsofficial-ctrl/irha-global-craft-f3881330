import { describe, expect, it } from "vitest";
import { CATEGORY_SEO } from "./categorySeo";

const prioritySlugs = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

describe("priority category SEO content", () => {
  it("publishes substantial buyer planning content for every top category", () => {
    for (const slug of prioritySlugs) {
      const profile = CATEGORY_SEO[slug];
      expect(profile).toBeDefined();
      expect(profile.title.length).toBeGreaterThanOrEqual(35);
      expect(profile.description.length).toBeGreaterThanOrEqual(100);
      expect(profile.intro.length).toBeGreaterThanOrEqual(150);
      expect(profile.sections).toHaveLength(3);
      expect(profile.faqs).toHaveLength(4);
      expect(profile.buyerGuides.length).toBeGreaterThanOrEqual(4);
      expect(profile.exportMarkets).toHaveLength(3);

      for (const section of profile.sections) {
        expect(section.heading.length).toBeGreaterThan(10);
        expect(section.body.length).toBeGreaterThan(80);
        expect(section.bullets.length).toBeGreaterThanOrEqual(4);
      }
    }
  });

  it("keeps buyer-guide links internal and duplicate-free", () => {
    for (const slug of prioritySlugs) {
      const links = CATEGORY_SEO[slug].buyerGuides.map((guide) => guide.href);
      expect(new Set(links).size).toBe(links.length);
      for (const href of links) {
        expect(href.startsWith("/")).toBe(true);
        expect(href.startsWith("//")).toBe(false);
      }
    }
  });
});
