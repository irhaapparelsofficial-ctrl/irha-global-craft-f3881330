import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";

describe("production artifact source-map classification", () => {
  it("accepts HTML fallbacks and detects real flat and indexed source maps", () => {
    const output = execFileSync(
      process.execPath,
      ["scripts/ci/audit-production-artifacts.mjs"],
      {
        cwd: process.cwd(),
        encoding: "utf8",
        env: {
          ...process.env,
          ARTIFACT_AUDIT_SELF_TEST: "1",
        },
      },
    );

    expect(JSON.parse(output)).toEqual({
      mode: "self-test",
      cases: 4,
      ok: true,
    });
  });
});
