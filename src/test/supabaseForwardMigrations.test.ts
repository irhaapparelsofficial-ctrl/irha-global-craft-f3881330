import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const workflow = readFileSync(
  resolve(process.cwd(), ".github/workflows/supabase-forward-migrations-auto.yml"),
  "utf8",
);
const baselinePath = resolve(
  process.cwd(),
  "supabase/forward_migrations/20260717002000_link_classic_bavarian_shirt_four_view_media.sql",
);
const baseline = readFileSync(baselinePath);

describe("Supabase forward migration control plane", () => {
  it("uses the official Management API instead of the drifted legacy CLI ledger", () => {
    expect(workflow).toContain("/database/query/read-only");
    expect(workflow).toContain("/database/query");
    expect(workflow).not.toContain("supabase db push");
    expect(workflow).not.toContain("migration repair");
    expect(workflow).not.toContain("SUPABASE_DB_PASSWORD");
  });

  it("locks every write to exact current main, checksum parity and one transaction", () => {
    expect(workflow).toContain("pg_advisory_xact_lock");
    expect(workflow).toContain("Checksum mismatch for already-applied migration");
    expect(workflow).toContain("Source superseded before migration");
    expect(workflow).toContain("begin;");
    expect(workflow).toContain("commit;");
    expect(workflow).toContain("curl --fail-with-body");
    expect(workflow).not.toContain("retry.sh 3 8");
  });

  it("keeps the reviewed baseline SQL byte-for-byte checksum locked", () => {
    const checksum = createHash("sha256").update(baseline).digest("hex");
    expect(checksum).toBe("15d5b3caee2816eaa58ea5bf52941d6c0e92d02dc9e80dc60136d9a1c4dd08c6");
  });

  it("keeps registry access private and service-role only", () => {
    expect(workflow).toContain(
      "revoke all on table private.irha_forward_migrations from public, anon, authenticated",
    );
    expect(workflow).toContain(
      "grant select, insert, update on table private.irha_forward_migrations to service_role",
    );
  });
});
