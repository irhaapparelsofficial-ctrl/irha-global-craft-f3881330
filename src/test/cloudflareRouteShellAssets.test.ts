import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cloudflare crawler route asset contract", () => {
  it("patches production builds to serve explicit nested route HTML", () => {
    const packageJson = read("package.json");
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");

    expect(packageJson).toContain("node scripts/enrich-generic-static-route-shells.mjs && node scripts/patch-cloudflare-route-shell-assets.mjs");
    expect(patcher).toContain('return `${normalized}/index.html`');
    expect(patcher).toContain("routeShellAssetResponse");
    expect(patcher).toContain("X-Irha-Route-Shell-Asset");
    expect(patcher).toContain("canonicalPathRedirect(request, url, pathname)");
    expect(patcher).toContain('const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"]');
  });

  it("derives dynamic public route validity from the exact generated sitemap", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    expect(patcher).toContain('const SITEMAP_PATH = resolve("dist/sitemap.xml")');
    expect(patcher).toContain("extractManifestRoutes");
    expect(patcher).toContain("GENERATED_PUBLIC_ROUTES");
    expect(patcher).toContain("FUNCTIONAL_HTML_PREFIXES");
    expect(patcher).toContain("if (GENERATED_PUBLIC_ROUTES.has(normalized)) return true");
    expect(patcher).toContain('if (worker.includes("return PUBLIC_PREFIXES.some"))');
    expect(patcher).toContain("Cloudflare worker still blanket-allows dynamic public prefixes");
  });

  it("returns true 404 when a manifest route shell asset is missing", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    expect(patcher).toContain("if (!explicitResponse.ok) return notFoundResponse(request, pathname)");
    expect(patcher).not.toContain("if (!explicitResponse.ok) return env.ASSETS.fetch(request)");
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
