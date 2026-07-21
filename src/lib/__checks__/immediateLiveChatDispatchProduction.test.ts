import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const migration = read("supabase/migrations/20260717162000_immediate_live_chat_presence_dispatch.sql");
const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
  migrations: Array<{ version: string; git_blob_sha: string }>;
};

describe("immediate live chat presence dispatch", () => {
  it("queues the outbox first and then wakes the verified dispatcher", () => {
    expect(migration).toContain("zz_crm_notifications_live_chat_dispatch");
    expect(migration).toContain("after insert on public.crm_notifications");
    expect(migration).toContain("new.metadata->>'channel' = 'human_live_chat'");
    expect(migration).toContain("new.metadata->>'event' = 'presence'");
    expect(migration).toContain("perform public.notification_dispatch_tick()");
  });

  it("keeps the trigger service-owned and repository-led", () => {
    expect(migration).toContain("security definer");
    expect(migration).toContain("revoke all on function public.notification_dispatch_live_chat_presence_now() from public, anon, authenticated");
    expect(manifest.migrations).toContainEqual(expect.objectContaining({
      version: "20260717162000",
      git_blob_sha: "5042e41b22a612ab9355495e463de0cf8c4950ed",
    }));
  });
});
