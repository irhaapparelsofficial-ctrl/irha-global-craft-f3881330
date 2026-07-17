import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const OWNER_PROJECT_ID = "pvzjiozismyxqrzmtfbi";
const RETIRED_PROJECT_ID = "mlefxgyaqoisvdmoiapq";

describe("owner Supabase project lock", () => {
  it("keeps the actual frontend runtime and repository migration control on the owner project", () => {
    const runtime = read("src/integrations/supabase/ownerRuntime.ts");
    const client = read("src/integrations/supabase/client.ts");
    const manifest = JSON.parse(read("supabase/repository-migrations.json")) as { project_id: string };

    expect(manifest.project_id).toBe(OWNER_PROJECT_ID);
    expect(runtime).toContain(`OWNER_SUPABASE_PROJECT_ID = "${OWNER_PROJECT_ID}"`);
    expect(runtime).toContain(`OWNER_SUPABASE_URL = "https://${OWNER_PROJECT_ID}.supabase.co"`);
    expect(runtime).toContain("OWNER_SUPABASE_PUBLISHABLE_KEY");
    expect(runtime).toContain("sb_publishable_");
    expect(runtime).not.toContain(RETIRED_PROJECT_ID);

    expect(client).toContain("OWNER_SUPABASE_PROJECT_ID");
    expect(client).toContain("OWNER_SUPABASE_URL");
    expect(client).toContain("OWNER_SUPABASE_PUBLISHABLE_KEY");
    expect(client).toContain("VITE_SUPABASE_* values are deliberately ignored");
    expect(client).not.toContain("import.meta.env.VITE_SUPABASE");
  });
});
