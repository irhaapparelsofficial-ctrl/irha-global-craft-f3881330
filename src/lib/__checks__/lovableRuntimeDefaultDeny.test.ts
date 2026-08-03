import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function filesUnder(root: string): string[] {
  return readdirSync(root).flatMap((name) => {
    const path = join(root, name);
    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });
}

function normalized(path: string) {
  return path.replaceAll("\\", "/");
}

const GSC_RUNTIME_FILES = [
  "supabase/functions/_shared/googleSearchConsoleOAuth.ts",
  "supabase/functions/gsc-analytics/index.ts",
  "supabase/functions/gsc-inspect/index.ts",
  "supabase/functions/sitemap-ping/index.ts",
] as const;

describe("Lovable runtime is explicit opt-in only", () => {
  it("recursively gates every LOVABLE_API_KEY consumer and keeps all GSC runtime files outside the exception model", () => {
    const sources = filesUnder("supabase/functions").filter((path) => /\.(ts|js)$/.test(path));
    const consumers = sources.filter((path) => readFileSync(path, "utf8").includes("LOVABLE_API_KEY"));
    expect(consumers.length).toBeGreaterThan(0);

    for (const path of consumers) {
      const source = readFileSync(path, "utf8");
      const repositoryPath = normalized(path);
      const directReads = source.match(/Deno\.env\.get\(["']LOVABLE_API_KEY["']\)/g) ?? [];
      expect(directReads.length, repositoryPath).toBe(1);
      expect(source, repositoryPath).toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
      expect(source, repositoryPath).toContain("function irhaLovableRuntimeKey()");
      expect(source, repositoryPath).toContain('Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true"');
    }

    for (const path of GSC_RUNTIME_FILES) {
      const source = readFileSync(path, "utf8");
      expect(source, path).not.toContain("LOVABLE_API_KEY");
      expect(source, path).not.toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
      expect(source, path).not.toContain("connector-gateway.lovable.dev");
    }
  });

  it("does not enable the opt-in flag in the committed Supabase configuration", () => {
    const config = readFileSync("supabase/config.toml", "utf8");
    expect(config).not.toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
  });

  it("covers the modular public chat provider source", () => {
    const provider = readFileSync("supabase/functions/chat/providers.ts", "utf8");
    expect(provider).toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
    expect(provider).toContain("irhaLovableRuntimeKey()");
  });

  it("preserves Vault-authorized sitemap-ping and locks scheduler RPCs", () => {
    const scheduler = readFileSync("supabase/functions/sitemap-ping/index.ts", "utf8");
    const queue = readFileSync("supabase/migrations/20260716035000_queue_and_finalize_sitemap_submission.sql", "utf8");
    const lock = readFileSync("supabase/migrations/20260716036000_lock_sitemap_scheduler_rpcs.sql", "utf8");
    expect(scheduler).toContain("SCHEDULER_TOKEN_HASH");
    expect(queue).toContain("/functions/v1/sitemap-ping");
    expect(lock).toContain("FROM anon, authenticated");
    expect(lock).toContain("TO service_role");
  });
});
