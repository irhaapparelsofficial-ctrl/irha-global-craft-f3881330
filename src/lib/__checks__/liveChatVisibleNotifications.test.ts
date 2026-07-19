import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("website-operations owner notifications", () => {
  it("does not mount the legacy CRM-era floating owner inbox in the protected admin runtime", () => {
    const app = read("src/App.tsx");
    const runtime = read("src/components/admin/AdminRuntime.tsx");
    const main = read("src/main.tsx");

    expect(app).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(runtime).not.toContain("<AdminLiveChatNotification />");
    expect(runtime).toContain("<AdminLiveChatLauncher />");
    expect(runtime).toContain("<AdminPushNotificationSetup />");
    expect(main).not.toContain("AdminLiveChatNotification");
  });

  it("keeps the retired notification component in the repository for rollback/history only", () => {
    const component = read("src/components/admin/AdminLiveChatNotification.tsx");
    expect(component).toContain('table: "crm_notifications"');
    expect(component).toContain('metadata?.channel === "human_live_chat"');
    expect(component).toContain('notification_type === "new_lead"');
    expect(component).toContain('source_type === "inquiry"');
    expect(component).toContain("/admin/live-chat?session=");
  });

  it("keeps optional background push setup available independently of the retired overlay", () => {
    const pushSetup = read("src/components/admin/AdminPushNotificationSetup.tsx");
    expect(pushSetup).toContain('supabase.functions.invoke("notification-dispatcher"');
    expect(pushSetup).toContain("Notification.requestPermission()");
    expect(pushSetup).toContain("pushManager.subscribe");
    expect(pushSetup).toContain("Owner alerts are active");
  });

  it("keeps historical notification data protected by admin RLS and realtime publication", () => {
    const migration = read("supabase/migrations/20260714191500_enable_live_chat_notification_realtime.sql");
    expect(migration).toContain("alter publication supabase_realtime add table public.crm_notifications");
    expect(migration).toContain("admin RLS");
  });

  it("retains database triggers for existing unread inquiry and live-chat notification records", () => {
    const chatMigration = read("supabase/migrations/20260714185530_live_chat_admin_notifications.sql");
    const inquiryMigration = read("supabase/migrations/20260714230000_lead_engine_notifications.sql");
    expect(chatMigration).toContain("new.role = 'user'");
    expect(chatMigration).toContain("'Live chat waiting'");
    expect(chatMigration).toContain("new.role = 'admin'");
    expect(chatMigration).toContain("status = 'read'");
    expect(inquiryMigration).toContain("crm_new_public_lead_notification");
    expect(inquiryMigration).toContain("crm_new_inquiry_notification_trigger");
    expect(inquiryMigration).toContain("'buyer inquiry'");
  });
});
