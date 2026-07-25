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

const DETERMINISTIC_PATTERNS = [
  /\bAssertionError\b/i,
  /(?:^|\n)\s*(?:FAIL|×)\s+/im,
  /\bTest Files?\b[^\n]*\bfailed\b/i,
  /\bTests?\b[^\n]*\bfailed\b/i,
  /\bexpected\b[^\n]*(?:received|to\s+(?:be|equal|contain|match)|mismatch)/i,
  /\bExpected:\s*/i,
  /\bReceived:\s*/i,
  /\berror\s+TS\d{4}\b/i,
  /\bTS\d{4}:/i,
  /\b(?:canonical|schema|redirect|route|migration|deployment-source|secret-safety)\b[^\n]*(?:mismatch|drift|missing|invalid|refus(?:e|ed|ing))/i,
  /\b(?:contract|parity|verification)\b[^\n]*(?:expected|mismatch|drift|missing|required|refus(?:e|ed|ing))/i,
];

const ANSI_PATTERN = /\u001b\[[0-?]*[ -/]*[@-~]/g;
const FAILURE_LINE_PATTERNS = [
  /##\[error\]/i,
  /^\s*(?:curl|wget|git|gh|npm|npx|node|wrangler|bash|sh):/i,
  /\bcurl:\s*\(\d+\)/i,
  /\b(?:fatal|error|failed|failure)\b/i,
  /\bProcess completed with exit code\b/i,
  /\bHTTP\s*(?:429|502|503|504)\b/i,
  /\b(?:ECONNRESET|ETIMEDOUT)\b/i,
  /\brunner.*(?:lost|disconnected)\b/i,
  /\bthe operation was canceled\b/i,
  /\bnetwork.*error\b/i,
];

function normalizeJobs(jobs) {
  if (Array.isArray(jobs)) return jobs;
  if (Array.isArray(jobs?.jobs)) return jobs.jobs;
  return [];
}

function stripAnsi(value) {
  return String(value ?? "").replace(ANSI_PATTERN, "");
}

function collectFailureContext(logs) {
  const lines = stripAnsi(logs).split(/\r?\n/);
  const selected = new Set();
  const successfulTestLine = /^\s*(?:✓|√|PASS)\b/i;

  lines.forEach((line, index) => {
    if (successfulTestLine.test(line)) return;
    if (!FAILURE_LINE_PATTERNS.some((pattern) => pattern.test(line))) return;
    for (let offset = -2; offset <= 2; offset += 1) {
      const candidate = index + offset;
      if (candidate >= 0 && candidate < lines.length) selected.add(candidate);
    }
  });

  return [...selected].sort((left, right) => left - right).map((index) => lines[index]).join("\n");
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

  const normalizedLogs = stripAnsi(logs);
  const deterministicPattern = DETERMINISTIC_PATTERNS.find((pattern) => pattern.test(normalizedLogs));
  if (deterministicPattern) {
    return result({
      classification: "deterministic",
      retryable: false,
      reason: `explicit deterministic failure evidence matched ${deterministicPattern}`,
      workflowName,
      runAttempt,
    });
  }

  const capacityPattern = CAPACITY_PATTERNS.find((pattern) => pattern.test(normalizedLogs));
  if (capacityPattern) {
    return result({
      classification: "capacity",
      retryable: false,
      reason: `runner/account capacity signal matched ${capacityPattern}`,
      workflowName,
      runAttempt,
    });
  }

  const failedOperationEvidence = collectFailureContext(normalizedLogs);
  const transientPattern = TRANSIENT_PATTERNS.find((pattern) => pattern.test(failedOperationEvidence));
  if (transientPattern) {
    const retryable = Number(runAttempt) < 2;
    return result({
      classification: "transient",
      retryable,
      recoveryAction: retryable ? "rerun-failed-jobs" : "none",
      reason: `transient infrastructure signal matched failed-operation evidence ${transientPattern}`,
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
