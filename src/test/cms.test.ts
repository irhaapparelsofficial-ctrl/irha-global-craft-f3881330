import { describe, expect, it } from "vitest";
import { DEFAULT_HERO_CONTENT, normalizeHeroContent } from "@/lib/cms";

describe("admin CMS hero normalization", () => {
  it("keeps the current verified content as fallback", () => {
    expect(normalizeHeroContent(null)).toEqual(DEFAULT_HERO_CONTENT);
  });

  it("accepts reviewed text and internal CTA paths", () => {
    const result = normalizeHeroContent({
      slides: [{
        eyebrow: "  Verified B2B Manufacturing  ",
        title: "Custom Programs",
        highlight: "Buyer-Led",
        subtitle: "A reviewed manufacturing program for wholesalers and private-label apparel buyers.",
        ctaLabel: "Request Details",
        ctaHref: "/inquiry",
      }],
    });

    expect(result.slides[0].eyebrow).toBe("Verified B2B Manufacturing");
    expect(result.slides[0].ctaHref).toBe("/inquiry");
    expect(result.slides).toHaveLength(3);
  });

  it("rejects unsafe or protocol-relative CTA destinations", () => {
    const javascriptResult = normalizeHeroContent({
      slides: [{ ...DEFAULT_HERO_CONTENT.slides[0], ctaHref: "javascript:alert(1)" }],
    });
    const protocolRelativeResult = normalizeHeroContent({
      slides: [{ ...DEFAULT_HERO_CONTENT.slides[0], ctaHref: "//malicious.example" }],
    });

    expect(javascriptResult.slides[0].ctaHref).toBe(DEFAULT_HERO_CONTENT.slides[0].ctaHref);
    expect(protocolRelativeResult.slides[0].ctaHref).toBe(DEFAULT_HERO_CONTENT.slides[0].ctaHref);
  });

  it("accepts HTTPS external destinations but not HTTP", () => {
    const httpsResult = normalizeHeroContent({
      slides: [{ ...DEFAULT_HERO_CONTENT.slides[0], ctaHref: "https://example.com/buyer" }],
    });
    const httpResult = normalizeHeroContent({
      slides: [{ ...DEFAULT_HERO_CONTENT.slides[0], ctaHref: "http://example.com/buyer" }],
    });

    expect(httpsResult.slides[0].ctaHref).toBe("https://example.com/buyer");
    expect(httpResult.slides[0].ctaHref).toBe(DEFAULT_HERO_CONTENT.slides[0].ctaHref);
  });
});
