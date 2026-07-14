import { describe, expect, it } from "vitest";
import {
  SEO_BUYER_INTENT_EXPANSION,
  SEO_BUYER_INTENT_LANDING_PAGES,
} from "./buyerIntentSeoPages";

describe("expanded buyer-intent SEO pages", () => {
  it("adds unique German-market routes without replacing existing pages", () => {
    const paths = SEO_BUYER_INTENT_LANDING_PAGES.map((page) => page.path);
    expect(SEO_BUYER_INTENT_EXPANSION).toHaveLength(5);
    expect(new Set(paths).size).toBe(paths.length);
    expect(paths).toContain("/de/bekleidungshersteller-deutschland");
    expect(paths).toContain("/custom-sportswear-manufacturer-germany");
    expect(paths).toContain("/de/sportbekleidung-hersteller");
    expect(paths).toContain("/leather-apparel-manufacturer-germany");
    expect(paths).toContain("/de/lederbekleidung-hersteller");
  });

  it("keeps every alternate URL reciprocal and internally resolvable", () => {
    const pagesByPath = new Map(
      SEO_BUYER_INTENT_LANDING_PAGES.map((page) => [page.path, page]),
    );

    for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
      for (const alternate of page.alternates ?? []) {
        const alternatePage = pagesByPath.get(alternate.href);
        expect(alternatePage, `${page.path} -> ${alternate.href}`).toBeDefined();
        if ((page.alternates?.length ?? 0) > 1) {
          expect(
            alternatePage?.alternates?.some((candidate) => candidate.href === page.path),
            `${alternate.href} should link back to ${page.path}`,
          ).toBe(true);
        }
      }
    }
  });

  it("ships substantial buyer content for every new page", () => {
    for (const page of SEO_BUYER_INTENT_EXPANSION) {
      expect(page.title.length).toBeGreaterThanOrEqual(35);
      expect(page.title.length).toBeLessThanOrEqual(85);
      expect(page.description.length).toBeGreaterThanOrEqual(80);
      expect(page.description.length).toBeLessThanOrEqual(200);
      expect(page.intro.length).toBeGreaterThanOrEqual(100);
      expect(page.sections).toHaveLength(4);
      expect(page.faqs).toHaveLength(4);
      expect(page.relatedPaths.length).toBeGreaterThanOrEqual(4);
      for (const section of page.sections) {
        expect(section.body.length).toBeGreaterThan(40);
        expect(section.bullets.length).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
