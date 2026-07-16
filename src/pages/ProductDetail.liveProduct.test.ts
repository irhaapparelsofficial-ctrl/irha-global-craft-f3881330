import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("./ProductDetail.tsx", import.meta.url), "utf8");

describe("live database product first load", () => {
  it("waits for the database fetch before redirecting a product absent from the committed fallback", () => {
    expect(source).toContain("const { data, isLoading, isFetching, error }");
    expect(source).toContain("isLoading || (isFetching && !data)");
    expect(source.indexOf("isLoading || (isFetching && !data)")).toBeLessThan(
      source.indexOf("if (error || !data)"),
    );
  });
});
