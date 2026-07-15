import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const gateway = readFileSync("supabase/functions/report-app-incident/index.ts", "utf8");
const client = readFileSync("src/lib/appRuntimeIncident.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");

describe("runtime incident Edge gateway contract", () => {
  it("keeps the browser away from the privileged RPC", () => {
    expect(client).toContain("/functions/v1/report-app-incident");
    expect(client).not.toContain("/rest/v1/rpc/record_public_app_incident");
  });

  it("uses a tightly scoped public gateway with server-side credentials", () => {
    expect(config).toContain("[functions.report-app-incident]");
    expect(config).toMatch(/\[functions\.report-app-incident\]\s+verify_jwt = false/);
    expect(gateway).toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(gateway).toContain("ALLOWED_ORIGINS");
    expect(gateway).toContain("MAX_BODY_BYTES");
    expect(gateway).toContain("Record<string, string>");
    expect(gateway).toContain("/rest/v1/rpc/record_public_app_incident");
    expect(gateway).not.toContain("Access-Control-Allow-Origin: *");
  });
});
