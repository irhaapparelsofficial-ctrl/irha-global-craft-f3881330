import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("live-chat visitor presence and coarse location", () => {
  it("captures edge context without persisting a raw visitor IP", () => {
    const worker = read("public/_worker.js");
    const migration = read("supabase/migrations/20260717124500_live_chat_visitor_presence_geo.sql");

    expect(worker).toContain('pathname === "/api/visitor-context"');
    expect(worker).toContain("request.cf");
    expect(worker).toContain('"Cache-Control": "no-store"');
    expect(migration).toContain("visitor_country_code");
    expect(migration).toContain("visitor_city");
    expect(migration).toContain("presence_alerted_at");
    expect(migration).not.toContain("visitor_ip");
  });

  it("creates one presence alert when the public chat is opened", () => {
    const publicChat = read("src/components/HumanLiveChatPro.tsx");
    const gateway = read("supabase/functions/live-chat/index.ts");

    expect(publicChat).toContain('action: "presence"');
    expect(publicChat).toContain("/api/visitor-context");
    expect(gateway).toContain('if (action === "presence")');
    expect(gateway).toContain("Visitor opened Live Chat");
    expect(gateway).toContain("presence_alerted_at");
    expect(gateway).toContain("live_chat:");
  });

  it("shows visitor location in the admin console and announces arrival distinctly", () => {
    const adminChat = read("src/pages/AdminLiveChatPro.tsx");
    const ownerAlerts = read("src/components/admin/AdminLiveChatNotification.tsx");

    expect(adminChat).toContain("visitor_country_code");
    expect(adminChat).toContain("visitor_country");
    expect(adminChat).toContain("visitor_city");
    expect(adminChat).toContain("locationLabel");
    expect(ownerAlerts).toContain('event === "presence"');
    expect(ownerAlerts).toContain("Live Chat visitor arrived");
  });
});
