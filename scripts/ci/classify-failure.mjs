import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CAPACITY_PATTERNS = [
  /actions minutes/i,
  /minutes quota/i,
  /billing/i,
  /spending limit/i,
  /hosted runner.*unavailable/i,
  /no hosted runner/i,
  /job was not started/i,
  /job failed before any steps/i,
];

const TRANSIENT_PATTERNS = [
  /timed? out/i,
  /timeout/i,
  /econnreset/i,
  /etimedout/i,
  /socket hang up/i,
  /connection reset/i,
  /temporary failure/i,
  /service unavailable/i,
  /bad gateway/i,
  /gateway timeout/i,
  /http\s*(429|502|503|504)/i,
  /rate limit/i,
  /dns/i,
  /could not resolve host/i,
  /runner.*lost/i,
  /runner.*disconnected/i,
  /the operation was canceled/i,
  /network.*error/i,
];

function normalizeJobs(jobs) {
  if (Array.isArray(jobs)) return jobs;
  if (Array.isArray(jobs?.jobs)) return jobs.jobs;
  return [];
}

function result({ classification, retryable, recoveryAction = "none", reason, workflowName, runAttempt }) {
  return { classification, retryable, recoveryAction, reason, workflowName, runAttempt };
}

export function classifyFailure(input) {
  const {
    workflowName = "unknown",
    conclusion = "failure",
    headBranch = "",
    headSha = "",
    latestMain = "",
    runAttempt = 1,
    jobs = [],
    logs = "",
  } = input ?? {};

  if (["success", "cancelled", "skipped", "neutral"].includes(conclusion)) {
    return result({
      classification: "resolved",
      retryable: false,
      reason: `workflow concluded ${conclusion}`,
      workflowName,
      runAttempt,
    });
  }

  if (headBranch === "main" && latestMain && headSha && headSha !== latestMain) {
    return result({
      classification: "stale",
      retryable: false,
      reason: `superseded main run ${headSha.slice(0, 12)}; current main is ${latestMain.slice(0, 12)}`,
      workflowName,
      runAttempt,
    });
  }

  const normalizedJobs = normalizeJobs(jobs);
  if (normalizedJobs.length === 0) {
    return result({
      classification: "startup",
      retryable: Number(runAttempt) < 2,
      recoveryAction: Number(runAttempt) < 2 ? "rerun-run" : "none",
      reason: "GitHub completed the workflow before creating any jobs",
      workflowName,
      runAttempt,
    });
  }

  const failedJobs = normalizedJobs.filter((job) => job?.conclusion === "failure");
  const zeroStepFailure =
    failedJobs.length > 0 &&
    failedJobs.every((job) => !Array.isArray(job?.steps) || job.steps.length === 0);

  if (zeroStepFailure) {
    return result({
      classification: "startup",
      retryable: Number(runAttempt) < 2,
      recoveryAction: Number(runAttempt) < 2 ? "rerun-run" : "none",
      reason: "GitHub failed job initialization before any step started",
      workflowName,
      runAttempt,
    });
  }

  const evidence = [logs, JSON.stringify(normalizedJobs)].join("\n");
  const capacityPattern = CAPACITY_PATTERNS.find((pattern) => pattern.test(evidence));
  if (capacityPattern) {
    return result({
      classification: "capacity",
      retryable: false,
      reason: `runner/account capacity signal matched ${capacityPattern}`,
      workflowName,
      runAttempt,
    });
  }

  const transientPattern = TRANSIENT_PATTERNS.find((pattern) => pattern.test(evidence));
  if (transientPattern) {
    const retryable = Number(runAttempt) < 2;
    return result({
      classification: "transient",
      retryable,
      recoveryAction: retryable ? "rerun-failed-jobs" : "none",
      reason: `transient infrastructure signal matched ${transientPattern}`,
      workflowName,
      runAttempt,
    });
  }

  return result({
    classification: "deterministic",
    retryable: false,
    reason: "code, test, configuration, permission, or release-contract failure requires inspection",
    workflowName,
    runAttempt,
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const currentFile = fileURLToPath(import.meta.url);
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(currentFile)) {
  const contextPath = process.argv[2];
  const logsPath = process.argv[3];
  if (!contextPath) {
    console.error("usage: node scripts/ci/classify-failure.mjs <context.json> [failed.log]");
    process.exit(64);
  }

  const context = readJson(contextPath);
  const logs = logsPath && fs.existsSync(logsPath) ? fs.readFileSync(logsPath, "utf8") : "";
  process.stdout.write(`${JSON.stringify(classifyFailure({ ...context, logs }))}\n`);
}
