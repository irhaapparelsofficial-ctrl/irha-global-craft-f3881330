import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const patch = readFileSync(resolve(process.cwd(), "scripts/patch-cloudflare-route-shell-assets.mjs"), "utf8");
const functionalFinalizer = readFileSync(resolve(process.cwd(), "scripts/finalize-cloudflare-functional-routes.mjs"), "utf8");
const packageJson = readFileSync(resolve(process.cwd(), "package.json"), "utf8");
const worker = readFileSync(resolve(process.cwd(), "public/_worker.js"), "utf8");

describe("Cloudflare exact catalogue route contract", () => {
  it("builds the edge allowlist from route shells and the 254-product manifest", () => {
    expect(patch).toContain('resolve("dist/products")');
    expect(patch).toContain('resolve("dist/catalog-route-manifest.json")');
    expect(patch).toContain("manifest?.productCount !== 254");
    expect(patch).toContain("PUBLISHED_CATALOG_PATHS");
    expect(patch).toContain("product.canonical_path");
  });

  it("injects approved one-hop redirects before exact route validation", () => {
    expect(patch).toContain('resolve("dist/_redirects")');
    expect(patch).toContain("GENERATED_LEGACY_ALIASES");
    expect(patch).toContain("generatedLegacyAliasTarget(pathname) || legacyAliasTarget(pathname)");
  });

  it("keeps exact valid spec sheets on SPA rendering without weakening unknown-route 404s", () => {
    expect(patch).toContain('/spec-sheet`');
    expect(functionalFinalizer).toContain('normalized.endsWith("/spec-sheet")');
    expect(functionalFinalizer).toContain("!isPublishedHtmlRoute(normalized)");
    expect(packageJson).toContain("node scripts/finalize-cloudflare-functional-routes.mjs");
  });

  it("returns a real edge 404 for unknown catalogue paths", () => {
    expect(patch).toContain("!isPublishedHtmlRoute(pathname)");
    expect(patch).toContain("return notFoundResponse(request, pathname)");
    expect(worker).toContain("status: 404");
    expect(worker).toContain('"X-Irha-Route-Status": "not-found"');
  });
});
