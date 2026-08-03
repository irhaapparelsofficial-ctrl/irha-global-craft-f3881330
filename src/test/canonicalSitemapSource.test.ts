import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const sitemapSeed = readFileSync(resolve(process.cwd(), "scripts/generate-sitemap.ts"), "utf8");
const liveAugment = readFileSync(resolve(process.cwd(), "scripts/augment-sitemap-with-live-catalog.ts"), "utf8");
const cloudflareSitemap = readFileSync(resolve(process.cwd(), "functions/sitemap.xml.js"), "utf8");

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

  it("uses the same canonical Supabase sitemap RPC at the Cloudflare edge", () => {
    expect(cloudflareSitemap).toContain("/rest/v1/rpc/get_public_sitemap_entries");
    expect(cloudflareSitemap).toContain('endpoint.searchParams.set("select", "path,lastmod,entry_kind")');
    expect(cloudflareSitemap).toContain('entryKind !== "product" && entryKind !== "taxonomy"');
    expect(cloudflareSitemap).toContain('pathname.startsWith("/products/")');
    expect(cloudflareSitemap).toContain('pathname === "/catalogue"');
    expect(cloudflareSitemap).not.toContain("category:categories!inner");
    expect(cloudflareSitemap).not.toContain("categorySlug");
    expect(cloudflareSitemap).not.toContain("/products/${categorySlug}/${productSlug}");
  });

  it("keeps the retired duplicate catalogue implementation deleted", () => {
    for (const path of [
      "src/pages/Catalogue.tsx",
      "src/pages/CatalogueCategory.tsx",
      "src/lib/catalogueGroups.ts",
    ]) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(false);
    }
  });
});
