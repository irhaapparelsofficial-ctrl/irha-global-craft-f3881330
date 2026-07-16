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

  it("syncs Supabase functions and migrations only from exact green main", () => {
    const functions = read(".github/workflows/supabase-functions-auto.yml");
    const database = read(".github/workflows/supabase-database-auto.yml");
    expect(functions).toContain("Supabase Functions After Quality Gate");
    expect(functions).toContain("function sync skipped without failure");
    expect(database).toContain("Supabase Database After Quality Gate");
    expect(database).toContain("supabase db push --linked --dry-run");
    expect(database).toContain("Apply pending migrations exactly once");
    expect(database).not.toContain("retry.sh 3 8 -- supabase db push --linked");
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
