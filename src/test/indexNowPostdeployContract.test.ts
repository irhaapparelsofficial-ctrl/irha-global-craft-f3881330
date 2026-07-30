import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("IndexNow post-production contract", () => {
  it("runs only after the exact Cloudflare Production proof", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain('workflows: ["Cloudflare Production Status"]');
    expect(workflow).toContain('UPSTREAM_CONCLUSION: ${{ github.event.workflow_run.conclusion }}');
    expect(workflow).toContain('UPSTREAM_REPOSITORY: ${{ github.event.workflow_run.head_repository.full_name }}');
    expect(workflow).toContain('.context == "Irha Cloudflare Production"');
    expect(workflow).toContain('.target_url == $target');
    expect(workflow).toContain('[ "$SOURCE_SHA" = "$latest_main" ]');
  });

  it("proves the live build identity and canonical sitemap before submission", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain("for attempt in $(seq 1 12)");
    expect(workflow).toContain("fetch-depth: 2");
    expect(workflow).toContain("Resolve previous canonical sitemap for change-only submission");
    expect(workflow).toContain("INDEXNOW_PREVIOUS_SITEMAP: /tmp/previous-sitemap.xml");
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

    expect(workflow).toContain('INDEXNOW_STRICT: "1"');
    expect(workflow).toContain("bash scripts/ci/retry.sh 3 10 -- node scripts/ping-search-engines.mjs");
    expect(workflow).toContain('context="Irha Search Discovery"');
    expect(workflow).toContain("Verified canonical sitemap accepted by IndexNow");
  });

  it("creates a real observer job for irrelevant upstream completions", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).not.toMatch(/notify:\n\s+if:/);
    expect(workflow).toContain("Record ignored non-release completion");
    expect(workflow).toContain("Submission attempted: \\`false\\`");
  });
});
