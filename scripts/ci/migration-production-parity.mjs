import { createHash } from "node:crypto";

export const REQUIRED_PRODUCTION_MIGRATION_VERSION = "20260731151915";
export const REQUIRED_PRODUCTION_MIGRATION_NAME = "align_drive_gallery_with_selected_media";
export const REQUIRED_PRODUCTION_MIGRATION_PATH = `supabase/migrations/${REQUIRED_PRODUCTION_MIGRATION_VERSION}_${REQUIRED_PRODUCTION_MIGRATION_NAME}.sql`;

const APPLIED_STATES = new Set(["applied", "verified_present"]);

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function versionFrom(value) {
  return String(typeof value === "object" && value !== null ? value.version : value);
}

function normalizeVersions(values, label) {
  if (!Array.isArray(values)) throw new Error(`${label} must be an array`);
  const seen = new Set();
  const versions = [];
  for (const value of values) {
    const version = versionFrom(value);
    if (!/^\d{14}$/.test(version)) throw new Error(`${label} contains invalid migration version ${version}`);
    if (seen.has(version)) throw new Error(`${label} contains duplicate migration version ${version}`);
    seen.add(version);
    versions.push(version);
  }
  return versions.sort();
}

function exactManifestEntry(entry) {
  return {
    version: String(entry.version),
    name: String(entry.name),
    path: String(entry.path),
    git_blob_sha: String(entry.git_blob_sha),
  };
}

export function deriveProductionMigrationVersions({ baselineRecords, repositoryManifest, repositoryLedger }) {
  const baselineVersions = normalizeVersions(baselineRecords, "sealed migration provenance");
  if (!repositoryManifest || !Array.isArray(repositoryManifest.migrations)) {
    throw new Error("repository migration manifest is missing migrations");
  }
  const manifestVersions = normalizeVersions(repositoryManifest.migrations, "repository migration manifest");
  const manifestByVersion = new Map();
  const manifestPaths = new Set();
  for (const entry of repositoryManifest.migrations) {
    const normalized = exactManifestEntry(entry);
    if (!/^[a-z0-9_]+$/.test(normalized.name)) throw new Error(`Invalid repository migration name ${normalized.version}`);
    if (!normalized.path.startsWith("supabase/migrations/") || !normalized.path.endsWith(".sql")) {
      throw new Error(`Invalid repository migration path ${normalized.version}`);
    }
    if (!/^[0-9a-f]{40}$/.test(normalized.git_blob_sha)) throw new Error(`Invalid repository migration checksum ${normalized.version}`);
    if (manifestPaths.has(normalized.path)) throw new Error(`repository migration manifest contains duplicate path ${normalized.path}`);
    manifestPaths.add(normalized.path);
    manifestByVersion.set(normalized.version, normalized);
  }
  if (manifestByVersion.size !== manifestVersions.length) throw new Error("repository migration manifest version index mismatch");

  const ledgerVersions = normalizeVersions(repositoryLedger, "repository migration ledger");
  const ledgerByVersion = new Map(repositoryLedger.map((row) => [String(row.version), row]));
  if (ledgerByVersion.size !== ledgerVersions.length) throw new Error("repository migration ledger version index mismatch");

  const approvedAppliedVersions = [];
  for (const entry of repositoryManifest.migrations) {
    const expected = exactManifestEntry(entry);
    const row = ledgerByVersion.get(expected.version);
    if (!row) continue;
    const applicationState = String(row.application_state ?? "");
    if (!APPLIED_STATES.has(applicationState)) {
      throw new Error(`Unexpected repository migration ledger state for ${expected.version}: ${applicationState || "missing"}`);
    }
    if (String(row.name) !== expected.name) throw new Error(`Repository migration ledger name mismatch for ${expected.version}`);
    if (String(row.repository_path) !== expected.path) throw new Error(`Repository migration ledger path mismatch for ${expected.version}`);
    if (String(row.git_blob_sha) !== expected.git_blob_sha) throw new Error(`Repository migration ledger checksum mismatch for ${expected.version}`);
    approvedAppliedVersions.push(expected.version);
  }

  const requiredManifest = manifestByVersion.get(REQUIRED_PRODUCTION_MIGRATION_VERSION);
  if (!requiredManifest
      || requiredManifest.name !== REQUIRED_PRODUCTION_MIGRATION_NAME
      || requiredManifest.path !== REQUIRED_PRODUCTION_MIGRATION_PATH) {
    throw new Error(`Required production migration ${REQUIRED_PRODUCTION_MIGRATION_VERSION} is not exactly registered`);
  }
  const requiredLedger = ledgerByVersion.get(REQUIRED_PRODUCTION_MIGRATION_VERSION);
  if (!requiredLedger || !APPLIED_STATES.has(String(requiredLedger.application_state ?? ""))) {
    throw new Error(`Required production migration ${REQUIRED_PRODUCTION_MIGRATION_VERSION} is not recorded as applied`);
  }

  return [...new Set([...baselineVersions, ...approvedAppliedVersions])].sort();
}

