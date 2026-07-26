import { describe, expect, it } from "vitest";
import {
  SEO_BUYER_INTENT_EXPANSION,
  SEO_BUYER_INTENT_LANDING_PAGES,
} from "./buyerIntentSeoPages";
import { getEquivalentRoutes, getPublishedRoute } from "./i18nFoundation";

describe("expanded buyer-intent SEO pages", () => {
  it("adds unique German, French and Dutch routes without replacing existing pages", () => {
    const paths = SEO_BUYER_INTENT_LANDING_PAGES.map((page) => page.path);
    expect(SEO_BUYER_INTENT_EXPANSION).toHaveLength(15);
    expect(new Set(paths).size).toBe(paths.length);
    for (const path of [
      "/de/bekleidungshersteller-deutschland",
      "/custom-sportswear-manufacturer-germany",
      "/de/sportbekleidung-hersteller",
      "/leather-apparel-manufacturer-germany",
      "/de/lederbekleidung-hersteller",
      "/fr/",
      "/fr/fabricant-vetements",
      "/fr/fabricant-vetements-sport",
      "/fr/fabricant-vetements-cuir",
      "/fr/fabrication-marque-blanche",
      "/nl/",
      "/nl/kledingfabrikant",
      "/nl/sportkleding-fabrikant",
      "/nl/leren-kleding-fabrikant",
      "/nl/private-label-kleding",
    ]) expect(paths).toContain(path);
  });

  it("keeps every alternate URL reciprocal and internally resolvable", () => {
    const pagesByPath = new Map(
      SEO_BUYER_INTENT_LANDING_PAGES.map((page) => [page.path, page]),
    );

    for (const page of SEO_BUYER_INTENT_LANDING_PAGES) {
      for (const alternate of page.alternates ?? []) {
        const alternatePage = pagesByPath.get(alternate.href);
        const alternateRoute = getPublishedRoute(alternate.href);
        expect(alternatePage || alternateRoute, `${page.path} -> ${alternate.href}`).toBeDefined();
        if ((page.alternates?.length ?? 0) > 1) {
          const reciprocalInPage = alternatePage?.alternates?.some((candidate) => candidate.href === page.path) ?? false;
          const reciprocalInRegistry = getEquivalentRoutes(alternate.href).some((candidate) => candidate.path === page.path);
          expect(
            reciprocalInPage || reciprocalInRegistry,
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
      expect(page.sections.length).toBeGreaterThanOrEqual(3);
      expect(page.faqs).toHaveLength(4);
      expect(page.relatedPaths.length).toBeGreaterThanOrEqual(4);
      for (const section of page.sections) {
        expect(section.body.length).toBeGreaterThan(40);
        expect(section.bullets.length).toBeGreaterThanOrEqual(4);
      }
    }
  });
});
