import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = ".github/workflows/cloudflare-production-status.yml";
const readWorkflow = () => readFileSync(resolve(process.cwd(), workflowPath), "utf8");

const extractRunBlock = (workflow: string, stepName: string) => {
  const stepMarker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThan(-1);

  const runMarker = "        run: |\n";
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);

  const contentStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf("\n      - name:", contentStart);
  const block = workflow.slice(contentStart, nextStep === -1 ? undefined : nextStep);

  return block
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
};

describe("Cloudflare Production Status observer contract", () => {
  it("keeps the exact-live verifier valid bash", () => {
    const workflow = readWorkflow();
    const script = extractRunBlock(workflow, "Verify pages.dev, apex and www against exact merged SHA");
    const result = spawnSync("bash", ["-n", "-s"], {
      input: script,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
  });

  it("requires exact Pages identity while treating only confirmed Cloudflare challenges as observer limits", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('verify_origin "$PAGES_URL" pages false');
    expect(workflow).toContain('[ "$ORIGIN_RESULT" = "exact" ] || { echo "Pages exact release proof is mandatory"; exit 1; }');
    expect(workflow).toContain('verify_origin "$CANONICAL_ORIGIN" apex true');
    expect(workflow).toContain("cf-mitigated");
    expect(workflow).toContain("Just a moment...");
    expect(workflow).toContain('echo "apex_challenged=true" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain('echo "www_challenged=true" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain("independent public verification remains required");
  });

  it("preserves hard failures for non-challenge www redirect mismatches", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('case "$status" in 301|302|307|308)');
    expect(workflow).toContain('case "$location" in https://irhaapparels.com/*)');
    expect(workflow).toContain("Unexpected www status");
    expect(workflow).toContain("Unexpected www location");
  });

  it("audits immutable Pages artifacts when apex is observer-challenged without claiming apex proof", () => {
    const workflow = readWorkflow();

    expect(workflow).toContain('artifact_origins="$PAGES_URL"');
    expect(workflow).toContain('artifact_origins="$PAGES_URL,$CANONICAL_ORIGIN"');
    expect(workflow).toContain('ARTIFACT_ORIGINS: ${{ steps.live.outputs.artifact_origins }}');
    expect(workflow).toContain('echo "- apex exact SHA from GitHub observer: \\`$APEX_VERIFIED\\`"');
    expect(workflow).toContain('echo "- apex GitHub observer challenged: \\`$APEX_CHALLENGED\\`"');
    expect(workflow).toContain('description="Exact Pages release/artifacts passed; public observer challenged"');
  });
});
