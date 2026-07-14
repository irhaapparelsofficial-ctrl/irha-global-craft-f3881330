import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(
  path.resolve(process.cwd(), "supabase/migrations/20260714233000_guard_business_email_outreach_and_activation.sql"),
  "utf8",
);

describe("business email activation and dispatch guard", () => {
  it("blocks personal, free and disposable email domains", () => {
    for (const domain of [
      "gmail.com",
      "googlemail.com",
      "yahoo.com",
      "outlook.com",
      "hotmail.com",
      "gmx.de",
      "web.de",
      "protonmail.com",
      "mailinator.com",
      "yopmail.com",
    ]) {
      expect(migration).toContain(`'${domain}'`);
    }
    expect(migration).toContain("create or replace function public.is_irha_business_email");
  });

  it("prevents email dispatch before any provider call can begin", () => {
    expect(migration).toContain("before insert or update of status, channel, recipient_email");
    expect(migration).toContain("new.status in ('approved', 'sending')");
    expect(migration).toContain("cannot enter automatic outreach dispatch");
  });

  it("requires a business email or explicit WhatsApp for future candidate imports", () => {
    expect(migration).toContain("new.verification_status = 'imported'");
    expect(migration).toContain("coalesce(new.whatsapp, '')");
    expect(migration).not.toContain("coalesce(new.phone, '')");
    expect(migration).toContain("A general phone number or personal email alone is not sufficient");
  });

  it("quarantines matching drafts without approving or sending them", () => {
    expect(migration).toContain("status = 'manual_required'");
    expect(migration).toContain("approved_by = null");
    expect(migration).toContain("approved_at = null");
    expect(migration).toContain("external_message_sent', false");
    expect(migration).not.toContain("gmail/v1");
    expect(migration).not.toContain("graph.facebook.com");
  });

  it("recalculates outreach campaign counters after quarantine", () => {
    expect(migration).toContain("update public.outreach_campaigns c");
    expect(migration).toContain("failed_count = counts.failed_count");
    expect(migration).toContain("group by campaign_id");
  });
});
