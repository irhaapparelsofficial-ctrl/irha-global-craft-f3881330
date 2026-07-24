import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("related product route parity", () => {
  it("uses the same deterministic fallback hierarchy in generation and verification", () => {
    const generator = read("scripts/enhance-product-route-shells.ts");
    const policy = read("scripts/related-product-policy.ts");
    const reconciliation = read("scripts/reconcile-related-product-route-findings.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");

    expect(generator).toContain('import { relatedCandidates } from "./related-product-policy"');
    expect(policy).toContain("export function relatedCandidates");
    expect(policy).toContain("candidates.filter((item) => sameType(item, product))");
    expect(policy).toContain("candidates.filter((item) => sameAudience(item, product))");
    expect(policy).toContain("item.main_category_slug === product.main_category_slug");
    expect(reconciliation).toContain("relatedCandidates(manifest.products, product)");
    expect(verifier).toContain("function expectedRelatedTier");
    expect(verifier).toContain("if (sameType.length) return sameType");
    expect(verifier).toContain("if (sameAudience.length) return sameAudience");
    expect(verifier).toContain("expected fallback tier");
  });

  it("never fabricates or links outside published canonical manifest products", () => {
    const generator = read("scripts/enhance-product-route-shells.ts");
    const policy = read("scripts/related-product-policy.ts");
    const reconciliation = read("scripts/reconcile-related-product-route-findings.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");

    expect(generator).toContain("payload.products");
    expect(generator).toContain("item.canonical_path");
    expect(policy).toContain("item.product_id !== product.product_id");
    expect(reconciliation).toContain("allowed.includes(link)");
    expect(verifier).toContain("new Set(expectedRelatedTier(product, products).map((item) => item.canonical_path))");
  });
});
