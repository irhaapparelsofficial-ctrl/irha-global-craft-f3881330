import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const generatedTypesPath = resolve(repositoryRoot, "src/integrations/supabase/types.ts");
const retiredSupplementPath = resolve(repositoryRoot, "src/integrations/supabase/secM03Database.ts");
const clientPath = resolve(repositoryRoot, "src/integrations/supabase/client.ts");
const durableLimiterPath = resolve(repositoryRoot, "supabase/functions/_shared/durable-rate-limit.ts");

function readRequiredSource(path: string, label: string) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`Required ${label} source is missing at ${path}: ${String(error)}`);
  }
}

describe("SEC-M03 generated browser types and server limiter boundary", () => {
  it("keeps authenticated live-generated public types free of private limiter implementation", () => {
    const source = readRequiredSource(generatedTypesPath, "official generated public types");

    expect(source).toContain("Functions: {");
    expect(source).toContain("automation_today_key");
    expect(source).toContain("cms_get_published_document");
    expect(source).not.toContain("cleanup_edge_rate_limit_state");
    expect(source).not.toContain("consume_edge_rate_limit");
    expect(source).not.toMatch(/^\s+edge_rate_limit_policies:\s*\{/m);
    expect(source).not.toMatch(/^\s+edge_rate_limit_state:\s*\{/m);
    expect(source).not.toMatch(/^\s+edge_rate_limit_metrics_hourly:\s*\{/m);
    expect(source).not.toMatch(/^\s+private:\s*\{/m);
    expect(source).not.toMatch(/^\s+vault:\s*\{/m);
    expect(source).not.toContain("burst_count:");
    expect(source).not.toContain("sustained_count:");
    expect(source).not.toContain("privacy_sample:");
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
