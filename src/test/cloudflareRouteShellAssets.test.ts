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
