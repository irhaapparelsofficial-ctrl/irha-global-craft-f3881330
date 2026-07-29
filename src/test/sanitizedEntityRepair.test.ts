import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

describe("sanitized HTML entity repair", () => {
  it("preserves possessive product names when catalogue wording is sanitized", () => {
    const directory = mkdtempSync(join(tmpdir(), "irha-entity-repair-"));
    directories.push(directory);
    const htmlPath = join(directory, "index.html");
    writeFileSync(
      htmlPath,
      '<img alt="Digital catalogue reference for Men&#39;s Lounge Set; not production proof, view 1" />\n<img alt="Digital catalogue reference for Women&#39;s Leather Jacket; not production proof, view 2" />',
      "utf8",
    );

    const env = { ...process.env, IRHA_DIST_DIR: directory };
    execFileSync(process.execPath, ["scripts/sanitize-unsupported-trust-copy.mjs"], { env });
    execFileSync(process.execPath, ["scripts/repair-sanitized-html-entities.mjs"], { env });

    const output = readFileSync(htmlPath, "utf8");
    expect(output).toContain('alt="Men&#39;s Lounge Set, view 1"');
    expect(output).toContain('alt="Women&#39;s Leather Jacket, view 2"');
    expect(output).not.toMatch(/&#(?:39|x27)\s+product style;s/i);
  });

  it("runs repair after sanitization and before authoritative manifest sealing", () => {
    const scripts = (JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> }).scripts;
    for (const name of ["build", "build:dev"] as const) {
      const command = scripts[name];
      const sanitize = command.indexOf("sanitize-unsupported-trust-copy.mjs");
      const repair = command.indexOf("repair-sanitized-html-entities.mjs");
      const seal = command.indexOf("apply-authoritative-seo-manifest.ts");
      expect(sanitize).toBeGreaterThanOrEqual(0);
      expect(repair).toBeGreaterThan(sanitize);
      expect(seal).toBeGreaterThan(repair);
    }
  });
});
