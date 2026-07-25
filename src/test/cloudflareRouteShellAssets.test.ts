import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CORE_ROUTE_CONTENT } from "@/lib/routeContent.mjs";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const requiredCoreRoutes = ["/products", "/contact", "/inquiry"] as const;

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
    expect(patcher).toContain('const REQUIRED_CORE_ROUTE_SHELLS = ["/products", "/contact", "/inquiry"]');
  });

  it("validates route-specific core shells from the canonical content and identity sources", () => {
    const patcher = read("scripts/patch-cloudflare-route-shell-assets.mjs");
    for (const route of requiredCoreRoutes) {
      expect(CORE_ROUTE_CONTENT[route]?.route).toBe(route);
    }
    for (const token of [
      "CORE_ROUTE_CONTENT",
      "PUBLIC_IDENTITY",
      'data-irha-route-shell="${route}"',
      'data-irha-route-content="core"',
      "content.h1",
      "content.intro",
      "content.sections.flatMap",
      "verifyCanonicalOrganization",
      "OBSOLETE_GENERIC_FINGERPRINTS",
    ]) {
      expect(patcher).toContain(token);
    }
    expect(patcher).not.toContain("function verifyRichRouteShells");
    expect(patcher).not.toContain('const REQUIRED_ROUTE_SHELLS = ["products", "contact", "inquiry"]');
  });
});
