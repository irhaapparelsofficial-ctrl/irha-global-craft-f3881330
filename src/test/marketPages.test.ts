import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { MARKET_PAGE_BY_SLUG, MARKET_PAGES } from "@/lib/marketPages";
// @ts-ignore Deployed JavaScript worker module has no declaration file.
import { isKnownHtmlRoute } from "../../public/_worker.js";
// @ts-ignore Cloudflare Pages Function module has no declaration file.
import { pageSummaryFor } from "../../functions/_middleware.js";

const EXPECTED_SLUGS = [
  "germany",
  "austria",
  "switzerland",
  "netherlands",
  "united-states",
  "united-kingdom",
  "canada",
  "australia",
  "new-zealand",
];

const EXPECTED_LOCALES = ["en-DE", "en-AT", "en-CH", "en-NL", "en-US", "en-GB", "en-CA", "en-AU", "en-NZ"];

function allText() {
  return MARKET_PAGES.map((market) => JSON.stringify(market)).join("\n");
}

describe("country market landing pages", () => {
  it("publishes exactly the nine approved markets", () => {
    expect(MARKET_PAGES.map((market) => market.slug)).toEqual(EXPECTED_SLUGS);
    expect(MARKET_PAGES.map((market) => market.locale)).toEqual(EXPECTED_LOCALES);
    expect(Object.keys(MARKET_PAGE_BY_SLUG)).toHaveLength(9);
  });

  it("resolves every canonical slug to its unique record", () => {
    for (const market of MARKET_PAGES) {
      expect(MARKET_PAGE_BY_SLUG[market.slug]).toBe(market);
      expect(market.country.length).toBeGreaterThan(2);
    }
  });

  it("has unique and substantial SEO copy", () => {
    const fields = ["title", "description", "h1", "intro"] as const;
    for (const field of fields) {
      const values = MARKET_PAGES.map((market) => market[field]);
      expect(new Set(values).size).toBe(MARKET_PAGES.length);
      expect(values.every((value) => value.trim().length > (field === "intro" ? 140 : 35))).toBe(true);
    }
  });

  it("contains useful page depth", () => {
    for (const market of MARKET_PAGES) {
      expect(market.priorityPrograms).toHaveLength(3);
      expect(market.sections).toHaveLength(3);
      expect(market.faqs.length).toBeGreaterThanOrEqual(4);
      expect(market.sections.every((section) => section.body.length > 130 && section.bullets.length >= 4)).toBe(true);
      expect(market.faqs.every((faq) => faq.question.length > 20 && faq.answer.length > 75)).toBe(true);
    }
  });

  it("does not publish prohibited positive commercial or trust claims", () => {
    const text = allText();
    const prohibited = [
      /\bwe guarantee\b/i,
      /\bguaranteed (?:delivery|lead time|quality|shipping)\b/i,
      /\bcertified (?:factory|manufacturer|supplier)\b/i,
      /\b(?:five|5)[- ]star\b/i,
      /\b(?:rated|rating) \d(?:\.\d)?\/5\b/i,
      /\bMOQ (?:is|of) \d+/i,
      /\bfixed (?:wholesale )?price(?:s)? (?:is|are|from|start)/i,
    ];
    for (const pattern of prohibited) expect(text).not.toMatch(pattern);
  });

  it("adds all market URLs to the primary sitemap build contract", () => {
    const generator = readFileSync(resolve("scripts/merge-market-sitemap.ts"), "utf8");
    expect(generator).toContain('"/markets"');
    for (const slug of EXPECTED_SLUGS) expect(generator).toContain("MARKET_PAGES");
  });

  it("recognizes valid HTML routes and rejects soft-404 routes", () => {
    expect(isKnownHtmlRoute("/markets/germany")).toBe(true);
    expect(isKnownHtmlRoute("/markets/new-zealand/")).toBe(true);
    expect(isKnownHtmlRoute("/products/sportswear/example-product")).toBe(true);
    expect(isKnownHtmlRoute("/markets/not-a-real-market")).toBe(false);
    expect(isKnownHtmlRoute("/this-route-definitely-does-not-exist-987654")).toBe(false);
  });

  it("returns market-specific Markdown summaries and no unknown fallback", () => {
    const germany = pageSummaryFor("/markets/germany");
    const australia = pageSummaryFor("/markets/australia");
    expect(germany?.title).toContain("Germany");
    expect(australia?.title).toContain("Australia");
    expect(germany?.summary).not.toBe(australia?.summary);
    expect(pageSummaryFor("/this-route-definitely-does-not-exist-987654")).toBeNull();
  });
});
