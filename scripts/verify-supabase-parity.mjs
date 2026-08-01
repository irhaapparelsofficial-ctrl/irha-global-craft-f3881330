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
assert.equal(provenance.payload.totals.live, 376);
assert.equal(provenance.payload.records.length, 376);
assert.equal(provenance.payload.totals.P1, 5);
assert.equal(provenance.payload.totals.P2, 371);
assert.equal(provenance.payload.totals.P3, 0);
assert.equal(provenance.payload.totals.P4, 0);
assert.equal(provenance.payload.totals.P5, 0);
assert.equal(provenance.payload.totals.all_statements_recovered, true);
assert.equal(provenance.payload.totals.all_creators_present, true);
assert.equal(new Set(provenance.payload.records.map((record) => record.version)).size, 376);
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

console.log(`Supabase parity manifest verified: ${manifestPath}`);
