import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const runtime = read("src/components/admin/AdminRuntime.tsx");
const setup = read("src/components/admin/AdminPushNotificationSetup.tsx");
const worker = read("public/irha-owner-sw.js");
const manifest = read("public/manifest.webmanifest");
const migration = read("supabase/migrations/20260717023000_owner_notification_delivery.sql");
const runtimeMigration = read("supabase/migrations/20260717023200_notification_dispatch_runtime.sql");
const ownerOnlyMigration = read("supabase/migrations/20260717023300_owner_notifications_only.sql");
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

  it("queues owner alerts for quotes, catalogue requests and human live chat", () => {
    expect(migration).toContain("crm_notifications_delivery_outbox");
    expect(migration).toContain("notification_outbox");
    expect(runtimeMigration).toContain("irha-notification-dispatcher");
    expect(runtimeMigration).toContain("* * * * *");
    expect(ownerOnlyMigration).toContain("drop trigger if exists inquiries_buyer_confirmation_outbox");
  });

  it("keeps provider credentials out of source and consumes runtime secrets", () => {
    expect(dispatcher).toContain('Deno.env.get("VAPID_PRIVATE_KEY")');
    expect(dispatcher).toContain('Deno.env.get("RESEND_API_KEY")');
    expect(dispatcher).not.toMatch(/re_[A-Za-z0-9]{20,}/);
    expect(dispatcher).not.toContain("dIODDc45u_");
    expect(migration).not.toContain("3JwDlewimBfW");
  });

  it("uses admin authorization and an idempotent rate-limited processor", () => {
    expect(config).toContain("[functions.notification-dispatcher]");
    expect(config).toContain("verify_jwt = false");
    expect(dispatcher).toContain("requireAdmin");
    expect(dispatcher).toContain("notification_begin_dispatch");
    expect(runtimeMigration).toContain("for update");
    expect(runtimeMigration).toContain("service role required");
  });
});
