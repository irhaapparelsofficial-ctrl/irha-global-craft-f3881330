import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("human live chat admin alerts", () => {
  it("keeps AI Guide and human chat mounted independently", () => {
    const layout = read("src/components/layout/Layout.tsx");
    expect(layout).toContain("<LiveChat />");
    expect(layout).toContain("<HumanLiveChat />");
  });

  it("preserves the existing protected admin live chat console launcher", () => {
    const launcher = read("src/components/admin/AdminLiveChatLauncher.tsx");
    const main = read("src/main.tsx");
    const mobileFocus = read("src/admin-mobile-focus.css");
    expect(main).toContain("<AdminLiveChatLauncher />");
    expect(launcher).toContain('href="/admin/live-chat"');
    expect(launcher).toContain('.eq("role", "admin")');
    expect(launcher).toContain('aria-label="Open human live chat console"');
    expect(mobileFocus).toContain('[aria-label="Open human live chat console"]');
  });

  it("creates an internal alert for a human buyer message and clears it on reply", () => {
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
