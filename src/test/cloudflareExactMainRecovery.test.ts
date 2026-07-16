import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-exact-main-recovery.yml"),
  "utf8",
);

describe("Cloudflare exact-main recovery", () => {
  it("deploys only the immutable artifact from a successful exact-main Quality Gate", () => {
    expect(workflow).toContain("Verify exact current main and deployment readiness");
    expect(workflow).toContain("Wait for successful exact-main Quality Gate");
    expect(workflow).toContain("production-dist-${{ env.SOURCE_SHA }}");
    expect(workflow).toContain("run-id: ${{ steps.quality.outputs.run_id }}");
    expect(workflow).toContain("Reconfirm exact main before production mutation");
    expect(workflow).toContain('--commit-hash="$SOURCE_SHA"');
  });

  it("verifies both Cloudflare origins and publishes an observable commit status", () => {
    expect(workflow).toContain("Pages and apex exact-source parity verified");
    expect(workflow).toContain("www canonical redirect verified");
    expect(workflow).toContain('context="Irha Cloudflare Recovery"');
    expect(workflow).toContain("statuses: write");
  });
});
