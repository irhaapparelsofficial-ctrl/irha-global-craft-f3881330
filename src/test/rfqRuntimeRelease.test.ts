import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const release = read("supabase/functions/_shared/rfq-runtime-release.ts");
const config = read("supabase/config.toml");
const gateway = read("supabase/functions/public-lead-gateway/index.ts");
const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
const metaWebhook = read("supabase/functions/meta-webhook/index.ts");
const ownerOnly = read("supabase/migrations/20260717142000_enforce_owner_only_rfq_notifications.sql");

 describe("RFQ runtime release", () => {
  it("marks every backend component required by the multi-item inquiry flow", () => {
    expect(release).toContain('RFQ_RUNTIME_RELEASE = "2026-07-17-rfq-v1"');
    for (const component of ["public-lead-gateway", "notification-dispatcher", "meta-webhook"]) {
      expect(release).toContain(`"${component}"`);
    }
  });

  it("keeps public endpoints behind their own application-level controls", () => {
    expect(config).toContain("[functions.public-lead-gateway]\nverify_jwt = false");
    expect(config).toContain("[functions.meta-webhook]\nverify_jwt = false");
    expect(config).toContain("[functions.notification-dispatcher]\nverify_jwt = false");

    expect(gateway).toContain('const TECH_PACK_BUCKET = "tech_packs"');
    expect(gateway).toContain("MAX_TECH_PACK_BYTES = 25 * 1024 * 1024");
    expect(gateway).toContain('service.rpc("submit_b2b_inquiry"');
    expect(metaWebhook).toContain('req.headers.get("x-hub-signature-256")');
    expect(metaWebhook).toContain("constantTimeEqual");
  });

  it("deploys the detailed owner alert runtime without automatic buyer email", () => {
    expect(dispatcher).toContain('Deno.env.get("RESEND_API_KEY")');
    expect(dispatcher).toContain("Owner notification");
    expect(ownerOnly).toContain("drop trigger if exists inquiries_buyer_confirmation_outbox");
    expect(ownerOnly).toContain("message-specific owner approval");
  });
});
