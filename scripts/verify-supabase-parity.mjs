import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

const read = (path) => readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(read(path));
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const canonicalize = (value) => {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonicalize(value[key])]));
  }
  return value;
};
const canonicalJson = (value) => `${JSON.stringify(canonicalize(value), null, 2)}\n`;

const manifestPath = "supabase/deployment-parity/manifest.json";
const manifest = readJson(manifestPath);
assert.equal(manifest.schema_version, 2, "unsupported deployment manifest schema");
assert.equal(manifest.execution_id, "IA-SEC-E002R");
assert.equal(manifest.goal_lock, "IRHA-PRODUCTION-SECURITY-01");
assert.equal(manifest.identity.supabase_project_id, "pvzjiozismyxqrzmtfbi");
assert.equal(manifest.identity.repository, "irhaapparelsofficial-ctrl/irha-global-craft-f3881330");
assert.equal(manifest.identity.supabase_status, "ACTIVE_HEALTHY");

const storedManifestHash = manifest.manifest_sha256;
const manifestPayload = structuredClone(manifest);
delete manifestPayload.manifest_sha256;
assert.equal(sha256(canonicalJson(manifestPayload)), storedManifestHash, "manifest checksum mismatch");

const provenancePath = manifest.migration_provenance.path;
const provenanceRaw = read(provenancePath);
const provenance = JSON.parse(provenanceRaw);
assert.equal(sha256(provenanceRaw), manifest.migration_provenance.file_sha256, "migration provenance file checksum mismatch");
assert.equal(
  sha256(canonicalJson(provenance.payload)),
  provenance.canonical_payload_sha256,
  "migration provenance payload checksum mismatch",
);
assert.equal(provenance.canonical_payload_sha256, manifest.migration_provenance.canonical_payload_sha256);
assert.equal(provenance.payload.project_id, manifest.identity.supabase_project_id);
assert.equal(provenance.payload.totals.live, 374);
assert.equal(provenance.payload.records.length, 374);
assert.equal(provenance.payload.totals.P1, 4);
assert.equal(provenance.payload.totals.P2, 370);
assert.equal(provenance.payload.totals.P3, 0);
assert.equal(provenance.payload.totals.P4, 0);
assert.equal(provenance.payload.totals.P5, 0);
assert.equal(provenance.payload.totals.all_statements_recovered, true);
assert.equal(provenance.payload.totals.all_creators_present, true);
assert.equal(new Set(provenance.payload.records.map((record) => record.version)).size, 374);
for (const record of provenance.payload.records) {
  assert.match(record.version, /^\d{14}$/);
  assert.match(record.class, /^P[12]$/);
  assert.ok(record.statement_count > 0, `missing retained SQL statements for ${record.version}`);
  assert.match(record.live_statement_sha256, /^[0-9a-f]{64}$/);
  assert.equal(record.authenticated_creator_present, true);
}

const config = read("supabase/config.toml");
assert.equal(sha256(config), manifest.edge_functions.config_toml_sha256, "config.toml checksum mismatch");
assert.equal(manifest.edge_functions.config_parity, true);

const registryOrder = ["F1", "F2", "F3", "F4", "F6"];
const registries = new Map();
let registryBytes = "";
for (const classification of registryOrder) {
  const record = manifest.edge_functions.registries[classification];
  const raw = read(record.path);
  assert.equal(sha256(raw), record.file_sha256, `${classification} registry checksum mismatch`);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.classification, classification);
  assert.equal(parsed.functions.length, record.count);
  registries.set(classification, parsed);
  registryBytes += raw;
}
assert.equal(sha256(registryBytes), manifest.edge_functions.classification_sha256, "classification checksum mismatch");
assert.deepEqual(
  Object.fromEntries(Object.entries(manifest.edge_functions.registries).map(([key, value]) => [key, value.count])),
  { F1: 33, F2: 14, F3: 9, F4: 1, F5: 0, F6: 31 },
);

const deployed = ["F1", "F2", "F3", "F6"].flatMap((classification) =>
  registries.get(classification).functions.map((row) => ({ classification, row })),
);
assert.equal(deployed.length, 87);
assert.equal(manifest.edge_functions.deployed_count, 87);
assert.equal(new Set(deployed.map(({ row }) => row[0])).size, 87);
assert.equal(manifest.edge_functions.registries.F5.count, 0);
assert.equal(manifest.security_invariants.unexplained_f5_count, 0);

for (const { classification, row } of deployed) {
  const [name, version, verifyJwt, sourceHash] = row;
  assert.match(classification, /^F[1236]$/);
  assert.ok(Number.isInteger(version) && version > 0, `invalid version: ${name}`);
  assert.equal(typeof verifyJwt, "boolean", `invalid verify_jwt: ${name}`);
  assert.match(sourceHash, /^[0-9a-f]{64}$/, `invalid source hash: ${name}`);
  assert.ok(config.includes(`[functions.${name}]`), `missing config entry: ${name}`);
  assert.ok(config.includes(`[functions.${name}]\nverify_jwt = ${verifyJwt}`), `verify_jwt mismatch: ${name}`);
}
for (const row of registries.get("F4").functions) {
  assert.ok(config.includes(`[functions.${row[0]}]`), `missing repository-only config entry: ${row[0]}`);
}

