import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("hybrid human live chat", () => {
  it("mounts a separate human-support widget without replacing the AI guide", () => {
    const layout = read("src/components/layout/Layout.tsx");
    expect(layout).toContain('import LiveChat from "@/components/LiveChat"');
    expect(layout).toContain('import HumanLiveChat from "@/components/HumanLiveChat"');
    expect(layout).toContain("<LiveChat />");
    expect(layout).toContain("<HumanLiveChat />");
  });

  it("uses a guarded edge gateway and visitor session token", () => {
    const widget = read("src/components/HumanLiveChat.tsx");
    const gateway = read("supabase/functions/live-chat/index.ts");
    expect(widget).toContain("/functions/v1/live-chat");
    expect(widget).toContain("visitorToken");
    expect(gateway).toContain("hashToken");
    expect(gateway).toContain("session_forbidden");
    expect(gateway).toContain("isAllowedOrigin");
    expect(gateway).toContain('channel: "human"');
  });

  it("keeps public tables private and exposes admin-guarded reply RPCs", () => {
    const migration = read("supabase/migrations/20260714233500_hybrid_human_live_chat.sql");
    expect(migration).toContain("alter table public.live_chat_sessions enable row level security");
    expect(migration).toContain("revoke all on public.live_chat_sessions from anon");
    expect(migration).toContain("live_chat_admin_reply");
    expect(migration).toContain("live_chat_set_status");
    expect(migration).toContain("public.has_role(auth.uid(), 'admin'::public.app_role)");
  });

  it("exposes the live support inbox only through the verified admin launcher", () => {
    const launcher = read("src/components/admin/AdminBuyerActionsLauncher.tsx");
    const inbox = read("src/components/admin/LiveChatAdminPanel.tsx");
    expect(launcher).toContain('import LiveChatAdminPanel from "@/components/admin/LiveChatAdminPanel"');
    expect(launcher).toContain("<LiveChatAdminPanel />");
    expect(launcher).toContain('.eq("role", "admin")');
    expect(inbox).toContain('db.rpc("live_chat_admin_reply"');
    expect(inbox).toContain("does not send an email or WhatsApp message");
  });
});
