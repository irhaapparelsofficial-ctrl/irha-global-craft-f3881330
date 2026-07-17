import { createHash } from "node:crypto";
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { transactionBody } from "./sql-transaction-body.mjs";

const root = process.cwd();
const manifestPath = resolve(root, "supabase/repository-migrations.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const mode = process.env.REPO_MIGRATION_MODE || "plan";
const projectId = (process.env.SUPABASE_PROJECT_ID || "").trim();
const accessToken = (process.env.SUPABASE_ACCESS_TOKEN || "").trim();
const sourceSha = (process.env.SOURCE_SHA || "").trim();
const repository = (process.env.GITHUB_REPOSITORY || "").trim();
const githubToken = (process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "").trim();
const planPath = process.env.REPO_MIGRATION_PLAN_PATH || "/tmp/repository-migration-plan.json";
const evidencePath = process.env.REPO_MIGRATION_EVIDENCE_PATH || "/tmp/repository-migration-evidence.json";
const managementApi = "https://api.supabase.com";

function required(value, label) {
  if (!value) throw new Error(`${label} is required`);
  return value;
}

function sqlLiteral(value) {
  return `'${String(value).replaceAll("'", "''")}'`;
}

function gitBlobSha(buffer) {
  const prefix = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(buffer).digest("hex");
}

function sha256(value) {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.result?.rows)) return payload.result.rows;
  return [];
}

function entryExecutionMode(entry) {
  return entry.execution_mode || "transactional";
}

function validateVerificationQuery(entry) {
  const query = String(entry.verification_query || "").trim();
  if (!query) throw new Error(`Migration ${entry.version} requires a verification_query`);
  if (!/^select\b/i.test(query)) {
    throw new Error(`Migration ${entry.version} verification_query must begin with SELECT`);
  }
  const withoutTrailingSemicolon = query.replace(/;\s*$/, "");
  if (withoutTrailingSemicolon.includes(";")) {
    throw new Error(`Migration ${entry.version} verification_query must contain one read-only statement`);
  }
  const forbidden = /\b(insert|update|delete|merge|create|alter|drop|truncate|grant|revoke|comment|call|do|copy|vacuum|cluster|reindex|refresh|execute|perform)\b/i;
  if (forbidden.test(withoutTrailingSemicolon)) {
    throw new Error(`Migration ${entry.version} verification_query contains a mutation keyword`);
  }
  return query;
}

async function databaseQuery(query, { readOnly = false } = {}) {
  const response = await fetch(`${managementApi}/v1/projects/${projectId}/database/query`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ query, read_only: readOnly }),
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text.slice(0, 2000) };
  }
  if (!response.ok) {
    throw new Error(`Supabase Management API query failed (${response.status}): ${JSON.stringify(payload).slice(0, 3000)}`);
  }
  return payload;
}

async function currentMainSha() {
  required(repository, "GITHUB_REPOSITORY");
  required(githubToken, "GH_TOKEN");
  const response = await fetch(`https://api.github.com/repos/${repository}/commits/main`, {
    headers: {
      authorization: `Bearer ${githubToken}`,
      accept: "application/vnd.github+json",
      "x-github-api-version": "2022-11-28",
    },
  });
  if (!response.ok) throw new Error(`Unable to resolve current main (${response.status})`);
  const payload = await response.json();
  return payload.sha;
}

