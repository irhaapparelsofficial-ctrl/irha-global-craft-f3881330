import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("Brevo alias email bridge", () => {
  it("keeps the API credential server-side and restricts From identities to approved Irha aliases", () => {
    const helper = read("supabase/functions/notification-dispatcher/brevo-email.ts");
    expect(helper).toContain('BREVO_SECRET_NAME = "brevo_api_key"');
    expect(helper).toContain('service.rpc("notification_get_secret"');
    expect(helper).toContain('BREVO_API_URL = "https://api.brevo.com/v3/smtp/email"');
    expect(helper).toContain('"api-key": apiKey');
    expect(helper).toContain('"info@irhaapparels.com": "Irha Apparels"');
    expect(helper).toContain('"sales@irhaapparels.com": "Irha Apparels Sales"');
    expect(helper).toContain('"export@irhaapparels.com": "Irha Apparels Export"');
    expect(helper).toContain('"contact@irhaapparels.com": "Irha Apparels"');
    expect(helper).not.toContain("nodemailer");
  });

  it("uses the existing durable notification outbox instead of creating a second queue", () => {
    const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
    const helper = read("supabase/functions/notification-dispatcher/brevo-email.ts");
    expect(dispatcher).toContain("CHATGPT_OUTBOUND_TEMPLATE");
    expect(dispatcher).toContain("await sendBrevoEmail(service, row, emailPayload, rendered, brevoKey)");
    expect(dispatcher).toContain("notification_claim_outbox");
    expect(dispatcher).toContain("notification_begin_dispatch");
    expect(dispatcher).toContain("authorizeSchedulerRequest");
    expect(dispatcher).toContain("notification_consume_dispatch_token");
    expect(helper).toContain("BREVO_CHATGPT_DAILY_CAP = 200");
    expect(helper).toContain('.from("notification_delivery_attempts")');
    expect(helper).toContain('.contains("metadata", { source: CHATGPT_OUTBOUND_TEMPLATE })');
  });

  it("adds idempotency evidence and preserves the existing Resend fallback", () => {
    const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
    const helper = read("supabase/functions/notification-dispatcher/brevo-email.ts");
    expect(helper).toContain('"Idempotency-Key": row.id');
    expect(helper).toContain('"X-Irha-Outbox-ID": row.id');
    expect(helper).toContain('replyTo: { email: replyToForPayload(payload, sender.address) }');
    expect(helper).toContain('BREVO_PROVIDER = "brevo-api"');
    expect(dispatcher).toContain('"idempotency-key": row.id');
    expect(dispatcher).toContain('fetch("https://api.resend.com/emails"');
    expect(dispatcher).toContain("email_provider: emailProvider");
  });
});
