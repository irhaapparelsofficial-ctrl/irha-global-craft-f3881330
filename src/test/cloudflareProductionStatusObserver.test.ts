import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/cloudflare-production-status.yml"),
  "utf8",
);

describe("Cloudflare production status observer", () => {
  it("inspects upstream jobs instead of treating skipped PR reconciliation as production failure", () => {
    expect(workflow).toContain("actions: read");
    expect(workflow).toContain("Inspect upstream reconciliation jobs");
    expect(workflow).toContain('select(.name == "preflight")');
    expect(workflow).toContain('select(.name == "reconcile")');
    expect(workflow).toContain('if [ "$preflight" = "skipped" ] && [ "$reconcile" = "skipped" ]');
    expect(workflow).toContain("Non-production reconciliation event ignored without status mutation");
  });

  it("publishes a live status only after an actual successful reconciliation", () => {
    expect(workflow).toContain("steps.upstream.outputs.successful == 'true'");
    expect(workflow).toContain('context="Irha Cloudflare Production"');
    expect(workflow).toContain("Verify pages.dev, apex and www against exact merged SHA");
    expect(workflow).toContain("Exact merged release is live on Cloudflare");
  });

  it("records actual upstream failures without creating a second failed observer run", () => {
    expect(workflow).toContain("Publish upstream reconciliation failure without duplicate failure email");
    expect(workflow).toContain("steps.upstream.outputs.attempted == 'true'");
    expect(workflow).toContain("steps.upstream.outputs.successful != 'true'");
    expect(workflow).toContain("this observer exits cleanly to avoid a duplicate failure email");
  });
});
