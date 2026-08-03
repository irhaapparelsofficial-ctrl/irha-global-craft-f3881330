import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const workflow = read(".github/workflows/supabase-functions-reconcile.yml");
const generator = read("scripts/ci/run-sec-m03-parity-generation.mjs");
const provenanceGenerator = read("scripts/ci/generate-migration-provenance.mjs");
const manifestGenerator = read("scripts/ci/generate-supabase-manifest.mjs");
const migrationParity = read("scripts/ci/migration-production-parity.mjs");
const parityVerifier = read("scripts/verify-supabase-parity.mjs");
const sourceVerifier = read("scripts/ci/verify-sec-m03-deployed-sources.mjs");
const registryRefresh = read("scripts/ci/refresh-sec-m03-live-parity.mjs");
const parityPlan = JSON.parse(read("supabase/reconciliation/sec-m03-parity-refresh.json"));

describe("SEC-M03 canonical parity control", () => {
  it("runs from main and requires the successful exact-SHA Quality Gate before mutation", () => {
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("SOURCE_SHA: ${{ github.sha }}");
    expect(workflow).toContain("Require successful exact-SHA Quality Gate");
    expect(workflow).toContain('.context == "Irha Quality Gate"');
    expect(workflow).toContain('test "$gate_state" = "success"');
    expect(workflow.indexOf("Require successful exact-SHA Quality Gate")).toBeLessThan(
      workflow.indexOf("Deploy only under-version approved functions"),
    );
  });

  it("publishes an exact-SHA reconciliation status and retains closure evidence", () => {
    expect(workflow).toContain("statuses: write");
    expect(workflow).toContain("Publish exact reconciliation status");
    expect(workflow).toContain('context="Irha Supabase Function Reconciliation"');
    expect(workflow).toContain("Exact public-schema types and Edge source parity passed");
    expect(workflow).toContain("sec-m03-parity-closure-${{ env.SOURCE_SHA }}");
    expect(workflow).toContain("retention-days: 7");
  });

  it("uses authenticated Management API JSON for deterministic inventories and source retrieval", () => {
    expect(workflow).toContain('https://api.supabase.com/v1/projects/$SUPABASE_PROJECT_ID/functions');
    expect(workflow).toContain('functions/$function_name');
    expect(workflow).toContain("/tmp/functions-before.raw.json");
    expect(workflow).toContain("/tmp/functions-after.raw.json");
    expect(workflow).toContain("/tmp/sec-m03-live-functions");
    expect(workflow).toContain('type == "array" and all(.[];');
    expect(workflow).toContain("inventory_ready=false");
    expect(workflow).not.toContain("supabase functions list");
  });

  it("keeps deployment bounded to the three approved functions", () => {
    expect(workflow).toContain("Deploy only under-version approved functions");
    expect(workflow).toContain("supabase/reconciliation/sec-m03-function-reconciliation.json");
    expect(workflow).toContain("/tmp/planned-functions.txt");
    expect(workflow).toContain("/tmp/blocked-f3.txt");
    expect(workflow).toContain("/tmp/blocked-f6.txt");
    expect(workflow).not.toContain("supabase functions deploy _shared");
    expect(parityPlan.functions.filter((entry: { minimum_version?: number }) => entry.minimum_version)).toHaveLength(3);
  });

  it("accepts only five explicitly proven parity refresh rows", () => {
    expect(parityPlan.functions.map((entry: { name: string }) => entry.name).sort()).toEqual([
      "generate-mockup",
      "live-chat",
      "notification-dispatcher",
      "public-lead-gateway",
      "site-visitor",
    ]);
    expect(sourceVerifier).toContain("Exact deployed source mismatch");
    expect(sourceVerifier).toContain("Durable limiter helper mismatch");
    expect(registryRefresh).toContain("Registry row missing");
    expect(registryRefresh).toContain("Exact hash mismatch");
  });

  it("falls back only to a unique exact repository-source byte match", () => {
    expect(sourceVerifier).toContain("resolveDeployedEntrypoint(response, entry, repositorySource)");
    expect(sourceVerifier).toContain("repositorySource.equals(Buffer.from(file.content, \"utf8\"))");
    expect(sourceVerifier).toContain("exactSourceCandidates.length === 1");
    expect(sourceVerifier).toContain("Ambiguous scoped entrypoint");
    expect(sourceVerifier).toContain("Ambiguous exact-source entrypoint");
    expect(sourceVerifier).not.toContain('file.name === "index.ts"');
  });

  it("source-verifies protected pre-existing functions without broad deployment", () => {
    expect(workflow).toContain("Pre-existing source-matched parity: notification-dispatcher v8 and public-lead-gateway v8");
    expect(parityPlan.functions.find((entry: { name: string }) => entry.name === "notification-dispatcher")).toMatchObject({
      registry: "supabase/deployment-parity/functions-f2.json",
      exact_version: 10,
      exact_hash: "d032934e62a8d5e490806d0bf6ee381dd4ee89c311a97b306a2aaec0e50a954c",
    });
    expect(parityPlan.functions.find((entry: { name: string }) => entry.name === "public-lead-gateway")).toMatchObject({
      registry: "supabase/deployment-parity/functions-f1.json",
      exact_version: 8,
      exact_hash: "717a53d6c63bcd92485fc2a18e460aab98ec6f5cf6eae0f3b0ef68da1e011471",
    });
    expect(generator).toContain("const dispatcherVersion = 10");
    expect(generator).toContain("d032934e62a8d5e490806d0bf6ee381dd4ee89c311a97b306a2aaec0e50a954c");
    expect(generator).toContain('dispatcher.version !== 8 || dispatcher.verify_jwt !== false || dispatcher.source_sha256 !== "2b4525d022b0788c3bb6b2bf25923c90c35807a3e2b6065671b2eb90f00f1a48"');
  });

  it("derives exact production migration parity without a fixed migration count", () => {
    expect(generator).toContain('const projectId = "pvzjiozismyxqrzmtfbi"');
    expect(generator).not.toMatch(/\bconst\s+liveMigrationCount\s*=/);
    expect(provenanceGenerator).not.toMatch(/totals\.live\s*!==\s*\d+/);
    expect(provenanceGenerator).not.toMatch(/Expected \d+ live migrations/);
    expect(manifestGenerator).not.toMatch(/live_migrations\.count\s*!==\s*\d+/);
    expect(manifestGenerator).not.toMatch(/Expected \d+ live migrations/);
    expect(generator).toContain("requireDynamicMigrationParity");
    expect(generator).toContain("migration-production-parity.mjs");
    expect(provenanceGenerator).toContain("deriveProductionMigrationVersions");
    expect(provenanceGenerator).toContain("assertExactMigrationParity");
    expect(provenanceGenerator).toContain("supabase/repository-migrations.json");
    expect(provenanceGenerator).toContain("private.irha_repository_migration_ledger");
    expect(manifestGenerator).toContain("assertExactMigrationParity");
    expect(manifestGenerator).toContain("select version from supabase_migrations.schema_migrations order by version");
    expect(parityVerifier).toContain("assertCommittedMigrationEvidence");
    expect(migrationParity).toContain('REQUIRED_PRODUCTION_MIGRATION_VERSION = "20260731151915"');
    expect(migrationParity).toContain('REQUIRED_PRODUCTION_MIGRATION_NAME = "align_drive_gallery_with_selected_media"');
    expect(migrationParity).toContain('new Set(["applied", "verified_present"])');
    expect(migrationParity).toContain("Migration version-set drift");
    expect(migrationParity).toContain("duplicate migration version");
    expect(migrationParity).toContain("ledger checksum mismatch");
    expect(migrationParity).toContain("newlyObservedLiveVersions");
    expect(migrationParity).toContain("New live migration");
    expect(migrationParity).toContain("not authorized by the repository manifest and applied ledger");
    expect(generator).toContain("replaceLegacyOrRequireCurrent");
    expect(generator).toContain("legacyCount === 1 && currentCount === 0");
    expect(generator).toContain("legacyCount === 0 && currentCount === 1");
    expect(generator).toContain("expected exactly one canonical replacement target or one already-current target");
  });
});
