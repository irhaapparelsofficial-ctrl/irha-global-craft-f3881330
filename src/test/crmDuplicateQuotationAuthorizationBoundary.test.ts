import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const globalDuplicateMigration = read("supabase/migrations/20260714230000_lead_engine_notifications.sql");
const commercialMigration = read("supabase/migrations/20260713060000_commercial_hub.sql");
const e004Migration = read("supabase/migrations/20260803224500_harden_crm_communication_history_association.sql");
const e006Migration = read("supabase/migrations/20260803234500_harden_crm_duplicate_quotation_integrity.sql");

function functionBlock(sql: string, name: string) {
  const lower = sql.toLowerCase();
  const marker = `create or replace function public.${name.toLowerCase()}`;
  const start = lower.indexOf(marker);
  expect(start, `${name} definition`).toBeGreaterThanOrEqual(0);
  const next = lower.indexOf("create or replace function public.", start + marker.length);
  return sql.slice(start, next === -1 ? undefined : next);
}

function expectAdminGuardBefore(block: string, laterMarker: string) {
  const lower = block.toLowerCase();
  const actor = lower.indexOf("auth.uid()");
  const guard = lower.indexOf("not public.has_role");
  const later = lower.indexOf(laterMarker.toLowerCase());
  expect(actor).toBeGreaterThanOrEqual(0);
  expect(guard).toBeGreaterThan(actor);
  expect(later).toBeGreaterThan(guard);
}

