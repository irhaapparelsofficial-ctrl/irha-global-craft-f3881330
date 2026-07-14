import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { BUYER_INTENT_LANDING_PAGES, BUYER_INTENT_PATHS } from "./buyerIntentLandingPages";
import { MARKET_PAGES } from "./marketPages";
import { MARKET_SEARCH_INTENT, getMarketSearchIntent } from "./marketSearchIntent";

const buyerPageByPath = new Map(BUYER_INTENT_LANDING_PAGES.map((page) => [page.path, page]));

describe("market guide search-intent separation", () => {
  it("provides one informational search profile for every country page", () => {
    expect(Object.keys(MARKET_SEARCH_INTENT)).toHaveLength(MARKET_PAGES.length);

    for (const market of MARKET_PAGES) {
      const profile = getMarketSearchIntent(market.slug);
      expect(profile.title).toContain("Sourcing Guide");
      expect(profile.h1).toContain("Sourcing Guide");
      expect(profile.title).not.toMatch(/\bmanufacturer\b/i);
      expect(profile.h1).not.toMatch(/\bmanufacturer\b/i);
      expect(profile.description.length).toBeGreaterThanOrEqual(110);
      expect(profile.description.length).toBeLessThanOrEqual(190);
      expect(profile.intro.length).toBeGreaterThanOrEqual(180);
    }
  });

  it("links every guide to a distinct transactional manufacturer page", () => {
    const manufacturerPaths = MARKET_PAGES.map((market) => getMarketSearchIntent(market.slug).manufacturerPath);
    expect(new Set(manufacturerPaths).size).toBe(MARKET_PAGES.length);

    for (const path of manufacturerPaths) {
      expect(BUYER_INTENT_PATHS).toContain(path);
      const buyerPage = buyerPageByPath.get(path);
      expect(buyerPage?.title).toMatch(/Manufacturer|Manufacturing/i);
      expect(buyerPage?.h1).toMatch(/Manufacturer|Manufacturing/i);
    }
  });

  it("keeps market titles and transactional titles unique", () => {
    const marketTitles = MARKET_PAGES.map((market) => getMarketSearchIntent(market.slug).title.toLowerCase());
    const buyerTitles = BUYER_INTENT_LANDING_PAGES.map((page) => page.title.toLowerCase());
    expect(new Set(marketTitles).size).toBe(marketTitles.length);

    for (const title of marketTitles) {
      expect(buyerTitles).not.toContain(title);
    }
  });

  it("does not declare different countries as translation alternates", () => {
    const runtimeSource = readFileSync("src/pages/MarketLandingPage.tsx", "utf8");
    const shellSource = readFileSync("scripts/patch-market-static-shells.ts", "utf8");

    expect(runtimeSource).not.toContain("MARKET_ALTERNATES");
    expect(runtimeSource).not.toContain("xDefaultPath");
    expect(shellSource).toContain('rel="alternate" hreflang');
    expect(shellSource).toContain("replace");
  });
});
