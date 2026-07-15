import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  "supabase/migrations/20260716031000_revoke_direct_runtime_incident_rpc.sql",
  "utf8",
);
const client = readFileSync("src/lib/appRuntimeIncident.ts", "utf8");

describe("runtime incident direct RPC cutover", () => {
  it("keeps public browsers on the Edge gateway", () => {
    expect(client).toContain("/functions/v1/report-app-incident");
    expect(client).not.toContain("/rest/v1/rpc/record_public_app_incident");
  });

  it("removes direct anon and authenticated execution after cutover", () => {
    expect(migration).toContain("FROM anon, authenticated");
    expect(migration).toContain("TO service_role");
    expect(migration).not.toMatch(/TO\s+anon/i);
    expect(migration).not.toMatch(/TO\s+authenticated/i);
  });
});
