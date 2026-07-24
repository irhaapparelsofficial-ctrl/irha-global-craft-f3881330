import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { relatedCandidates, type RelatedProductRoute } from "../../scripts/related-product-policy";

const route = (product_id: string, main_category_slug: string, audience_slug: string, product_type_slug: string): RelatedProductRoute => ({
  product_id,
  canonical_path: `/products/${main_category_slug}/${audience_slug}/${product_type_slug}/${product_id}`,
  main_category_slug,
  audience_slug,
  product_type_slug,
});

describe("related product route parity policy", () => {
  it("selects same type, then same audience, then same main category without fabricated routes", () => {
    const target = route("target", "sportswear", "men", "football-kits");
    const sameType = route("same-type", "sportswear", "men", "football-kits");
    const sameAudience = route("same-audience", "sportswear", "men", "training-wear");
    const sameMain = route("same-main", "sportswear", "women", "teamwear");
    const unrelated = route("unrelated", "premium-leather-apparel", "men", "leather-jackets");

    expect(relatedCandidates([target, sameMain, unrelated, sameAudience, sameType], target).map((item) => item.product_id)).toEqual([
      "same-type",
      "same-audience",
      "same-main",
    ]);
  });

  it("keeps reconciliation strict and removes the preview related-link exception", () => {
    const reconciliation = readFileSync(resolve("scripts/reconcile-related-product-route-findings.ts"), "utf8");
    const evaluator = readFileSync(resolve("scripts/evaluate-preview-route-parity.ts"), "utf8");
    const previewWorkflow = readFileSync(resolve(".github/workflows/cloudflare-pages-preview.yml"), "utf8");
    const productionWorkflow = readFileSync(resolve(".github/workflows/production-route-parity.yml"), "utf8");

    expect(reconciliation).toContain("relatedCandidates(manifest.products, product)");
    expect(reconciliation).toContain("unresolved.length");
    expect(evaluator).not.toContain('finding.code === "missing_related_product_link"');
    expect(evaluator).toContain('finding.code === "sitemap_noindex"');
    expect(previewWorkflow).toContain("Reconcile related-product route evidence");
    expect(productionWorkflow).toContain("Reconcile related-product route evidence");
  });
});
