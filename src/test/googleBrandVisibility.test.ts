import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Google brand visibility controls", () => {
  it("strengthens the exact Irha Apparels homepage entity signals during every build", () => {
    const ensureHome = read("scripts/ensure-home-structured-data.mjs");
    const patch = read("scripts/strengthen-brand-search-signals.mjs");

    expect(ensureHome).toContain('await import("./strengthen-brand-search-signals.mjs")');
    expect(ensureHome).toContain('alternateName: "Irha Apparels Sialkot"');
    expect(patch).toContain("Irha Apparels | B2B Apparel Manufacturer in Sialkot, Pakistan");
    expect(patch).toContain("Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers");
    expect(patch).toContain("/products/bavarian-trachten-wear");
    expect(patch).toContain("/products/premium-leather-apparel");
    expect(patch).toContain("/products/streetwear-activewear");
  });

  it("consolidates stale category and unsupported editorial URLs into verified canonical pages", () => {
    const redirects = read("public/_redirects");

    for (const redirect of [
      "/products/bavarian-garments /products/bavarian-trachten-wear 301",
      "/products/leather-garments /products/premium-leather-apparel 301",
      "/products/streetwear /products/streetwear-activewear 301",
      "/products/streetwear/oversized-hoodie /products/streetwear-activewear/unisex/tops/oversized-pullover-hoodie 301",
      "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe /products/leisure-nightwear/women/robes/womens-plush-robe 301",
      "/blog/dirndl-manufacturer-moq-50 /products/bavarian-trachten-wear/women/dirndl-dresses 301",
    ]) {
      expect(redirects).toContain(redirect);
    }
    expect(redirects).not.toContain("/products/streetwear-activewear/oversized-streetwear-hoodie 301");
    expect(redirects).not.toContain("/products/leisure-nightwear/plush-bathrobe-sleep-robe 301");
  });

  it("keeps the buyer-safe Custom Lab accessible but temporarily outside the public search index", () => {
    const redirects = read("public/_redirects");
    const policy = read("scripts/enforce-public-index-policy.mjs");

    expect(redirects).not.toContain("/studio /inquiry");
    expect(policy).toContain('const NON_INDEXABLE_PATHS = new Set(["/studio"])');
    expect(policy).toContain('"studio/index.html"');
    expect(policy).toContain('"/blog/dirndl-manufacturer-moq-50"');
    expect(policy).toContain('"blog/dirndl-manufacturer-moq-50/index.html"');
  });
});
