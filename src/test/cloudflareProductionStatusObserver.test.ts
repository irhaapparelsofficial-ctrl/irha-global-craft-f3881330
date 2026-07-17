import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-production-status.yml"),
  "utf8",
);

describe("Cloudflare production status observer", () => {
  it("resolves the original Quality Gate SHA instead of trusting second-level workflow metadata", () => {
    expect(workflow).toContain("actions: read");
    expect(workflow).toContain("Resolve original release SHA and upstream relevance");
    expect(workflow).toContain("display_title");
    expect(workflow).toContain("grep -Eo '[0-9a-f]{40}'");
    expect(workflow).toContain("SOURCE_SHA=$source_sha");
  });

  it("ignores reconciliation events where every deployment job was skipped", () => {
    expect(workflow).toContain("executed_jobs");
    expect(workflow).toContain('select(.conclusion != "skipped")');
    expect(workflow).toContain("Non-release Cloudflare reconcile ignored");
    expect(workflow).toContain("Commit status mutation: `false`");
  });

  it("publishes production proof only for a real exact-current-main reconciliation", () => {
    expect(workflow).toContain("steps.relevance.outputs.relevant == 'true'");
    expect(workflow).toContain("steps.relevance.outputs.current == 'true'");
    expect(workflow).toContain("Verify pages.dev, apex and www against exact merged SHA");
    expect(workflow).toContain('context="Irha Cloudflare Production"');
  });
});
