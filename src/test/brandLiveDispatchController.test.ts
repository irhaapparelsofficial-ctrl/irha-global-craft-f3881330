import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/brand-live-dispatch-controller.yml"),
  "utf8",
);

const extractRunBlock = (stepName: string) => {
  const stepMarker = `      - name: ${stepName}`;
  const stepStart = workflow.indexOf(stepMarker);
  expect(stepStart).toBeGreaterThan(-1);

  const runMarker = "        run: |\n";
  const runStart = workflow.indexOf(runMarker, stepStart);
  expect(runStart).toBeGreaterThan(stepStart);

  const contentStart = runStart + runMarker.length;
  const nextStep = workflow.indexOf("\n      - name:", contentStart);
  return workflow
    .slice(contentStart, nextStep === -1 ? undefined : nextStep)
    .split("\n")
    .map((line) => (line.startsWith("          ") ? line.slice(10) : line))
    .join("\n");
};

describe("Brand Live dispatch controller", () => {
  it("keeps the owner command exact and release-status gated", () => {
    expect(workflow).toContain("github.event.issue.number == 375");
    expect(workflow).toContain("github.event.comment.body == '/run-brand-live'");
    for (const context of [
      "Irha Quality Gate",
      "Irha Cloudflare Production",
      "Irha Search Discovery",
    ]) {
      expect(workflow).toContain(`\"${context}\"`);
    }
  });

  it("requires exact Pages identity and tolerates custom-domain observation only for evidenced Cloudflare challenges", () => {
    const script = extractRunBlock("Require exact search-verified current-main release");
    const result = spawnSync("bash", ["-n", "-s"], {
      input: script,
      encoding: "utf8",
    });

    expect(result.status, result.stderr).toBe(0);
    expect(workflow).toContain("PAGES_ORIGIN: https://irha-apparels.pages.dev");
    expect(workflow).toContain("CANONICAL_ORIGIN: https://irhaapparels.com");
    expect(workflow).toContain('verify_build "$PAGES_ORIGIN" pages false');
    expect(workflow).toContain('verify_build "$CANONICAL_ORIGIN" apex true');
    expect(workflow).toContain('[ "$status" = "403" ] || return 1');
    expect(workflow).toContain("cf-mitigated:[[:space:]]*challenge");
    expect(workflow).toContain("server:[[:space:]]*cloudflare");
    expect(workflow).toContain("Just a moment...");
    expect(workflow).toContain('.source_commit == $sha');
    expect(workflow).toContain('.source_identity_state == "verified"');
    expect(workflow).toContain("exact Pages identity remains mandatory");
  });

  it("deduplicates exact-main Brand Live runs and reconfirms main before dispatch", () => {
    expect(workflow).toContain("latest_main");
    expect(workflow).toContain('test "$latest_main" = "$SOURCE_SHA"');
    expect(workflow).toContain("exact-main Brand Live already succeeded");
    expect(workflow).toContain("exact-main Brand Live already active");
    expect(workflow).toContain("gh workflow run verify-official-brand-live.yml");
  });
});
