import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  resolve(process.cwd(), "supabase/migrations/20260717222000_media_duplicate_lineage_foundation.sql"),
  "utf8",
);

describe("media lineage migration authorization", () => {
  it("uses transaction-local service role context for the existing media write guard", () => {
    expect(migration).toContain("set local request.jwt.claim.role = 'service_role';");
    expect(migration).toContain("begin;");
    expect(migration).toContain("commit;");
  });

  it("does not disable or remove the production media write guard", () => {
    expect(migration).not.toMatch(/disable\s+trigger\s+media_assets_before_write_trigger/i);
    expect(migration).not.toMatch(/drop\s+trigger\s+media_assets_before_write_trigger/i);
    expect(migration).not.toMatch(/alter\s+function\s+public\.media_assets_before_write/i);
  });
});
