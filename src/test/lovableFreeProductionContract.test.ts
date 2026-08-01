import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Lovable-free production contract", () => {
  it("documents GitHub, Cloudflare and owner Supabase as the active authorities", () => {
    const runbook = read("docs/LOVABLE_FREE_OPERATIONS.md");

    expect(runbook).toContain("Status: active production operating model");
    expect(runbook).toContain(".github/workflows/quality.yml");
    expect(runbook).toContain(".github/workflows/cloudflare-current-main-reconcile.yml");
    expect(runbook).toContain(".github/workflows/cloudflare-production-status.yml");
    expect(runbook).toContain(".github/workflows/supabase-database-auto.yml");
    expect(runbook).toContain(".github/workflows/supabase-functions-auto.yml");
    expect(runbook).toContain("pvzjiozismyxqrzmtfbi");
    expect(runbook).toContain("no Lovable Update or Publish action is required");
  });

  it("hands a manual Lovable-free kickoff to the active Cloudflare stages", () => {
    const kickoff = read(".github/workflows/lovable-free-release.yml");

    expect(kickoff).toContain("Cloudflare Current Main Reconcile");
    expect(kickoff).toContain("Cloudflare Production Status");
    expect(kickoff).not.toContain("Cloudflare Production After Quality Gate");
    expect(kickoff).toContain("Lovable credits and Lovable Publish are not used");
  });

  it("accepts only successful exact-main Quality runs from authorized non-PR triggers", () => {
    const kickoff = read(".github/workflows/lovable-free-release.yml");

    expect(kickoff).toContain('.head_sha == $sha');
    expect(kickoff).toContain('(.event == "push" or .event == "workflow_dispatch")');
    expect(kickoff).toContain('.head_branch == "main"');
    expect(kickoff).toContain('.conclusion == "success"');
    expect(kickoff).not.toContain('and .event == "push"');
    expect(kickoff).not.toContain('.event == "pull_request"');
    expect(kickoff).toContain('test "$quality_conclusion" = "success"');
    expect(kickoff).toContain('Safety lock failed: expected $expected_sha but current main is $latest_main');
  });

  it("ignores skipped non-release reconciliation runs and proves only exact current main", () => {
    const observer = read(".github/workflows/cloudflare-production-status.yml");

    expect(observer).toContain("Resolve original release SHA and upstream relevance");
    expect(observer).toContain("display_title");
    expect(observer).toContain("grep -Eo '[0-9a-f]{40}'");
    expect(observer).toContain('select(.conclusion != "skipped")');
    expect(observer).toContain("Non-release Cloudflare reconcile ignored");
    expect(observer).toContain("Verify pages.dev, apex and www against exact merged SHA");
    expect(observer).toContain('context="Irha Cloudflare Production"');
  });
});
