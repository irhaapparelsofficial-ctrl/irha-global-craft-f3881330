import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const coreMigration = read("supabase/migrations/20260713152000_add_buyer_crm_core_actions.sql");
const roleMigration = read("supabase/migrations/20260713202138_harden_has_role_self_scope.sql");
const hardeningMigration = read("supabase/migrations/20260803233000_harden_crm_task_meeting_integrity.sql");
const corePanel = read("src/components/admin/BuyerCoreActionsPanel.tsx");

function functionBlock(sql: string, name: string) {
  const start = sql.indexOf(`create or replace function public.${name}`);
  expect(start, `${name} definition`).toBeGreaterThanOrEqual(0);
  const next = sql.indexOf("create or replace function public.", start + 1);
  return sql.slice(start, next === -1 ? undefined : next);
}

function expectAdminGuardBefore(block: string, laterMarker: string) {
  const actor = block.indexOf("_actor uuid := auth.uid()");
  const guard = block.indexOf("not public.has_role(_actor, 'admin'::public.app_role)");
  const later = block.indexOf(laterMarker);
  expect(actor).toBeGreaterThanOrEqual(0);
  expect(guard).toBeGreaterThan(actor);
  expect(later).toBeGreaterThan(guard);
}

describe("IA-SEC-E005 CRM task and meeting authorization boundary", () => {
  it("keeps the browser-admin RPC path for task creation, task status and meeting scheduling", () => {
    expect(corePanel).toContain('db.rpc("crm_create_followup_task"');
    expect(corePanel).toContain('db.rpc("crm_set_task_status"');
    expect(corePanel).toContain('db.rpc("crm_schedule_buyer_meeting"');
  });

  it("keeps authorization ahead of task and meeting object work", () => {
    expectAdminGuardBefore(functionBlock(coreMigration, "crm_create_followup_task"), "public.crm_source_exists");
    expectAdminGuardBefore(functionBlock(hardeningMigration, "crm_set_task_status"), "from public.crm_tasks");
    expectAdminGuardBefore(functionBlock(hardeningMigration, "crm_schedule_buyer_meeting"), "public.crm_source_exists");
    expectAdminGuardBefore(functionBlock(hardeningMigration, "crm_set_meeting_outcome"), "from public.crm_meetings");
  });

  it("keeps source type and source id coupled to one supported buyer source", () => {
    const helper = functionBlock(coreMigration, "crm_source_exists");
    expect(helper).toContain("when 'inquiry' then exists(select 1 from public.inquiries where id = _source_id)");
    expect(helper).toContain("when 'catalogue' then exists(select 1 from public.catalogue_leads where id = _source_id)");
    expect(helper).toContain("when 'prospect' then exists(select 1 from public.b2b_leads where id = _source_id)");
    expect(helper).toContain("else false");
  });

  it("keeps has_role self-scoped for ordinary authenticated callers", () => {
    expect(roleMigration).toContain("_user_id IS DISTINCT FROM auth.uid()");
    expect(roleMigration).toContain("WHERE user_id = auth.uid()");
    expect(roleMigration).toContain("REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;");
  });

  it("makes exact task-status retries idempotent before mutation or activity logging", () => {
    const task = functionBlock(hardeningMigration, "crm_set_task_status");
    expect(task).toContain("for update");
    expect(task).toContain("if _row.status = _status then");
    expect(task.indexOf("if _row.status = _status then")).toBeLessThan(task.indexOf("update public.crm_tasks"));
    expect(task).toContain("if _status <> 'completed' then");
  });

  it("validates meeting timezone and a usable HTTPS location before insertion", () => {
    const meeting = functionBlock(hardeningMigration, "crm_schedule_buyer_meeting");
    expect(meeting).toContain("from pg_catalog.pg_timezone_names");
    expect(meeting).toContain("raise exception 'Unsupported timezone'");
    expect(meeting).toContain("^https://[^[:space:]/?#]+([/?#][^[:space:]]*)?$");
    expect(meeting).toContain("raise exception 'Meeting link must be a valid HTTPS URL'");
    expect(meeting.indexOf("Unsupported timezone")).toBeLessThan(meeting.indexOf("insert into public.crm_meetings"));
  });

  it("keeps final meeting outcomes guarded and makes exact retries idempotent", () => {
    const outcome = functionBlock(hardeningMigration, "crm_set_meeting_outcome");
    expect(outcome).toContain("if _meeting.status not in ('scheduled', _status) then");
    expect(outcome).toContain("_meeting.outcome_notes is not distinct from _clean_notes");
    expect(outcome.indexOf("_meeting.outcome_notes is not distinct from _clean_notes")).toBeLessThan(outcome.indexOf("update public.crm_meetings"));
    expect(outcome).toContain("'meeting_id', _meeting.id");
    expect(outcome).toContain("_meeting.source_type");
    expect(outcome).toContain("_meeting.source_id");
  });

  it("locks grants, search-path assumptions and synthetic authorization probes for all four targets", () => {
    for (const rpc of [
      "crm_create_followup_task",
      "crm_set_task_status",
      "crm_schedule_buyer_meeting",
      "crm_set_meeting_outcome",
    ]) {
      expect(hardeningMigration).toContain(rpc);
    }
    expect(hardeningMigration).toContain("has_function_privilege('anon', _sig, 'execute')");
    expect(hardeningMigration).toContain("has_function_privilege('authenticated', _sig, 'execute')");
    expect(hardeningMigration).toContain("has_schema_privilege('anon', 'public', 'create')");
    expect(hardeningMigration).toContain("has_schema_privilege('authenticated', 'public', 'create')");
    expect(hardeningMigration).toContain("search_path=public, pg_temp");
    expect(hardeningMigration).toContain("sqlerrm <> 'Admin access required'");
    expect(hardeningMigration).toContain("'Buyer record not found', 'Task not found', 'Meeting not found'");
  });

  it("contains rollback-safe source-tuple and retry-integrity fixtures with explicit cleanup", () => {
    expect(hardeningMigration).toContain("task source tuple mismatch was accepted");
    expect(hardeningMigration).toContain("meeting source tuple mismatch was accepted");
    expect(hardeningMigration).toContain("no-op task replay changed CRM activity history");
    expect(hardeningMigration).toContain("exact meeting-outcome replay changed CRM activity history");
    expect(hardeningMigration).toContain("invalid timezone was accepted");
    expect(hardeningMigration).toContain("hostless HTTPS meeting link was accepted");
    expect(hardeningMigration).toContain("synthetic fixture cleanup failed");
  });
});
