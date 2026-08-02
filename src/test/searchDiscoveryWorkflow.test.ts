import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/indexnow-after-production.yml"), "utf8");

const extractRunBlock = (stepName: string) => {
  const stepMarker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThan(-1);

  const runMarker = "        run: |\n";
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);

  const contentStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf("\n      - name:", contentStart);
  return workflow
    .slice(contentStart, nextStep === -1 ? undefined : nextStep)
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
};

describe("search discovery workflow", () => {
  it("waits for exact live release parity instead of failing on first propagation read", () => {
    expect(workflow).toContain("for attempt in $(seq 1 12)");
    expect(workflow).toContain("non-challenge apex build mismatch: status=$BUILD_STATUS source=$live_sha expected=$SOURCE_SHA");
    expect(workflow).toContain("sleep 5");
    expect(workflow).toContain("Canonical sitemap and route state did not reach exact release parity after 12 attempts");
  });

  it("checks build identity, canonical sitemap rules and the IndexNow key", () => {
    expect(workflow).toContain('.source_commit == $sha and .source_identity_state == "verified"');
    expect(workflow).toContain("canonical sitemap contract failed");
    expect(workflow).toContain("19d2833c43fe6e05e2a4416f65a53cdc");
    expect(workflow).toContain("INDEXNOW_STRICT: \"1\"");
    expect(workflow).toContain('.canonicalOrigin == $origin');
    expect(workflow).toContain('(.canonicalUrl | startswith($origin + "/"))');
  });

  it("uses exact Pages artifacts only after a directly evidenced apex Cloudflare challenge", () => {
    const script = extractRunBlock("Fetch and verify exact live canonical sitemap and route state");
    const result = spawnSync("bash", ["-n", "-s"], { input: script, encoding: "utf8" });

    expect(result.status, result.stderr).toBe(0);
    expect(workflow).toContain("PAGES_ORIGIN: https://irha-apparels.pages.dev");
    expect(workflow).toContain("cloudflare_challenge()");
    expect(workflow).toContain("cf-mitigated:[[:space:]]*challenge");
    expect(workflow).toContain("server:[[:space:]]*cloudflare");
    expect(workflow).toContain("Just a moment...");
    expect(workflow).toContain('[ "$status" = "403" ] || return 1');
    expect(workflow).toContain('artifact_origin="$PAGES_ORIGIN"');
    expect(workflow).toContain('fetch_exact_build "$PAGES_ORIGIN" pages "$cache_bust"');
    expect(workflow).toContain("apex observer challenged; exact Pages artifact selected");
    expect(workflow).toContain("non-challenge apex build mismatch");
  });

  it("keeps canonical truth independent from the selected artifact fetch origin", () => {
    expect(workflow).toContain('"$artifact_origin/sitemap.xml?search_discovery=$cache_bust"');
    expect(workflow).toContain('"$artifact_origin/seo-route-manifest.json?search_discovery=$cache_bust"');
    expect(workflow).toContain('"$artifact_origin/19d2833c43fe6e05e2a4416f65a53cdc.txt?search_discovery=$cache_bust"');
    expect(workflow).toContain("<loc>https://irhaapparels.com/");
    expect(workflow).toContain("! grep -F '<loc>https://www.irhaapparels.com/'");
    expect(workflow).toContain('jq -e --arg origin "$CANONICAL_ORIGIN"');
    expect(workflow).toContain("cmp -s seo/search-route-state.json /tmp/live-search-route-state.json");
  });

  it("reconfirms exact current main immediately before search submission", () => {
    expect(workflow).toContain("Reconfirm exact current main before search submission");
    expect(workflow).toContain('latest_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq \'.sha\')"');
    expect(workflow).toContain('test "$latest_main" = "$SOURCE_SHA"');
  });

  it("preserves concise diagnostics, selected artifact origin and exact status evidence", () => {
    expect(workflow).toContain("Preserve search discovery diagnostics");
    expect(workflow).toContain("search-discovery-${{ steps.resolve.outputs.source_sha }}");
    expect(workflow).toContain("tail -n 1 \"$SEARCH_DISCOVERY_DIAGNOSTIC\"");
    expect(workflow).toContain('context="Irha Search Discovery"');
    expect(workflow).toContain("Apex GitHub observer challenged");
    expect(workflow).toContain("Verified artifact origin");
    expect(workflow).toContain("Canonical origin enforced in sitemap/manifest");
  });
});
