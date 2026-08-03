import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const planPath = resolve(root, process.env.SEC_M03_PARITY_REFRESH_PLAN || "supabase/reconciliation/sec-m03-parity-refresh.json");
const liveDirectory = resolve(process.env.SEC_M03_LIVE_FUNCTION_DIRECTORY || "/tmp/sec-m03-live-functions");
const outputPath = resolve(process.env.SEC_M03_SOURCE_EVIDENCE || "/tmp/sec-m03-deployed-source-evidence.json");
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const helperPath = resolve(root, "supabase/functions/_shared/durable-rate-limit.ts");
const helperSource = readFileSync(helperPath);

const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const rows = [];

function compareDeployedSource(repositorySource, content) {
  if (typeof content !== "string") {
    return { matched: false, mode: null, deployedSource: null };
  }

  const deployedSource = Buffer.from(content, "utf8");
  if (repositorySource.equals(deployedSource)) {
    return { matched: true, mode: "exact_bytes", deployedSource };
  }

  const repositoryHasFinalLf = repositorySource.length > 0 && repositorySource.at(-1) === 0x0a;
  const deployedHasFinalLf = deployedSource.length > 0 && deployedSource.at(-1) === 0x0a;
  if (repositoryHasFinalLf === deployedHasFinalLf) {
    return { matched: false, mode: null, deployedSource };
  }

  const repositoryComparable = repositoryHasFinalLf
    ? repositorySource.subarray(0, repositorySource.length - 1)
    : repositorySource;
  const deployedComparable = deployedHasFinalLf
    ? deployedSource.subarray(0, deployedSource.length - 1)
    : deployedSource;

  if (repositoryComparable.equals(deployedComparable)) {
    return {
      matched: true,
      mode: "single_trailing_lf_transport",
      deployedSource,
    };
  }

  return { matched: false, mode: null, deployedSource };
}

function resolveDeployedEntrypoint(response, entry, repositorySource) {
  const scopedCandidates = response.files.filter((file) =>
    typeof file?.name === "string" && file.name.endsWith(`${entry.name}/index.ts`)
  );
  if (scopedCandidates.length === 1) return scopedCandidates[0];
  if (scopedCandidates.length > 1) {
    throw new Error(`Ambiguous scoped entrypoint for ${entry.name}`);
  }

  const repositorySourceCandidates = response.files.filter((file) =>
    compareDeployedSource(repositorySource, file?.content).matched
  );
  if (repositorySourceCandidates.length === 1) return repositorySourceCandidates[0];
  if (repositorySourceCandidates.length > 1) {
    throw new Error(`Ambiguous repository-source entrypoint for ${entry.name}`);
  }
  return null;
}

for (const entry of plan.functions) {
  const responsePath = resolve(liveDirectory, `${entry.name}.json`);
  const response = JSON.parse(readFileSync(responsePath, "utf8"));
  if (response.slug !== entry.name && response.name !== entry.name) {
    throw new Error(`Unexpected function response identity for ${entry.name}`);
  }
  if (response.verify_jwt !== entry.verify_jwt) {
    throw new Error(`verify_jwt mismatch for ${entry.name}`);
  }
  if (entry.exact_version !== undefined && response.version !== entry.exact_version) {
    throw new Error(`Exact version mismatch for ${entry.name}`);
  }
  if (entry.minimum_version !== undefined && Number(response.version) < entry.minimum_version) {
    throw new Error(`Minimum version mismatch for ${entry.name}`);
  }
  if (entry.exact_hash && response.ezbr_sha256 !== entry.exact_hash) {
    throw new Error(`Exact bundle hash mismatch for ${entry.name}`);
  }
  if (!Array.isArray(response.files)) throw new Error(`Function files missing for ${entry.name}`);

  const repositorySource = readFileSync(resolve(root, entry.repository_source));
  const deployedEntrypoint = resolveDeployedEntrypoint(response, entry, repositorySource);
  if (!deployedEntrypoint || typeof deployedEntrypoint.content !== "string") {
    throw new Error(`Repository-equivalent deployed entrypoint source missing for ${entry.name}`);
  }

  const sourceMatch = compareDeployedSource(repositorySource, deployedEntrypoint.content);
  if (!sourceMatch.matched || !sourceMatch.deployedSource) {
    throw new Error(`Exact deployed source mismatch for ${entry.name}`);
  }
  const deployedSource = sourceMatch.deployedSource;

  let helperMatched = null;
  if (entry.require_shared_limiter) {
    const deployedHelper = response.files.find((file) =>
      typeof file?.name === "string" && file.name.endsWith("_shared/durable-rate-limit.ts")
    );
    if (!deployedHelper || typeof deployedHelper.content !== "string") {
      throw new Error(`Durable limiter helper missing from ${entry.name}`);
    }
    const deployedHelperSource = Buffer.from(deployedHelper.content, "utf8");
    helperMatched = helperSource.equals(deployedHelperSource);
    if (!helperMatched) throw new Error(`Durable limiter helper mismatch for ${entry.name}`);
  }

  rows.push({
    name: entry.name,
    version: response.version,
    verify_jwt: response.verify_jwt,
    live_bundle_sha256: response.ezbr_sha256,
    repository_source: entry.repository_source,
    repository_source_sha256: sha256(repositorySource),
    deployed_source_sha256: sha256(deployedSource),
    source_match_mode: sourceMatch.mode,
    exact_source_match: sourceMatch.mode === "exact_bytes",
    transport_equivalent_source_match: true,
    durable_limiter_helper_match: helperMatched,
    provenance: entry.provenance,
  });
}

const evidence = {
  schema_version: 1,
  execution_id: plan.execution_id,
  project_id: plan.project_id,
  source_sha: process.env.SOURCE_SHA || null,
  functions: rows.sort((left, right) => left.name.localeCompare(right.name)),
};
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`Verified deployment-locked source parity for ${rows.length} approved functions.`);
