import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cloudflare crawler route asset contract", () => {
  it("patches production builds after product and taxonomy parity transforms", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: { build: string; "build:dev": string } };
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");

    for (const command of [packageJson.scripts.build, packageJson.scripts["build:dev"]]) {
      const generic = command.indexOf("node scripts/enrich-generic-static-route-shells.mjs");
      const product = command.indexOf("npx tsx scripts/enhance-product-route-shells.ts");
      const taxonomy = command.indexOf("npx tsx scripts/align-taxonomy-route-shells.ts");
      const assets = command.indexOf("node scripts/patch-cloudflare-route-shell-assets.mjs");
      expect(generic).toBeGreaterThan(-1);
      expect(product).toBeGreaterThan(generic);
      expect(taxonomy).toBeGreaterThan(product);
      expect(assets).toBeGreaterThan(taxonomy);
    }
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
