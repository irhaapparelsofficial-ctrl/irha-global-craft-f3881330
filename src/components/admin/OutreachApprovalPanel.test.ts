import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";

const ui = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/OutreachApprovalPanel.tsx"), "utf8");
const activationUi = fs.readFileSync(path.resolve(process.cwd(), "src/components/admin/ChannelCandidateActivationPanel.tsx"), "utf8");
const workflow = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/outreach-workflow-v2/index.ts"), "utf8");
const fileRegistry = fs.readFileSync(path.resolve(process.cwd(), "supabase/functions/lead-file-registry/index.ts"), "utf8");
const migration = fs.readFileSync(path.resolve(process.cwd(), "supabase/migrations/20260714120000_outreach_approval_dispatch.sql"), "utf8");

 describe("owner approved multi-channel outreach", () => {
  it("keeps generation draft-only and exposes a one-message approval action", () => {
    expect(workflow).toContain('if (action === "generate")');
    expect(workflow).toContain('if (action === "approve_and_send")');
    expect(workflow).toContain('const messageId = clean(body.message_id');
    expect(workflow).not.toContain("message_ids[] required");
    expect(workflow).toContain("sent: false");
    expect(ui).toContain("Generate drafts only");
    expect(ui).toContain("Approve & Send");
  });

  it("supports email or WhatsApp while refusing fake WhatsApp completion", () => {
    expect(workflow).toContain('type Channel = "email" | "whatsapp"');
    expect(workflow).toContain("WhatsApp customer-service window is closed");
    expect(workflow).toContain('status: "manual_required"');
    expect(workflow).toContain("graphMessageId");
    expect(ui).toContain("never falsely marked sent");
  });

  it("binds only real private buyer files and keeps storage operations server-side", () => {
    expect(workflow).toContain('from("crm_files")');
    expect(workflow).toContain('from("outreach_message_attachments")');
    expect(workflow).toContain("MAX_EMAIL_ATTACHMENT_BYTES");
    expect(workflow).toContain("MAX_WHATSAPP_ATTACHMENT_BYTES");
    expect(ui).toContain("Real private buyer files");
    expect(ui).not.toContain("storage.from(");
    expect(fileRegistry).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(fileRegistry).toContain("createSignedUploadUrl");
  });

  it("requires authenticated admin approval and owner-confirmed candidate activation", () => {
    expect(workflow).toContain("auth.auth.getUser()");
    expect(workflow).toContain('.eq("role", "admin")');
    expect(activationUi).toContain("owner_confirmed: true");
    expect(activationUi).toContain("This does not send email or WhatsApp");
  });

  it("enforces admin-only attachment records in the database", () => {
    expect(migration).toContain("create table if not exists public.outreach_message_attachments");
    expect(migration).toContain("alter table public.outreach_message_attachments enable row level security");
    expect(migration).toContain("outreach_message_attachments_admin_all");
    expect(migration).toContain("manual_required");
  });
});
