import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/CategoryTaxonomyPage.tsx"), "utf8");

describe("taxonomy collection conversion journey", () => {
  it("uses structured RFQ as the primary taxonomy quote action", () => {
    expect(source).toContain("const structuredQuoteLink = `/inquiry?intent=rfq&category=");
    expect(source).toContain('data-track="taxonomy-structured-rfq"');
    expect(source).toContain("categoryName=${encodeURIComponent(quoteContext)}");
    expect(source).toContain("collectionName=${encodeURIComponent(collectionName ?? collection.name)}");
  });

  it("preserves WhatsApp as a secondary assisted channel", () => {
    expect(source).toContain("const quoteWhatsappMessage =");
    expect(source).toContain("href={whatsappLink(quoteWhatsappMessage)}");
    expect(source).toContain("rel=\"noreferrer noopener\"");
  });

  it("lets buyers save and compare products directly from live collection cards", () => {
    expect(source).toContain("useShortlist");
    expect(source).toContain("useCompare");
    expect(source).toContain("shortlist.toggle(storedProduct)");
    expect(source).toContain("compare.toggle(storedProduct)");
    expect(source).toContain("const compareFull = !inCompare && compare.items.length >= 4");
    expect(source).toContain("Comparison is limited to four products");
  });

  it("turns an empty collection into an assisted custom-review path", () => {
    expect(source).toContain("Request custom review");
    expect(source).toContain("Share a reference or requirement");
    expect(source).toContain("to={structuredQuoteLink}");
  });

  it("keeps product detail routes and the explicit taxonomy hierarchy intact", () => {
    expect(source).toContain("taxonomyAudiencePath");
    expect(source).toContain("taxonomyCollectionPath");
    expect(source).toContain("const productPath = (productSlug: string) =>");
    expect(source).toContain("`/products/${category.slug}/${audience.slug}/${collection.slug}/${productSlug}`");
    expect(source).toContain("`/products/${category.slug}/${productSlug}`");
    expect(source).toContain("<CategoryAudienceNavigator category={category} locale={locale} taxonomy={taxonomy} />");
    expect(source).toContain("publishedTaxonomy.taxonomy ?? buildCategoryTaxonomy(category)");
  });
});
