import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const projectId = "pvzjiozismyxqrzmtfbi";

function requireDynamicMigrationParity(source, label) {
  if (!source.includes("assertExactMigrationParity")) throw new Error(`${label} must enforce dynamic exact migration version-set parity`);
  if (source.includes("liveMigrationCount")) throw new Error(`${label} must not depend on a fixed live migration count`);
  if (source.includes("Expected 376 live migrations") || source.includes("!== 376")) throw new Error(`${label} contains a stale fixed migration-count invariant`);
  return source;
}

function requireMonotonicEdgeVersionParity(source, label) {
  if (!source.includes("deployed.version < representation.minimum_version")) throw new Error(`${label} must treat Supabase numeric versions as monotonic minimum floors`);
  if (source.includes("deployed.version !== representation.version")) throw new Error(`${label} must not exact-pin monotonic Supabase numeric versions`);
  if (!source.includes('expectedFunctions.get("notification-dispatcher")')) throw new Error(`${label} must derive notification-dispatcher source/auth invariants from the approved registry`);
  return source;
}

function run(scriptPath, extraEnv) {
  execFileSync(process.execPath, [scriptPath], { cwd: root, env: { ...process.env, SUPABASE_PROJECT_ID: projectId, ...extraEnv }, stdio: "inherit" });
}

const directory = mkdtempSync(join(tmpdir(), "irha-sec-m03-parity-"));
try {
  const provenancePath = join(directory, "generate-migration-provenance.mjs");
  const generatedManifestPath = join(directory, "generate-supabase-manifest.mjs");
  const parityHelperPath = join(directory, "migration-production-parity.mjs");
  writeFileSync(provenancePath, requireDynamicMigrationParity(readFileSync(resolve(root, "scripts/ci/generate-migration-provenance.mjs"), "utf8"), "migration provenance generator"), "utf8");
  writeFileSync(generatedManifestPath, requireMonotonicEdgeVersionParity(requireDynamicMigrationParity(readFileSync(resolve(root, "scripts/ci/generate-supabase-manifest.mjs"), "utf8"), "Supabase manifest generator"), "Supabase manifest generator"), "utf8");
  writeFileSync(parityHelperPath, readFileSync(resolve(root, "scripts/ci/migration-production-parity.mjs"), "utf8"), "utf8");
  run(provenancePath, { MIGRATION_PROVENANCE_MODE: "write" });
  run(generatedManifestPath, { SUPABASE_MANIFEST_MODE: "write" });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
