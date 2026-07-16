import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Irha CI control plane", () => {
  it("defers repository verification until all core deployment secrets exist", () => {
    const quality = read(".github/workflows/quality.yml");
    expect(quality).toContain("Detect full-verification readiness");
    expect(quality).toContain("Repository verification is deferred without failure");
    expect(quality).toContain("steps.mode.outputs.full_verify == 'true'");
    expect(quality).toContain("Publish exact main build artifact");
    expect(quality).toContain("production-dist-${{ github.sha }}");
    expect(quality).not.toContain("issue_comment:");
    expect(quality).not.toContain("wrangler@4 pages deploy");
  });

  it("uses one shared production mutation lock", () => {
    for (const path of [
      ".github/workflows/cloudflare-pages-auto-production.yml",
      ".github/workflows/supabase-functions-auto.yml",
      ".github/workflows/supabase-database-auto.yml",
      ".github/workflows/supabase-owner-release.yml",
      ".github/workflows/deploy-chat-current-main.yml",
    ]) {
      expect(read(path)).toContain("group: irha-production-mutation");
      expect(read(path)).toContain("cancel-in-progress: false");
    }
  });

  it("deploys the exact immutable Quality Gate artifact", () => {
    const production = read(".github/workflows/cloudflare-pages-auto-production.yml");
    expect(production).toContain("actions/download-artifact@v4");
    expect(production).toContain("run-id: ${{ env.QUALITY_RUN_ID }}");
    expect(production).toContain("Reconfirm current main after acquiring production lock");
    expect(production).toContain("deploy skipped without failure");
    expect(production).toContain("waiting for repository secrets");
    expect(production).not.toContain("npm run build");
  });

  it("automatically activates verification and all core sync jobs after secrets appear", () => {
    const bootstrap = read(".github/workflows/secret-bootstrap-controller.yml");
    expect(bootstrap).toContain('cron: "17 * * * *"');
    expect(bootstrap).toContain("no repository verification, no workflow dispatch, and no red failure");
    expect(bootstrap).toContain("gh workflow run quality.yml");
    expect(bootstrap).toContain("Cloudflare deploy job success");
    expect(bootstrap).toContain("Supabase functions job success");
    expect(bootstrap).toContain("Supabase database job success");
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

  it("has an automatic one-attempt transient failure guardian", () => {
    const guardian = read(".github/workflows/ci-guardian.yml");
    expect(guardian).toContain("Irha CI Guardian");
    expect(guardian).toContain("rerun-failed-jobs");
    expect(guardian).toContain("classify-failure.mjs");
    expect(guardian).toContain("one automatic failed-job rerun requested");
    expect(guardian).toContain("Database migration workflow is never blindly rerun");
  });

  it("removes obsolete duplicate production deployers", () => {
    expect(
      existsSync(resolve(process.cwd(), ".github/workflows/cloudflare-pages-one-time-20260714.yml")),
    ).toBe(false);
    expect(
      existsSync(resolve(process.cwd(), ".github/workflows/cloudflare-pages-staging-once.yml")),
    ).toBe(false);
    expect(
      existsSync(resolve(process.cwd(), ".github/workflows/deploy-robots-worker-fix-20260715.yml")),
    ).toBe(false);
  });

  it("keeps media repository writes single-flight and stale-safe", () => {
    const media = read(".github/workflows/sync-product-media.yml");
    expect(media).toContain("group: irha-repository-mutation");
    expect(media).toContain("generated commit skipped without failure");
  });
});
