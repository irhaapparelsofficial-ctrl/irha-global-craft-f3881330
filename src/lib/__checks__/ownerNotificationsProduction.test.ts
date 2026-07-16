import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const runtime = read("src/components/admin/AdminRuntime.tsx");
const setup = read("src/components/admin/AdminPushNotificationSetup.tsx");
const worker = read("public/irha-owner-sw.js");
const manifest = read("public/manifest.webmanifest");
const migration = read("supabase/migrations/20260717023000_owner_notification_delivery.sql");
const dispatcher = read("supabase/functions/notification-dispatcher/index.ts");
const config = read("supabase/config.toml");

describe("production owner notifications", () => {
  it("mounts an admin-only background push subscription workflow", () => {
    expect(runtime).toContain("<AdminPushNotificationSetup />");
    expect(setup).toContain('navigator.serviceWorker.register("/irha-owner-sw.js"');
    expect(setup).toContain("pushManager.subscribe");
    expect(setup).toContain('action: "subscribe"');
    expect(setup).toContain("Add to Home Screen");
  });

  it("ships an installable admin PWA and visible push worker", () => {
    expect(manifest).toContain('"name": "Irha Apparels Admin"');
    expect(manifest).toContain('"start_url": "/admin"');
    expect(manifest).toContain('"display": "standalone"');
    expect(worker).toContain('self.addEventListener("push"');
    expect(worker).toContain("showNotification");
    expect(worker).toContain('self.addEventListener("notificationclick"');
  });

  it("queues quote, catalogue and human live-chat notifications", () => {
    expect(migration).toContain("crm_notifications_delivery_outbox");
    expect(migration).toContain("inquiries_buyer_confirmation_outbox");
    expect(migration).toContain("catalogue_buyer_confirmation_outbox");
    expect(migration).toContain("irha-notification-dispatcher");
    expect(migration).toContain("* * * * *");
  });

  it("keeps secrets out of source and reads them only through Vault", () => {
    expect(dispatcher).toContain('secret("irha_vapid_private_key")');
    expect(dispatcher).toContain('secret("irha_resend_api_key")');
    expect(dispatcher).not.toMatch(/re_[A-Za-z0-9]{20,}/);
    expect(migration).not.toContain("dIODDc45u_");
    expect(migration).not.toContain("3JwDlewimBfW");
  });

  it("uses explicit custom authorization for the public dispatcher gateway", () => {
    expect(config).toContain("[functions.notification-dispatcher]");
    expect(config).toContain("verify_jwt = false");
    expect(dispatcher).toContain("x-irha-notification-token");
    expect(dispatcher).toContain("requireAdmin");
    expect(dispatcher).toContain("constantTimeEqual");
  });
});
