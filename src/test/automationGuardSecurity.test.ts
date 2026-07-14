import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260714092600_harden_automation_guard_and_internal_tables.sql"),
  "utf8",
);

describe("automation guard security follow-up", () => {
  it("keeps the trigger helper inaccessible to browser roles", () => {
    expect(migration).toContain("revoke all on function public.guard_automation_task_result_state() from anon");
    expect(migration).toContain("revoke all on function public.guard_automation_task_result_state() from authenticated");
    expect(migration).toContain("grant execute on function public.guard_automation_task_result_state() to service_role");
  });

  it("keeps privileged repair and checkpoint evidence service-only", () => {
    expect(migration).toContain("revoke all on table public.automation_task_repair_snapshots from anon, authenticated");
    expect(migration).toContain("revoke all on table public.backend_activation_checkpoints from anon, authenticated");
    expect(migration).toContain("automation_task_repair_snapshots_deny_clients");
    expect(migration).toContain("backend_activation_checkpoints_deny_clients");
    expect(migration.match(/using \(false\)/g)?.length).toBe(2);
    expect(migration.match(/with check \(false\)/g)?.length).toBe(2);
  });
});
