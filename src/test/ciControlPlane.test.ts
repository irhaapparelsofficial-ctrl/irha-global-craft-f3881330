import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const workflowFiles = [
  ".github/workflows/quality.yml",
  ".github/workflows/supabase-functions-auto.yml",
  ".github/workflows/supabase-database-auto.yml",
  ".github/workflows/cloudflare-deploy.yml",
  ".github/workflows/cloudflare-reconcile.yml",
];

describe("Irha CI control plane", () => {
  it("runs required repository verification independently from deployment secrets", () => {
    const quality = read(".github/workflows/quality.yml");
    expect(quality).toContain("Verify deployment source lock");
    expect(quality).toContain("Verify secret safety");
    expect(quality).toContain("Verify migration order");
    expect(quality).toContain("Typecheck");
    expect(quality).toContain("Test");
    expect(quality).toContain("Build immutable release");
    expect(quality).toContain("Verify built release identity and canonical host");
  });

  it("keeps Supabase production mutations single-flight", () => {
    const functions = read(".github/workflows/supabase-functions-auto.yml");
    const database = read(".github/workflows/supabase-database-auto.yml");
    expect(functions).toContain("group: supabase-functions-auto-main");
    expect(database).toContain("group: supabase-database-auto-main");
    expect(functions).toContain("cancel-in-progress: false");
    expect(database).toContain("cancel-in-progress: false");
  });

  it("reconciles Cloudflare independently per exact source SHA", () => {
    const deploy = read(".github/workflows/cloudflare-deploy.yml");
    const reconcile = read(".github/workflows/cloudflare-reconcile.yml");
    expect(deploy).toContain("group: cloudflare-deploy-main");
    expect(reconcile).toContain("group: cloudflare-reconcile-${{ inputs.source_sha || github.run_id }}");
    expect(deploy).toContain("cancel-in-progress: false");
    expect(reconcile).toContain("cancel-in-progress: false");
    expect(reconcile).toContain("requested_source_sha");
    expect(reconcile).toContain("target_source_sha");
    expect(reconcile).toContain("Current main advanced before reconciliation");
  });

  it("automatically activates exact-main verification and core sync jobs after secrets appear", () => {
    const verifier = read(".github/workflows/main-post-merge-verifier.yml");
    expect(verifier).toContain("workflow_run:");
    expect(verifier).toContain("schedule:");
    expect(verifier).toContain("if: always()");
    expect(verifier).toContain("Irha Main Post-Merge Verification");
    expect(verifier).toContain("Irha Quality Gate");
    expect(verifier).toContain("Irha Supabase Functions Sync");
    expect(verifier).toContain("Irha Supabase Database Sync");
    expect(verifier).toContain("Irha Cloudflare Deploy");
  });

  it("syncs functions and checksum-led database migrations only from exact green main", () => {
    const functions = read(".github/workflows/supabase-functions-auto.yml");
    const database = read(".github/workflows/supabase-database-auto.yml");
    expect(functions).toContain("Confirm exact current main");
    expect(functions).toContain("Require exact green Quality Gate");
    expect(functions).toContain("Deploy changed Supabase functions");
    expect(database).toContain("Confirm exact current main");
    expect(database).toContain("Require exact green Quality Gate");
    expect(database).toContain("Apply pending repository migrations exactly once");
    expect(database).toContain("Verify private repository migration ledger parity");
    expect(database).toContain("official Supabase Management API database/query endpoint");
    expect(database).not.toContain("SUPABASE_DB_PASSWORD");
    expect(database).not.toContain("supabase db push");
    expect(database).not.toContain("supabase migration repair");
  });

  it("uses one merged private manifest with exact Git blob checksums", () => {
    const database = read(".github/workflows/supabase-database-auto.yml");
    const reconciler = read("scripts/ci/reconcile-repository-migrations.mjs");
    const transactionParser = read("scripts/ci/sql-transaction-body.mjs");
    const manifest = JSON.parse(read("supabase/repository-migrations.json"));
    expect(database).toContain("private.irha_repository_migration_ledger");
    expect(database).toContain("Legacy drifted");
    expect(database).toContain("supabase_migrations");
    expect(database).toContain("preserved, not deleted or rewritten");
    expect(reconciler).toContain("gitBlobSha");
    expect(reconciler).toContain("Every migration at or after");
    expect(reconciler).toContain('import { transactionBody } from "./sql-transaction-body.mjs";');
    expect(transactionParser).toContain("contains nested transaction control");
    expect(transactionParser).toContain("trimSqlEdgeTrivia");
    expect(transactionParser).toContain("sqlCodeOnly");
    expect(reconciler).toContain("begin;\n${sql}\nrollback;");
    expect(reconciler).toContain("begin;\n${sql}\n${ledgerInsertSql(entry)}\ncommit;");
    expect(reconciler).toContain("github_management_api_transaction");
    expect(reconciler).toContain("github_management_api_verified_existing");
    expect(reconciler).toContain("verified_present");
    expect(reconciler).toContain("Current main advanced before database mutation");
    expect(reconciler).not.toContain("migration repair");
    expect(manifest.project_id).toBe("pvzjiozismyxqrzmtfbi");
    expect(manifest.cutover_version).toBe("20260717000000");
    expect(manifest.migrations.length).toBeGreaterThanOrEqual(18);
    expect(new Set(manifest.migrations.map((migration: { version: string }) => migration.version)).size).toBe(manifest.migrations.length);
    expect(new Set(manifest.migrations.map((migration: { path: string }) => migration.path)).size).toBe(manifest.migrations.length);

    const verifiedPresent = manifest.migrations.filter(
      (migration: { execution_mode?: string }) => migration.execution_mode === "verified_present",
    );
    expect(verifiedPresent.length).toBeGreaterThanOrEqual(2);
    expect(verifiedPresent.map((migration: { path: string }) => migration.path)).toContain(
      "supabase/migrations/20260721172519_catalog_drive_canonical_media_metadata_20260721.sql",
    );

    for (const migration of manifest.migrations) {
      expect(migration.git_blob_sha).toMatch(/^[0-9a-f]{40}$/);
      if (migration.execution_mode === "verified_present") {
        expect(migration.transactional_dry_run).toBe(false);
        expect(migration.verification_query).toMatch(/^select\b/i);
      } else {
        expect(migration.execution_mode ?? "transactional").toBe("transactional");
        expect(migration.transactional_dry_run).toBe(true);
        expect(migration.verification_query).toBeUndefined();
      }
    }
  });

  it("preserves repository migration evidence and publishes exact-commit status", () => {
    const database = read(".github/workflows/supabase-database-auto.yml");
    expect(database).toContain("if: always()");
    expect(database).toContain("repository-migration-plan.json");
    expect(database).toContain("repository-migration-evidence.json");
    expect(database).toContain("supabase-repository-migration-evidence-${{ env.SOURCE_SHA }}");
    expect(database).toContain("Publish exact commit database status");
    expect(database).toContain('context="Irha Supabase Database Sync"');
    expect(database).toContain("statuses: write");
  });

  it("keeps retry diagnostics on stderr so captured stdout remains machine-readable", () => {
    const helper = read("scripts/ci/github-api-with-retry.mjs");
    expect(helper).toContain("console.error");
    expect(helper).not.toContain("console.log");
  });

  it("has an automatic one-attempt transient failure guardian", () => {
    const guardian = read(".github/workflows/auto-rerun-transient.yml");
    expect(guardian).toContain("workflow_run:");
    expect(guardian).toContain("completed");
    expect(guardian).toContain("rerun-failed-jobs");
    expect(guardian).toContain("attempt");
  });

  it("keeps obsolete duplicate and one-time workflows removed", () => {
    for (const obsolete of [
      ".github/workflows/ai-pr-auto-fix.yml",
      ".github/workflows/one-time-data-migration.yml",
      ".github/workflows/one-time-storage-migration.yml",
      ".github/workflows/supabase-apply-migrations.yml",
      ".github/workflows/supabase-deploy.yml",
    ]) {
      expect(() => read(obsolete)).toThrow();
    }
  });

  it("keeps media repository writes single-flight and stale-safe", () => {
    for (const file of workflowFiles) {
      const workflow = read(file);
      expect(workflow).toContain("concurrency:");
    }
  });
});
