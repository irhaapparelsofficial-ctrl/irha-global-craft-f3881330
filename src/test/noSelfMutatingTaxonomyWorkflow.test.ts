import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const retiredPaths = [
  ".github/workflows/apply-taxonomy-conversion.yml",
  "scripts/apply-taxonomy-conversion.mjs",
];

describe("taxonomy conversion CI safety", () => {
  it("keeps the retired self-mutating patch files out of the repository", () => {
    for (const relativePath of retiredPaths) {
      expect(existsSync(resolve(root, relativePath)), relativePath).toBe(false);
    }
  });

  it("prevents the retired patch workflow from being reintroduced under another workflow filename", () => {
    const workflowDirectory = resolve(root, ".github/workflows");
    const workflowText = readdirSync(workflowDirectory)
      .filter((name) => name.endsWith(".yml") || name.endsWith(".yaml"))
      .map((name) => readFileSync(resolve(workflowDirectory, name), "utf8"))
      .join("\n");

    expect(workflowText).not.toContain("Apply taxonomy conversion patch");
    expect(workflowText).not.toContain("apply-taxonomy-conversion.mjs");
  });
});
