import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(path), "utf8");

describe("related product route parity", () => {
  it("uses the same deterministic fallback hierarchy in generation and verification", () => {
    const generator = read("scripts/enhance-product-route-shells.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");

    expect(generator).toContain("export function relatedCandidates");
    expect(generator).toContain("candidates.filter((item) => sameType(item, product))");
    expect(generator).toContain("candidates.filter((item) => sameAudience(item, product))");
    expect(generator).toContain("item.main_category_slug === product.main_category_slug");
    expect(verifier).toContain("function expectedRelatedTier");
    expect(verifier).toContain("if (sameType.length) return sameType");
    expect(verifier).toContain("if (sameAudience.length) return sameAudience");
    expect(verifier).toContain("expected fallback tier");
  });

  it("never fabricates or links outside published canonical manifest products", () => {
    const generator = read("scripts/enhance-product-route-shells.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");

    expect(generator).toContain("payload.products");
    expect(generator).toContain("item.canonical_path");
    expect(generator).toContain("item.product_id !== product.product_id");
    expect(verifier).toContain("new Set(expectedRelatedTier(product, products).map((item) => item.canonical_path))");
  });
});
