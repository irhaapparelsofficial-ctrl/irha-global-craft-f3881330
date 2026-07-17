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

  it("retains the complete production asset preparation separately", () => {
    const pkg = JSON.parse(read("package.json")) as {
      scripts: Record<string, string>;
    };

    expect(pkg.scripts["prepare:public-assets"]).toContain("generate-sitemap.ts");
    expect(pkg.scripts["prepare:public-assets"]).toContain("generate:thumbnails");
    expect(pkg.scripts["prepare:public-assets"]).toContain("generate:catalog-pdfs");
    expect(pkg.scripts["build:frontend"]).toBe(
      "node scripts/clean-transient-public-builds.mjs && npm run prepare:public-assets && npm --ignore-scripts run build",
    );
    expect(pkg.scripts.prebuild).toContain("verify-migration-order.mjs");
    expect(pkg.scripts.prebuild).toContain("npm run prepare:public-assets");
  });
});
