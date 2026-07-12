import { describe, expect, it } from "vitest";
import { DEFAULT_FAQS } from "@/lib/defaultFaqs";
import { normalizeRoute, safeOptionalUrl, slugify, splitList } from "@/components/admin/content/contentCmsTypes";

describe("content CMS validation", () => {
  it("creates stable article slugs", () => {
    expect(slugify("  Private Label & OEM Guide  ")).toBe("private-label-oem-guide");
  });

  it("accepts clean internal routes and rejects unsafe routes", () => {
    expect(normalizeRoute(" /products/sportswear ")).toBe("/products/sportswear");
    expect(normalizeRoute("//malicious.example/path")).toBeNull();
    expect(normalizeRoute("/products?draft=true")).toBeNull();
    expect(normalizeRoute("javascript:alert(1)")).toBeNull();
  });

  it("allows internal or HTTPS media URLs only", () => {
    expect(safeOptionalUrl("/images/article.webp")).toBe("/images/article.webp");
    expect(safeOptionalUrl("https://example.com/article.webp")).toBe("https://example.com/article.webp");
    expect(safeOptionalUrl("http://example.com/article.webp")).toBeUndefined();
    expect(safeOptionalUrl("javascript:alert(1)")).toBeUndefined();
    expect(safeOptionalUrl(" ")).toBeNull();
  });

  it("normalizes tags and limits the public list", () => {
    const values = Array.from({ length: 30 }, (_, index) => `tag-${index}`).join(",");
    expect(splitList(values)).toHaveLength(20);
  });

  it("keeps verified fallback FAQ ids and questions unique", () => {
    expect(new Set(DEFAULT_FAQS.map((item) => item.id)).size).toBe(DEFAULT_FAQS.length);
    expect(new Set(DEFAULT_FAQS.map((item) => item.question.toLowerCase())).size).toBe(DEFAULT_FAQS.length);
    expect(DEFAULT_FAQS.every((item) => item.answer.length >= 10)).toBe(true);
  });
});
