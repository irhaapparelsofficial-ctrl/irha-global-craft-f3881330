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

describe("lead review and CRM activation safety", () => {
  it("keeps the workspace private and outside the public site layout", () => {
    const route = '<Route path="/admin/lead-review" element={<AdminLeadReview />} />';
    const wildcard = app.indexOf('<Route path="*"');
    expect(page).toContain("if (!user)");
    expect(page).toContain("if (!isAdmin)");
    expect(page).toContain("noindex");
    expect(app).toContain(route);
    expect(wildcard).toBeGreaterThan(-1);
    expect(app.indexOf(route)).toBeLessThan(wildcard);
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
    expect(migration).toContain("lead_activation_events");
    expect(auditMigration).toContain("activated_lead_ids");
    expect(config).toContain("[functions.lead-activation]");
  });
});
