import { describe, expect, it } from "vitest";
import { GERMAN_BUYER_JOURNEY_PAGES, GERMAN_BUYER_JOURNEY_PATHS } from "./germanBuyerJourneyPages";
import { GERMAN_GATEWAY_CONTENT } from "./germanGatewayContent";
import { getHreflangAlternates, getPublishedLocalizedRoutes, getXDefaultPath } from "./i18nFoundation";

const pairedEnglishRoutes = new Map([
  ["/de/bavarian-wear", "/products/bavarian-trachten-wear"],
  ["/de/lederhosen-hersteller", "/lederhosen-manufacturer-germany"],
  ["/de/dirndl-grosshandel", "/dirndl-manufacturer-austria"],
  ["/de/bekleidungshersteller-deutschland", "/germany-apparel-manufacturer"],
  ["/de/sportbekleidung-hersteller", "/custom-sportswear-manufacturer-germany"],
  ["/de/lederbekleidung-hersteller", "/leather-apparel-manufacturer-germany"],
]);

const forbiddenFallbackCopy = [
  "Buyer FAQ",
  "Request Quote",
  "Explore related products",
  "Related sourcing pages",
  "Experienced manufacturer in Sialkot",
];

const germanBuyerConfidenceRoutes = [
  "/de/einkaeufer-informationen",
  "/de/materialien",
];

describe("German pilot buyer journey", () => {
  it("preserves seven complete buyer-intent pages while adding two reviewed buyer-confidence routes", () => {
    expect(GERMAN_BUYER_JOURNEY_PAGES).toHaveLength(7);
    expect(new Set(GERMAN_BUYER_JOURNEY_PATHS).size).toBe(7);

    const establishedPublished = [
      "/de/",
      ...GERMAN_BUYER_JOURNEY_PATHS,
    ].sort();
    const expectedPublished = [...establishedPublished, ...germanBuyerConfidenceRoutes].sort();
    const publishedGerman = getPublishedLocalizedRoutes()
      .filter((route) => route.locale === "de")
      .map((route) => route.path)
      .sort();
    expect(publishedGerman).toEqual(expectedPublished);
    expect(GERMAN_GATEWAY_CONTENT.links.map((link) => link.href).sort()).toEqual(establishedPublished.filter((path) => path !== "/de/"));
  });

  it("contains complete native-German B2B copy without raw English fallbacks", () => {
    for (const page of GERMAN_BUYER_JOURNEY_PAGES) {
      expect(page.locale).toBe("de-DE");
      expect(page.title.length).toBeGreaterThan(35);
      expect(page.description.length).toBeGreaterThan(100);
      expect(page.h1.length).toBeGreaterThan(30);
      expect(page.sections).toHaveLength(4);
      expect(page.faqs).toHaveLength(4);
      expect(page.primaryLabel).toMatch(/anfragen|senden/i);
      expect(page.secondaryLabel).toContain("Fabrik");

      const allCopy = JSON.stringify(page);
      for (const forbidden of forbiddenFallbackCopy) expect(allCopy).not.toContain(forbidden);
      expect(allCopy).not.toContain("deutsches Büro");
      expect(allCopy).not.toContain("garantierte Mindestmenge");
      expect(allCopy).not.toContain("Festpreisgarantie");
    }
  });

  it("keeps reciprocal hreflang only where a genuine English equivalent exists", () => {
    for (const page of GERMAN_BUYER_JOURNEY_PAGES) {
      const english = pairedEnglishRoutes.get(page.path);
      if (english) {
        expect(page.alternates).toEqual([
          { locale: "en", href: english },
          { locale: "de", href: page.path },
        ]);
        expect(getHreflangAlternates(page.path)).toEqual([
          { locale: "en", href: english },
          { locale: "de", href: page.path },
        ]);
        expect(getXDefaultPath(page.path)).toBe(english);
      } else {
        expect(page.path).toBe("/de/trachten-private-label");
        expect(page.alternates).toEqual([{ locale: "de", href: page.path }]);
        expect(getHreflangAlternates(page.path)).toEqual([{ locale: "de", href: page.path }]);
        expect(getXDefaultPath(page.path)).toBe("/products/bavarian-trachten-wear");
      }
    }
  });

  it("does not link to unpublished German URLs", () => {
    const published = new Set(getPublishedLocalizedRoutes().map((route) => route.path));
    for (const page of GERMAN_BUYER_JOURNEY_PAGES) {
      for (const path of page.relatedPaths.filter((value) => value.startsWith("/de"))) {
        expect(published.has(path)).toBe(true);
      }
    }
  });
});
