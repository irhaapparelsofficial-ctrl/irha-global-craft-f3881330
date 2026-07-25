import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  PUBLIC_IDENTITY,
  buildCanonicalHomepageWebPageSchema,
  buildCanonicalOrganizationSchema,
  buildCanonicalWebsiteSchema,
} from "@/lib/publicIdentity.mjs";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Google brand visibility controls", () => {
  it("strengthens the exact Irha Apparels homepage entity signals during every build", () => {
    const ensureHome = read("scripts/ensure-home-structured-data.mjs");
    const patch = read("scripts/strengthen-brand-search-signals.mjs");
    const organization = buildCanonicalOrganizationSchema();
    const website = buildCanonicalWebsiteSchema();
    const homepage = buildCanonicalHomepageWebPageSchema();

    expect(ensureHome).toContain('from "../src/lib/publicIdentity.mjs"');
    expect(ensureHome).toContain('await import("./strengthen-brand-search-signals.mjs")');
    expect(ensureHome).not.toContain("alternateName");
    expect(organization).toMatchObject({
      "@id": PUBLIC_IDENTITY.organizationId,
      name: PUBLIC_IDENTITY.name,
      logo: PUBLIC_IDENTITY.logoUrl,
      email: PUBLIC_IDENTITY.email,
      telephone: PUBLIC_IDENTITY.telephone,
      sameAs: PUBLIC_IDENTITY.sameAs,
    });
    expect(website).toMatchObject({
      "@id": PUBLIC_IDENTITY.websiteId,
      publisher: { "@id": PUBLIC_IDENTITY.organizationId },
    });
    expect(homepage).toMatchObject({
      "@type": "WebPage",
      "@id": PUBLIC_IDENTITY.homepageId,
      isPartOf: { "@id": PUBLIC_IDENTITY.websiteId },
      publisher: { "@id": PUBLIC_IDENTITY.organizationId },
    });
    expect(patch).toContain("PUBLIC_IDENTITY.homepage.title");
    expect(patch).toContain(`const BRAND_H1 = "${PUBLIC_IDENTITY.homepage.heading}"`);
    expect(patch).toContain("if (BRAND_H1 !== PUBLIC_IDENTITY.homepage.heading)");
    expect(patch).toContain("Homepage H1 contract drifted from publicIdentity.mjs");
    expect(patch).toContain("/products/bavarian-trachten-wear");
    expect(patch).toContain("/products/premium-leather-apparel");
    expect(patch).toContain("/products/streetwear-activewear");
  });

  it("consolidates stale category and unsupported editorial URLs into verified canonical pages", () => {
    const redirects = read("public/_redirects");
    const generator = read("scripts/generate-buyer-ready-redirects.ts");
    const verifier = read("scripts/verify-route-parity-build.ts");
    const workerPatch = read("scripts/patch-worker-route-parity.mjs");
    const plushSource = "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe";
    const plushCanonical = "/products/leisure-nightwear/women/robes/womens-plush-robe";

    for (const redirect of [
      "/products/bavarian-garments /products/bavarian-trachten-wear 301",
      "/products/leather-garments /products/premium-leather-apparel 301",
      "/products/streetwear /products/streetwear-activewear 301",
      "/products/streetwear/oversized-hoodie /products/streetwear-activewear/unisex/tops/oversized-pullover-hoodie 301",
      "/blog/dirndl-manufacturer-moq-50 /products/bavarian-trachten-wear/women/dirndl-dresses 301",
    ]) {
      expect(redirects).toContain(redirect);
    }
    expect(redirects).not.toContain(plushSource);
    expect(generator).toContain("reference_code.toLowerCase()");
    expect(generator).toContain("if (localizedCanonical) return localizedCanonical");
    expect(generator).toContain("approvedRows.forEach(add)");
    expect(workerPatch).toContain(plushCanonical);
    expect(verifier).toContain(plushCanonical);
    expect(verifier).toContain("Duplicate final redirect source");
    expect(verifier).toContain("Final redirect target is not canonical");
    expect(redirects).not.toContain("/products/streetwear-activewear/oversized-streetwear-hoodie 301");
    expect(redirects).not.toContain("/products/leisure-nightwear/plush-bathrobe-sleep-robe 301");
  });

  it("keeps the buyer-safe Custom Lab accessible but temporarily outside the public search index", () => {
    const redirects = read("public/_redirects");
    const policy = read("scripts/enforce-public-index-policy.mjs");

    expect(redirects).not.toContain("/studio /inquiry");
    expect(policy).toContain('const NON_INDEXABLE_PATHS = new Set(["/studio"])');
    expect(policy).toContain('"studio/index.html"');
    expect(policy).toContain('/blog/dirndl-manufacturer-moq-50');
    expect(policy).toContain('"blog/dirndl-manufacturer-moq-50/index.html"');
  });
});
