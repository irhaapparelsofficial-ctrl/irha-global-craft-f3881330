import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-current-main-reconcile.yml"),
  "utf8",
);

describe("Cloudflare current-main reconciliation authentication", () => {
  it("provides GitHub authentication to source-resolution and live-verification calls", () => {
    expect(workflow).toContain("jobs:\n  preflight:");
    expect(workflow).toContain("      GH_TOKEN: ${{ github.token }}");
    expect(workflow).toContain("Verify pages.dev, apex and www canonical behavior");
    expect(workflow).toContain(
      'latest_main="$(bash scripts/ci/retry.sh 3 3 -- gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq \'.sha\')"',
    );
  });

  it("keeps exact-main freshness, release identity and canonical redirect verification", () => {
    expect(workflow).toContain("Superseded release verification skipped without failure");
    expect(workflow).toContain(".source_commit == $sha");
    expect(workflow).toContain(".build_fingerprint == $fingerprint");
    expect(workflow).toContain("https://irhaapparels.com/*");
  });
});
