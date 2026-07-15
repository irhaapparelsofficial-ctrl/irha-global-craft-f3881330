import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

describe("Lovable runtime is explicit opt-in only", () => {
  it("gates every Edge Function key read behind a new default-deny flag", () => {
    const sources = filesUnder("supabase/functions").filter((path) => /\.(ts|js)$/.test(path));
    const consumers = sources.filter((path) => readFileSync(path, "utf8").includes("LOVABLE_API_KEY"));
    expect(consumers.length).toBeGreaterThan(0);

    for (const path of consumers) {
      const source = readFileSync(path, "utf8");
      const directReads = source.match(/Deno\.env\.get\(["']LOVABLE_API_KEY["']\)/g) ?? [];
      expect(source, path).toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
      expect(source, path).toContain("function irhaLovableRuntimeKey()");
      expect(directReads.length, path).toBe(1);
      expect(source, path).toContain('Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true"');
    }
  });

  it("keeps the scheduled sitemap database client on service role", () => {
    const source = readFileSync("supabase/functions/scheduled-sitemap-submit/index.ts", "utf8");
    expect(source).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(source).not.toContain('Deno.env.get("SUPABASE_ANON_KEY")');
    expect(source).toContain("createClient(supabaseUrl, serviceRoleKey");
  });
});