export function assertExactMigrationParity({ databaseVersions, productionMigrationVersions }) {
  const database = normalizeVersions(databaseVersions, "database migrations");
  const production = normalizeVersions(productionMigrationVersions, "production migrations");
  const databaseSet = new Set(database);
  const productionSet = new Set(production);

  if (!databaseSet.has(REQUIRED_PRODUCTION_MIGRATION_VERSION)) {
    throw new Error(`Required production migration ${REQUIRED_PRODUCTION_MIGRATION_VERSION} is missing from database`);
  }
  if (!productionSet.has(REQUIRED_PRODUCTION_MIGRATION_VERSION)) {
    throw new Error(`Required production migration ${REQUIRED_PRODUCTION_MIGRATION_VERSION} is missing from production inventory`);
  }

  const missing = production.filter((version) => !databaseSet.has(version));
  const unexpected = database.filter((version) => !productionSet.has(version));
  if (missing.length > 0 || unexpected.length > 0) {
    throw new Error(
      `Migration version-set drift: missing=[${missing.join(",")}] unexpected=[${unexpected.join(",")}]`,
    );
  }

  return {
    databaseVersions: database.length,
    productionMigrationFiles: production.length,
    requiredVersion: REQUIRED_PRODUCTION_MIGRATION_VERSION,
  };
}

export function migrationHistoryDigestFromRecords(records) {
  const versions = normalizeVersions(records, "migration provenance records");
  const byVersion = new Map(records.map((record) => [String(record.version), record]));
  const canonical = versions.map((version) => {
    const record = byVersion.get(version);
    const name = String(record.name ?? "");
    const statementHash = String(record.live_statement_sha256 ?? "");
    if (!name) throw new Error(`Migration provenance record ${version} is missing name`);
    if (!/^[0-9a-f]{64}$/.test(statementHash)) throw new Error(`Migration provenance record ${version} has invalid statement checksum`);
    return `${version}|${name}|${statementHash}`;
  }).join("\n");
  return sha256(canonical);
}

export function assertCommittedMigrationEvidence({ databaseMigrationSummary, databaseMigrationDigest, records }) {
  const versions = normalizeVersions(records, "migration provenance records");
  if (!versions.includes(REQUIRED_PRODUCTION_MIGRATION_VERSION)) {
    throw new Error(`Required production migration ${REQUIRED_PRODUCTION_MIGRATION_VERSION} is missing from committed provenance`);
  }
  if (Number(databaseMigrationSummary?.count) !== versions.length) {
    throw new Error(`Committed migration count mismatch: database=${databaseMigrationSummary?.count} provenance=${versions.length}`);
  }
  if (String(databaseMigrationSummary?.min_version ?? "") !== versions[0]) {
    throw new Error("Committed migration minimum version mismatch");
  }
  if (String(databaseMigrationSummary?.max_version ?? "") !== versions.at(-1)) {
    throw new Error("Committed migration maximum version mismatch");
  }
  const evidenceDigest = migrationHistoryDigestFromRecords(records);
  if (evidenceDigest !== String(databaseMigrationDigest ?? "")) {
    throw new Error("Committed migration history digest mismatch");
  }
  return {
    databaseVersions: versions.length,
    productionMigrationFiles: versions.length,
    requiredVersion: REQUIRED_PRODUCTION_MIGRATION_VERSION,
  };
}
