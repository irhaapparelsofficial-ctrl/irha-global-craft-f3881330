import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const source = readFileSync(resolve(process.cwd(), "src/pages/CategoryTaxonomyPage.tsx"), "utf8");

describe("taxonomy collection conversion journey", () => {
  it("uses structured RFQ or the populated inquiry cart as the primary taxonomy action", () => {
    expect(source).toContain("const structuredQuoteLink = `/inquiry?intent=rfq&category=");
    expect(source).toContain('data-track="taxonomy-structured-rfq"');
    expect(source).toContain("categoryName=${encodeURIComponent(quoteContext)}");
    expect(source).toContain("collectionName=${encodeURIComponent(collectionName ?? collection.name)}");
    expect(source).toContain('inquiryCart.count > 0 ? "/inquiry-cart" : structuredQuoteLink');
  });

  it("preserves WhatsApp as a secondary assisted channel", () => {
    expect(source).toContain("const quoteWhatsappMessage =");
    expect(source).toContain("href={whatsappLink(quoteWhatsappMessage)}");
    expect(source).toContain("rel=\"noreferrer noopener\"");
  });

  it("lets buyers add and compare products directly from live collection cards", () => {
    expect(source).toContain("useInquiryCart");
    expect(source).toContain("useCompare");
    expect(source).toContain("inquiryCart.toggle(inquiryProduct)");
    expect(source).toContain("compare.toggle(inquiryProduct)");
    expect(source).toContain("const compareFull = !inCompare && compare.items.length >= 4");
    expect(source).toContain("Comparison is limited to four products");
    expect(source).toContain("Add to Inquiry");
  });

  it("turns an empty collection into an assisted custom-review path", () => {
    expect(source).toContain("Request custom review");
    expect(source).toContain("Share a reference or requirement");
    expect(source).toContain("to={structuredQuoteLink}");
  });

  it("keeps product detail routes and the existing taxonomy hierarchy intact", () => {
    expect(source).toContain("taxonomyAudiencePath");
    expect(source).toContain("taxonomyCollectionPath");
    expect(source).toContain("const productPath = `/products/${category.slug}/${product.slug}`");
    expect(source).toContain("<CategoryAudienceNavigator category={category} locale={locale} />");
  });
});
