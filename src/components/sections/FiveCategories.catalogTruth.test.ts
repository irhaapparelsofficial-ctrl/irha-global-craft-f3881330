import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "src/components/sections/FiveCategories.tsx"),
  "utf8",
);

describe("FiveCategories catalogue truth", () => {
  it("does not publish derived hardcoded product totals", () => {
    expect(source).not.toContain("const productCount = products.length");
    expect(source).not.toContain("`${productCount} products`");
  });

  it("uses requirement-led category language until the DB-only snapshot cutover", () => {
    expect(source).toContain("Requirement-led program");
    expect(source).toContain("current catalogue release");
  });
});
