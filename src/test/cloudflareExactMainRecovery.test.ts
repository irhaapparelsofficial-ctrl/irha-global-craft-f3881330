import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-exact-main-recovery.yml"),
  "utf8",
);

describe("Cloudflare exact-main recovery", () => {
  it("prefers the immutable exact-main Quality artifact", () => {
    expect(workflow).toContain("Wait briefly for successful exact-main Quality Gate");
    expect(workflow).toContain("production-dist-${{ env.SOURCE_SHA }}");
    expect(workflow).toContain("run-id: ${{ steps.quality.outputs.run_id }}");
    expect(workflow).toContain("steps.quality.outputs.fallback_build != 'true'");
  });

  it("runs the full deterministic release gate when Quality runs are repeatedly cancelled", () => {
    expect(workflow).toContain("fallback_build");
    expect(workflow).toContain("Checkout exact source for fallback verification");
    expect(workflow).toContain("Run deterministic fallback verification and build");
    expect(workflow).toContain("npm run verify:deployment-source");
    expect(workflow).toContain("npm run verify:secrets");
    expect(workflow).toContain("npm run verify:migrations");
    expect(workflow).toContain("npx tsc --noEmit");
    expect(workflow).toContain("npm test -- --passWithNoTests");
    expect(workflow).toContain("npm run build");
    expect(workflow).toContain("npm run verify:release-identity");
    expect(workflow).toContain("exact-main-recovery-fallback");
  });

  it("follows every main push and safely skips superseded source commits", () => {
    expect(workflow).toContain("branches: [main]");
    expect(workflow).not.toContain('paths:\n      - ".github/workflows/cloudflare-exact-main-recovery.yml"');
    expect(workflow).toContain("group: cloudflare-exact-main-recovery-${{ github.sha }}");
    expect(workflow).toContain("Main advanced while waiting for Quality Gate");
    expect(workflow).toContain("Superseded recovery skipped before deployment");
    expect(workflow).toContain("Superseded Cloudflare recovery skipped safely");
  });

  it("deploys only after exact-main freshness and verifies all public origins", () => {
    expect(workflow).toContain("Reconfirm exact main before production mutation");
    expect(workflow).toContain('--commit-hash="$SOURCE_SHA"');
    expect(workflow).toContain("Pages and apex exact-source parity verified");
    expect(workflow).toContain("www canonical redirect verified");
    expect(workflow).toContain("VERIFY_SUPERSEDED");
    expect(workflow).toContain('context="Irha Cloudflare Recovery"');
    expect(workflow).toContain("statuses: write");
  });
});
