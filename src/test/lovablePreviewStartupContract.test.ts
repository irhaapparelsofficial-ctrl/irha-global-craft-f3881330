import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Lovable preview and frontend build contract", () => {
  it("keeps preview startup lightweight", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts.dev).toBe("vite");
    expect(pkg.scripts.predev).toContain("node scripts/clean-transient-public-builds.mjs");
    expect(pkg.scripts.predev).not.toContain("generate-sitemap");
    expect(pkg.scripts.predev).not.toContain("generate:thumbnails");
    expect(pkg.scripts.predev).not.toContain("generate:catalog-pdfs");
  });

  it("retains complete production asset preparation exactly once in the build command", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["prepare:public-assets"]).toContain("generate-sitemap.ts");
    expect(pkg.scripts["prepare:public-assets"]).toContain("generate:thumbnails");
    expect(pkg.scripts["prepare:public-assets"]).toContain("generate:catalog-pdfs");
    expect(pkg.scripts.build).toContain("npm run prepare:public-assets");
    expect(pkg.scripts["build:frontend"]).toBe(
      "node scripts/clean-transient-public-builds.mjs && npm --ignore-scripts run build",
    );
    expect(pkg.scripts.prebuild).toContain("verify-migration-order.mjs");
    expect(pkg.scripts.prebuild).not.toContain("npm run prepare:public-assets");
  });
});
