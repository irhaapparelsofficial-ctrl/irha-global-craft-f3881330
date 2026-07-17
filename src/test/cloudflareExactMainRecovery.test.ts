import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const canonicalWorkflowPath = resolve(
  process.cwd(),
  ".github/workflows/cloudflare-current-main-reconcile.yml",
);
const directWorkflowPath = resolve(
  process.cwd(),
  ".github/workflows/cloudflare-direct-production.yml",
);
const legacyRecoveryPath = resolve(
  process.cwd(),
  ".github/workflows/cloudflare-exact-main-recovery.yml",
);
const workflow = readFileSync(canonicalWorkflowPath, "utf8");

describe("Cloudflare exact-current-main release reconciliation", () => {
  it("deploys only the immutable artifact from a successful current-main Quality Gate", () => {
    expect(workflow).toContain('workflows: ["Quality Gate"]');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("production-dist-${{ env.SOURCE_SHA }}");
    expect(workflow).toContain("run-id: ${{ env.QUALITY_RUN_ID }}");
    expect(workflow).toContain("Reconfirm exact current main before production mutation");
    expect(workflow).toContain('--commit-hash="$SOURCE_SHA"');
  });

  it("keeps one automatic Cloudflare deployment authority and safely skips superseded commits", () => {
    expect(existsSync(directWorkflowPath)).toBe(false);
    expect(existsSync(legacyRecoveryPath)).toBe(false);
    expect(workflow).toContain("group: cloudflare-reconcile-${{ github.event.workflow_run.head_sha }}");
    expect(workflow).toContain("Superseded source skipped safely");
    expect(workflow).toContain("stale deploy skipped without failure");
    expect(workflow).toContain("Superseded release verification skipped without failure");
  });

  it("verifies pages.dev, apex, release identity and canonical www behavior", () => {
    expect(workflow).toContain("Verify pages.dev, apex and www canonical behavior");
    expect(workflow).toContain("verify_origin \"$PAGES_URL\" pages");
    expect(workflow).toContain("verify_origin \"$CANONICAL_ORIGIN\" apex");
    expect(workflow).toContain(".source_commit == $sha");
    expect(workflow).toContain("www canonical GET redirect verified");
    expect(workflow).toContain("Apex and Pages source parity: verified");
  });
});
