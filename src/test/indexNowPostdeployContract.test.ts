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

  it("proves live build, sitemap, authoritative route manifest and committed route state parity", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain("for attempt in $(seq 1 12)");
    expect(workflow).toContain("fetch-depth: 2");
    expect(workflow).toContain("$CANONICAL_ORIGIN/build.json?search_discovery=");
    expect(workflow).toContain(".source_commit == $sha");
    expect(workflow).toContain("$CANONICAL_ORIGIN/sitemap.xml?search_discovery=");
    expect(workflow).toContain("$CANONICAL_ORIGIN/seo-route-manifest.json?search_discovery=");
    expect(workflow).toContain("/tmp/live-seo-route-manifest.json");
    expect(workflow).toContain("/tmp/live-search-route-state.json");
    expect(workflow).toContain("seo/search-route-state.json");
    expect(workflow).toContain("cmp -s /tmp/live-sitemap-urls.txt /tmp/live-manifest-urls.txt");
    expect(workflow).toContain("cmp -s seo/search-route-state.json /tmp/live-search-route-state.json");
    expect(workflow).toContain('[ "$url_count" -le 10000 ]');
    expect(workflow).toContain("! grep -F '<loc>https://www.irhaapparels.com/'");
    expect(workflow).toContain("! grep -F '<loc>https://irhaapparels.com/intl/'");
    expect(workflow).toContain("! grep -F '<loc>https://irhaapparels.com/studio'");
  });

  it("diffs the current exact route state against the parent authoritative state", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain("Resolve previous authoritative material route state");
    expect(workflow).toContain('${SOURCE_SHA}^:seo/search-route-state.json');
    expect(workflow).toContain("INDEXNOW_ROUTE_STATE: /tmp/live-search-route-state.json");
    expect(workflow).toContain("INDEXNOW_PREVIOUS_ROUTE_STATE: /tmp/previous-search-route-state.json");
    expect(workflow).not.toContain("INDEXNOW_PREVIOUS_SITEMAP:");
    expect(workflow).toContain("deterministic route-state baseline initialized");
    expect(workflow).toContain("Unapproved route-state baseline file");
  });

  it("skips unchanged releases and preserves exact diagnostic evidence", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).toContain('INDEXNOW_STRICT: "1"');
    expect(workflow).toContain("bash scripts/ci/retry.sh 3 10 -- node scripts/ping-search-engines.mjs 2>&1 | tee -a");
    expect(workflow).toContain("/tmp/live-sitemap.xml");
    expect(workflow).toContain("/tmp/live-seo-route-manifest.json");
    expect(workflow).toContain("/tmp/live-search-route-state.json");
    expect(workflow).toContain("No material canonical URL changes; IndexNow skipped");
    expect(workflow).toContain('context="Irha Search Discovery"');
  });

  it("requires the committed material route state to match the final immutable manifest", () => {
    const packageJson = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
    const generator = read("scripts/generate-search-route-state.mjs");
    const exactCheck = "node scripts/generate-search-route-state.mjs --input dist/seo-route-manifest.json --output seo/search-route-state.json --check";

    expect(packageJson.scripts.build).toContain(exactCheck);
    expect(packageJson.scripts["build:dev"]).toContain(exactCheck);
    expect(packageJson.scripts["prepare:public-assets"]).not.toContain("generate-search-route-state.mjs");
    expect(packageJson.scripts["generate:market-sitemap"]).not.toContain("generate-search-route-state.mjs");
    expect(generator).toContain("Committed material search route state is stale");
    expect(generator).toContain("checkSearchRouteState");
  });

  it("creates a real observer job for irrelevant upstream completions", () => {
    const workflow = read(".github/workflows/indexnow-after-production.yml");

    expect(workflow).not.toMatch(/notify:\n\s+if:/);
    expect(workflow).toContain("Record ignored non-release completion");
    expect(workflow).toContain("Submission attempted: \\`false\\`");
  });
});
