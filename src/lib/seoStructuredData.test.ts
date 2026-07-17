import { describe, expect, it } from "vitest";
import {
  APEX_ORIGIN,
  buildBreadcrumbListSchema,
  buildCollectionPageSchema,
  buildOrganizationSchema,
  buildProductSchemaOrNull,
  humanizeSlug,
} from "./seoStructuredData";
import type { ProductSlot } from "./catalogTaxonomyManifest";

function approvedSlot(overrides: Partial<ProductSlot> = {}): ProductSlot {
  return {
    referenceCode: "IRHA-SPT-MEN-SHR-001",
    workingTitle: "Men's Football Shorts — Design 01",
    slug: "mens-football-shorts-design-01",
    draftStatus: "approved",
    publicationStatus: "published",
    mediaStatus: "approved",
    ...overrides,
  };
}

describe("seoStructuredData", () => {
  it("BreadcrumbList is 1-indexed with Home first, apex-origin absolute URLs", () => {
    const schema = buildBreadcrumbListSchema(
      "sportswear/men/mens-football-shorts",
    ) as {
      itemListElement: Array<{ position: number; name: string; item: string }>;
    };
    expect(schema.itemListElement[0]).toMatchObject({
      position: 1,
      name: "Home",
      item: `${APEX_ORIGIN}/`,
    });
    expect(schema.itemListElement).toHaveLength(4);
    for (const item of schema.itemListElement) {
      expect(item.item.startsWith(APEX_ORIGIN)).toBe(true);
      expect(item.item).not.toMatch(/www\./);
    }
  });

  it("Organization schema uses legal name and apex origin", () => {
    const org = buildOrganizationSchema() as { name: string; url: string };
    expect(org.name).toBe("Irha Apparels");
    expect(org.url).toBe(`${APEX_ORIGIN}/`);
  });

  it("Product schema returns null unless slot is fully publishable + media approved", () => {
    expect(
      buildProductSchemaOrNull({
        slot: approvedSlot({ draftStatus: "in_review" }),
        familyFullSlugPath: "sportswear/men/mens-football-shorts",
        approvedImageUrl: "https://irhaapparels.com/img/a.jpg",
      }),
    ).toBeNull();
    expect(
      buildProductSchemaOrNull({
        slot: approvedSlot({ mediaStatus: "pending_review" }),
        familyFullSlugPath: "sportswear/men/mens-football-shorts",
        approvedImageUrl: "https://irhaapparels.com/img/a.jpg",
      }),
    ).toBeNull();
    expect(
      buildProductSchemaOrNull({
        slot: approvedSlot(),
        familyFullSlugPath: "sportswear/men/mens-football-shorts",
        approvedImageUrl: undefined,
      }),
    ).toBeNull();
  });

  it("Product schema omits fabricated fields (no offers, price, rating, availability)", () => {
    const schema = buildProductSchemaOrNull({
      slot: approvedSlot(),
      familyFullSlugPath: "sportswear/men/mens-football-shorts",
      approvedImageUrl: "https://irhaapparels.com/img/a.jpg",
      factualDescription: "B2B manufacturing planned record.",
    }) as Record<string, unknown>;
    expect(schema["@type"]).toBe("Product");
    for (const forbidden of [
      "offers",
      "price",
      "priceCurrency",
      "availability",
      "aggregateRating",
      "review",
      "gtin",
      "gtin13",
      "mpn",
    ]) {
      expect(schema).not.toHaveProperty(forbidden);
    }
    expect(schema.sku).toBe("IRHA-SPT-MEN-SHR-001");
    expect(schema.url).toBe(
      `${APEX_ORIGIN}/sportswear/men/mens-football-shorts/mens-football-shorts-design-01`,
    );
  });

  it("CollectionPage schema uses apex canonical, no invented fields", () => {
    const c = buildCollectionPageSchema({
      name: "Sportswear",
      fullSlugPath: "sportswear",
    }) as Record<string, string>;
    expect(c["@type"]).toBe("CollectionPage");
    expect(c.url).toBe(`${APEX_ORIGIN}/sportswear`);
  });

  it("humanizeSlug converts hyphenated slugs to title case", () => {
    expect(humanizeSlug("mens-short-lederhosen")).toBe("Mens Short Lederhosen");
    expect(humanizeSlug("bavarian-trachten-wear")).toBe(
      "Bavarian Trachten Wear",
    );
  });
});
