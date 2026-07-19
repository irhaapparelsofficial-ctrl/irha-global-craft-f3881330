import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("human live chat admin alerts", () => {
  it("mounts unified public support while preserving the real human channel", () => {
    const layout = read("src/components/layout/Layout.tsx");
    const guide = read("src/components/LiveChat.tsx");
    expect(layout).toContain("<LiveChat />");
    expect(layout).toContain("<HumanLiveChat />");
    expect(guide).toContain('const OPEN_HUMAN_EVENT = "irha:open-human-chat"');
    expect(guide).toContain("Human Team");
  });

  it("keeps the protected live-chat launcher while retiring the legacy CRM-era owner inbox overlay", () => {
    const desktopLauncher = read("src/components/admin/AdminLiveChatLauncher.tsx");
    const adminRuntime = read("src/components/admin/AdminRuntime.tsx");
    const main = read("src/main.tsx");
    const mobileFocus = read("src/admin-mobile-focus.css");

    expect(adminRuntime).toContain("<AdminLiveChatLauncher />");
    expect(adminRuntime).not.toContain("<AdminLiveChatNotification />");
    expect(adminRuntime).toContain("<AdminPushNotificationSetup />");
    expect(adminRuntime).toContain('import "@/admin-mobile-focus.css"');
    expect(main).not.toContain("AdminLiveChatLauncher");
    expect(main).not.toContain("AdminLiveChatNotification");
    expect(main).not.toContain("admin-mobile-focus.css");
    expect(desktopLauncher).toContain('href="/admin/live-chat"');
    expect(desktopLauncher).toContain('.eq("role", "admin")');
    expect(desktopLauncher).toContain('aria-label="Open human live chat console"');
    expect(mobileFocus).toContain('[aria-label="Open human live chat console"]');
  });

  it("retains the historical internal notification trigger infrastructure for rollback and push compatibility", () => {
    const migration = read("supabase/migrations/20260714185530_live_chat_admin_notifications.sql");
    expect(migration).toContain("notify_human_live_chat_admin");
    expect(migration).toContain("chat_messages_human_admin_notification");
    expect(migration).toContain("Live chat waiting");
    expect(migration).toContain("'live_chat:' || new.session_id");
    expect(migration).toContain("new.role = 'admin'");
    expect(migration).toContain("status = 'read'");
  });

  it("keeps the notifier trigger-only and does not send external messages", () => {
    const migration = read("supabase/migrations/20260714185530_live_chat_admin_notifications.sql");
    expect(migration).toContain("revoke all on function public.notify_human_live_chat_admin() from public, anon, authenticated");
    expect(migration).not.toContain("process-email-queue");
    expect(migration).not.toContain("whatsapp_messages");
  });
});
