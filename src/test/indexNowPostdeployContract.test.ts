import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("IndexNow post-production contract", () => {
  it("runs only after the exact Cloudflare current-main reconciliation", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain('workflows: ["Cloudflare Current Main Reconcile"]');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("grep -Eo '[0-9a-f]{40}'");
    expect(workflow).toContain('source_sha" = "$latest_main');
  });

  it("proves the live build identity and canonical sitemap before submission", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain("for attempt in $(seq 1 12)");
    expect(workflow).toContain("$CANONICAL_ORIGIN/build.json?search_discovery=");
    expect(workflow).toContain(".source_commit == $sha");
    expect(workflow).toContain("$CANONICAL_ORIGIN/sitemap.xml?search_discovery=");
    expect(workflow).toContain('[ "$url_count" -le 10000 ]');
    expect(workflow).toContain("! grep -F '<loc>https://www.irhaapparels.com/'");
    expect(workflow).toContain("! grep -F '<loc>https://irhaapparels.com/intl/'");
    expect(workflow).toContain("! grep -F '<loc>https://irhaapparels.com/studio'");
    expect(workflow).toContain("SEARCH_DISCOVERY_DIAGNOSTIC");
    expect(workflow).toContain("Preserve search discovery diagnostics");
  });

  it("uses strict retrying IndexNow submission and publishes a dedicated status", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain("INDEXNOW_STRICT: \"1\"");
    expect(workflow).toContain("bash scripts/ci/retry.sh 3 10 -- node scripts/ping-search-engines.mjs");
    expect(workflow).toContain('context="Irha Search Discovery"');
    expect(workflow).toContain("Verified canonical sitemap accepted by IndexNow");
  });
});
