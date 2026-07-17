import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const OWNER_PROJECT_ID = "pvzjiozismyxqrzmtfbi";
const RETIRED_PROJECT_ID = "mlefxgyaqoisvdmoiapq";

describe("owner Supabase project lock", () => {
  it("keeps frontend runtime and repository migration control on the same owner project", () => {
    const env = read(".env");
    const manifest = JSON.parse(read("supabase/repository-migrations.json")) as { project_id: string };

    expect(manifest.project_id).toBe(OWNER_PROJECT_ID);
    expect(env).toContain(`VITE_SUPABASE_PROJECT_ID="${OWNER_PROJECT_ID}"`);
    expect(env).toContain(`VITE_SUPABASE_URL="https://${OWNER_PROJECT_ID}.supabase.co"`);
    expect(env).toContain("VITE_SUPABASE_PUBLISHABLE_KEY=\"sb_publishable_");
    expect(env).not.toContain(RETIRED_PROJECT_ID);
  });
});
