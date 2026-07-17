import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

const inquiryMigration = read("supabase/migrations/20260717140000_b2b_inquiry_cart_relational.sql");
const ownerOnlyMigration = read("supabase/migrations/20260717142000_enforce_owner_only_rfq_notifications.sql");
const manifest = JSON.parse(read("supabase/repository-migrations.json")) as {
  migrations: Array<{ version: string; git_blob_sha: string }>;
};

describe("RFQ notification approval boundary", () => {
  it("finishes the migration sequence with buyer auto-confirmation disabled", () => {
    expect(inquiryMigration).toContain("inquiries_buyer_confirmation_outbox");
    expect(ownerOnlyMigration).toContain("drop trigger if exists inquiries_buyer_confirmation_outbox");
    expect(ownerOnlyMigration).toContain("drop function if exists public.notification_enqueue_buyer_confirmation()");
    expect(ownerOnlyMigration).toContain("message-specific owner approval");
  });

  it("does not weaken the internal owner notification pipeline", () => {
    expect(ownerOnlyMigration).not.toContain("crm_notifications_delivery_outbox");
    expect(ownerOnlyMigration).not.toContain("notification_enqueue_from_crm");
  });

  it("registers the exact owner-only guard migration blob", () => {
    const entry = manifest.migrations.find((item) => item.version === "20260717142000");
    expect(entry?.git_blob_sha).toBe("ff626d6e70b008fc1277b7ab9faf77bc098e4d0e");
  });
});
