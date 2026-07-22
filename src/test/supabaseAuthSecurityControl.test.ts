import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const script = read("scripts/ci/reconcile-supabase-auth-security.mjs");
const workflow = read(".github/workflows/supabase-auth-security.yml");

describe("Supabase Auth security control", () => {
  it("patches only leaked-password protection and verifies it afterwards", () => {
    expect(script).toContain('/v1/projects/${projectId}/config/auth');
    expect(script).toContain('await authConfig("PATCH", { password_hibp_enabled: true })');
    expect(script).toContain("after?.password_hibp_enabled !== true");
    expect(script).not.toContain("SUPABASE_DB_PASSWORD");
  });

  it("runs only from an exact green current-main push with production serialization", () => {
    expect(workflow).toContain("branches: [main]");
    expect(workflow).toContain('".github/workflows/supabase-auth-security.yml"');
    expect(workflow).toContain('select(.context == "Irha Quality Gate")');
    expect(workflow).toContain('test "$quality_state" = "success"');
    expect(workflow).toContain("group: irha-production-mutation");
    expect(workflow).toContain("Reconfirm exact current main before Auth mutation");
    expect(workflow).toContain("refusing Auth mutation");
  });

  it("keeps the access token secret and publishes only sanitized evidence", () => {
    expect(workflow).toContain("SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}");
    expect(script).toContain("publicEvidence");
    expect(script).not.toContain("console.log(accessToken)");
    expect(workflow).toContain("supabase-auth-security-${{ env.SOURCE_SHA }}");
    expect(workflow).toContain('context="Irha Supabase Auth Security"');
  });
});
