import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/indexnow-after-production.yml"), "utf8");

describe("search discovery workflow", () => {
  it("waits for exact live release parity instead of failing on first propagation read", () => {
    expect(workflow).toContain("for attempt in $(seq 1 12)");
    expect(workflow).toContain("live build source is $live_sha, expected $SOURCE_SHA");
    expect(workflow).toContain("sleep 5");
    expect(workflow).toContain("Live canonical sitemap did not reach exact release parity after 12 attempts");
  });

  it("checks build identity, canonical sitemap rules and the IndexNow key", () => {
    expect(workflow).toContain('.source_commit == $sha and .source_identity_state == "verified"');
    expect(workflow).toContain("canonical sitemap contract failed");
    expect(workflow).toContain("19d2833c43fe6e05e2a4416f65a53cdc");
    expect(workflow).toContain("INDEXNOW_STRICT: \"1\"");
  });

  it("preserves one concise diagnostic artifact and exact failure status", () => {
    expect(workflow).toContain("Preserve search discovery diagnostics");
    expect(workflow).toContain("search-discovery-${{ steps.resolve.outputs.source_sha }}");
    expect(workflow).toContain("tail -n 1 \"$SEARCH_DISCOVERY_DIAGNOSTIC\"");
    expect(workflow).toContain('context="Irha Search Discovery"');
  });
});
