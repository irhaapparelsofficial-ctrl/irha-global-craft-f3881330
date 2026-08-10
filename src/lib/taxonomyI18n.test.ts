import { describe, expect, it } from "vitest";
import { localizedTaxonomySeo, type TaxonomyLocale } from "./taxonomyI18n";

const repeatedCollectionContexts = [
  {
    topName: "Bavarian & Trachten Wear",
    audienceName: "Men",
    collectionName: "Lederhosen",
  },
  {
    topName: "Bavarian & Trachten Wear",
    audienceName: "Kids & Youth",
    collectionName: "Lederhosen",
  },
  {
    topName: "Premium Leather Apparel",
    audienceName: "Men",
    collectionName: "Jackets & Outerwear",
  },
  {
    topName: "Leisurewear & Nightwear",
    audienceName: "Unisex",
    collectionName: "Jackets & Outerwear",
  },
  {
    topName: "Premium Leather Apparel",
    audienceName: "Women",
    collectionName: "Custom Apparel",
  },
  {
    topName: "Leisurewear & Nightwear",
    audienceName: "Women",
    collectionName: "Custom Apparel",
  },
] as const;

const locales: TaxonomyLocale[] = ["en", "de", "fr", "es"];

const gp4CommercialContexts = [
  {
    label: "football teamwear",
    args: { topName: "Custom Sportswear & Teamwear", audienceName: "Teams & Clubs", collectionName: "Team Uniforms" },
    title: "Custom Football Kit Manufacturer | Private Label Teamwear | Irha Apparels",
    h1: "Custom Football Kit & Teamwear Manufacturer",
  },
  {
    label: "lederhosen",
    args: { topName: "Bavarian & Trachten Wear", audienceName: "Men", collectionName: "Men's Lederhosen" },
    title: "Lederhosen Manufacturer | Wholesale & Private Label | Irha Apparels",
    h1: "Lederhosen Manufacturer for Wholesale & Private Label",
  },
  {
    label: "sportswear",
    args: { topName: "Custom Sportswear & Teamwear" },
    title: "Private Label Sportswear Manufacturer | Custom Teamwear | Irha Apparels",
    h1: "Private Label Sportswear Manufacturer for B2B Buyers",
  },
  {
    label: "leather jackets",
    args: { topName: "Premium Leather Apparel", audienceName: "Men", collectionName: "Men's Jackets & Outerwear" },
    title: "Private Label Leather Jacket Manufacturer | Irha Apparels",
    h1: "Private Label Leather Jacket & Outerwear Manufacturer",
  },
  {
    label: "streetwear",
    args: { topName: "Streetwear & Activewear" },
    title: "Private Label Streetwear Manufacturer | Heavyweight Hoodies | Irha Apparels",
    h1: "Private Label Streetwear & Hoodie Manufacturer",
  },
  {
    label: "dirndl",
    args: { topName: "Bavarian & Trachten Wear", audienceName: "Women", collectionName: "Women's Dirndl Dresses" },
    title: "Private Label Dirndl Manufacturer | Wholesale Trachten | Irha Apparels",
    h1: "Private Label Dirndl Manufacturer for Wholesale Buyers",
  },
  {
    label: "nightwear",
    args: { topName: "Leisurewear & Nightwear" },
    title: "Private Label Pajama & Nightwear Manufacturer | Irha Apparels",
    h1: "Private Label Pajama & Nightwear Manufacturer",
  },
  {
    label: "activewear",
    args: { topName: "Custom Sportswear & Teamwear", audienceName: "Fitness & Activewear", collectionName: "Performance & Activewear" },
    title: "Private Label Activewear Manufacturer | Performance Apparel | Irha Apparels",
    h1: "Private Label Activewear & Performance Apparel Manufacturer",
  },
  {
    label: "leather accessories",
    args: { topName: "Premium Leather Apparel", audienceName: "Accessories" },
    title: "Private Label Leather Accessories Manufacturer | Irha Apparels",
    h1: "Private Label Leather Accessories Manufacturer",
  },
  {
    label: "trachten shirts and vests",
    args: { topName: "Bavarian & Trachten Wear", audienceName: "Men" },
    title: "Trachten Shirt & Vest Manufacturer | Wholesale & Private Label | Irha Apparels",
    h1: "Trachten Shirt & Vest Manufacturer for B2B Buyers",
  },
] as const;

describe("localized taxonomy SEO hierarchy", () => {
  it.each(locales)("keeps repeated collection metadata unique in %s", (locale) => {
    const metadata = repeatedCollectionContexts.map((context) =>
      localizedTaxonomySeo({ locale, ...context }),
    );

    for (const field of ["title", "h1", "description", "intro"] as const) {
      expect(new Set(metadata.map((entry) => entry[field])).size).toBe(metadata.length);
    }
  });

  it("includes the collection, audience and parent commercial division in generic English collection metadata", () => {
    const metadata = localizedTaxonomySeo({
      locale: "en",
      topName: "Premium Leather Apparel",
      audienceName: "Women",
      collectionName: "Jackets & Outerwear",
    });

    for (const field of ["title", "h1", "description", "intro"] as const) {
      expect(metadata[field]).toContain("Jackets & Outerwear");
      expect(metadata[field]).toContain("Women");
      expect(metadata[field]).toContain("Premium Leather Apparel");
    }
  });

  it("preserves non-priority audience-level B2B intent", () => {
    const audienceLevel = localizedTaxonomySeo({
      locale: "en",
      topName: "Custom Sportswear & Teamwear",
      audienceName: "Teams & Clubs",
    });

    expect(audienceLevel.h1).toBe(
      "Teams & Clubs Custom Sportswear & Teamwear Manufacturer for Wholesale & Private Label",
    );
  });

  it.each(gp4CommercialContexts)("locks GP-4 commercial targeting for $label", ({ args, title, h1 }) => {
    const metadata = localizedTaxonomySeo({ locale: "en", ...args });
    expect(metadata.title).toBe(title);
    expect(metadata.h1).toBe(h1);
    expect(metadata.description.length).toBeGreaterThan(90);
    expect(metadata.intro.length).toBeGreaterThan(120);
    expect(`${metadata.description} ${metadata.intro}`).not.toMatch(/\b(?:fixed MOQ|guaranteed|certified|rating|review score|production capacity)\b/i);
  });

  it("keeps all ten GP-4 title/H1 pairs unique", () => {
    const metadata = gp4CommercialContexts.map(({ args }) => localizedTaxonomySeo({ locale: "en", ...args }));
    expect(new Set(metadata.map((entry) => entry.title)).size).toBe(gp4CommercialContexts.length);
    expect(new Set(metadata.map((entry) => entry.h1)).size).toBe(gp4CommercialContexts.length);
  });
});