describe("IA-SEC-E006 CRM duplicate and quotation authorization boundary", () => {
  it("keeps global duplicate discovery admin-only, bounded and pair-safe", () => {
    const block = functionBlock(globalDuplicateMigration, "crm_find_duplicate_candidates");
    const lower = block.toLowerCase();

    expectAdminGuardBefore(block, "with records as");
    expect(lower).toContain("length(a.phone_norm) >= 7");
    expect(lower).toContain("a.company_norm = b.company_norm");
    expect(lower).toContain("a.country_norm = b.country_norm");
    expect(lower).toContain("(a.source_type || ':' || a.id::text) < (b.source_type || ':' || b.id::text)");
    expect(lower).toContain("not exists (\n      select 1 from public.crm_record_links");
    expect(lower).toContain("limit greatest(1, least(coalesce(_limit,100),500))");
  });

  it("preserves all four intended authenticated SECURITY DEFINER RPC grants and helper lock", () => {
    for (const signature of [
      "crm_find_duplicate_candidates(integer)",
      "crm_find_duplicate_candidates(text,uuid,integer)",
      "crm_confirm_same_buyer(text,uuid,text,uuid,text)",
      "crm_create_buyer_quotation_handoff(text,uuid,text,date,text,text,text,text)",
    ]) {
      expect(e006Migration).toContain(signature);
    }

    expect(e006Migration).toContain("has_function_privilege('anon', _sig, 'execute')");
    expect(e006Migration).toContain("has_function_privilege('authenticated', _sig, 'execute')");
    expect(e006Migration).toContain("has_schema_privilege('anon', 'public', 'create')");
    expect(e006Migration).toContain("has_schema_privilege('authenticated', 'public', 'create')");
    expect(e006Migration).toContain("crm_source_contact_snapshot(text,uuid)");
    expect(e006Migration).toContain("source snapshot helper direct EXECUTE boundary drifted");
  });

  it("keeps same-buyer confirmation exact, symmetric, canonical and retry-idempotent", () => {
    const block = functionBlock(e006Migration, "crm_confirm_same_buyer");
    const lower = block.toLowerCase();

    expectAdminGuardBefore(block, "choose two different buyer records");
    expect(lower.match(/crm_source_contact_snapshot/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
    expect(lower).toContain("_left_email = _right_email");
    expect(lower).toContain("char_length(_left_phone) >= 7");
    expect(lower).toContain("_left_phone = _right_phone");
    expect(lower).toContain("exact email or phone evidence is required");
    expect(lower).toContain("_left_source_type || ':' || _left_source_id::text");
    expect(lower).toContain("for update");
    expect(lower).toContain("_link.link_type = 'same_buyer'");
    expect(lower).toContain("_link.status = 'confirmed'");
    expect(lower).toContain("_link.reason is not distinct from _clean_reason");

    const replayGuard = lower.indexOf("_link.reason is not distinct from _clean_reason");
    const linkUpdate = lower.indexOf("update public.crm_record_links");
    const activityInsert = lower.indexOf("insert into public.crm_activity_events");
    expect(replayGuard).toBeGreaterThanOrEqual(0);
    expect(replayGuard).toBeLessThan(linkUpdate);
    expect(linkUpdate).toBeLessThan(activityInsert);
    expect(lower).toContain("'link_id', _link.id");
  });

  it("keeps quotation handoff tied to one exact buyer and draft-only commercial state", () => {
    const block = functionBlock(e006Migration, "crm_create_buyer_quotation_handoff");
    const lower = block.toLowerCase();

    expectAdminGuardBefore(block, "crm_source_contact_snapshot");
    expect(lower).toContain("_identity := public.crm_source_contact_snapshot(_source_type, _source_id)");
    expect(lower).toContain("('usd','eur','gbp','aud','cad','aed')");
    expect(lower).toContain("_valid_until < current_date");
    expect(lower).toContain("_valid_until > current_date + 365");
    expect(lower).toContain("char_length(_incoterm_clean) not between 2 and 40");
    expect(lower).toContain("char_length(_shipping_clean) not between 2 and 2000");
    expect(lower).toContain("char_length(_payment_clean) not between 2 and 2000");
    expect(lower).toContain("char_length(_notes_clean) > 4000");
    expect(lower).toContain("'draft'");
    expect(lower).toContain("'external_send', false");
    expect(lower).toContain("'owner_approval_required', true");
    expect(lower).not.toContain("insert into public.crm_activity_events");
  });

  it("uses the existing quotation table audit trigger as the single creation-history writer", () => {
    const audit = functionBlock(commercialMigration, "crm_commercial_activity_audit").toLowerCase();
    expect(audit).toContain("tg_table_name = 'crm_quotations'");
    expect(audit).toContain("'quotation_created'");
    expect(audit).toContain("insert into public.crm_activity_events");

    expect(commercialMigration.toLowerCase()).toContain("crm_quotations_activity_trigger");
    expect(commercialMigration.toLowerCase()).toContain("after insert or update on public.crm_quotations");
    expect(e006Migration).toContain("authoritative quotation activity trigger is missing or disabled");
    expect(e006Migration).toContain("quotation handoff still writes a duplicate direct activity event");
  });

  it("probes ordinary authenticated denial and legitimate admin validation without CRM residue", () => {
    expect(e006Migration).toContain("ordinary authenticated probe unexpectedly passed authorization");
    expect(e006Migration).toContain("perform count(*) from public.crm_find_duplicate_candidates(1)");
    expect(e006Migration).toContain("Unsupported buyer source");
    expect(e006Migration).toContain("Buyer record not found");
    expect(e006Migration).toContain("authorization probes mutated CRM state");
    expect(e006Migration).toContain("exact same-buyer retry changed CRM activity history");
    expect(e006Migration).toContain("synthetic fixture cleanup failed");
  });

  it("does not reopen E004 communication-history association hardening", () => {
    const history = functionBlock(e004Migration, "crm_get_buyer_communication_history").toLowerCase();
    expect(history).toContain("count(*) filter (where email = _email) = 1");
    expect(history).toContain("count(*) filter (where phone = _phone) = 1");
    expect(history).toContain("g.linked_lead_id is null");
    expect(history).toContain("o.lead_id is null");
    expect(history).toContain("wc.crm_lead_id is null");
    expect(history).not.toContain("crm_record_links");
    expect(e006Migration).not.toContain("create or replace function public.crm_get_buyer_communication_history");
  });
});
