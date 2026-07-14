import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("final release source identity", () => {
  it("keeps the secure human live chat mounted and routed", () => {
    const app = read("src/App.tsx");
    const layout = read("src/components/layout/Layout.tsx");
    expect(app).toContain('path="/admin/live-chat"');
    expect(layout).toContain("<HumanLiveChat />");
  });

  it("keeps the live-chat production migrations in source control", () => {
    expect(read("supabase/migrations/20260714213000_human_live_chat.sql")).toContain("chat_sessions");
    expect(read("supabase/migrations/20260714213100_human_live_chat_admin_role.sql")).toContain("'admin'");
  });
});
