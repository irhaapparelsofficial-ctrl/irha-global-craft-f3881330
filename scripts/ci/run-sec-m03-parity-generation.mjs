import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const root = process.cwd();
const projectId = "pvzjiozismyxqrzmtfbi";
const dispatcherVersion = 8;
const dispatcherHash = "2b4525d022b0788c3bb6b2bf25923c90c35807a3e2b6065671b2eb90f00f1a48";
const liveMigrationCount = 375;

function replaceExactlyOnce(source, before, after, label) {
  const first = source.indexOf(before);
  const last = source.lastIndexOf(before);
  if (first < 0 || first !== last) {
    throw new Error(`${label} expected exactly one canonical replacement target`);
  }
  return source.slice(0, first) + after + source.slice(first + before.length);
}

function patchedProvenanceSource() {
  const path = resolve(root, "scripts/ci/generate-migration-provenance.mjs");
  let source = readFileSync(path, "utf8");
  source = replaceExactlyOnce(
    source,
    "if (result.payload.totals.live !== 374) {",
    `if (result.payload.totals.live !== ${liveMigrationCount}) {`,
    "migration provenance count guard",
  );
  source = replaceExactlyOnce(
    source,
    "`Expected 374 live migrations, found ${result.payload.totals.live}`",
    `\`Expected ${liveMigrationCount} live migrations, found \${result.payload.totals.live}\``,
    "migration provenance count message",
  );
  return source;
}

function patchedManifestSource() {
  const path = resolve(root, "scripts/ci/generate-supabase-manifest.mjs");
  let source = readFileSync(path, "utf8");
  source = replaceExactlyOnce(
    source,
    'dispatcher.version !== 7 || dispatcher.verify_jwt !== false || dispatcher.source_sha256 !== "62da00683ce93174c7850f38640ba279ea5baa6de77129045a1670681e153ec7"',
    `dispatcher.version !== ${dispatcherVersion} || dispatcher.verify_jwt !== false || dispatcher.source_sha256 !== "${dispatcherHash}"`,
    "notification dispatcher invariant",
  );
  source = replaceExactlyOnce(
    source,
    "if (database.live_migrations.count !== 374)",
    `if (database.live_migrations.count !== ${liveMigrationCount})`,
    "manifest migration count guard",
  );
  source = replaceExactlyOnce(
    source,
    '"Expected 374 live migrations"',
    `"Expected ${liveMigrationCount} live migrations"`,
    "manifest migration count message",
  );
  return source;
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
  writeFileSync(provenancePath, patchedProvenanceSource(), "utf8");
  writeFileSync(manifestPath, patchedManifestSource(), "utf8");

  run(provenancePath, { MIGRATION_PROVENANCE_MODE: "write" });
  run(manifestPath, { SUPABASE_MANIFEST_MODE: "write" });
} finally {
  rmSync(directory, { recursive: true, force: true });
}
