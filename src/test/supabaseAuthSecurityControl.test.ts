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
    expect(workflow).toContain('select(.context == "Irha Quality Gate")');
    expect(workflow).toContain('test "$quality_state" = "success"');
    expect(workflow).toContain("group: irha-production-mutation");
    expect(workflow).toContain("Reconfirm exact current main before Auth mutation");
    expect(workflow).toContain("refusing Auth mutation");
  });

  it("writes sanitized evidence for successful, blocked and failed reconciliation", () => {
    expect(script).toContain("class ManagementApiError extends Error");
    expect(script).toContain("safeErrorPayload");
    expect(script).toContain("redactText");
    expect(script).toContain('blocked_reason: "supabase_pro_plan_required"');
    expect(script).toContain('parity = classification.blocked_reason ? "blocked" : "failed"');
    expect(script).toContain("writeEvidence");
    expect(script).not.toContain("console.log(accessToken)");
  });

  it("does not turn a known plan restriction into a recurring failed job", () => {
    expect(workflow).toContain("blocked:supabase_pro_plan_required");
    expect(workflow).toContain("result_state=blocked_plan");
    expect(workflow).toContain("Leaked-password protection requires Supabase Pro; no unsafe change");
    expect(workflow).toContain("verified|blocked_plan");
  });

  it("preserves only sanitized short-lived diagnostics", () => {
    expect(workflow).toContain("SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}");
    expect(workflow).toContain("SUPABASE_AUTH_LOG_PATH: /tmp/supabase-auth-security.log");
    expect(workflow).toContain("/tmp/supabase-auth-security-evidence.json");
    expect(workflow).toContain("/tmp/supabase-auth-security.log");
    expect(workflow).toContain("retention-days: 2");
    expect(workflow).toContain('context="Irha Supabase Auth Security"');
  });
});
