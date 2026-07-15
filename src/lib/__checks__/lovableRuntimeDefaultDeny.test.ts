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

  it("preserves the current Vault-authorized sitemap-ping scheduler and locks its RPCs", () => {
    const scheduler = readFileSync("supabase/functions/sitemap-ping/index.ts", "utf8");
    const queue = readFileSync("supabase/migrations/20260716035000_queue_and_finalize_sitemap_submission.sql", "utf8");
    const lock = readFileSync("supabase/migrations/20260716036000_lock_sitemap_scheduler_rpcs.sql", "utf8");
    expect(scheduler).toContain("SCHEDULER_TOKEN_HASH");
    expect(scheduler).toContain("constantTimeEqual");
    expect(scheduler).toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
    expect(queue).toContain("/functions/v1/sitemap-ping");
    expect(lock).toContain("FROM anon, authenticated");
    expect(lock).toContain("TO service_role");
  });
});
