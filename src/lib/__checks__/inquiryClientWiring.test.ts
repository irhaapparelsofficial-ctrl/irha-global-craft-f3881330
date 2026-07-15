import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("inquiry client wiring", () => {
  it("installs the secure inquiry transport on the owner Supabase client", () => {
    const client = readFileSync("src/integrations/supabase/client.ts", "utf8");
    const transport = readFileSync("src/lib/inquiryTransportFetch.ts", "utf8");

    expect(client).toContain('import { createIrhaFetch } from "../../lib/inquiryTransportFetch"');
    expect(client).toContain("fetch: createIrhaFetch(supabaseRuntimeUrl)");
    expect(transport).toContain('url.pathname !== INQUIRY_REST_PATH');
    expect(transport).toContain('row.source !== "inquiry-wizard"');
    expect(transport).toContain('action: "submit_inquiry"');
    expect(transport).toContain('kind: "inquiry"');
  });

  it("records the restricted live compatibility policy as a migration", () => {
    const migration = readFileSync(
      "supabase/migrations/20260716010000_restore_safe_public_inquiry_compatibility.sql",
      "utf8",
    );

    expect(migration).toContain("GRANT INSERT ON TABLE public.inquiries TO anon");
    expect(migration).toContain("REVOKE SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER");
    expect(migration).toContain("source = 'inquiry-wizard'");
    expect(migration).toContain("validate_public_inquiry_insert()");
  });
});
