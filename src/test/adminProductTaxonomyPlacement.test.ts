import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/admin/ProductsPanel.tsx"),
  "utf8",
);

describe("admin product taxonomy placement", () => {
  it("loads exact taxonomy leaves and current product assignments", () => {
    expect(source).toContain('from("catalog_taxonomy_nodes")');
    expect(source).toContain('from("product_taxonomy_assignments")');
    expect(source).toContain('node.depth === 2 && node.node_type === "product_type"');
    expect(source).toContain("Main Category → Audience → Product Type");
  });

  it("keeps new or changed placement under one-record owner review", () => {
    expect(source).toContain('review_state: "proposed"');
    expect(source).toContain('assignment_source: "admin"');
    expect(source).toContain('.upsert(assignmentPayload, { onConflict: "product_id" })');
    expect(source).toContain("placement approval required");
    expect(source).not.toContain("Approve all");
    expect(source).not.toContain("Publish hierarchy");
  });

  it("supports editable reference codes, safe copy suggestions and canonical preview", () => {
    expect(source).toContain("suggestProductReferenceCode");
    expect(source).toContain("normalizeProductReferenceCode");
    expect(source).toContain("Suggest safe B2B SEO copy");
    expect(source).toContain("taxonomyProductPublicUrl");
    expect(source).toContain("Do not publish unverified material");
  });

  it("retains product image upload, responsive media processing and quotation-only rules", () => {
    expect(source).toContain("uploadProductImages");
    expect(source).toContain("JPG, PNG or WebP");
    expect(source).toContain("Pricing remains quotation-only");
    expect(source).toContain("object-contain");
  });
});
