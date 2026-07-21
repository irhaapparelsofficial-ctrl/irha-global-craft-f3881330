import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/pages/Studio.tsx"), "utf8");

describe("Studio canonical catalogue contract", () => {
  it("loads products from the published canonical route manifest", () => {
    expect(source).toContain('rpc("get_public_catalog_route_manifest")');
    expect(source).toContain('queryKey: ["studio-products", "canonical-route-manifest"]');
    expect(source).not.toContain('.from("products")');
    expect(source).not.toContain("categories!inner");
  });

  it("uses final taxonomy fields and resilient product media", () => {
    expect(source).toContain("main_category_slug");
    expect(source).toContain("audience_name");
    expect(source).toContain("product_type_name");
    expect(source).toContain("<ResilientImage");
  });

  it("keeps generated visuals non-binding and review-led", () => {
    expect(source).toContain("Concept preview only — non-binding");
    expect(source).toContain("Reference Visualization · Review Before Quote");
    expect(source).not.toMatch(/MOQ\s*50|45[- ]day/i);
  });
});
