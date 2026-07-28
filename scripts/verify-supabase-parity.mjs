import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const readJson = (path) => JSON.parse(read(path));
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const canonical = (value) => {
  const sort = (item) => Array.isArray(item)
    ? item.map(sort)
    : item && typeof item === "object"
      ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])]))
      : item;
  return `${JSON.stringify(sort(value))}\n`;
};

const manifest = readJson("supabase/deployment-parity/manifest.json");
const ledger = readJson("supabase/deployment-parity/migration-reconciliation.json");
const config = read("supabase/config.toml");
const types = read("src/integrations/supabase/types.ts");

const storedManifestHash = manifest.manifest_sha256;
delete manifest.manifest_sha256;
assert.equal(sha256(canonical(manifest)), storedManifestHash, "manifest checksum mismatch");

const storedLedgerHash = ledger.ledger_sha256;
delete ledger.ledger_sha256;
assert.equal(sha256(canonical(ledger)), storedLedgerHash, "migration ledger checksum mismatch");

const registryOrder = ["F1", "F2", "F3", "F4", "F6"];
const registries = new Map();
let registryBytes = "";
for (const classification of registryOrder) {
  const record = manifest.edge_functions.registries[classification];
  const raw = read(record.path);
  assert.equal(sha256(raw), record.file_sha256, `${classification} registry file checksum mismatch`);
  const parsed = JSON.parse(raw);
  assert.equal(parsed.classification, classification);
  assert.equal(parsed.functions.length, record.count);
  registries.set(classification, parsed);
  registryBytes += raw;
}
assert.equal(sha256(registryBytes), manifest.edge_functions.classification_sha256, "classification registry checksum mismatch");

const deployed = ["F1", "F2", "F3", "F6"].flatMap((classification) =>
  registries.get(classification).functions.map((row) => ({ classification, row }))
);
assert.equal(deployed.length, manifest.edge_functions.deployed_count);
assert.equal(new Set(deployed.map(({ row }) => row[0])).size, deployed.length);
assert.equal(manifest.edge_functions.registries.F5.count, 0);

for (const { classification, row } of deployed) {
  const [name, version, verifyJwt, sourceHash] = row;
  assert.ok(Number.isInteger(version) && version > 0);
  assert.match(sourceHash, /^[0-9a-f]{64}$/);
  assert.ok(config.includes(`[functions.${name}]`), `missing config entry: ${name}`);
  assert.ok(config.includes(`[functions.${name}]\nverify_jwt = ${verifyJwt}`), `verify_jwt mismatch: ${name}`);
  assert.match(classification, /^F[1236]$/);
}
for (const row of registries.get("F4").functions) {
  assert.ok(config.includes(`[functions.${row[0]}]`), `missing F4 config entry: ${row[0]}`);
}

const dispatcherRow = deployed.find(({ row }) => row[0] === "notification-dispatcher")?.row;
assert.ok(dispatcherRow, "notification-dispatcher missing");
assert.equal(dispatcherRow[1], 7);
assert.equal(dispatcherRow[2], false);
assert.equal(dispatcherRow[3], "62da00683ce93174c7850f38640ba279ea5baa6de77129045a1670681e153ec7");
const dispatcher = manifest.security_invariants.notification_dispatcher;
assert.equal(dispatcher.custom_auth_required, true);
assert.equal(dispatcher.single_use_scheduler_authorization, true);

for (const row of registries.get("F3").functions) {
  assert.equal(row[2], true, `sealed stub must stay JWT-protected: ${row[0]}`);
  assert.match(row[9], /retain sealed/);
  assert.equal(row[10], "sealed-410-inspected");
}

assert.equal(manifest.identity.supabase_project_id, "pvzjiozismyxqrzmtfbi");
assert.equal(manifest.browser_exposure.private_schema_client_exposure, false);
assert.equal(manifest.generated_types.approved_schema, "public");
assert.equal(manifest.generated_types.private_schemas_excluded, true);
assert.ok(types.includes("export type Database"), "generated Database type missing");
assert.ok(!types.includes("private:"), "private schema unexpectedly present in browser types");
assert.ok(!types.includes("vault:"), "Vault schema unexpectedly present in browser types");

// Match concrete credential formats or assignments, not descriptive metadata such as
// "service-role operational tooling" or "private key excluded".
const forbidden = /(eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}|sbp_[a-zA-Z0-9]{20,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|authorization"\s*:\s*"bearer\s+[a-z0-9._-]{20,}|(?:service_role_key|supabase_access_token|client_secret|private_key)"?\s*[:=]\s*"[^"]{12,}")/i;
for (const path of [
  "supabase/deployment-parity/manifest.json",
  "supabase/deployment-parity/migration-reconciliation.json",
  ...registryOrder.map((classification) => manifest.edge_functions.registries[classification].path)
]) {
  assert.ok(!forbidden.test(read(path)), `secret-like value in ${path}`);
}

console.log(JSON.stringify({
  ok: true,
  project: manifest.identity.supabase_project_id,
  edge_functions: deployed.length,
  classifications: Object.fromEntries(Object.entries(manifest.edge_functions.registries).map(([key, value]) => [key, value.count])),
  manifest_sha256: storedManifestHash,
  function_classification_sha256: manifest.edge_functions.classification_sha256,
  migration_ledger_sha256: storedLedgerHash,
  generated_types_live_source_sha256: manifest.generated_types.live_source_sha256
}, null, 2));
