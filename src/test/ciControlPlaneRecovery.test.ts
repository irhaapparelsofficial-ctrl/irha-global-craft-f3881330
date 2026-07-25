import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { classifyFailure } from "../../scripts/ci/classify-failure.mjs";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("CI control-plane recovery", () => {
  it("classifies a true zero-job failure as one bounded full-run retry", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: "a".repeat(40),
        latestMain: "a".repeat(40),
        runAttempt: 1,
        jobs: { jobs: [] },
      }),
    ).toMatchObject({
      classification: "startup",
      retryable: true,
      recoveryAction: "rerun-run",
    });

    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: "a".repeat(40),
        latestMain: "a".repeat(40),
        runAttempt: 2,
        jobs: [],
      }),
    ).toMatchObject({
      classification: "startup",
      retryable: false,
      recoveryAction: "none",
    });
  });

  it("uses failed-job reruns only for transient failures with a job graph", () => {
    expect(
      classifyFailure({
        workflowName: "Cloudflare Production Status",
        conclusion: "failure",
        headBranch: "main",
        headSha: "b".repeat(40),
        latestMain: "b".repeat(40),
        runAttempt: 1,
        jobs: {
          jobs: [
            {
              conclusion: "failure",
              steps: [{ conclusion: "failure", name: "Verify" }],
            },
          ],
        },
        logs: "HTTP 503 service unavailable",
      }),
    ).toMatchObject({
      classification: "transient",
      retryable: true,
      recoveryAction: "rerun-failed-jobs",
    });
  });

  it("keeps Guardian on the canonical release chain without recursive or unrelated fan-out", () => {
    const workflow = read(".github/workflows/ci-guardian.yml");

    for (const name of [
      "Quality Gate",
      "Cloudflare Current Main Reconcile",
      "Cloudflare Production Status",
      "IndexNow After Verified Production",
      "Verify Official Brand Live",
      "Production Route Parity",
    ]) {
      expect(workflow).toContain(`- ${name}`);
    }

    for (const unrelated of [
      "Supabase Functions After Quality Gate",
      "Supabase Database After Quality Gate",
      "Secret Bootstrap Controller",
      "Workers AI Guide Gate",
      "Sync Product Media",
      "Automatic AI Image Pipeline",
    ]) {
      expect(workflow).not.toContain(`- ${unrelated}`);
    }

    expect(workflow).not.toContain("- Irha CI Guardian");
    expect(workflow).not.toMatch(/classify-and-heal:\n\s+if:/);
    expect(workflow).toContain('"repos/$GITHUB_REPOSITORY/actions/runs/$RUN_ID/rerun"');
    expect(workflow).toContain('"repos/$GITHUB_REPOSITORY/actions/runs/$RUN_ID/rerun-failed-jobs"');
    expect(workflow).not.toContain("gh workflow run");
  });

  it("requires release convergence before a manually dispatched production crawl", () => {
    const workflow = read(".github/workflows/production-route-parity.yml");

    expect(workflow).toContain("on:\n  workflow_dispatch:");
    expect(workflow).not.toContain("\n  push:\n");
    for (const context of [
      "Irha Quality Gate",
      "Irha Cloudflare Production",
      "Irha Search Discovery",
      "Irha Brand Live",
    ]) {
      expect(workflow).toContain(`\"${context}\"`);
    }
    expect(workflow).toContain("Required exact-SHA release status is not green");
  });

  it("serializes Search Discovery before Brand Live", () => {
    const discovery = read(".github/workflows/indexnow-after-production.yml");
    const brand = read(".github/workflows/verify-official-brand-live.yml");

    expect(discovery).toContain('workflows: ["Cloudflare Production Status"]');
    expect(discovery).toContain('.context == "Irha Cloudflare Production"');
    expect(brand).toContain('workflows: ["IndexNow After Verified Production"]');
    expect(brand).toContain('.context == "Irha Search Discovery"');
    expect(brand).toContain('.target_url == $target');
  });
});
