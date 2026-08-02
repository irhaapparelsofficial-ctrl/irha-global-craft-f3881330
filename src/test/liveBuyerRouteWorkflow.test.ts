import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(resolve(process.cwd(), ".github/workflows/verify-official-brand-live.yml"), "utf8");

describe("live buyer route verification", () => {
  it("requires the complete canonical product manifest", () => {
    expect(workflow).toContain("catalog-route-manifest.json");
    expect(workflow).toContain(".productCount == 254");
    expect(workflow).toContain(".products[0].canonical_path");
  });

  it("verifies canonical 200, legacy one-hop 301 and real edge 404", () => {
    expect(workflow).toContain('valid_status" = "200"');
    expect(workflow).toContain('legacy_status" = "301"');
    expect(workflow).toContain('missing_status" = "404"');
    expect(workflow).toContain('missing_marker" = "not-found"');
    expect(workflow).toContain("--max-redirs 0");
  });

  it("allows Cloudflare propagation before declaring the live route contract failed", () => {
    expect(workflow).toContain("for attempt in $(seq 1 18)");
    expect(workflow).toContain("Route proof $label attempt $attempt/18");
    expect(workflow).toContain("sleep 10");
    expect(workflow).toContain('verify_route_origin "$pages_origin" pages false ""');
    expect(workflow).toContain('verify_route_origin "$apex_origin" apex true "$pages_valid_path"');
    expect(workflow).toContain('[ "$status" = "403" ] || return 1');
    expect(workflow).toContain("Buyer route non-challenge failure");
  });

  it("publishes one combined live-brand and buyer-route status", () => {
    expect(workflow).toContain("Official brand and canonical buyer routes verified live");
    expect(workflow).toContain('context="Irha Brand Live"');
    expect(workflow).toContain("JOB_STATUS: ${{ job.status }}");
  });
});
