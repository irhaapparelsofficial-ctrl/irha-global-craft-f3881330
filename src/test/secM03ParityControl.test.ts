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
const supabaseConfig = read("supabase/config.toml");
const deploymentPlan = JSON.parse(read("supabase/reconciliation/sec-m03-function-reconciliation.json"));
const parityPlan = JSON.parse(read("supabase/reconciliation/sec-m03-parity-refresh.json"));
const f1Registry = JSON.parse(read("supabase/deployment-parity/functions-f1.json"));

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
    expect(deploymentPlan.functions.map((entry: { name: string }) => entry.name).sort()).toEqual([
      "generate-mockup",
      "live-chat",
      "site-visitor",
    ]);
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

  it("bounds Management API source transport tolerance to one trailing LF only", () => {
    expect(sourceVerifier).toContain("compareDeployedSource(repositorySource, content)");
    expect(sourceVerifier).toContain('mode: "exact_bytes"');
    expect(sourceVerifier).toContain('mode: "single_trailing_lf_transport"');
    expect(sourceVerifier).toContain("repositoryHasFinalLf === deployedHasFinalLf");
    expect(sourceVerifier).toContain("repositorySource.subarray(0, repositorySource.length - 1)");
    expect(sourceVerifier).toContain("deployedSource.subarray(0, deployedSource.length - 1)");
    expect(sourceVerifier).toContain("repositorySourceCandidates.length === 1");
    expect(sourceVerifier).toContain("Ambiguous scoped entrypoint");
    expect(sourceVerifier).toContain("Ambiguous repository-source entrypoint");
    expect(sourceVerifier).not.toContain(".trim()");
    expect(sourceVerifier).not.toContain('file.name === "index.ts"');
  });

  it("source-verifies protected pre-existing functions without broad deployment", () => {
    expect(workflow).toContain("Pre-existing source-matched parity: notification-dispatcher v8 and public-lead-gateway v8");
    const notificationParity = parityPlan.functions.find((entry: { name: string }) => entry.name === "notification-dispatcher");
    expect(notificationParity).toMatchObject({
      registry: "supabase/deployment-parity/functions-f2.json",
      minimum_version: 10,
      exact_hash: "de14ab8afea431d56ba0878ab1f7be63d5f11d9a63277a7d2e0e218428bfcd8d",
    });
    expect(notificationParity).not.toHaveProperty("exact_version");
    const publicLeadParity = parityPlan.functions.find((entry: { name: string }) => entry.name === "public-lead-gateway");
    expect(publicLeadParity).toMatchObject({
      registry: "supabase/deployment-parity/functions-f1.json",
      minimum_version: 8,
      exact_hash: "717a53d6c63bcd92485fc2a18e460aab98ec6f5cf6eae0f3b0ef68da1e011471",
    });
    expect(publicLeadParity).not.toHaveProperty("exact_version");
    expect(manifestGenerator).toContain("deployed.version < representation.minimum_version");
    expect(manifestGenerator).not.toContain("deployed.version !== representation.version");
    expect(manifestGenerator).toContain('expectedFunctions.get("notification-dispatcher")');
    expect(generator).toContain("requireMonotonicEdgeVersionParity");
  });

  it("locks current Pinterest production functions to exact source/auth with monotonic version floors", () => {
    const expectedPinterest = [
      ["pinterest-admin", 11, true, "55879127fc063426c426c171f855ca6e4412afc79f8f784c9752aa7d557a8bb9"],
      ["pinterest-oauth-callback", 11, false, "685d1db0ab0a0bea5477c325092502cd62f02f89a613899b903318e587a0dbec"],
      ["pinterest-oauth-start", 12, false, "4628cbd14b72e24a38b782c20d69f3c4d6be49486a118de460709744719c2c37"],
      ["pinterest-operator", 15, false, "94fa23341351b1a38c7b1e1f1a27d02c9915be772c0f31c25f47ff631789a463"],
      ["pinterest-operator-get", 11, false, "54f556d003a740f7759634484e7acb28faa7ec309383516b4c87919022eac1ae"],
    ] as const;

    for (const [name, minimumVersion, verifyJwt, sourceHash] of expectedPinterest) {
      const row = f1Registry.functions.find((entry: unknown[]) => entry[0] === name);
      expect(row?.slice(0, 4)).toEqual([name, minimumVersion, verifyJwt, sourceHash]);
      expect(supabaseConfig).toContain(`[functions.${name}]\nverify_jwt = ${verifyJwt}`);
    }

    expect(manifestGenerator).toContain("live.length !== expected.size");
    expect(manifestGenerator).not.toContain("live.length !== 87");
    expect(manifestGenerator).not.toContain("Expected 87 live and represented functions");
    expect(parityVerifier).not.toContain("deployed.length, 87");
    expect(parityVerifier).not.toContain("F1: 33");
    expect(parityVerifier).toContain("manifest.edge_functions.deployed_count, deployed.length");
    expect(parityVerifier).toContain("uniqueDeployedNames.size, deployed.length");
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
    expect(generator).toContain("requireMonotonicEdgeVersionParity");
    expect(generator).not.toContain("replaceLegacyOrRequireCurrent");
    expect(manifestGenerator).toContain("minimum_version: minimumVersion");
    expect(manifestGenerator).toContain("dispatcherRepresentation.minimum_version");
  });
});
