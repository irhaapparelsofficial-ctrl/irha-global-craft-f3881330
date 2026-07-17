import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("transient public build cleanup", () => {
  it("removes only hidden generated image workspaces before builds", () => {
    const script = read("scripts/clean-transient-public-builds.mjs");
    expect(script).toContain('[".image-build-", ".thumbnail-build-"]');
    expect(script).toContain("entry.isDirectory()");
    expect(script).toContain("rmSync");
    expect(script).toContain("recursive: true");
    expect(script).not.toContain("public/media");
    expect(script).not.toContain("product-media");
  });

  it("runs cleanup before dev and production asset generation", () => {
    const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    expect(pkg.scripts.prebuild.startsWith("node scripts/clean-transient-public-builds.mjs && ")).toBe(true);
    expect(pkg.scripts.predev.startsWith("node scripts/clean-transient-public-builds.mjs && ")).toBe(true);
  });

  it("keeps transient workspaces ignored", () => {
    const ignore = read(".gitignore");
    expect(ignore).toContain("public/.image-build-*/");
    expect(ignore).toContain("public/.thumbnail-build-*/");
  });
});
