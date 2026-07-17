import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Batch 1 public index cleanup", () => {
  it("removes the functional studio and retired articles from the sitemap", () => {
    const packageJson = read("package.json");
    const policy = read("scripts/enforce-public-index-policy.mjs");

    expect(packageJson).toContain("node scripts/enforce-public-index-policy.mjs sitemap");
    expect(packageJson).toContain("node scripts/enforce-public-index-policy.mjs build");
    expect(policy).toContain('const NON_INDEXABLE_PATHS = new Set(["/studio"])');
    expect(policy).toContain("/blog/streetwear-oem-pakistan");
    expect(policy).toContain("/blog/leather-grades-explained");
    expect(policy).toContain("/blog/fob-sialkot-vs-cif-pricing-explained");
  });

  it("locks the verified domain email into public HTML", () => {
    const policy = read("scripts/enforce-public-index-policy.mjs");
    const constants = read("src/lib/constants.ts");
    const settings = read("src/lib/siteSettings.ts");

    expect(policy).toContain('const OWNER_EMAIL = "irhaapparelsofficial@gmail.com"');
    expect(policy).toContain('const DOMAIN_EMAIL = "info@irhaapparels.com"');
    expect(policy).toContain("Owner Gmail leaked into public HTML");
    expect(constants).toContain('email: "info@irhaapparels.com"');
    expect(settings).toContain('email: "info@irhaapparels.com"');
  });

  it("returns real 404s for missing published route assets instead of the homepage", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");

    expect(patcher).toContain("FUNCTIONAL_SPA_PATHS");
    expect(patcher).toContain('const FUNCTIONAL_NOINDEX_PATHS = new Set(["/studio", "/shortlist", "/compare"])');
    expect(patcher).toContain("if (!explicitResponse.ok) return notFoundResponse(request, pathname)");
    expect(patcher).toContain('withNoIndexHeaders(assetResponse, "functional-public-tool")');
    expect(patcher).not.toContain("if (!explicitResponse.ok) return env.ASSETS.fetch(request)");
  });
});
