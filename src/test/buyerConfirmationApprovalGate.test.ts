import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260717232300_keep_buyer_confirmation_approval_gated.sql"),
  "utf8",
);

describe("buyer confirmation approval gate", () => {
  it("keeps the automatic inquiry trigger absent", () => {
    expect(migration).toContain(
      "drop trigger if exists inquiries_buyer_confirmation_outbox on public.inquiries;",
    );
    expect(migration).not.toMatch(/create\s+trigger\s+inquiries_buyer_confirmation_outbox/i);
  });

  it("documents that the queue function remains dormant", () => {
    expect(migration).toContain("Dormant buyer-confirmation queue function");
    expect(migration).toContain("external buyer messages remain approval-gated");
  });
});
