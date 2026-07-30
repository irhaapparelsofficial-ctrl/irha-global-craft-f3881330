import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflowPath = resolve(process.cwd(), ".github/workflows/supabase-functions-reconcile.yml");

describe("Supabase Function Reconciliation closure status", () => {
  it("publishes the exact workflow result against the reconciled source SHA", () => {
    const workflow = readFileSync(workflowPath, "utf8");

    expect(workflow).toMatch(/permissions:\n\s+contents: read\n\s+statuses: write/);
    expect(workflow).toContain("Publish exact reconciliation status");
    expect(workflow).toContain('RECONCILIATION_JOB_STATUS: ${{ job.status }}');
    expect(workflow).toContain('context="Irha Supabase Function Reconciliation"');
    expect(workflow).toContain('target_url="$GITHUB_SERVER_URL/$GITHUB_REPOSITORY/actions/runs/$GITHUB_RUN_ID"');
    expect(workflow).toContain("Exact public-schema types and Edge source parity passed");
  });
});
