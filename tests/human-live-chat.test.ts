import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), "utf8");

describe("secure website live support", () => {
  it("mounts one professional support entry with AI guide and human escalation", () => {
    const layout = read("src/components/layout/Layout.tsx");
    const guide = read("src/components/LiveChat.tsx");
    expect(layout).toContain('const loadGuide = () => import("@/components/LiveChat")');
    expect(layout).toContain('const loadHumanLiveChat = () => import("@/components/HumanLiveChat")');
    expect(layout).toContain("<LiveChat />");
    expect(layout).toContain("<HumanLiveChat />");
    expect(guide).toContain("Irha Live Support");
    expect(guide).toContain("AI answers now · Human team one tap away");
    expect(guide).toContain('const OPEN_HUMAN_EVENT = "irha:open-human-chat"');
  });

  it("uses one labelled mobile contact dock for live support and quote", () => {
    const dock = read("src/components/sections/StickyMobileCTA.tsx");
    expect(dock).toContain('new CustomEvent("irha:open-irha-guide")');
    expect(dock).toContain("Live support");
    expect(dock).toContain("AI guide + human team");
    expect(dock).toContain("Request quote");
    expect(dock).not.toContain("settingsWhatsappLink");
  });

  it("makes human support unmistakable and keeps visitor entry simple", () => {
    const widget = read("src/components/HumanLiveChatPro.tsx");
    expect(widget).toContain("Live Chat — Irha Team");
    expect(widget).toContain("Real human support");
    expect(widget).toContain("Your message goes directly to the admin dashboard");
    expect(widget).toContain('const OPEN_EVENT = "irha:open-human-chat"');
    expect(widget).toContain("Company (optional)");
    expect(widget).toContain("if (!started && !visitorName.trim())");
    expect(widget).not.toContain("!visitorCompany.trim()");
    expect(widget).toContain('data-chat-kind="human"');
  });

  it("provides a protected admin route, reply console and route-gated launcher", () => {
    const app = read("src/App.tsx");
    const main = read("src/main.tsx");
    const adminRuntime = read("src/components/admin/AdminRuntime.tsx");
    const admin = read("src/pages/AdminLiveChatPro.tsx");
    const launcher = read("src/components/admin/AdminLiveChatLauncher.tsx");
    expect(app).toContain('const AdminLiveChat = lazy(() => import("./pages/AdminLiveChat"))');
    expect(app).toContain('path="/admin/live-chat"');
    expect(app).toContain('const AdminRuntime = lazy(() => import("@/components/admin/AdminRuntime"))');
    expect(app).toContain('if (!pathname.startsWith("/admin")) return null');
    expect(adminRuntime).toContain("<AdminLiveChatLauncher />");
    expect(main).not.toContain("AdminLiveChatLauncher");
    expect(launcher).toContain('href="/admin/live-chat"');
    expect(launcher).toContain('.eq("role", "admin")');
    expect(admin).toContain("if (!user) return <Navigate");
    expect(admin).toContain("if (!isAdmin)");
    expect(admin).toContain('role: "admin"');
    expect(admin).toContain('channel: "human"');
    expect(admin).toContain('status: "active"');
  });

  it("keeps public table access closed and admin writes behind RLS", () => {
    const migration = read("supabase/migrations/20260714213000_human_live_chat.sql");
    const roleMigration = read("supabase/migrations/20260714213100_human_live_chat_admin_role.sql");
    expect(migration).toContain("alter table public.chat_sessions enable row level security");
    expect(migration).toContain("revoke all on table public.chat_sessions from anon");
    expect(migration).toContain('create policy "Admins reply to human live chat"');
    expect(migration).toContain("public.has_role((select auth.uid()), 'admin'::public.app_role)");
    expect(migration).toContain("and role = 'admin'");
    expect(migration).toContain("and channel = 'human'");
    expect(roleMigration).toContain("check (role in ('user', 'assistant', 'admin'))");
  });

  it("uses custom visitor-token authentication, hashing and origin controls", () => {
    const edge = read("supabase/functions/live-chat/index.ts");
    const typingEdge = read("supabase/functions/live-chat-typing/index.ts");
    const config = read("supabase/config.toml");
    expect(config).toContain("[functions.live-chat]");
    expect(config).toContain("[functions.live-chat-typing]");
    expect(config).toContain("verify_jwt = false");
    expect(edge).toContain("async function sha256");
    expect(edge).toContain("constantTimeEqual");
    expect(edge).toContain("invalid_session_token");
    expect(edge).toContain("origin_not_allowed");
    expect(edge).toContain('channel: "human"');
    expect(edge).toContain("client_message_id: clientMessageId");
    expect(typingEdge).toContain("authenticateSession");
    expect(typingEdge).toContain("MAX_DRAFT_CHARS = 1_000");
  });

  it("polls safely and never auto-generates commercial promises", () => {
    const widget = read("src/components/HumanLiveChatPro.tsx");
    expect(widget).toContain('action: "poll"');
    expect(widget).toContain("2_500");
    expect(widget).toContain("Pricing remains subject to formal requirement review");
    expect(widget).toContain("admin replies appear here");
    expect(widget).not.toContain("guaranteed response");
  });
});
