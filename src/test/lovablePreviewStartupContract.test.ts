import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const occurrences = (value: string, token: string) => value.split(token).length - 1;

describe("Lovable preview and frontend build contract", () => {
  it("keeps preview startup lightweight", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.predev).toContain("node scripts/clean-transient-public-builds.mjs");
    expect(pkg.scripts.predev).not.toContain("generate-sitemap");
    expect(pkg.scripts.predev).not.toContain("finalize-seo-route-manifest");
    expect(pkg.scripts.predev).not.toContain("generate:thumbnails");
    expect(pkg.scripts.predev).not.toContain("generate:catalog-pdfs");
  });

  it("retains one authoritative production route-manifest preparation pass", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };
    const prepare = pkg.scripts["prepare:public-assets"];

    expect(occurrences(prepare, "finalize-seo-route-manifest.ts")).toBe(1);
    expect(prepare).toContain("generate-buyer-ready-catalog-manifest.ts");
    expect(prepare).toContain("generate-buyer-ready-redirects.ts");
    expect(prepare).toContain("generate:thumbnails");
    expect(prepare).toContain("generate:catalog-pdfs");

    expect(prepare).not.toContain("generate-sitemap.ts");
    expect(prepare).not.toContain("augment-sitemap-with-buyer-intent.ts");
    expect(prepare).not.toContain("merge-market-sitemap.ts");
    expect(prepare).not.toContain("append-b2b-platform-sitemap.mjs");
    expect(prepare).not.toContain("augment-sitemap-with-live-catalog.ts");

    expect(pkg.scripts.build).toContain("npm run prepare:public-assets");
    expect(occurrences(pkg.scripts.build, "apply-authoritative-seo-manifest.ts")).toBe(1);
    expect(occurrences(pkg.scripts.build, "seal-authoritative-worker.ts")).toBe(1);
    expect(pkg.scripts["build:frontend"]).toBe(
      "node scripts/clean-transient-public-builds.mjs && npm --ignore-scripts run build",
    );
    expect(pkg.scripts.prebuild).toContain("verify-migration-order.mjs");
    expect(pkg.scripts.prebuild).not.toContain("npm run prepare:public-assets");
  });
});
