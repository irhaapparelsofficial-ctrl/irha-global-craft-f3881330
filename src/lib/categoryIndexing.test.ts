import { describe, expect, it } from "vitest";
import {
  categoryIndexingQueryKeys,
  shouldNoIndexCategorySearchParams,
} from "./categoryIndexing";

describe("category indexing query rules", () => {
  it("keeps canonical category and tracking-only URLs indexable", () => {
    expect(shouldNoIndexCategorySearchParams("")).toBe(false);
    expect(shouldNoIndexCategorySearchParams("utm_source=google&utm_campaign=de"))
      .toBe(false);
    expect(shouldNoIndexCategorySearchParams("sort=recommended&subcategory=all"))
      .toBe(false);
  });

  it("noindexes search, sort and filtered category states", () => {
    expect(shouldNoIndexCategorySearchParams("q=lederhosen")).toBe(true);
    expect(shouldNoIndexCategorySearchParams("sort=name")).toBe(true);
    expect(shouldNoIndexCategorySearchParams("sort=newest")).toBe(true);
    expect(shouldNoIndexCategorySearchParams("subcategory=lederhosen"))
      .toBe(true);
  });

  it("trims functional query values and publishes the controlled key set", () => {
    expect(shouldNoIndexCategorySearchParams("q=%20%20")).toBe(false);
    expect(categoryIndexingQueryKeys()).toEqual(["q", "sort", "subcategory"]);
  });
});
