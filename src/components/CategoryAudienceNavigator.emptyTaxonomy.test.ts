import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/CategoryAudienceNavigator.tsx"),
  "utf8",
);

describe("CategoryAudienceNavigator empty taxonomy guard", () => {
  it("removes empty audiences before public links are rendered", () => {
    expect(source).toContain("audience.productCount > 0 && audience.collections.length > 0");
    expect(source).toContain("if (visibleAudiences.length === 0) return null");
    expect(source).toContain("visibleAudiences.map((audience)");
  });

  it("removes empty collections from every visible audience", () => {
    expect(source).toContain("collection.products.length > 0");
    expect(source).toContain("const visibleCollections = audience.collections.slice");
  });
});
