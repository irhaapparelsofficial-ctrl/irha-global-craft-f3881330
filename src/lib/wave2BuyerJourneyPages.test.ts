import { describe, expect, it } from "vitest";
import { DUTCH_WAVE2_PAGES, FRENCH_WAVE2_PAGES, WAVE2_BUYER_JOURNEY_PAGES } from "./wave2BuyerJourneyPages";

const blockedClaims = [
  /notre bureau (?:local )?(?:en France|en Belgique|aux Pays-Bas)/i,
  /ons (?:lokale )?kantoor (?:in Nederland|in België)/i,
  /certifi(?:é|cation) (?:BSCI|ISO|SEDEX)/i,
  /gegarandeerde vaste minimale afname/i,
  /quantité minimale fixe garantie de \d+/i,
];

describe("French and Dutch Wave 2 buyer journeys", () => {
  it("contains exactly five unique published pages per language", () => {
    expect(FRENCH_WAVE2_PAGES).toHaveLength(5);
    expect(DUTCH_WAVE2_PAGES).toHaveLength(5);
    expect(new Set(WAVE2_BUYER_JOURNEY_PAGES.map((page) => page.path)).size).toBe(10);
  });

  it.each(WAVE2_BUYER_JOURNEY_PAGES)("provides complete native B2B content for $path", (page) => {
    expect(page.title.length).toBeGreaterThan(35);
    expect(page.description.length).toBeGreaterThan(100);
    expect(page.h1.length).toBeGreaterThan(25);
    expect(page.intro.length).toBeGreaterThan(120);
    expect(page.sections.length).toBeGreaterThanOrEqual(3);
    expect(page.faqs.length).toBeGreaterThanOrEqual(4);
    expect(page.relatedPaths.length).toBeGreaterThanOrEqual(4);
    const copy = JSON.stringify(page);
    for (const claim of blockedClaims) expect(copy).not.toMatch(claim);
  });

  it("uses genuine English equivalents only for sportswear and leather pages", () => {
    const withEnglish = WAVE2_BUYER_JOURNEY_PAGES.filter((page) => page.alternates?.some((alternate) => alternate.locale === "en"));
    expect(withEnglish.map((page) => page.path).sort()).toEqual([
      "/fr/fabricant-vetements-cuir",
      "/fr/fabricant-vetements-sport",
      "/nl/leren-kleding-fabrikant",
      "/nl/sportkleding-fabrikant",
    ]);
    expect(withEnglish.every((page) => page.alternates?.some((alternate) => alternate.href.startsWith("/products/")))).toBe(true);
  });

  it("keeps all localized internal links within the published Wave 2 set", () => {
    const published = new Set(WAVE2_BUYER_JOURNEY_PAGES.map((page) => page.path));
    for (const page of WAVE2_BUYER_JOURNEY_PAGES) {
      for (const path of page.relatedPaths.filter((path) => path.startsWith("/fr/") || path.startsWith("/nl/"))) {
        expect(published.has(path)).toBe(true);
      }
    }
  });
});
