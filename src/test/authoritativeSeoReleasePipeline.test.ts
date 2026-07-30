import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("authoritative SEO release pipeline", () => {
  it("aligns taxonomy metadata before deterministic manifest sealing", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    for (const scriptName of ["prepare:public-assets", "generate:market-sitemap"] as const) {
      const script = packageJson.scripts[scriptName];
      const finalize = script.indexOf("finalize-seo-route-manifest.ts");
      const align = script.indexOf("align-seo-manifest-taxonomy-runtime.ts");
      const seal = script.indexOf("seal-seo-manifest-determinism.mjs");
      expect(finalize).toBeGreaterThanOrEqual(0);
      expect(align).toBeGreaterThan(finalize);
      expect(seal).toBeGreaterThan(align);
    }
  });

  it("normalizes the boot landmark before route-specific shells are generated", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    for (const scriptName of ["build", "build:dev"] as const) {
      const script = packageJson.scripts[scriptName];
      const vite = script.indexOf("vite build");
      const normalize = script.indexOf("fix-boot-shell-semantics.mjs");
      const shells = script.indexOf("generate-static-route-shells.ts");
      expect(vite).toBeGreaterThanOrEqual(0);
      expect(normalize).toBeGreaterThan(vite);
      expect(shells).toBeGreaterThan(normalize);
    }
  });

  it("validates material route state only after final manifest transformations", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const exactCheck = "node scripts/generate-search-route-state.mjs --input dist/seo-route-manifest.json --output seo/search-route-state.json --check";

    for (const scriptName of ["build", "build:dev"] as const) {
      const script = packageJson.scripts[scriptName];
      const sealWorker = script.indexOf("seal-authoritative-worker.ts");
      const routeStateCheck = script.indexOf(exactCheck);
      const releaseIdentity = script.indexOf("generate-release-identity.ts");
      expect(sealWorker).toBeGreaterThanOrEqual(0);
      expect(routeStateCheck).toBeGreaterThan(sealWorker);
      expect(releaseIdentity).toBeGreaterThan(routeStateCheck);
    }

    expect(packageJson.scripts["prepare:public-assets"]).not.toContain("generate-search-route-state.mjs");
    expect(packageJson.scripts["generate:market-sitemap"]).not.toContain("generate-search-route-state.mjs");
  });

  it("generates production crawl inputs from the authoritative manifest without the append chain", () => {
    const workflow = read(".github/workflows/production-route-parity.yml");
    expect(workflow).toContain("finalize-seo-route-manifest.ts");
    expect(workflow).toContain("align-seo-manifest-taxonomy-runtime.ts");
    expect(workflow).toContain("seal-seo-manifest-determinism.mjs");
    expect(workflow).toContain("enforce-public-index-policy.mjs sitemap");
    expect(workflow).not.toContain("augment-sitemap-with-buyer-intent.ts");
    expect(workflow).not.toContain("merge-market-sitemap.ts");
    expect(workflow).not.toContain("append-b2b-platform-sitemap.mjs");
    expect(workflow).not.toContain("normalize-sitemap-lastmod.mjs");
  });
});
