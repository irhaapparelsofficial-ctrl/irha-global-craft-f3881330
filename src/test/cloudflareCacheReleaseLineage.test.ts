import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const extractRunBlock = (workflow: string, stepName: string) => {
  const stepMarker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThan(-1);

  const runMarker = "        run: |\n";
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);

  const contentStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf("\n      - name:", contentStart);
  return workflow
    .slice(contentStart, nextStep === -1 ? undefined : nextStep)
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
};

describe("Cloudflare cache release lineage", () => {
  it("uses exact successful GitHub Actions lineage instead of the optional public deployment marker", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");
    const script = extractRunBlock(
      workflow,
      "Freeze exact current main and resolve immutable Quality artifact",
    );

    expect(workflow).toContain("actions: read");
    expect(script).toContain('gh api "repos/$GITHUB_REPOSITORY/actions/runs/$UPSTREAM_RUN_ID"');
    expect(script).toContain('.name == "Cloudflare Current Main Reconcile"');
    expect(script).toContain(".head_sha == $sha");
    expect(script).toContain('.head_branch == "main"');
    expect(script).toContain('.conclusion == "success"');
    expect(script).toContain('actions/runs?head_sha=$SOURCE_SHA&per_page=100');
    expect(script).toContain('.name == "Quality Gate"');
    expect(script).toContain('(.event == "push" or .event == "workflow_dispatch")');
    expect(script).toContain("sort_by(.run_number)");
    expect(script).toContain("| last");
    expect(script).toContain('gh api "repos/$GITHUB_REPOSITORY/actions/runs/$quality_run_id"');
    expect(script).toContain("authoritative Quality lineage resolved from GitHub Actions");
    expect(script).not.toContain("cloudflare-deployment.json?release_check=");
    expect(script).not.toContain("actions/workflows/quality.yml/runs?branch=main");
  });

  it("keeps the lineage resolver valid bash", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");
    const script = extractRunBlock(
      workflow,
      "Freeze exact current main and resolve immutable Quality artifact",
    );
    const result = spawnSync("bash", ["-n", "-s"], {
      input: script,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
  });
});