function validateManifest() {
  required(projectId, "SUPABASE_PROJECT_ID");
  required(accessToken, "SUPABASE_ACCESS_TOKEN");
  required(sourceSha, "SOURCE_SHA");
  if (manifest.schema_version !== 1) throw new Error("Unsupported repository migration manifest schema");
  if (manifest.project_id !== projectId) throw new Error("Repository migration manifest project mismatch");
  if (manifest.ledger_table !== "private.irha_repository_migration_ledger") {
    throw new Error("Unexpected repository migration ledger table");
  }
  if (!/^\d{14}$/.test(manifest.cutover_version)) throw new Error("Invalid cutover migration version");
  if (!Array.isArray(manifest.migrations)) throw new Error("Manifest migrations must be an array");

  const files = readdirSync(resolve(root, "supabase/migrations"))
    .filter((file) => /^\d{14}_.+\.sql$/.test(file))
    .filter((file) => file.slice(0, 14) >= manifest.cutover_version)
    .map((file) => `supabase/migrations/${file}`)
    .sort();
  const listed = manifest.migrations.map((entry) => entry.path).sort();
  if (JSON.stringify(files) !== JSON.stringify(listed)) {
    throw new Error(`Every migration at or after ${manifest.cutover_version} must be listed in supabase/repository-migrations.json`);
  }

  const versions = new Set();
  const paths = new Set();
  for (const entry of manifest.migrations) {
    if (!/^\d{14}$/.test(entry.version)) throw new Error(`Invalid migration version: ${entry.version}`);
    if (entry.version < manifest.cutover_version) throw new Error(`Migration precedes cutover: ${entry.version}`);
    if (!/^[a-z0-9_]+$/.test(entry.name)) throw new Error(`Invalid migration name: ${entry.name}`);
    if (!entry.path.startsWith("supabase/migrations/") || !entry.path.endsWith(".sql")) {
      throw new Error(`Invalid migration path: ${entry.path}`);
    }
    if (!/^[0-9a-f]{40}$/.test(entry.git_blob_sha)) throw new Error(`Invalid Git blob SHA for ${entry.version}`);
    if (versions.has(entry.version) || paths.has(entry.path)) throw new Error(`Duplicate migration manifest entry: ${entry.version}`);
    versions.add(entry.version);
    paths.add(entry.path);

    const buffer = readFileSync(resolve(root, entry.path));
    const actualBlobSha = gitBlobSha(buffer);
    if (actualBlobSha !== entry.git_blob_sha) {
      throw new Error(`Migration checksum mismatch for ${entry.path}: expected ${entry.git_blob_sha}, got ${actualBlobSha}`);
    }

    const executionMode = entryExecutionMode(entry);
    if (!["transactional", "verified_present"].includes(executionMode)) {
      throw new Error(`Unsupported execution_mode for ${entry.version}: ${executionMode}`);
    }

    if (executionMode === "verified_present") {
      if (entry.transactional_dry_run !== false) {
        throw new Error(`Verified-present migration ${entry.version} must set transactional_dry_run to false`);
      }
      validateVerificationQuery(entry);
      continue;
    }

    if (entry.transactional_dry_run !== true) {
      throw new Error(`Migration ${entry.version} must opt into transactional dry-run`);
    }
    if (entry.verification_query !== undefined) {
      throw new Error(`Transactional migration ${entry.version} must not define verification_query`);
    }
    const sql = transactionBody(buffer.toString("utf8"), entry);
    const forbidden = /\b(create\s+index\s+concurrently|reindex\s+concurrently|vacuum|cluster\s+|net\.http_|http_post\s*\(|cron\.schedule\s*\()/i;
    if (forbidden.test(sql)) throw new Error(`Migration ${entry.version} contains non-transactional or external side-effect SQL`);
  }
}

async function readLedger() {
  const payload = await databaseQuery(
    "select version, name, repository_path, git_blob_sha, source_commit, application_state, execution_mode, verification, applied_at from private.irha_repository_migration_ledger order by version",
    { readOnly: true },
  );
  return extractRows(payload);
}

function pendingEntries(ledgerRows) {
  const byVersion = new Map(ledgerRows.map((row) => [String(row.version), row]));
  const pending = [];
  for (const entry of manifest.migrations) {
    const row = byVersion.get(entry.version);
    if (!row) {
      pending.push(entry);
      continue;
    }
    if (row.git_blob_sha !== entry.git_blob_sha) {
      throw new Error(`Applied migration checksum drift for ${entry.version}`);
    }
    if (!["applied", "verified_present"].includes(row.application_state)) {
      throw new Error(`Unexpected ledger state for ${entry.version}: ${row.application_state}`);
    }
  }
  return pending;
}

async function verifyExistingEntry(entry) {
  const query = validateVerificationQuery(entry);
  const payload = await databaseQuery(query, { readOnly: true });
  const rows = extractRows(payload);
  if (rows.length !== 1 || rows[0]?.verified !== true) {
    throw new Error(`Existing migration verification failed for ${entry.version}`);
  }
  return {
    version: entry.version,
    path: entry.path,
    git_blob_sha: entry.git_blob_sha,
    verification_query_sha256: sha256(query),
    status: "verified_present",
  };
}

async function plan() {
  const ledger = await readLedger();
  const pending = pendingEntries(ledger);
  const dryRuns = [];
  const verifiedExisting = [];
  const transactionalStack = [];
  for (const entry of pending) {
    if (entryExecutionMode(entry) === "verified_present") {
      verifiedExisting.push(await verifyExistingEntry(entry));
      continue;
    }
    const sql = transactionBody(readFileSync(resolve(root, entry.path), "utf8"), entry);
    transactionalStack.push({ entry, sql });
  }
  // Dry-run all pending transactional migrations in ONE BEGIN...ROLLBACK so
  // later migrations that reference objects created by earlier pending ones
  // resolve correctly. Apply() still commits each migration in its own
  // transaction, so per-migration atomicity is preserved at mutation time.
  if (transactionalStack.length > 0) {
    const sql = transactionalStack.map((item) => item.sql).join("\n");
    await databaseQuery(`begin;\n${sql}\nrollback;`);
    for (const { entry } of transactionalStack) {
      dryRuns.push({ version: entry.version, path: entry.path, git_blob_sha: entry.git_blob_sha, status: "passed" });
    }
  }
  const output = {
    schema_version: 1,
    project_id: projectId,
    repository,
    source_sha: sourceSha,
    generated_at: new Date().toISOString(),
    pending: pending.map(({ version, name, path, git_blob_sha, execution_mode }) => ({
      version,
      name,
      path,
      git_blob_sha,
      execution_mode: execution_mode || "transactional",
    })),
    transactional_dry_runs: dryRuns,
    transactional_dry_run_mode: "stacked_single_transaction",
    verified_existing: verifiedExisting,
    ledger_versions: ledger.map((row) => ({ version: String(row.version), git_blob_sha: row.git_blob_sha, state: row.application_state })),
  };
  writeJson(planPath, output);
  writeJson(evidencePath, { phase: "plan", ...output });
  console.log(`Repository migration plan complete: ${pending.length} pending migration(s)`);
}

function ledgerInsertSql(entry, {
  applicationState = "applied",
  executionMode = "github_management_api_transaction",
  verificationExtra = {},
} = {}) {
  const verification = JSON.stringify({
    source_sha: sourceSha,
    manifest_schema_version: manifest.schema_version,
    execution_mode: entryExecutionMode(entry),
    transactional_dry_run: entry.transactional_dry_run,
    ...verificationExtra,
  });
  return `insert into private.irha_repository_migration_ledger (
    version, name, repository_path, git_blob_sha, source_commit,
    application_state, execution_mode, verification, applied_at, recorded_at
  ) values (
    ${sqlLiteral(entry.version)}, ${sqlLiteral(entry.name)}, ${sqlLiteral(entry.path)},
    ${sqlLiteral(entry.git_blob_sha)}, ${sqlLiteral(sourceSha)}, ${sqlLiteral(applicationState)},
    ${sqlLiteral(executionMode)}, ${sqlLiteral(verification)}::jsonb, now(), now()
  )
  on conflict (version) do update
  set name = excluded.name,
      repository_path = excluded.repository_path,
      source_commit = excluded.source_commit,
      application_state = excluded.application_state,
      execution_mode = excluded.execution_mode,
      verification = excluded.verification,
      recorded_at = now()
  where private.irha_repository_migration_ledger.git_blob_sha = excluded.git_blob_sha;`;
}

async function apply() {
  const planDocument = JSON.parse(readFileSync(planPath, "utf8"));
  if (planDocument.project_id !== projectId || planDocument.source_sha !== sourceSha) {
    throw new Error("Repository migration plan does not match exact source/project");
  }
  const planned = new Map(planDocument.pending.map((entry) => [entry.version, entry]));
  const ledgerBefore = await readLedger();
  const pending = pendingEntries(ledgerBefore).filter((entry) => planned.has(entry.version));
  const applied = [];

  for (const entry of pending) {
    const latestMain = await currentMainSha();
    if (latestMain !== sourceSha) throw new Error(`Current main advanced before database mutation: ${latestMain}`);

    if (entryExecutionMode(entry) === "verified_present") {
      const verification = await verifyExistingEntry(entry);
      await databaseQuery(`begin;\n${ledgerInsertSql(entry, {
        applicationState: "verified_present",
        executionMode: "github_management_api_verified_existing",
        verificationExtra: {
          verification_query_sha256: verification.verification_query_sha256,
          existing_objects_verified: true,
        },
      })}\ncommit;`);
      applied.push({ ...verification, ledger_state: "verified_present" });
      continue;
    }

    const sql = transactionBody(readFileSync(resolve(root, entry.path), "utf8"), entry);
    await databaseQuery(`begin;\n${sql}\n${ledgerInsertSql(entry)}\ncommit;`);
    applied.push({ version: entry.version, path: entry.path, git_blob_sha: entry.git_blob_sha, ledger_state: "applied" });
  }

  const ledgerAfter = await readLedger();
  const remaining = pendingEntries(ledgerAfter);
  if (remaining.length > 0) throw new Error(`Repository migration ledger parity failed: ${remaining.map((entry) => entry.version).join(", ")}`);

  const output = {
    phase: "apply",
    schema_version: 1,
    project_id: projectId,
    repository,
    source_sha: sourceSha,
    completed_at: new Date().toISOString(),
    planned_count: planDocument.pending.length,
    applied,
    ledger_versions: ledgerAfter.map((row) => ({ version: String(row.version), git_blob_sha: row.git_blob_sha, state: row.application_state })),
    parity: "verified",
  };
  writeJson(evidencePath, output);
  console.log(`Repository migration apply complete: ${applied.length} applied or verified; parity verified`);
}

async function verify() {
  const ledger = await readLedger();
  const remaining = pendingEntries(ledger);
  if (remaining.length > 0) throw new Error(`Pending repository migrations: ${remaining.map((entry) => entry.version).join(", ")}`);

  const verifiedExisting = [];
  for (const entry of manifest.migrations) {
    if (entryExecutionMode(entry) === "verified_present") {
      verifiedExisting.push(await verifyExistingEntry(entry));
    }
  }

  const output = {
    phase: "verify",
    schema_version: 1,
    project_id: projectId,
    repository,
    source_sha: sourceSha,
    verified_at: new Date().toISOString(),
    parity: "verified",
    verified_existing: verifiedExisting,
    ledger_versions: ledger.map((row) => ({ version: String(row.version), git_blob_sha: row.git_blob_sha, state: row.application_state })),
  };
  writeJson(evidencePath, output);
  console.log("Repository migration ledger parity verified");
}

async function main() {
  validateManifest();
  if (mode === "plan") return plan();
  if (mode === "apply") return apply();
  if (mode === "verify") return verify();
  throw new Error(`Unsupported REPO_MIGRATION_MODE: ${mode}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
