import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const workflow = read(".github/workflows/supabase-functions-reconcile.yml");
const generator = read("scripts/ci/run-sec-m03-parity-generation.mjs");

describe("SEC-M03 canonical parity control", () => {
  it("runs from main and requires the successful exact-SHA Quality Gate before mutation", () => {
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain("SOURCE_SHA: ${{ github.sha }}");
    expect(workflow).toContain("Require successful exact-SHA Quality Gate");
    expect(workflow).toContain('.context == "Irha Quality Gate"');
    expect(workflow).toContain('test "$gate_state" = "success"');
    expect(workflow.indexOf("Require successful exact-SHA Quality Gate")).toBeLessThan(
      workflow.indexOf("Deploy only under-version approved functions"),
    );
  });

  it("keeps deployment bounded to the three approved functions", () => {
    expect(workflow).toContain("Deploy only under-version approved functions");
    expect(workflow).toContain("supabase/reconciliation/sec-m03-function-reconciliation.json");
    expect(workflow).toContain("/tmp/planned-functions.txt");
    expect(workflow).toContain("/tmp/blocked-f3.txt");
    expect(workflow).toContain("/tmp/blocked-f6.txt");
    expect(workflow).not.toContain("supabase functions deploy _shared");
  });

  it("refreshes but never deploys the protected notification dispatcher", () => {
    expect(workflow).toContain('$row[0] == "notification-dispatcher"');
    expect(workflow).toContain("Notification dispatcher: parity-refresh only; never deployed by this workflow");
    expect(generator).toContain("const dispatcherVersion = 8");
    expect(generator).toContain("2b4525d022b0788c3bb6b2bf25923c90c35807a3e2b6065671b2eb90f00f1a48");
  });

  it("requires the exact reviewed migration and project baseline", () => {
    expect(generator).toContain('const projectId = "pvzjiozismyxqrzmtfbi"');
    expect(generator).toContain("const liveMigrationCount = 375");
    expect(generator).toContain("expected exactly one canonical replacement target");
  });
});
