import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("lead conversion engine notifications", () => {
  it("loads admin-only alerts and refreshes overdue work", () => {
    const panel = read("src/components/admin/LeadEngineAlertsPanel.tsx");
    expect(panel).toContain('rpc("crm_refresh_action_notifications")');
    expect(panel).toContain('from("crm_notifications")');
    expect(panel).toContain('neq("status", "archived")');
    expect(panel).toContain("Mark all read");
  });

  it("requires a human decision before recording duplicate relationships", () => {
    const panel = read("src/components/admin/LeadEngineAlertsPanel.tsx");
    expect(panel).toContain('rpc("crm_find_duplicate_candidates"');
    expect(panel).toContain('from("crm_record_links")');
    expect(panel).toContain('link_type: "duplicate"');
    expect(panel).toContain('decideDuplicate(candidate, "confirmed")');
    expect(panel).toContain('decideDuplicate(candidate, "rejected")');
    expect(panel).toContain("No buyer record was merged or deleted");
  });

  it("keeps public lead alerts trigger-only and admin protected", () => {
    const migration = read("supabase/migrations/20260714230000_lead_engine_notifications.sql");
    expect(migration).toContain("crm_notifications_admin_all");
    expect(migration).toContain("crm_new_inquiry_notification_trigger");
    expect(migration).toContain("crm_new_catalogue_notification_trigger");
    expect(migration).toContain("REVOKE EXECUTE ON FUNCTION public.crm_new_public_lead_notification() FROM PUBLIC, anon, authenticated");
  });

  it("never auto-merges duplicates or sends buyer communication", () => {
    const migration = read("supabase/migrations/20260714230000_lead_engine_notifications.sql");
    expect(migration).toContain("crm_find_duplicate_candidates");
    expect(migration).not.toContain("DELETE FROM public.inquiries");
    expect(migration).not.toContain("DELETE FROM public.catalogue_leads");
    expect(migration).not.toContain("DELETE FROM public.b2b_leads");
    expect(migration).not.toContain("enqueue_email");
  });

  it("archives a daily owner report without approving or contacting buyers", () => {
    const migration = read("supabase/migrations/20260714230000_lead_engine_notifications.sql");
    expect(migration).toContain("crm_generate_daily_owner_report");
    expect(migration).toContain("crm_daily_reports");
    expect(migration).toContain("daily-summary:");
    expect(migration).not.toContain("sendLovableEmail");
  });
});
