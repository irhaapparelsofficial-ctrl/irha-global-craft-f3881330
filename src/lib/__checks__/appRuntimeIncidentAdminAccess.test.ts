import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("runtime incident admin access", () => {
  it("pairs the admin-only RLS policy with the required authenticated SELECT grant", () => {
    const baseMigration = readFileSync(
      "supabase/migrations/20260716020000_add_public_app_runtime_incident_reporting.sql",
      "utf8",
    );
    const grantMigration = readFileSync(
      "supabase/migrations/20260716021000_grant_admin_read_app_runtime_incidents.sql",
      "utf8",
    );

    expect(baseMigration).toContain('CREATE POLICY "Admins read app runtime incidents"');
    expect(baseMigration).toContain("TO authenticated");
    expect(baseMigration).toContain("public.has_role");
    expect(grantMigration).toContain(
      "GRANT SELECT ON TABLE public.app_runtime_incidents TO authenticated",
    );
    expect(grantMigration).not.toContain("TO anon");
  });
});
