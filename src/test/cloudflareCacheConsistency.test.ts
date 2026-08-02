import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const extractRunBlock = (workflow: string, stepName: string) => {
  const stepMarker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThan(-1);

  const runMarker = "        run: |\n";
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);

  const contentStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf("\n      - name:", contentStart);
  const block = workflow.slice(contentStart, nextStep === -1 ? undefined : nextStep);

  return block
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
};

describe("Cloudflare cache-consistency release contract", () => {
  it("runs after current-main reconciliation and locks every mutation to exact current main", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");

    expect(workflow).toContain('workflows: ["Cloudflare Current Main Reconcile"]');
    expect(workflow).toContain(`latest_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq '.sha')"`);
    expect(workflow).toContain('test "$latest_main" = "$SOURCE_SHA"');
    expect(workflow).toContain("Inspect Cloudflare routing and cache state before mutation");
    expect(workflow).toContain("Enforce final HTML and release-identity cache bypass");
    expect(workflow).toContain("Purge unknown historical Cloudflare cache keys once");

    const inspect = workflow.indexOf("Inspect Cloudflare routing and cache state before mutation");
    const enforce = workflow.indexOf("Enforce final HTML and release-identity cache bypass");
    const purge = workflow.indexOf("Purge unknown historical Cloudflare cache keys once");
    expect(inspect).toBeGreaterThan(-1);
    expect(enforce).toBeGreaterThan(inspect);
    expect(purge).toBeGreaterThan(enforce);
  });

  it("proves unbusted and arbitrary-query identities instead of relying only on cache busting", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");

    expect(workflow).toContain('for suffix in "" "?release_check=');
    expect(workflow).toContain('for home_suffix in "" "?a=1" "?utm_source=google" "?cache_probe=');
    expect(workflow).toContain('"$origin/build.json$suffix"');
    expect(workflow).toContain('"$origin/$suffix"');
    expect(workflow).toContain("x-irha-source-commit");
    expect(workflow).toContain("x-irha-build-fingerprint");
    expect(workflow).toContain("Two macro hubs.");
    expect(workflow).toContain("GitHub-hosted direct apex observation is challenged");
  });

  it("keeps the public consistency verifier valid bash", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");
    const script = extractRunBlock(workflow, "Verify unbusted and query-string release consistency");
    const result = spawnSync("bash", ["-n", "-s"], {
      input: script,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(workflow).toContain("String.fromCharCode(39)");
  });

  it("bypasses only HTML/release identity while preserving long-lived immutable asset caching", () => {
    const script = read("scripts/ci/cloudflare-cache-consistency.mjs");

    expect(script).toContain('const RULE_DESCRIPTION = "Irha HTML and release identity bypass"');
    expect(script).toContain('action_parameters: { cache: false }');
    expect(script).toContain('starts_with(http.request.uri.path, "/assets/")');
    expect(script).toContain('starts_with(http.request.uri.path, "/responsive/")');
    expect(script).toContain('starts_with(http.request.uri.path, "/thumbnails/")');
    expect(script).toContain('starts_with(http.request.uri.path, "/media/")');
    expect(script).toContain('ends_with(http.request.uri.path, ".js")');
    expect(script).toContain('http.request.uri.path ne "/sw.js"');
    expect(script).toContain('position: { after: "" }');
  });

  it("reaffirms an already-correct final bypass rule without sending an invalid move-to-bottom PATCH", () => {
    const script = read("scripts/ci/cloudflare-cache-consistency.mjs");

    expect(script).toContain("const existingIsLast = existingIndex >= 0 && existingIndex === rules.length - 1");
    expect(script).toContain("if (!(existingMatches && existingIsLast))");
    expect(script).toContain("const patchDefinition = existingIsLast");
    expect(script).toContain("? baseDefinition");
    expect(script).toContain(': { ...baseDefinition, position: { after: "" } }');
    expect(script).toContain('let mutation = "reaffirmed"');
  });

  it("treats confirmed apex and www Cloudflare challenges as observer limitations, not release mismatches", () => {
    const workflow = read(".github/workflows/cloudflare-current-main-reconcile.yml");
    const script = extractRunBlock(workflow, "Verify pages.dev, apex and www canonical behavior");
    const result = spawnSync("bash", ["-n", "-s"], {
      input: script,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(workflow).toContain('echo "apex_challenged=false" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain('echo "www_challenged=false" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain("Just a moment...");
    expect(workflow).toContain("cf-mitigated");
    expect(workflow).toContain('echo "apex_challenged=true" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain('echo "www_challenged=true" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain("downstream cache/public verification remains required for apex");
    expect(workflow).toContain("Canonical redirect remains subject to downstream independent public verification");
  });

  it("keeps strict www redirect checks unless the GitHub observer is demonstrably challenged", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");
    const script = extractRunBlock(workflow, "Verify unbusted and query-string release consistency");
    const result = spawnSync("bash", ["-n", "-s"], {
      input: script,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(workflow).toContain('echo "www_challenge_seen=$www_challenge" >> "$GITHUB_OUTPUT"');
    expect(workflow).toContain("cf-mitigated");
    expect(workflow).toContain('case "$www_status" in 301|302|307|308)');
    expect(workflow).toContain('case "$www_location" in https://irhaapparels.com/*)');
    expect(workflow).toContain("independent public-browser verification remains required for canonical redirect");
    expect(workflow).toContain("WWW_CHALLENGE: ${{ steps.verify.outputs.www_challenge_seen }}");
  });

  it("uses one auditable whole-zone purge because unknown historical query keys cannot be enumerated", () => {
    const script = read("scripts/ci/cloudflare-cache-consistency.mjs");

    expect(script).toContain('{ purge_everything: true }');
    expect(script).toContain("Unknown historical HTML query-string cache keys cannot be enumerated reliably.");
    expect(script).not.toContain("purge_everything: false");
  });
});
