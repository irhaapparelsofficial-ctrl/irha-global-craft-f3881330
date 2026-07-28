import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const planPath = resolve(root, process.env.SEC_M03_PARITY_REFRESH_PLAN || "supabase/reconciliation/sec-m03-parity-refresh.json");
const inventoryPath = resolve(process.env.SEC_M03_LIVE_INVENTORY || "/tmp/functions-after.json");
const outputPath = resolve(process.env.SEC_M03_REGISTRY_EVIDENCE || "/tmp/sec-m03-registry-refresh-evidence.json");
const plan = JSON.parse(readFileSync(planPath, "utf8"));
const inventory = JSON.parse(readFileSync(inventoryPath, "utf8"));
if (!Array.isArray(inventory)) throw new Error("Live function inventory must be an array");

const grouped = new Map();
for (const entry of plan.functions) {
  const live = inventory.find((candidate) => (candidate.name ?? candidate.slug) === entry.name);
  if (!live) throw new Error(`Live function missing: ${entry.name}`);
  if (live.verify_jwt !== entry.verify_jwt) throw new Error(`verify_jwt mismatch: ${entry.name}`);
  if (entry.exact_version !== undefined && Number(live.version) !== entry.exact_version) {
    throw new Error(`Exact version mismatch: ${entry.name}`);
  }
  if (entry.minimum_version !== undefined && Number(live.version) < entry.minimum_version) {
    throw new Error(`Minimum version mismatch: ${entry.name}`);
  }
  const liveHash = live.ezbr_sha256 ?? live.sha256;
  if (typeof liveHash !== "string" || !/^[a-f0-9]{64}$/.test(liveHash)) {
    throw new Error(`Live hash missing: ${entry.name}`);
  }
  if (entry.exact_hash && liveHash !== entry.exact_hash) throw new Error(`Exact hash mismatch: ${entry.name}`);
  const rows = grouped.get(entry.registry) ?? [];
  rows.push({ entry, live, liveHash });
  grouped.set(entry.registry, rows);
}

const evidenceRows = [];
for (const [registryPath, updates] of [...grouped.entries()].sort(([left], [right]) => left.localeCompare(right))) {
  const absolutePath = resolve(root, registryPath);
  const registry = JSON.parse(readFileSync(absolutePath, "utf8"));
  if (!Array.isArray(registry.functions)) throw new Error(`Registry functions missing: ${registryPath}`);

  for (const { entry, live, liveHash } of updates) {
    const row = registry.functions.find((candidate) => candidate[0] === entry.name);
    if (!row) throw new Error(`Registry row missing: ${entry.name}`);
    const before = { version: row[1], verify_jwt: row[2], sha256: row[3] };
    row[1] = Number(live.version);
    row[2] = live.verify_jwt;
    row[3] = liveHash;
    evidenceRows.push({
      name: entry.name,
      registry: registryPath,
      before,
      after: { version: row[1], verify_jwt: row[2], sha256: row[3] },
      provenance: entry.provenance,
    });
  }

  registry.functions.sort((left, right) => String(left[0]).localeCompare(String(right[0])));
  writeFileSync(absolutePath, `${JSON.stringify(registry)}\n`, "utf8");
}

const evidence = {
  schema_version: 1,
  execution_id: plan.execution_id,
  project_id: plan.project_id,
  source_sha: process.env.SOURCE_SHA || null,
  changes: evidenceRows.sort((left, right) => left.name.localeCompare(right.name)),
};
writeFileSync(outputPath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
console.log(`Refreshed ${evidenceRows.length} approved registry rows across ${grouped.size} registries.`);
