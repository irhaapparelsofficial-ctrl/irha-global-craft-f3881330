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
    expect(script).toContain('after?.password_hibp_enabled !== true');
    expect(script).not.toContain("SUPABASE_DB_PASSWORD");
  });

  it("runs only from exact green current main with production serialization", () => {
    expect(workflow).toContain('workflows: ["Quality Gate"]');
    expect(workflow).toContain("github.event.workflow_run.conclusion == 'success'");
    expect(workflow).toContain("github.event.workflow_run.head_branch == 'main'");
    expect(workflow).toContain("group: irha-production-mutation");
    expect(workflow).toContain("Reconfirm exact current main before Auth mutation");
  });

  it("keeps the access token secret and publishes only sanitized evidence", () => {
    expect(workflow).toContain("SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}");
    expect(script).toContain("publicEvidence");
    expect(script).not.toContain("console.log(accessToken)");
    expect(workflow).toContain("supabase-auth-security-${{ env.SOURCE_SHA }}");
    expect(workflow).toContain('context="Irha Supabase Auth Security"');
  });
});
