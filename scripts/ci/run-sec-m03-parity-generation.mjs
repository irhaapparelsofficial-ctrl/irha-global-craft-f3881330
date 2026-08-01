import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const projectId = "pvzjiozismyxqrzmtfbi";
const dispatcherVersion = 8;
const dispatcherHash = "2b4525d022b0788c3bb6b2bf25923c90c35807a3e2b6065671b2eb90f00f1a48";

function occurrenceCount(source, target) {
  let count = 0;
  let offset = 0;
  while (true) {
    const index = source.indexOf(target, offset);
    if (index < 0) return count;
    count += 1;
    offset = index + target.length;
  }
}

function replaceLegacyOrRequireCurrent(source, legacy, current, label) {
  const legacyCount = occurrenceCount(source, legacy);
  const currentCount = occurrenceCount(source, current);
  if (legacyCount === 1 && currentCount === 0) {
    return source.replace(legacy, current);
  }
  if (legacyCount === 0 && currentCount === 1) {
    return source;
  }
  throw new Error(
    `${label} expected exactly one canonical replacement target or one already-current target; legacy=${legacyCount} current=${currentCount}`,
  );
}

function requireDynamicMigrationParity(source, label) {
  if (!source.includes("assertExactMigrationParity")) {
    throw new Error(`${label} must enforce dynamic exact migration version-set parity`);
  }
  if (source.includes("liveMigrationCount")) {
    throw new Error(`${label} must not depend on a fixed live migration count`);
  }
  if (source.includes("Expected 376 live migrations") || source.includes("!== 376")) {
    throw new Error(`${label} contains a stale fixed migration-count invariant`);
  }
  return source;
}

function patchedProvenanceSource() {
  const path = resolve(root, "scripts/ci/generate-migration-provenance.mjs");
  return requireDynamicMigrationParity(readFileSync(path, "utf8"), "migration provenance generator");
}

function patchedManifestSource() {
  const path = resolve(root, "scripts/ci/generate-supabase-manifest.mjs");
  let source = readFileSync(path, "utf8");
  source = replaceLegacyOrRequireCurrent(
    source,
    'dispatcher.version !== 7 || dispatcher.verify_jwt !== false || dispatcher.source_sha256 !== "62da00683ce93174c7850f38640ba279ea5baa6de77129045a1670681e153ec7"',
    `dispatcher.version !== ${dispatcherVersion} || dispatcher.verify_jwt !== false || dispatcher.source_sha256 !== "${dispatcherHash}"`,
    "notification dispatcher invariant",
  );
  return requireDynamicMigrationParity(source, "Supabase manifest generator");
}

function run(scriptPath, extraEnv) {
  execFileSync(process.execPath, [scriptPath], {
    cwd: root,
    env: {
      ...process.env,
      SUPABASE_PROJECT_ID: projectId,
      ...extraEnv,
    },
    stdio: "inherit",
  });
}

const directory = mkdtempSync(join(tmpdir(), "irha-sec-m03-parity-"));
try {
  const provenancePath = join(directory, "generate-migration-provenance.mjs");
  const manifestPath = join(directory, "generate-supabase-manifest.mjs");
  const parityHelperPath = join(directory, "migration-production-parity.mjs");
  writeFileSync(provenancePath, patchedProvenanceSource(), "utf8");
  writeFileSync(manifestPath, patchedManifestSource(), "utf8");
  writeFileSync(
    parityHelperPath,
    readFileSync(resolve(root, "scripts/ci/migration-production-parity.mjs"), "utf8"),
    "utf8",
  );

  run(provenancePath, { MIGRATION_PROVENANCE_MODE: "write" });
  run(manifestPath, { SUPABASE_MANIFEST_MODE: "write" });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
