import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const panel = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/LeadReviewActivationPanel.tsx"), "utf8");
const page = fs.readFileSync(path.resolve(process.cwd(), "src/pages/AdminLeadReview.tsx"), "utf8");
const app = fs.readFileSync(path.resolve(process.cwd(), "src/App.tsx"), "utf8");
const backend = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/lead-activation/index.ts"), "utf8");
const migration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260714143000_lead_activation_audit_and_rollback.sql"), "utf8");
const auditMigration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260714143500_preserve_activation_event_lead_ids.sql"), "utf8");
const config = fs.readFileSync(path.resolve(process.cwd(), "supabase/config.toml"), "utf8");
const publicWildcardIndex = app.search(/<Route\s+path="\*"\s+element=\{/);

describe("lead review and CRM activation safety", () => {
  it("keeps the workspace private and outside the public site layout", () => {
    const route = '<Route path="/admin/lead-review" element={<AdminLeadReview />} />';
    expect(page).toContain("if (!user)");
    expect(page).toContain("if (!isAdmin)");
    expect(page).toContain("noindex");
    expect(app).toContain(route);
    expect(publicWildcardIndex).toBeGreaterThan(-1);
    expect(app.indexOf(route)).toBeLessThan(publicWildcardIndex);
  });

  it("uses small restartable validation and activation chunks", () => {
    expect(panel).toContain("const ACTIVATION_CHUNK = 25");
    expect(panel).toContain("const VALIDATION_CHUNK = 50");
    expect(backend).toContain("const MAX_BATCH = 50");
    expect(backend).toContain("slice(0, MAX_BATCH)");
  });

  it("requires explicit owner confirmation for import and rollback", () => {
    expect(panel).toContain("owner_confirmed: true");
    expect(backend).toContain('if (body.owner_confirmed !== true)');
    expect(panel).toContain("window.confirm");
  });

  it("does not send email, WhatsApp or social messages", () => {
    expect(backend).toContain("sends_external_messages: false");
    expect(panel).not.toContain('action: "send"');
    expect(backend).not.toContain("outreach-engine");
    expect(backend).not.toContain("whatsapp-admin");
    expect(backend).not.toContain("social-calendar");
    expect(backend).not.toContain("gmail/v1");
    expect(backend).not.toContain("graph.facebook.com");
  });

  it("blocks free, disposable, unresolvable and website-misaligned email domains", () => {
    expect(backend).toContain("FREE_EMAIL_DOMAINS");
    expect(backend).toContain("DISPOSABLE_DOMAINS");
    expect(backend).toContain('Deno.resolveDns(emailDomain, "MX")');
    expect(backend).toContain("email domain does not match company website");
    expect(backend).toContain("const ready = Boolean(email && business && mxExists && aligned)");
  });

  it("deduplicates before CRM insert and rolls back candidate linkage on partial failure", () => {
    expect(backend).toContain("knownCrm(db)");
    expect(backend).toContain("known.companies.get(companyKey)");
    expect(backend).toContain('.from("b2b_leads").delete().eq("id", lead.data.id)');
    expect(backend).toContain("Candidate link failed; CRM insert rolled back");
  });

  it("protects real buyer work from rollback", () => {
    for (const guard of [
      "outreach exists",
      "communication history exists",
      "CRM task exists",
      "quotation or PI exists",
      "sample workflow started",
      "buyer history changed",
    ]) expect(backend).toContain(guard);
    expect(panel).toContain("Only untouched CRM imports will be removed");
  });

  it("creates admin-RLS audit tables without altering existing lead rows", () => {
    expect(migration).toContain("create table if not exists public.lead_activation_batches");
    expect(migration).toContain("create table if not exists public.lead_activation_events");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("public.has_role");
    expect(migration).not.toContain("delete from public.b2b_leads");
    expect(migration).not.toContain("update public.lead_candidates");
    expect(auditMigration).toContain("drop constraint if exists lead_activation_events_lead_id_fkey");
  });

  it("keeps the function JWT protected and uses admin RLS without service-role bypass", () => {
    expect(config).toContain("[functions.lead-activation]\nverify_jwt = true");
    expect(backend).toContain("db.auth.getUser()");
    expect(backend).toContain('.eq("role", "admin")');
    expect(backend).toContain('authorization_mode: "admin_jwt_rls"');
    expect(backend).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(panel).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(page).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("records Azerbaijan planning as a private CRM task only", () => {
    expect(backend).toContain('.from("crm_tasks").insert');
    expect(backend).toContain('event: "visit_scheduled"');
    expect(panel).toContain("Azerbaijan visit planner");
    expect(panel).toContain("It does not contact the company");
    expect(panel).toContain('const BAKU_UTC_OFFSET = "+04:00"');
    expect(panel).toContain("bakuLocalToIso(visitAt)");
    expect(panel).toContain("Baku time (UTC+4)");
    expect(panel).not.toContain("new Date(visitAt).toISOString()");
    expect(backend).not.toContain('assigned_to: "Daim Ali"');
  });
});
