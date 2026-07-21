import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cloudflare crawler route asset contract", () => {
  it("patches production builds to serve explicit nested route HTML", () => {
    const packageJson = read("package.json");
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");

    expect(packageJson).toContain("node scripts/enrich-generic-static-route-shells.mjs && node scripts/patch-cloudflare-route-shell-assets.mjs");
    expect(patcher).toContain('return normalized + "/index.html"');
    expect(patcher).toContain("routeShellAssetResponse");
    expect(patcher).toContain("X-Irha-Route-Shell-Asset");
    expect(patcher).toContain("canonicalPathRedirect(request, url, pathname)");
    expect(patcher).toContain('const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"]');
  });

  it("renders published canonical products from the owner Supabase catalogue", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");

    for (const token of [
      "CANONICAL_PRODUCT_ROUTE",
      "fetchPublishedProduct",
      'endpoint.searchParams.set("canonical_path", "eq." + pathname)',
      'endpoint.searchParams.set("is_published", "eq.true")',
      "productRouteShellResponse",
      'data-irha-product-route-shell="true"',
      'data-irha-product-jsonld="true"',
      'property="og:type" content="product"',
      "Product",
      "BreadcrumbList",
      "X-Irha-Product-Shell",
      "isCanonicalProductPath(pathname)",
      "product.image_url",
    ]) {
      expect(patcher).toContain(token);
    }
  });

  it("fails closed instead of serving the homepage for a missing product", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    expect(patcher).toContain("if (!product) return notFoundResponse(request, pathname)");
    expect(patcher).toContain('status: 503');
    expect(patcher).toContain('"X-Robots-Tag": "noindex, nofollow, noarchive"');
  });

  it("fails the build unless core route shells contain conversion and trust content", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    for (const token of [
      'data-irha-rich-route-shell="true"',
      "info@irhaapparels.com",
      "+92 320 4110066",
      "Five specialist apparel categories",
      "Request a Manufacturing Quote",
    ]) {
      expect(patcher).toContain(token);
    }
  });
});
