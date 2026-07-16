import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-exact-main-recovery.yml"),
  "utf8",
);

describe("Cloudflare exact-main recovery authentication", () => {
  it("provides GitHub authentication to every deploy-job gh api call", () => {
    expect(workflow).toContain("jobs:\n  deploy:");
    expect(workflow).toContain("      GH_TOKEN: ${{ github.token }}");
    expect(workflow).toContain("Verify Pages, apex and canonical www behavior");
    expect(workflow).toContain('latest_main="$(gh api "repos/$GITHUB_REPOSITORY/commits/main" --jq \'.sha\')"');
  });

  it("keeps exact-main freshness and canonical redirect verification", () => {
    expect(workflow).toContain("Verification superseded by newer main");
    expect(workflow).toContain(".source_commit == $sha");
    expect(workflow).toContain("https://irhaapparels.com/*");
  });
});
