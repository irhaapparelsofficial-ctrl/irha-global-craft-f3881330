import { describe, expect, it } from "vitest";
import { classifyFailure } from "../../scripts/ci/classify-failure.mjs";

describe("CI failure classifier", () => {
  it("suppresses superseded main failures", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: "aaaaaaaaaaaaaaaa",
        latestMain: "bbbbbbbbbbbbbbbb",
      }),
    ).toMatchObject({ classification: "stale", retryable: false });
  });

  it("does not retry zero-step runner or account failures", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        headBranch: "main",
        headSha: "aaaaaaaaaaaaaaaa",
        latestMain: "aaaaaaaaaaaaaaaa",
        jobs: [{ conclusion: "failure", steps: [] }],
      }),
    ).toMatchObject({ classification: "capacity", retryable: false });
  });

  it("retries one transient infrastructure failure only once", () => {
    expect(
      classifyFailure({
        workflowName: "Cloudflare Production After Quality Gate",
        conclusion: "failure",
        runAttempt: 1,
        logs: "curl: (6) Could not resolve host: api.cloudflare.com",
      }),
    ).toMatchObject({ classification: "transient", retryable: true });

    expect(
      classifyFailure({
        workflowName: "Cloudflare Production After Quality Gate",
        conclusion: "failure",
        runAttempt: 2,
        logs: "HTTP 503 Service Unavailable",
      }),
    ).toMatchObject({ classification: "transient", retryable: false });
  });

  it("leaves deterministic test failures for exact diagnosis", () => {
    expect(
      classifyFailure({
        workflowName: "Quality Gate",
        conclusion: "failure",
        logs: "AssertionError: expected 200 to be 301",
        jobs: [{ conclusion: "failure", steps: [{ name: "Test", conclusion: "failure" }] }],
      }),
    ).toMatchObject({ classification: "deterministic", retryable: false });
  });
});
