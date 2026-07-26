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

describe("localized taxonomy SEO hierarchy", () => {
  it.each(locales)("keeps repeated collection metadata unique in %s", (locale) => {
    const metadata = repeatedCollectionContexts.map((context) =>
      localizedTaxonomySeo({ locale, ...context }),
    );

    for (const field of ["title", "h1", "description", "intro"] as const) {
      expect(new Set(metadata.map((entry) => entry[field])).size).toBe(metadata.length);
    }
  });

  it("includes the collection, audience and parent commercial division in English collection metadata", () => {
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

  it("preserves the existing top-level and audience-level B2B intent", () => {
    const topLevel = localizedTaxonomySeo({
      locale: "en",
      topName: "Custom Sportswear & Teamwear",
    });
    const audienceLevel = localizedTaxonomySeo({
      locale: "en",
      topName: "Custom Sportswear & Teamwear",
      audienceName: "Teams & Clubs",
    });

    expect(topLevel.title).toBe(
      "Custom Sportswear & Teamwear Manufacturer | Wholesale & Private Label | Irha Apparels",
    );
    expect(audienceLevel.h1).toBe(
      "Teams & Clubs Custom Sportswear & Teamwear Manufacturer for Wholesale & Private Label",
    );
  });
});
