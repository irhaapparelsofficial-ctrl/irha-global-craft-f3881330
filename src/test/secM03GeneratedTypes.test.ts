import { describe, expect, it } from "vitest";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const generatedTypesPath = resolve(repositoryRoot, "src/integrations/supabase/types.ts");
const retiredSupplementPath = resolve(repositoryRoot, "src/integrations/supabase/secM03Database.ts");
const clientPath = resolve(repositoryRoot, "src/integrations/supabase/client.ts");
const durableLimiterPath = resolve(repositoryRoot, "supabase/functions/_shared/durable-rate-limit.ts");
const migrationsPath = resolve(repositoryRoot, "supabase/migrations");

function readRequiredSource(path: string, label: string) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`Required ${label} source is missing at ${path}: ${String(error)}`);
  }
}

function readMigrationSources() {
  return readdirSync(migrationsPath)
    .filter((fileName) => fileName.endsWith(".sql"))
    .sort()
    .map((fileName) => readRequiredSource(resolve(migrationsPath, fileName), `migration ${fileName}`))
    .join("\n");
}

describe("SEC-M03 generated browser types and server limiter boundary", () => {
  it("keeps official public-schema types complete without leaking private limiter tables", () => {
    const source = readRequiredSource(generatedTypesPath, "official generated public types");

    expect(source).toContain("Functions: {");
    expect(source).toContain("cms_get_published_document");

    // Supabase's official public-schema generator includes public function
    // signatures even when browser roles cannot execute those functions. Keep
    // byte parity with official generation and test the actual ACL boundary
    // separately instead of treating type omission as authorization.
    expect(source).toContain("cleanup_edge_rate_limit_state");
    expect(source).toContain("consume_edge_rate_limit");

    expect(source).not.toMatch(/^\s+edge_rate_limit_policies:\s*\{/m);
    expect(source).not.toMatch(/^\s+edge_rate_limit_state:\s*\{/m);
    expect(source).not.toMatch(/^\s+edge_rate_limit_metrics_hourly:\s*\{/m);
    expect(source).not.toMatch(/^\s+private:\s*\{/m);
    expect(source).not.toMatch(/^\s+vault:\s*\{/m);
    expect(source).not.toContain("burst_count:");
    expect(source).not.toContain("sustained_count:");
    expect(source).not.toContain("privacy_sample:");
  });

  it("records service-role-only execution grants for durable limiter RPCs", () => {
    const migrationSource = readMigrationSources();

    for (const functionName of ["consume_edge_rate_limit", "cleanup_edge_rate_limit_state"]) {
      expect(migrationSource).toMatch(
        new RegExp(`revoke\\s+all\\s+on\\s+function\\s+public\\.${functionName}\\([^;]+?from\\s+public\\s*,\\s*anon\\s*,\\s*authenticated`, "is"),
      );
      expect(migrationSource).toMatch(
        new RegExp(`grant\\s+execute\\s+on\\s+function\\s+public\\.${functionName}\\([^;]+?to\\s+service_role`, "is"),
      );
    }
  });

  it("keeps durable rate limiting typed inside the server-only Edge boundary", () => {
    const limiterSource = readRequiredSource(durableLimiterPath, "durable rate-limit implementation");

    expect(limiterSource).toContain('functionName: "consume_edge_rate_limit"');
    expect(limiterSource).toContain("retryAfterSeconds");
    expect(limiterSource).toContain("duplicateSuppressed");
    expect(limiterSource).toContain("DurableRateLimitUnavailableError");
  });

  it("uses the authoritative generated types directly in the browser client", () => {
    const clientSource = readRequiredSource(clientPath, "Supabase client");
    expect(clientSource).toContain('import type { Database } from "./types"');
    expect(clientSource).not.toContain("secM03Database");
    expect(clientSource).toContain("createClient<Database>");
    expect(existsSync(retiredSupplementPath)).toBe(false);
  });
});
