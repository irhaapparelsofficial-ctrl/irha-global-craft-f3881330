import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("advanced product SEO and AEO contracts", () => {
  it("uses one shared product-specific content resolver for static and hydrated output", () => {
    const manifest = read("scripts/generate-buyer-ready-catalog-manifest.ts");
    const runtime = read("src/pages/CanonicalProductDetail.tsx");
    const shells = read("scripts/generate-static-route-shells.ts");
    const seoManifest = read("scripts/finalize-seo-route-manifest.ts");
    const parityCrawler = read("scripts/crawl-production-route-parity.ts");

    expect(manifest).toContain("resolveBuyerReadyProductContent");
    expect(runtime).toContain("resolveBuyerReadyProductContent");
    expect(shells).toContain("product.opening_answer");
    expect(seoManifest).toContain("product.body_text");
    expect(parityCrawler).toContain("resolveBuyerReadyProductContent");
    expect(parityCrawler).toContain("expectedTitle: content.seoTitle");
    expect(parityCrawler).toContain("expectedDescription: content.description");
  });

  it("maps every product to one canonical commercial query cluster", () => {
    const manifest = read("scripts/generate-buyer-ready-catalog-manifest.ts");

    expect(manifest).toContain("one-primary-commercial-query-cluster-to-one-canonical-product-url");
    expect(manifest).toContain("primaryQueries.has");
    expect(manifest).toContain("seo-query-to-url-map.json");
    expect(manifest).toContain("External demand metrics are maintained separately and must never be fabricated.");
    expect(manifest).toContain("MEASURED_SEED_RESEARCH");
    expect(manifest).toContain("estimatedDemand: null");
    expect(manifest).toContain("currentRankingUrl: null");
    expect(manifest).toContain("measurementStatus");
  });

  it("fails release generation on materially duplicated or thin product content", () => {
    const manifest = read("scripts/generate-buyer-ready-catalog-manifest.ts");

    expect(manifest).toContain("Materially duplicated product descriptions");
    expect(manifest).toContain("similarity >= 0.92");
    expect(manifest).toContain("row.body_text.split");
    expect(manifest).toContain("row.buyer_faqs.length < 2");
  });

  it("publishes truthful quotation-led Product schema without commerce inventions", () => {
    const runtime = read("src/pages/CanonicalProductDetail.tsx");
    const shells = read("scripts/generate-static-route-shells.ts");

    expect(runtime).toContain('"@type": "Product"');
    expect(runtime).not.toContain('"@type": "Service"');
    expect(runtime).toContain("manufacturer: { \"@id\": ORGANIZATION_ID }");
    expect(shells).toContain('"@type": "Product"');
    expect(shells).not.toContain("aggregateRating:");
    expect(shells).not.toContain("offers:");
    expect(shells).not.toContain("price:");
  });

  it("keeps product images dimensioned and FAQs visible in both render paths", () => {
    const runtime = read("src/pages/CanonicalProductDetail.tsx");
    const shells = read("scripts/generate-static-route-shells.ts");

    expect(runtime.match(/width=\{1200\}/g)?.length).toBeGreaterThanOrEqual(3);
    expect(runtime.match(/height=\{1200\}/g)?.length).toBeGreaterThanOrEqual(3);
    expect(runtime).toContain("Sampling and approval workflow");
    expect(runtime).toContain("buyerContent.faqs.map");
    expect(shells).toContain('width="1200" height="1200"');
    expect(shells).toContain("product.buyer_faqs");
  });

  it("does not expose prohibited website-age messaging in new ranking content", () => {
    for (const path of [
      "src/lib/buyerReadyProductContent.ts",
      "src/pages/CanonicalProductDetail.tsx",
      "scripts/generate-buyer-ready-catalog-manifest.ts",
      "scripts/generate-static-route-shells.ts",
    ]) {
      expect(read(path)).not.toMatch(/newly built|new website|website is new/i);
    }
  });
});
