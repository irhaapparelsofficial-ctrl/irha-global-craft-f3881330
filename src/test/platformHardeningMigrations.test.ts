import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("final platform hardening migrations", () => {
  it("keeps live-chat CRM notifications admin guarded while allowing the trusted service role", () => {
    const sql = read("supabase/migrations/20260716183500_allow_service_role_crm_notification_updates.sql");
    expect(sql).toContain("auth.role() = 'service_role'");
    expect(sql).toContain("public.has_role(auth.uid(), 'admin')");
    expect(sql).toContain("revoke all on function public.crm_notification_before_write()");
    expect(sql).toContain("grant execute on function public.crm_notification_before_write() to service_role");
  });

  it("requeues only the four recovered stale-lock media rows", () => {
    const sql = read("supabase/migrations/20260716183600_requeue_four_recovered_ai_media_jobs.sql");
    expect(sql.match(/::uuid/g)).toHaveLength(4);
    expect(sql).toContain("and ai_processing_status = 'failed'");
    expect(sql).toContain("and ai_processing_locked_at is null");
    expect(sql).toContain("owner-audited-stale-lock-retry-20260716");
  });

  it("makes internal-table deny-all intent explicit without opening browser access", () => {
    const sql = read("supabase/migrations/20260716183700_document_internal_tables_as_service_only.sql");
    expect(sql).toContain("for all to anon, authenticated using (false) with check (false)");
    expect(sql).toContain("internal_asset_migration_control");
    expect(sql).toContain("sitemap_submission_control");
    expect(sql).not.toContain("using (true)");
  });
});