const dispatcherRow = deployed.find(({ row }) => row[0] === "notification-dispatcher")?.row;
assert.ok(dispatcherRow, "notification-dispatcher missing");
assert.equal(dispatcherRow[1], 7);
assert.equal(dispatcherRow[2], false);
assert.equal(dispatcherRow[3], "62da00683ce93174c7850f38640ba279ea5baa6de77129045a1670681e153ec7");
const dispatcher = manifest.security_invariants.notification_dispatcher;
assert.equal(dispatcher.version, 7);
assert.equal(dispatcher.verify_jwt, false);
assert.equal(dispatcher.source_sha256, dispatcherRow[3]);
assert.equal(dispatcher.custom_auth_required, true);
assert.equal(dispatcher.single_use_scheduler_authorization, true);

for (const row of registries.get("F3").functions) {
  assert.equal(row[2], true, `sealed stub must remain JWT-protected: ${row[0]}`);
  assert.match(row[9], /retain sealed/);
  assert.equal(row[10], "sealed-410-inspected");
}
assert.equal(manifest.security_invariants.sealed_stub_count, 9);
for (const row of registries.get("F6").functions) {
  assert.equal(row[9], "retain removal candidate", `F6 lifecycle changed: ${row[0]}`);
}

const typesPath = manifest.generated_types.committed_file;
const types = read(typesPath);
assert.equal(sha256(types), manifest.generated_types.sha256, "generated types checksum mismatch");
assert.equal(manifest.generated_types.approved_schema, "public");
assert.equal(manifest.generated_types.private_schemas_excluded, true);
assert.deepEqual(manifest.generated_types.totals, {
  enums: 4,
  function_signatures: 202,
  tables: 158,
  views: 13,
});
assert.ok(types.includes("export type Database"));
assert.ok(!types.includes("private:"), "private schema unexpectedly present in generated types");
assert.ok(!types.includes("vault:"), "Vault schema unexpectedly present in generated types");

assert.equal(manifest.database.public.tables, 158);
assert.equal(manifest.database.public.views, 13);
assert.equal(manifest.database.public.function_signatures, 202);
assert.equal(manifest.database.public.enums, 4);
assert.equal(manifest.database.public.rls_enabled_tables, 158);
assert.equal(manifest.database.live_migrations.count, 374);
assert.equal(manifest.cron.count, 8);
assert.equal(manifest.cron.active_count, 8);
assert.equal(manifest.cron.jobs.length, 8);
assert.equal(manifest.storage.bucket_count, 11);
assert.equal(manifest.storage.buckets.length, 11);
assert.equal(manifest.storage.buckets.filter((bucket) => bucket.public).length, 2);
assert.deepEqual(
  manifest.storage.buckets.filter((bucket) => bucket.public).map((bucket) => bucket.name).sort(),
  ["site-media", "social-renders"],
);
assert.equal(manifest.browser_exposure.private_schema_client_exposure, false);
for (const [schema, grants] of Object.entries(manifest.browser_exposure)) {
  if (schema === "public_schema_usage" || schema === "private_schema_client_exposure") continue;
  assert.equal(grants.anon, false, `${schema} exposed to anon`);
  assert.equal(grants.authenticated, false, `${schema} exposed to authenticated`);
}

const serializationRaw = read(manifest.serialization_contract.path);
assert.equal(sha256(serializationRaw), manifest.serialization_contract.sha256, "serialization contract checksum mismatch");

const forbidden = /(?:sb_secret_[a-zA-Z0-9_-]+|sbp_[a-zA-Z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|authorization\s*[:=]\s*["']bearer\s+[a-z0-9._-]{20,}|(?:service_role_key|supabase_access_token|client_secret|private_key)\s*[:=]\s*["'][^"']{12,})/i;
for (const path of [
  manifestPath,
  provenancePath,
  typesPath,
  manifest.serialization_contract.path,
  ...registryOrder.map((classification) => manifest.edge_functions.registries[classification].path),
]) {
  assert.ok(!forbidden.test(read(path)), `secret-like value in ${path}`);
}

console.log(JSON.stringify({
  ok: true,
  project: manifest.identity.supabase_project_id,
  database: manifest.database.public,
  migrations: provenance.payload.totals,
  edge_functions: deployed.length,
  classifications: Object.fromEntries(Object.entries(manifest.edge_functions.registries).map(([key, value]) => [key, value.count])),
  cron_jobs: manifest.cron.count,
  storage_buckets: manifest.storage.bucket_count,
  generated_types_sha256: manifest.generated_types.sha256,
  migration_provenance_sha256: provenance.canonical_payload_sha256,
  manifest_sha256: storedManifestHash,
  serialization_contract_sha256: manifest.serialization_contract.sha256,
}, null, 2));
