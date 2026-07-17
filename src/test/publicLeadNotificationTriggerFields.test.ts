import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260717233000_fix_public_lead_notification_record_fields.sql"),
  "utf8",
);

describe("public lead notification trigger record safety", () => {
  it("copies relation-specific NEW fields inside their own trigger branches", () => {
    expect(migration).toContain("if tg_table_name = 'inquiries' then");
    expect(migration).toContain("_company := nullif(btrim(new.company), '');");
    expect(migration).toContain("elsif tg_table_name = 'catalogue_leads' then");
    expect(migration).toContain("_company := nullif(btrim(new.company_name), '');");
    expect(migration).toContain("_inquiry_ref := null;");
  });

  it("builds shared CRM metadata only from local variables", () => {
    expect(migration).toContain("'company', _company");
    expect(migration).toContain("'inquiry_ref', _inquiry_ref");
    expect(migration).toContain("'created_at', _created_at");
    expect(migration).not.toContain("case when _source_type = 'inquiry' then new.company else new.company_name end");
    expect(migration).not.toContain("case when _source_type = 'inquiry' then new.inquiry_ref else null end");
  });

  it("preserves detailed inquiry items and owner-only CRM notification creation", () => {
    expect(migration).toContain("jsonb_array_elements(_items) with ordinality");
    expect(migration).toContain("Requested styles:");
    expect(migration).toContain("insert into public.crm_notifications");
    expect(migration).not.toContain("notification_outbox");
    expect(migration).not.toContain("buyer_confirmation");
  });
});
