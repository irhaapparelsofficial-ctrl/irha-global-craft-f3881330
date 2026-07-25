import { describe, expect, it } from "vitest";
import { classifyFailure } from "../../scripts/ci/classify-failure.mjs";

const sameSha = "a".repeat(40);
const failedJob = {
  conclusion: "failure",
  steps: [{ name: "Run verification", conclusion: "failure" }],
};

describe("CI failure classifier", () => {
  it("suppresses superseded main failures", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: "a".repeat(40),
        latestMain: "b".repeat(40),
        jobs: [failedJob],
      }),
    ).toMatchObject({ classification: "stale", retryable: false, recoveryAction: "none" });
  });

  it("recovers an empty job graph with one bounded full-run retry", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: sameSha,
        latestMain: sameSha,
        runAttempt: 1,
        jobs: [],
      }),
    ).toMatchObject({ classification: "startup", retryable: true, recoveryAction: "rerun-run" });

    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: sameSha,
        latestMain: sameSha,
        runAttempt: 2,
        jobs: { jobs: [] },
      }),
    ).toMatchObject({ classification: "startup", retryable: false, recoveryAction: "none" });
  });

  it("recovers failed job initialization with one bounded full-run retry", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        runAttempt: 1,
        jobs: [{ conclusion: "failure", steps: [] }],
      }),
    ).toMatchObject({ classification: "startup", retryable: true, recoveryAction: "rerun-run" });

    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        runAttempt: 2,
        jobs: [{ conclusion: "failure", steps: [] }],
      }),
    ).toMatchObject({ classification: "startup", retryable: false, recoveryAction: "none" });
  });

  it("retries proven transient infrastructure failures only once", () => {
    expect(
      classifyFailure({
        workflowName: "Cloudflare Production Status",
        conclusion: "failure",
        runAttempt: 1,
        jobs: [failedJob],
        logs: "curl: (6) Could not resolve host: api.cloudflare.com",
      }),
    ).toMatchObject({
      classification: "transient",
      retryable: true,
      recoveryAction: "rerun-failed-jobs",
    });

    expect(
      classifyFailure({
        workflowName: "Cloudflare Production Status",
        conclusion: "failure",
        runAttempt: 2,
        jobs: [failedJob],
        logs: "HTTP 503 Service Unavailable",
      }),
    ).toMatchObject({ classification: "transient", retryable: false, recoveryAction: "none" });
  });

  it("keeps deterministic assertions non-retryable despite transient fixture words", () => {
    for (const logs of [
      [
        "✓ handles timeout recovery fixture",
        "✓ accepts rate limit sample text",
        "✓ parses could not resolve host examples",
        "FAIL src/test/example.test.ts > repository contract",
        "AssertionError: expected false to be true",
      ].join("\n"),
      [
        "fixture = 'timeout rate limit could not resolve host'",
        "AssertionError: expected 200 to be 301",
      ].join("\n"),
    ]) {
      expect(
        classifyFailure({
          workflowName: "Quality Gate",
          conclusion: "failure",
          runAttempt: 1,
          jobs: [failedJob],
          logs,
        }),
      ).toMatchObject({ classification: "deterministic", retryable: false, recoveryAction: "none" });
    }
  });

  it("keeps compiler and repository contract failures deterministic", () => {
    for (const logs of [
      "src/app.ts(4,3): error TS2322: Type 'string' is not assignable to type 'number'.",
      "Build contract verification failed: canonical route mismatch",
    ]) {
      expect(
        classifyFailure({
          workflowName: "Quality Gate",
          conclusion: "failure",
          jobs: [failedJob],
          logs,
        }),
      ).toMatchObject({ classification: "deterministic", retryable: false, recoveryAction: "none" });
    }
  });

  it("keeps proven capacity failures non-retryable", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        jobs: [failedJob],
        logs: "##[error]The job was not started because the actions minutes quota was exhausted.",
      }),
    ).toMatchObject({ classification: "capacity", retryable: false, recoveryAction: "none" });
  });
});
