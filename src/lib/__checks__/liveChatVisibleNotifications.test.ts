import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("visible owner notifications", () => {
  it("mounts the notification layer only in the protected admin runtime", () => {
    const app = read("src/App.tsx");
    const runtime = read("src/components/admin/AdminRuntime.tsx");
    const main = read("src/main.tsx");

    expect(app).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(runtime).toContain("AdminLiveChatNotification");
    expect(runtime).toContain("<AdminLiveChatNotification />");
    expect(main).not.toContain("AdminLiveChatNotification");
  });

  it("combines live-chat and inquiry alerts from the protected CRM stream", () => {
    const component = read("src/components/admin/AdminLiveChatNotification.tsx");
    expect(component).toContain('table: "crm_notifications"');
    expect(component).toContain('metadata?.channel === "human_live_chat"');
    expect(component).toContain('notification_type === "new_lead"');
    expect(component).toContain('source_type === "inquiry"');
    expect(component).toContain("setInterval");
    expect(component).toContain('.eq("role", "admin")');
    expect(component).toContain("/admin/live-chat?session=");
    expect(component).toContain('OWNER_VIEW_QUERY = "ownerView"');
    expect(component).toContain('OWNER_VIEW_INQUIRIES = "inquiries"');
  });

  it("opens inquiry alerts into the owner request workspace on touch and device click", () => {
    const component = read("src/components/admin/AdminLiveChatNotification.tsx");
    expect(component).toContain("openInquiryWorkspaceFromCurrentAdminView");
    expect(component).toContain('findAdminButtonByPrefixes(["review new requests", "new requests"])');
    expect(component).toContain('findAdminButtonByPrefixes(["inbox"])');
    expect(component).toContain("event.preventDefault()");
    expect(component).toContain("window.location.assign(alertHref(latestAlert))");
    expect(component).toContain("touch-manipulation");
    expect(component).toContain("clearRequestedOwnerView");
  });

  it("offers explicit device permission, visible toast, sound and click-through alerts", () => {
    const component = read("src/components/admin/AdminLiveChatNotification.tsx");
    expect(component).toContain("Notification.requestPermission()");
    expect(component).toContain("new Notification");
    expect(component).toContain("playChime");
    expect(component).toContain("window.location.assign(alertHref(alert))");
    expect(component).toContain("Enable device alerts");
    expect(component).toContain("while your admin session is active");
  });

  it("keeps notification data protected by admin RLS and realtime publication", () => {
    const migration = read("supabase/migrations/20260714191500_enable_live_chat_notification_realtime.sql");
    expect(migration).toContain("alter publication supabase_realtime add table public.crm_notifications");
    expect(migration).toContain("admin RLS");
  });

  it("relies on database triggers for unread inquiry and live-chat records", () => {
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
