import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("product shortlist and compare RFQ journey", () => {
  it("lets buyers add or remove a product from comparison on the product page", () => {
    const product = read("src/pages/ProductDetail.tsx");
    expect(product).toContain("useCompare");
    expect(product).toContain("const compareFull = !inCompare && compare.items.length >= 4");
    expect(product).toContain('data-track="product-compare-toggle"');
    expect(product).toContain('to="/compare"');
    expect(product).toContain("Compare Full");
  });

  it("keeps full product identity in quote and reference-design handoffs", () => {
    const product = read("src/pages/ProductDetail.tsx");
    expect(product).toContain("intent=rfq&product=");
    expect(product).toContain("&name=${encodeURIComponent(product.name)}");
    expect(product).toContain("&category=${encodeURIComponent(category.slug)}");
    expect(product).toContain("intent=reference");
  });

  it("blocks structured compare RFQ until all selected products have current published specs", () => {
    const compare = read("src/pages/Compare.tsx");
    expect(compare).toContain("const canSubmitRfq =");
    expect(compare).toContain("unavailableCount === 0");
    expect(compare).toContain("columns.every((column) => Boolean(column.product))");
    expect(compare).toContain('aria-disabled="true"');
    expect(compare).toContain('data-track="compare-structured-rfq"');
  });

  it("preserves a WhatsApp fallback and selected-product context", () => {
    const compare = read("src/pages/Compare.tsx");
    expect(compare).toContain("whatsappLink(whatsappMsg)");
    expect(compare).toContain("compare.items.map((item, index)");
    expect(compare).toContain("WhatsApp remains available for assistance");
  });

  it("keeps shortlist and compare query context compatible with the inquiry wizard", () => {
    const shortlist = read("src/pages/Shortlist.tsx");
    const compare = read("src/pages/Compare.tsx");
    const inquiry = read("src/pages/Inquiry.tsx");
    expect(shortlist).toContain("shortlist=");
    expect(shortlist).toContain("&names=");
    expect(compare).toContain("compare=");
    expect(compare).toContain("&compareNames=");
    expect(inquiry).toContain('listParam(params, "shortlist")');
    expect(inquiry).toContain('listParam(params, "compare")');
  });
});
