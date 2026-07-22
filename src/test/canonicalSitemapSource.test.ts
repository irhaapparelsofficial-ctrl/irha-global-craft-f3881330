import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sitemapSeed = readFileSync(resolve(process.cwd(), "scripts/generate-sitemap.ts"), "utf8");
const liveAugment = readFileSync(resolve(process.cwd(), "scripts/augment-sitemap-with-live-catalog.ts"), "utf8");

describe("canonical sitemap source", () => {
  it("keeps the static seed free of legacy catalogue and product arrays", () => {
    expect(sitemapSeed).not.toContain("CATALOG");
    expect(sitemapSeed).not.toContain("CATEGORIES");
    expect(sitemapSeed).not.toContain("supplementalCatalog");
    expect(sitemapSeed).not.toContain("catalogueSlugs");
    expect(sitemapSeed).not.toContain('path: "/catalogue"');
    expect(sitemapSeed).not.toContain("/catalogue/${");
  });

  it("delegates published products and taxonomy routes to owner Supabase", () => {
    expect(sitemapSeed).toContain("canonical catalogue and taxonomy routes are appended from owner Supabase");
    expect(liveAugment).toContain("get_public_sitemap_entries");
    expect(liveAugment).toContain("expected 254 published Drive products");
    expect(liveAugment).toContain("manifestPaths");
    expect(liveAugment).toContain("taxonomyPages");
  });
});
