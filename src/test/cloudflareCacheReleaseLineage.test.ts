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
  it("uses the Quality artifact recorded by the deployed Cloudflare release instead of a later same-SHA build", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");
    const script = extractRunBlock(
      workflow,
      "Freeze exact current main and resolve immutable Quality artifact",
    );

    expect(script).toContain("cloudflare-deployment.json?release_check=");
    expect(script).toContain(".source_sha == $sha");
    expect(script).toContain(".quality_run_id");
    expect(script).toContain("quality_run_id=\"$(jq -r '.quality_run_id' \"$lineage_marker\")\"");
    expect(script).toContain('gh api "repos/$GITHUB_REPOSITORY/actions/runs/$quality_run_id"');
    expect(script).toContain('.name == "Quality Gate"');
    expect(script).toContain(".head_sha == $sha");
    expect(script).toContain('.conclusion == "success"');
    expect(script).not.toContain("actions/workflows/quality.yml/runs?branch=main");
    expect(script).not.toContain("sort_by(.run_number, .run_attempt)");
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
