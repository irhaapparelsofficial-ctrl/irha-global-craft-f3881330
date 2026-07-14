import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("visible human live-chat notifications", () => {
  it("mounts the admin notification layer globally", () => {
    const main = read("src/main.tsx");
    expect(main).toContain("AdminLiveChatNotification");
    expect(main).toContain("<AdminLiveChatNotification />");
  });

  it("uses an admin-only realtime stream with a polling fallback", () => {
    const component = read("src/components/admin/AdminLiveChatNotification.tsx");
    expect(component).toContain('table: "crm_notifications"');
    expect(component).toContain('channel: "human_live_chat"');
    expect(component).toContain("setInterval");
    expect(component).toContain('.eq("role", "admin")');
    expect(component).toContain("/admin/live-chat?session=");
  });

  it("keeps notification data protected by admin RLS and realtime publication", () => {
    const migration = read("supabase/migrations/20260714191500_enable_live_chat_notification_realtime.sql");
    expect(migration).toContain("alter publication supabase_realtime add table public.crm_notifications");
    expect(migration).toContain("admin RLS");
  });

  it("creates an unread alert on buyer message and clears it on admin reply", () => {
    const migration = read("supabase/migrations/20260714185530_live_chat_admin_notifications.sql");
    expect(migration).toContain("new.role = 'user'");
    expect(migration).toContain("'Live chat waiting'");
    expect(migration).toContain("new.role = 'admin'");
    expect(migration).toContain("status = 'read'");
  });
});
