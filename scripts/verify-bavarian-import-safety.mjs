import { readFileSync } from "node:fs";

const workflowPath = ".github/workflows/import-bavarian-drive-media.yml";
const batchPath = "tools/import_bavarian_drive_batch.py";

const workflow = readFileSync(workflowPath, "utf8");
const batchImporter = readFileSync(batchPath, "utf8");

const assertions = [
  [workflow.includes("workflow_dispatch:"), "Importer must remain manually dispatchable"],
  [!workflow.includes("pull_request:"), "Importer must not auto-run and mutate pull-request branches"],
  [workflow.includes("cancel-in-progress: false"), "Importer must preserve resumable runs"],
  [batchImporter.includes('failure_count = int(existing.get("download_failure_count", 0))'), "Batch importer must inspect prior download failures"],
  [batchImporter.includes("if complete and failure_count == 0:"), "Only zero-failure batches may be skipped"],
  [batchImporter.includes("IRHA_BATCH_RETRY"), "Incomplete batches must emit an explicit retry marker"],
];

const failures = assertions.filter(([ok]) => !ok).map(([, message]) => message);
if (failures.length > 0) {
  console.error("Bavarian import safety verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("Bavarian import safety verification passed.");
