import { describe, expect, it } from "vitest";
import { BLOG_POSTS } from "./blogPostsTrusted";

const prohibitedVisibleClaims = [
  /\b(?:MOQ|minimum(?: order)?(?: quantity)?)\s*(?:is|of|:)?\s*\d+/i,
  /\b\d+\s*[-–]\s*\d+\s*(?:working\s+)?days?\b/i,
  /\b(?:USD|EUR|GBP|PKR)\s*\d+/i,
  /[$€£]\s*\d+/,
  /\b(?:BSCI|Sedex|SMETA|GRS[- ]certified|GOTS|OEKO(?:-TEX)?|LWG|ISO\s*\d+)\b/i,
  /\b(?:every shipment|guaranteed delivery|guaranteed quality|free tech[- ]pack|free size split)\b/i,
  /\b(?:Flexible MOQ|our flexible MOQ|audit-on-request|regulatory-documentation-as-required|certified fabrics on request)\b/i,
  /\bFOB Sialkot\b/i,
];

const obsoleteCtaPaths = new Set([
  "/sportswear-manufacturer-pakistan",
  "/sportswear-manufacturer-sialkot",
  "/private-label-sportswear-manufacturer",
  "/streetwear-manufacturer-pakistan",
  "/custom-apparel-manufacturer-pakistan",
  "/leatherwear-manufacturer-pakistan",
  "/lederhosen-manufacturer",
  "/trachten-manufacturer",
  "/oktoberfest-clothing-manufacturer",
  "/germany-manufacturer",
  "/products/streetwear",
  "/products/leather",
  "/products/bavarian",
]);

function visibleText(post: (typeof BLOG_POSTS)[number]) {
  return [
    post.title,
    post.metaTitle,
    post.metaDescription,
    post.excerpt,
    post.heroAlt,
    ...post.blocks.flatMap((block) => {
      if (block.type === "ul") return block.items;
      return "text" in block ? [block.text] : [];
    }),
  ].join("\n");
}

describe("trusted SEO blog content", () => {
  it("preserves a unique, useful set of existing article URLs", () => {
    expect(BLOG_POSTS).toHaveLength(15);
    const slugs = BLOG_POSTS.map((post) => post.slug);
    expect(new Set(slugs).size).toBe(slugs.length);

    for (const slug of slugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    }
  });

  it("keeps metadata and article structure substantial", () => {
    for (const post of BLOG_POSTS) {
      expect(post.title.length).toBeGreaterThanOrEqual(30);
      expect(post.metaTitle.length).toBeGreaterThanOrEqual(35);
      expect(post.metaTitle.length).toBeLessThanOrEqual(75);
      expect(post.metaDescription.length).toBeGreaterThanOrEqual(100);
      expect(post.metaDescription.length).toBeLessThanOrEqual(190);
      expect(post.excerpt.length).toBeGreaterThanOrEqual(100);
      expect(post.readingMinutes).toBeGreaterThanOrEqual(6);
      expect(post.blocks.length).toBeGreaterThanOrEqual(10);
      expect(post.related.length).toBeGreaterThanOrEqual(3);
      expect(post.ctaInternalLinks.length).toBeGreaterThanOrEqual(2);
    }
  });

  it("does not publish unsupported fixed commercial or certification claims", () => {
    for (const post of BLOG_POSTS) {
      const text = visibleText(post);
      for (const pattern of prohibitedVisibleClaims) {
        expect(text, `${post.slug} matched ${pattern}`).not.toMatch(pattern);
      }
    }
  });

  it("only relates to articles that actually exist", () => {
    const slugs = new Set(BLOG_POSTS.map((post) => post.slug));
    for (const post of BLOG_POSTS) {
      for (const related of post.related) {
        expect(slugs.has(related.slug), `${post.slug} -> ${related.slug}`).toBe(true);
        expect(related.slug).not.toBe(post.slug);
      }
    }
  });

  it("uses canonical internal conversion paths instead of obsolete aliases", () => {
    for (const post of BLOG_POSTS) {
      for (const link of post.ctaInternalLinks) {
        expect(link.href.startsWith("/")).toBe(true);
        expect(link.href.startsWith("//")).toBe(false);
        expect(link.href).not.toContain(".." );
        expect(obsoleteCtaPaths.has(link.href), `${post.slug}: ${link.href}`).toBe(false);
      }
    }
  });
});
