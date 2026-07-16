import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "src/pages/ProductDetail.tsx"), "utf8");

describe("live database product first load", () => {
  it("waits for the database fetch before redirecting a product absent from the committed fallback", () => {
    expect(source).toContain("const { data, isLoading, isFetching, error }");
    expect(source).toContain("isLoading || (isFetching && !data)");
    expect(source.indexOf("isLoading || (isFetching && !data)")).toBeLessThan(
      source.indexOf("if (error || !data)"),
    );
  });
});
