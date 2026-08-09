import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("Cloudflare cache lineage control", () => {
  it("uses exact GitHub Actions truth instead of the optional public deployment marker", () => {
    const workflow = read(".github/workflows/cloudflare-cache-consistency.yml");

    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain('.name == "Cloudflare Current Main Reconcile"');
    expect(workflow).toContain('actions/runs?head_sha=$SOURCE_SHA&per_page=100');
    expect(workflow).toContain('.name == "Quality Gate"');
    expect(workflow).toContain("authoritative Quality lineage resolved from GitHub Actions");
    expect(workflow).not.toContain("cloudflare-deployment.json?release_check=");
  });
});
