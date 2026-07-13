import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("immutable owner Supabase runtime", () => {
  it("pins the public frontend client to the owner project", () => {
    const runtime = read("src/integrations/supabase/ownerRuntime.ts");

    expect(runtime).toContain('OWNER_SUPABASE_PROJECT_ID = "pvzjiozismyxqrzmtfbi"');
    expect(runtime).toContain(
      'OWNER_SUPABASE_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co"',
    );
    expect(runtime).toContain("OWNER_SUPABASE_PUBLISHABLE_KEY");
    expect(runtime).not.toContain("mlefxgyaqoisvdmoiapq");
    expect(runtime).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
  });

  it("does not read Lovable-managed Supabase env values at runtime", () => {
    const client = read("src/integrations/supabase/client.ts");

    expect(client).not.toContain("import.meta.env");
    expect(client).toContain("OWNER_SUPABASE_URL");
    expect(client).toContain("OWNER_SUPABASE_PUBLISHABLE_KEY");
  });
});
