import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const fanout = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/CampaignPrivateFileFanout.tsx"), "utf8");
const panel = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/CampaignPrivateFileFanoutPanel.tsx"), "utf8");
const mailing = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/MailingPanel.tsx"), "utf8");
const migration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260714234500_prepare_dach_nl_owner_review_drafts.sql"), "utf8");

describe("campaign private file fan-out", () => {
  it("mounts the preparation panel before owner review", () => {
    expect(mailing).toContain("CampaignPrivateFileFanoutPanel");
    expect(mailing.indexOf("CampaignPrivateFileFanoutPanel onPrepared")).toBeLessThan(mailing.indexOf("OutreachApprovalPanel key"));
    expect(panel).toContain(".gt(\"draft_count\", 0)");
    expect(panel).toContain("select(\"id,lead_id,recipient_company,channel,status\")");
  });

  it("creates isolated prospect-owned copies with duplicate detection", () => {
    expect(fanout).toContain("for (const target of targets)");
    expect(fanout).toContain("source_type: \"prospect\"");
    expect(fanout).toContain("prospect/${target.lead_id}/campaign-${campaignId}");
    expect(fanout).toContain("[campaign:${campaignId}]");
    expect(fanout).toContain("existingByLead.has(target.lead_id)");
    expect(fanout).toContain("upsert: false");
  });

  it("rolls back newly created metadata and storage on partial failure", () => {
    expect(fanout).toContain("Campaign file preparation rolled back safely");
    expect(fanout).toContain("for (const item of [...created].reverse())");
    expect(fanout).toContain("db.from(\"crm_files\").delete().eq(\"id\", item.id)");
    expect(fanout).toContain("if (!metadataDelete.error) await supabase.storage.from(FILE_BUCKET).remove");
  });

  it("uses stricter Meta media limits when a WhatsApp draft exists", () => {
    expect(fanout).toContain("MAX_WHATSAPP_FILE_BYTES = 5 * 1024 * 1024");
    expect(fanout).toContain("WHATSAPP_FILE_TYPES");
    expect(fanout).toContain("hasWhatsAppTarget");
    expect(fanout).toContain("PDF/JPG/PNG/WEBP · max 5 MB");
  });

  it("never invokes an email or WhatsApp provider", () => {
    expect(fanout).not.toContain("approve_and_send");
    expect(fanout).not.toContain("messages/send");
    expect(fanout).not.toContain("graph.facebook.com");
    expect(panel).toContain("never calls email or WhatsApp providers");
  });
});

describe("six DACH/NL owner-review drafts", () => {
  it("targets only the six reviewed business addresses", () => {
    for (const email of [
      "info@schaber.com",
      "info@trachtenkaiser.at",
      "onlineshop@trachtenhof.de",
      "info@lechtaler.de",
      "info@carnavalsland.nl",
      "info@feestkledingbreda.nl",
    ]) expect(migration).toContain(`'${email}'`);
    expect(migration).toContain("public.is_irha_business_email(m.recipient_email)");
  });

  it("keeps every message in draft and records truthful review metadata", () => {
    expect(migration).toContain("and m.status = 'draft'");
    expect(migration).toContain("'status_preserved', 'draft'");
    expect(migration).toContain("'owner_approval_required', true");
    expect(migration).toContain("'external_message_sent', false");
    expect(migration).not.toMatch(/set[\s\S]{0,120}status\s*=\s*'(approved|sending|sent)'/i);
    expect(migration).not.toContain("sent_at =");
    expect(migration).not.toContain("approved_at =");
  });

  it("retains approved Irha trust positioning and removes unsupported assortment language", () => {
    expect(migration).toContain("Unsere Website wurde neu aufgebaut");
    expect(migration).toContain("Live-Videoführung durch die Produktion");
    expect(migration).toContain("Onze website is nieuw opgebouwd");
    expect(migration).toContain("live-videorondleiding door de productie");
    expect(migration).not.toContain("Event Decoration");
    expect(migration).not.toContain("Oktoberfest Group Packages");
    expect(migration).not.toContain("Kids Trachten");
    expect(migration).not.toContain("Hospitality Uniforms");
  });
});
