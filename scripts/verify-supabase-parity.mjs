import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";

const manifestPath = "supabase/deployment-parity/manifest.json";
const ledgerPath = "supabase/deployment-parity/migration-reconciliation.json";
const configPath = "supabase/config.toml";
const typesPath = "src/integrations/supabase/types.ts";

const readJson = (path) => JSON.parse(fs.readFileSync(path, "utf8"));
const canonical = (value) => {
  const sort = (item) => Array.isArray(item)
    ? item.map(sort)
    : item && typeof item === "object"
      ? Object.fromEntries(Object.keys(item).sort().map((key) => [key, sort(item[key])]))
      : item;
  return `${JSON.stringify(sort(value))}\n`;
};
const sha256 = (value) => crypto.createHash("sha256").update(value, "utf8").digest("hex");
const manifest = readJson(manifestPath);
const ledger = readJson(ledgerPath);
const config = fs.readFileSync(configPath, "utf8");
const types = fs.readFileSync(typesPath, "utf8");

const storedManifestHash = manifest.manifest_sha256;
delete manifest.manifest_sha256;
assert.equal(sha256(canonical(manifest)), storedManifestHash, "manifest checksum mismatch");

const storedLedgerHash = ledger.ledger_sha256;
delete ledger.ledger_sha256;
assert.equal(sha256(canonical(ledger)), storedLedgerHash, "migration ledger checksum mismatch");

assert.equal(manifest.identity.supabase_project_id, "pvzjiozismyxqrzmtfbi");
assert.equal(manifest.edge_functions.deployed_count, 87);
assert.equal(manifest.edge_functions.functions.length, 87);
assert.equal(new Set(manifest.edge_functions.functions.map((item) => item[0])).size, 87);
assert.equal(manifest.edge_functions.totals.F5, 0);
assert.equal(manifest.edge_functions.totals.F3, 9);

for (const fn of manifest.edge_functions.functions) {
  const [name, version, verifyJwt, sourceHash, classification] = fn;
  assert.match(classification, /^F[1-6]$/);
  assert.ok(Number.isInteger(version) && version > 0);
  assert.match(sourceHash, /^[0-9a-f]{64}$/);
  assert.ok(config.includes(`[functions.${name}]`), `missing config entry: ${name}`);
  assert.ok(config.includes(`[functions.${name}]\nverify_jwt = ${verifyJwt}`), `verify_jwt mismatch: ${name}`);
}
for (const fn of manifest.edge_functions.f4) {
  assert.ok(config.includes(`[functions.${fn[0]}]`), `missing F4 config entry: ${fn[0]}`);
}

const dispatcher = manifest.security_invariants.notification_dispatcher;
assert.equal(dispatcher.version, 7);
assert.equal(dispatcher.verify_jwt, false);
assert.equal(dispatcher.custom_auth_required, true);
assert.equal(dispatcher.single_use_scheduler_authorization, true);
assert.equal(dispatcher.source_sha256, "62da00683ce93174c7850f38640ba279ea5baa6de77129045a1670681e153ec7");

for (const fn of manifest.edge_functions.functions.filter((item) => item[4] === "F3")) {
  assert.equal(fn[2], true, `sealed stub must stay JWT-protected: ${fn[0]}`);
  assert.match(fn[10], /retain sealed/);
  assert.equal(fn[11], "sealed-410-inspected");
}

assert.equal(manifest.browser_exposure.private_schema_client_exposure, false);
assert.equal(manifest.generated_types.approved_schema, "public");
assert.equal(manifest.generated_types.private_schemas_excluded, true);
assert.ok(types.includes("export type Database"), "generated Database type missing");
assert.ok(!types.includes("private:"), "private schema unexpectedly present in browser types");
assert.ok(!types.includes("vault:"), "Vault schema unexpectedly present in browser types");

const forbidden = /(service[_-]?role|supabase[_-]?access[_-]?token|private[_-]?key|client[_-]?secret|authorization"\s*:\s*"bearer\s+[a-z0-9._-]+)/i;
assert.ok(!forbidden.test(JSON.stringify(manifest)), "secret-like value in manifest");
assert.ok(!forbidden.test(JSON.stringify(ledger)), "secret-like value in migration ledger");

console.log(JSON.stringify({
  ok: true,
  project: manifest.identity.supabase_project_id,
  edge_functions: manifest.edge_functions.deployed_count,
  classifications: manifest.edge_functions.totals,
  manifest_sha256: storedManifestHash,
  migration_ledger_sha256: storedLedgerHash,
  generated_types_live_source_sha256: manifest.generated_types.live_source_sha256
}, null, 2));
