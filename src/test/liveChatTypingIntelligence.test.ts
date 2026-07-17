import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const buyer = read("src/components/HumanLiveChatPro.tsx");
const admin = read("src/pages/AdminLiveChatPro.tsx");
const typingGateway = read("supabase/functions/live-chat-typing/index.ts");
const migration = read("supabase/migrations/20260718103000_live_chat_typing_intelligence.sql");
const privacy = read("src/pages/PrivacyPolicy.tsx");
const config = read("supabase/config.toml");

describe("professional live-chat typing intelligence", () => {
  it("shares only the live message composer preview with clear buyer disclosure", () => {
    expect(buyer).toContain("publishTyping(event.target.value)");
    expect(buyer).toContain("Live typing preview is shared with Irha support only while you type in this message box");
    expect(buyer).toContain("clearTyping()");
    expect(buyer).toContain('action: isTyping ? "visitor_typing" : "visitor_clear"');
    expect(buyer).not.toContain("publishTyping(visitorName");
    expect(buyer).not.toContain("publishTyping(visitorEmail");
    expect(buyer).not.toContain("publishTyping(visitorCompany");
  });

  it("authenticates every typing request with the existing visitor session token", () => {
    expect(config).toContain("[functions.live-chat-typing]");
    expect(config).toMatch(/\[functions\.live-chat-typing\][\s\S]*?verify_jwt = false/);
    expect(typingGateway).toContain("authenticateSession");
    expect(typingGateway).toContain("visitor_token_hash");
    expect(typingGateway).toContain("constantTimeEqual");
    expect(typingGateway).toContain("invalid_session_token");
    expect(typingGateway).toContain("origin_not_allowed");
    expect(typingGateway).toContain("MAX_DRAFT_CHARS = 1_000");
    expect(typingGateway).not.toMatch(/(visitor_ip|raw_ip|ip_address)\s*:/);
  });

  it("keeps typing state inside the existing admin-RLS protected chat session", () => {
    expect(migration).toContain("visitor_typing_preview");
    expect(migration).toContain("visitor_typing_at");
    expect(migration).toContain("admin_typing_at");
    expect(migration).toContain("char_length(coalesce(visitor_typing_preview, '')) <= 1000");
    expect(migration).toContain("alter publication supabase_realtime add table public.chat_sessions");
    expect(migration).not.toContain("grant select");
    expect(migration).not.toContain("to anon");
  });

  it("shows exact unsent buyer preview and two-way WhatsApp-style typing status", () => {
    expect(admin).toContain("Customer is typing · live preview");
    expect(admin).toContain("Not sent yet · clears automatically");
    expect(admin).toContain("Typing now:");
    expect(admin).toContain("signalAdminTyping");
    expect(admin).toContain("admin_typing_at");
    expect(buyer).toContain("Irha team is typing…");
    expect(buyer).toContain("ADMIN_TYPING_POLL_MS = 1_200");
  });

  it("expires and clears stale typing data instead of treating it as a sent message", () => {
    expect(admin).toContain("TYPING_FRESH_MS = 8_000");
    expect(admin).toContain("isVisitorTyping");
    expect(buyer).toContain("TYPING_IDLE_MS = 2_500");
    expect(typingGateway).toContain("TYPING_FRESH_MS = 8_000");
    expect(typingGateway).toContain("visitor_typing_preview: isTyping ? draftPreview : null");
    expect(typingGateway).toContain("visitor_typing_at: isTyping ? now : null");
  });

  it("publishes a direct privacy explanation", () => {
    expect(privacy).toContain("Live chat and typing preview");
    expect(privacy).toContain("before you press Send");
    expect(privacy).toContain("does not read other forms, password fields, browser activity or text entered elsewhere");
  });
});
