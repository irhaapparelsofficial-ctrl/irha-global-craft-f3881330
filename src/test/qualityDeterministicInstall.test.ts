import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const qualityWorkflow = readFileSync(
  resolve(".github/workflows/quality.yml"),
  "utf8",
);

describe("Quality Gate dependency installation", () => {
  it("installs the exact package-lock dependency graph", () => {
    expect(qualityWorkflow).toContain(
      "npm ci --legacy-peer-deps --no-audit --no-fund",
    );
    expect(qualityWorkflow).not.toContain("npm install --legacy-peer-deps");
  });

  it("fails if package manifests are mutated during installation", () => {
    expect(qualityWorkflow).toContain(
      "git diff --exit-code -- package.json package-lock.json",
    );
  });

  it("records deterministic installation in release evidence", () => {
    expect(qualityWorkflow).toContain(
      "Dependency install: exact npm lockfile via",
    );
    expect(qualityWorkflow).toContain(
      "Dependency manifests: immutable",
    );
  });
});
