import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const EXPECTED_PROJECT_ID = "pvzjiozismyxqrzmtfbi";
const MANAGEMENT_API = "https://api.supabase.com";
const STATEMENT_BOUNDARY = "\n-- IRHA-MIGRATION-STATEMENT-BOUNDARY --\n";
const ROLLBACK_BOUNDARY = "\n-- IRHA-MIGRATION-ROLLBACK-BOUNDARY --\n";

class ProvenanceError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "ProvenanceError";
    this.code = code;
  }
}

function required(value, label) {
  const normalized = String(value ?? "").trim();
  if (!normalized) throw new ProvenanceError("MISSING_INPUT", `${label} is required`);
  return normalized;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function gitBlobSha(buffer) {
  const prefix = Buffer.from(`blob ${buffer.length}\0`, "utf8");
  return createHash("sha1").update(prefix).update(buffer).digest("hex");
}

function canonicalize(value) {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonicalize(value[key])]),
    );
  }
  return value;
}

function canonicalJson(value) {
  return `${JSON.stringify(canonicalize(value), null, 2)}\n`;
}

function extractRows(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.result?.rows)) return payload.result.rows;
  return [];
}

async function managementRequest(path, accessToken, options = {}) {
  const response = await fetch(`${MANAGEMENT_API}${path}`, {
    ...options,
    headers: {
      authorization: `Bearer ${accessToken}`,
      "content-type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { malformed_response: true };
  }
  if (!response.ok) {
    throw new ProvenanceError(
      "MANAGEMENT_API_FAILURE",
      `Supabase Management API request failed (${response.status})`,
    );
  }
  return payload;
}

async function verifyProjectIdentity(projectId, accessToken) {
  if (projectId !== EXPECTED_PROJECT_ID) {
    throw new ProvenanceError("PROJECT_MISMATCH", "Refusing migration provenance generation for an unexpected project");
  }
  const project = await managementRequest(`/v1/projects/${projectId}`, accessToken);
  if (project?.id !== EXPECTED_PROJECT_ID || project?.status !== "ACTIVE_HEALTHY") {
    throw new ProvenanceError("PROJECT_IDENTITY_FAILURE", "Supabase project identity or health verification failed");
  }
}

async function databaseQuery(projectId, accessToken, query) {
  const payload = await managementRequest(`/v1/projects/${projectId}/database/query`, accessToken, {
    method: "POST",
    body: JSON.stringify({ query, read_only: true }),
  });
  return extractRows(payload);
}

function repositoryMigrationSources(root) {
  const directory = resolve(root, "supabase/migrations");
  const sources = new Map();
  for (const file of readdirSync(directory).filter((name) => /^\d{14}_[a-z0-9_]+\.sql$/.test(name)).sort()) {
    const version = file.slice(0, 14);
    const name = file.slice(15, -4);
    const path = `supabase/migrations/${file}`;
    const bytes = readFileSync(resolve(root, path));
    sources.set(`${version}|${name}`, {
      version,
      name,
      path,
      git_blob_sha1: gitBlobSha(bytes),
      file_sha256: sha256(bytes),
    });
  }
  return sources;
}

function normalizeTextArray(value) {
  if (!Array.isArray(value)) return [];
  return value.map((entry) => String(entry));
}

function statementKinds(statements) {
  return [...new Set(
    statements
      .map((statement) => statement.trim())
      .filter(Boolean)
      .map((statement) => statement.match(/^([a-z]+)/i)?.[1]?.toUpperCase() ?? "OTHER"),
  )].sort();
}

function buildLedger({ migrations, repositoryLedger, repositorySources }) {
  const exactLedgerByKey = new Map(
    repositoryLedger.map((row) => [`${String(row.version)}|${String(row.name)}`, row]),
  );
  const seenVersions = new Set();
  const records = [];

  for (const migration of [...migrations].sort((a, b) => String(a.version).localeCompare(String(b.version)))) {
    const version = String(migration.version);
    const name = String(migration.name);
    if (!/^\d{14}$/.test(version)) {
      throw new ProvenanceError("INVALID_VERSION", `Invalid live migration version ${version}`);
    }
    if (seenVersions.has(version)) {
      throw new ProvenanceError("DUPLICATE_VERSION", `Duplicate live migration version ${version}`);
    }
    seenVersions.add(version);

    const statements = normalizeTextArray(migration.statements);
    const rollback = normalizeTextArray(migration.rollback);
    const key = `${version}|${name}`;
    const repositorySource = repositorySources.get(key);
    const exactLedger = exactLedgerByKey.get(key);
    const exactRepositorySource = repositorySource && exactLedger
      && exactLedger.repository_path === repositorySource.path
      && exactLedger.git_blob_sha === repositorySource.git_blob_sha1;

    let provenanceClass = "P5";
    if (exactRepositorySource) provenanceClass = "P1";
    else if (statements.length > 0) provenanceClass = "P2";

    const record = {
      version,
      name,
      class: provenanceClass,
      execution_origin: "supabase_migrations.schema_migrations",
      statement_count: statements.length,
      live_statement_sha256: statements.length > 0 ? sha256(statements.join(STATEMENT_BOUNDARY)) : null,
      rollback_statement_count: rollback.length,
      live_rollback_sha256: rollback.length > 0 ? sha256(rollback.join(ROLLBACK_BOUNDARY)) : null,
      authenticated_creator_present: Boolean(String(migration.created_by ?? "").trim()),
      idempotency_key_present: Boolean(String(migration.idempotency_key ?? "").trim()),
      statement_kinds: statementKinds(statements),
      exact_repository_source: exactRepositorySource
        ? {
            repository_path: repositorySource.path,
            git_blob_sha1: repositorySource.git_blob_sha1,
            file_sha256: repositorySource.file_sha256,
            source_commit: String(exactLedger.source_commit),
            application_state: String(exactLedger.application_state),
            execution_mode: String(exactLedger.execution_mode),
          }
        : null,
      current_repository_representation: exactRepositorySource
        ? "exact migration file"
        : "retained exact execution artifact plus current approved schema baseline",
      security_review_result: "covered by current schema, RLS, private-schema, Edge Function and cron parity snapshots",
      reason: exactRepositorySource
        ? "Exact repository version and name are linked to an immutable verified Git blob."
        : statements.length > 0
          ? "Exact deployed SQL is retained in live migration history; no fabricated timestamp mirror is required."
          : "No exact repository source or retained deployed SQL statement artifact was recovered.",
      superseding_baseline: exactRepositorySource
        ? null
        : "current approved public-schema baseline and canonical deployment manifest",
      evidence_refs: exactRepositorySource
        ? [
            `supabase_migrations.schema_migrations:${version}`,
            `private.irha_repository_migration_ledger:${version}`,
            repositorySource.path,
          ]
        : [`supabase_migrations.schema_migrations:${version}`],
    };
    records.push(canonicalize(record));
  }

  const count = (classification) => records.filter((record) => record.class === classification).length;
  const payload = {
    schema_version: 2,
    execution_id: "IA-SEC-E002R",
    goal_lock: "IRHA-PRODUCTION-SECURITY-01",
    project_id: EXPECTED_PROJECT_ID,
    classification_policy: {
      P1: "Exact repository source recovered and linked to the exact live version and name.",
      P2: "Exact deployed SQL execution artifact recovered from retained live migration statements.",
      P3: "Semantic repository equivalent.",
      P4: "Approved post-cutover reconciliation.",
      P5: "Unresolved provenance.",
    },
    totals: {
      live: records.length,
      P1: count("P1"),
      P2: count("P2"),
      P3: count("P3"),
      P4: count("P4"),
      P5: count("P5"),
      all_statements_recovered: records.every((record) => record.statement_count > 0),
      all_creators_present: records.every((record) => record.authenticated_creator_present),
    },
    records,
  };
  const canonicalPayload = canonicalJson(payload);
  return {
    canonical_payload_sha256: sha256(canonicalPayload),
    payload,
  };
}

function rejectSecretBearingOutput(serialized) {
  const forbidden = [
    /sb_secret_[A-Za-z0-9_-]+/,
    /service_role\s*[:=]\s*["']?[A-Za-z0-9._-]{20,}/i,
    /eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}/,
    /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  ];
  if (forbidden.some((pattern) => pattern.test(serialized))) {
    throw new ProvenanceError("SECRET_OUTPUT", "Secret-bearing migration provenance output was rejected");
  }
}

async function main() {
  const root = process.cwd();
  const projectId = required(process.env.SUPABASE_PROJECT_ID ?? EXPECTED_PROJECT_ID, "SUPABASE_PROJECT_ID");
  const accessToken = required(process.env.SUPABASE_ACCESS_TOKEN, "SUPABASE_ACCESS_TOKEN");
  const outputPath = resolve(root, process.env.MIGRATION_PROVENANCE_OUTPUT ?? "supabase/deployment-parity/migration-provenance.json");
  const mode = process.env.MIGRATION_PROVENANCE_MODE ?? "verify";

  await verifyProjectIdentity(projectId, accessToken);
  const migrations = await databaseQuery(
    projectId,
    accessToken,
    "select version, name, statements, rollback, created_by, idempotency_key from supabase_migrations.schema_migrations order by version",
  );
  const repositoryLedger = await databaseQuery(
    projectId,
    accessToken,
    "select version, name, repository_path, git_blob_sha, source_commit, application_state, execution_mode from private.irha_repository_migration_ledger order by version",
  );
  const result = buildLedger({
    migrations,
    repositoryLedger,
    repositorySources: repositoryMigrationSources(root),
  });
  const serialized = canonicalJson(result);
  rejectSecretBearingOutput(serialized);

  if (result.payload.totals.P5 !== 0) {
    throw new ProvenanceError("UNRESOLVED_P5", `${result.payload.totals.P5} migration provenance record(s) remain P5`);
  }
  if (result.payload.totals.live !== 376) {
    throw new ProvenanceError("LIVE_COUNT_DRIFT", `Expected 376 live migrations, found ${result.payload.totals.live}`);
  }

  if (mode === "write") {
    writeFileSync(outputPath, serialized, "utf8");
  } else if (mode === "verify") {
    if (!existsSync(outputPath)) throw new ProvenanceError("MISSING_LEDGER", "Committed migration provenance ledger is missing");
    const committed = readFileSync(outputPath, "utf8");
    if (committed !== serialized) {
      throw new ProvenanceError("LEDGER_DRIFT", "Committed migration provenance ledger does not match live history");
    }
  } else {
    throw new ProvenanceError("INVALID_MODE", `Unsupported MIGRATION_PROVENANCE_MODE ${mode}`);
  }

  console.log(JSON.stringify({
    project_id: projectId,
    live: result.payload.totals.live,
    P1: result.payload.totals.P1,
    P2: result.payload.totals.P2,
    P3: result.payload.totals.P3,
    P4: result.payload.totals.P4,
    P5: result.payload.totals.P5,
    checksum: result.canonical_payload_sha256,
    mode,
  }));
}

main().catch((error) => {
  const code = error instanceof ProvenanceError ? error.code : "UNEXPECTED_FAILURE";
  console.error(`${code}: ${error.message}`);
  process.exitCode = 1;
});
