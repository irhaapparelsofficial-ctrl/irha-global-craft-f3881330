import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const profileMigration = read("supabase/migrations/20260713154500_add_buyer_profiles_and_communication_history.sql");
const coreMigration = read("supabase/migrations/20260713152500_fix_buyer_crm_activity_event_types.sql");
const sourceHelperMigration = read("supabase/migrations/20260713152000_add_buyer_crm_core_actions.sql");
const roleMigration = read("supabase/migrations/20260713202138_harden_has_role_self_scope.sql");
const hardeningMigration = read("supabase/migrations/20260803224500_harden_crm_communication_history_association.sql");
const profilePanel = read("src/components/admin/BuyerProfileCommunicationsPanel.tsx");
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

describe("IA-SEC-E004 CRM buyer authorization boundary", () => {
  it("keeps authenticated RPC execution because the admin browser calls all five targets directly", () => {
    for (const rpc of [
      "crm_get_buyer_profile",
      "crm_get_buyer_communication_history",
      "crm_save_buyer_profile",
      "crm_log_communication",
    ]) {
      expect(profilePanel).toContain(`db.rpc(\"${rpc}\"`);
    }
    expect(corePanel).toContain('db.rpc("crm_update_buyer_operating_state"');
  });

  it("keeps authorization ahead of buyer reads and writes", () => {
    expectAdminGuardBefore(functionBlock(profileMigration, "crm_get_buyer_profile"), "public.crm_source_exists");
    expectAdminGuardBefore(functionBlock(profileMigration, "crm_save_buyer_profile"), "public.crm_source_exists");
    expectAdminGuardBefore(functionBlock(profileMigration, "crm_log_communication"), "public.crm_source_exists");
    expectAdminGuardBefore(functionBlock(coreMigration, "crm_update_buyer_operating_state"), "_source_type not in");
    expectAdminGuardBefore(functionBlock(hardeningMigration, "crm_get_buyer_communication_history"), "public.crm_get_buyer_profile");
  });

  it("keeps source type and source id coupled to exactly one native buyer source", () => {
    const helper = functionBlock(sourceHelperMigration, "crm_source_exists");
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

  it("bounds history work and refuses ambiguous identifier fallback", () => {
    const history = functionBlock(hardeningMigration, "crm_get_buyer_communication_history");
    expect(history).toContain("greatest(1, least(coalesce(_limit, 200), 500))");
    expect(history).toContain("count(*) filter (where email = _email) = 1");
    expect(history).toContain("count(*) filter (where phone = _phone) = 1");
    expect(history).toContain("g.linked_lead_id is null\n             and _email_is_unique");
    expect(history).toContain("o.lead_id is null\n             and _email_is_unique");
    expect(history).toContain("wc.crm_lead_id is null\n             and _phone_is_unique");
    expect(history).toContain("where _email_is_unique\n          and _email is not null");
  });

  it("preserves direct prospect links even when identifier fallback is unavailable", () => {
    const history = functionBlock(hardeningMigration, "crm_get_buyer_communication_history");
    expect(history).toContain("_source_type = 'prospect' and g.linked_lead_id = _source_id");
    expect(history).toContain("_source_type = 'prospect' and o.lead_id = _source_id");
    expect(history).toContain("_source_type = 'prospect' and wc.crm_lead_id = _source_id");
  });

  it("locks target grants and search-path assumptions inside the transactional migration", () => {
    expect(hardeningMigration).toContain("has_function_privilege('anon', _sig, 'execute')");
    expect(hardeningMigration).toContain("has_function_privilege('authenticated', _sig, 'execute')");
    expect(hardeningMigration).toContain("has_schema_privilege('anon', 'public', 'create')");
    expect(hardeningMigration).toContain("has_schema_privilege('authenticated', 'public', 'create')");
    expect(hardeningMigration).toContain("search_path=public, pg_temp");
  });

  it("probes all five target functions as synthetic ordinary-authenticated and legitimate-admin claims", () => {
    for (const rpc of [
      "crm_get_buyer_profile",
      "crm_get_buyer_communication_history",
      "crm_save_buyer_profile",
      "crm_update_buyer_operating_state",
      "crm_log_communication",
    ]) {
      expect(hardeningMigration.match(new RegExp(`select public\\.${rpc}\\(`, "g"))?.length ?? 0).toBeGreaterThanOrEqual(2);
    }
    expect(hardeningMigration).toContain("sqlerrm <> 'Admin access required'");
    expect(hardeningMigration).toContain("sqlerrm <> 'Buyer record not found'");
  });
});
