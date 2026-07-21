import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Irha CI control plane", () => {
  it("runs required repository verification independently from deployment secrets", () => {
    const quality = read(".github/workflows/quality.yml");
    expect(quality).toContain("Checkout exact event source");
    expect(quality).toContain("Verify deployment source lock");
    expect(quality).toContain("Verify secret safety");
    expect(quality).toContain("Verify migration order");
    expect(quality).toContain("Typecheck");
    expect(quality).toContain("Test");
    expect(quality).toContain("Build immutable release");
    expect(quality).toContain("Publish exact main build artifact");
    expect(quality).toContain("production-dist-${{ github.sha }}");
    expect(quality).toContain("statuses: write");
    expect(quality).toContain("Publish exact commit Quality Gate status");
    expect(quality).toContain('context="Irha Quality Gate"');
    expect(quality).not.toContain("Detect full-verification readiness");
    expect(quality).not.toContain("steps.mode.outputs.full_verify");
    expect(quality).not.toContain("CLOUDFLARE_API_TOKEN");
    expect(quality).not.toContain("SUPABASE_ACCESS_TOKEN");
    expect(quality).not.toContain("issue_comment:");
    expect(quality).not.toContain("wrangler@4 pages deploy");
  });

  it("keeps Supabase production mutations single-flight", () => {
    for (const path of [
      ".github/workflows/supabase-functions-auto.yml",
      ".github/workflows/supabase-database-auto.yml",
      ".github/workflows/supabase-owner-release.yml",
      ".github/workflows/deploy-chat-current-main.yml",
    ]) {
      expect(read(path)).toContain("group: irha-production-mutation");
      expect(read(path)).toContain("cancel-in-progress: false");
    }
  });

  it("reconciles Cloudflare independently per exact source SHA", () => {
    const production = read(".github/workflows/cloudflare-current-main-reconcile.yml");
    expect(production).toContain("group: cloudflare-reconcile-${{ github.event.workflow_run.head_sha }}");
    expect(production).toContain("actions/download-artifact@v4");
    expect(production).toContain("run-id: ${{ env.QUALITY_RUN_ID }}");
    expect(production).toContain("Check whether production already serves the exact release");
    expect(production).toContain("Reconfirm exact current main before production mutation");
    expect(production).toContain("idempotent-current-main-reconcile");
    expect(production).toContain("authoritative release parity verified");
    expect(production).toContain("deployment marker is absent or was replaced by another valid same-source deploy");
    expect(production).toContain("www canonical GET redirect verified");
    expect(production).toContain("stale deploy skipped without failure");
    expect(production).toContain("Superseded release verification skipped without failure");
    expect(production).toContain("--max-redirs 0");
    expect(production).not.toContain("npm run build");
  });

  it("automatically activates exact-main verification and core sync jobs after secrets appear", () => {
    const bootstrap = read(".github/workflows/secret-bootstrap-controller.yml");
    expect(bootstrap).toContain('cron: "17 * * * *"');
    expect(bootstrap).toContain("workflow_dispatch:");
    expect(bootstrap).toContain("gh workflow run quality.yml");
    expect(bootstrap).toContain("exact-main successful Quality Gate is missing");
    expect(bootstrap).toContain("github.event_name != 'pull_request'");

    for (const path of [
      ".github/workflows/cloudflare-current-main-reconcile.yml",
      ".github/workflows/supabase-functions-auto.yml",
      ".github/workflows/supabase-database-auto.yml",
    ]) {
      const workflow = read(path);
      expect(workflow).toContain('workflows: ["Quality Gate"]');
      expect(workflow).toContain("types: [completed]");
      expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
      expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    }
  });

  it("syncs functions and checksum-led database migrations only from exact green main", () => {
    const functions = read(".github/workflows/supabase-functions-auto.yml");
    const database = read(".github/workflows/supabase-database-auto.yml");
    expect(functions).toContain("Supabase Functions After Quality Gate");
    expect(functions).toContain("Detect whether Edge Functions changed");
    expect(functions).toContain("No Edge Function source changed; unrelated commit skipped without failure");
    expect(functions).toContain("function sync skipped without failure");
    expect(database).toContain("Supabase Database After Quality Gate");
    expect(database).toContain("Confirm exact current main and Management API readiness");
    expect(database).toContain("Validate manifest and transactionally dry-run pending migrations");
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
    const retry = read("scripts/ci/retry.sh");
    expect(retry).toContain('echo "[retry] attempt $attempt/$attempts: $*" >&2');
    expect(retry).toContain('echo "[retry] transient failure (exit $status); waiting ${sleep_for}s before retry" >&2');
  });

  it("has an automatic one-attempt transient failure guardian", () => {
    const guardian = read(".github/workflows/ci-guardian.yml");
    expect(guardian).toContain("Irha CI Guardian");
    expect(guardian).toContain("rerun-failed-jobs");
    expect(guardian).toContain("classify-failure.mjs");
    expect(guardian).toContain("one automatic failed-job rerun requested");
    expect(guardian).toContain("Database migration workflow is never blindly rerun");
  });

  it("keeps obsolete duplicate and one-time workflows removed", () => {
    for (const path of [
      ".github/workflows/cloudflare-pages-auto-production.yml",
      ".github/workflows/cloudflare-pages-one-time-20260714.yml",
      ".github/workflows/cloudflare-pages-staging-once.yml",
      ".github/workflows/deploy-robots-worker-fix-20260715.yml",
      ".github/workflows/purge-cloudflare-audit-logs-20260715.yml",
      ".github/workflows/diagnose-static-lighthouse-audits-20260715.yml",
      ".github/workflows/diagnose-live-edge-overrides-20260715.yml",
      ".github/workflows/agent-readiness-live-once-20260715.yml",
      ".github/workflows/verify-live-mobile-performance-20260715.yml",
      ".github/workflows/discover-cloudflare-robots-api-20260715.yml",
    ]) {
      expect(existsSync(resolve(process.cwd(), path))).toBe(false);
    }
  });

  it("keeps media repository writes single-flight and stale-safe", () => {
    const media = read(".github/workflows/sync-product-media.yml");
    expect(media).toContain("group: irha-repository-mutation");
    expect(media).toContain("generated commit skipped without failure");
  });
});
