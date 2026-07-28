import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const generatedTypesPath = resolve(repositoryRoot, "src/integrations/supabase/types.ts");
const retiredSupplementPath = resolve(repositoryRoot, "src/integrations/supabase/secM03Database.ts");
const clientPath = resolve(repositoryRoot, "src/integrations/supabase/client.ts");

function readRequiredSource(path: string, label: string) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`Required ${label} source is missing at ${path}: ${String(error)}`);
  }
}

describe("SEC-M03 official generated public RPC types", () => {
  it("contains the reviewed public RPC surface without private limiter detail", () => {
    const source = readRequiredSource(generatedTypesPath, "official generated public types");
    expect(source).toContain("cleanup_edge_rate_limit_state");
    expect(source).toContain("consume_edge_rate_limit");
    expect(source).toContain("p_resource_hash?: string");
    expect(source).toContain("retry_after_seconds: number");
    expect(source).toContain("duplicate_suppressed: boolean");
    expect(source).not.toMatch(/^\s+edge_rate_limit_policies:\s*\{/m);
    expect(source).not.toMatch(/^\s+edge_rate_limit_state:\s*\{/m);
    expect(source).not.toMatch(/^\s+edge_rate_limit_metrics_hourly:\s*\{/m);
    expect(source).not.toMatch(/^\s+private:\s*\{/m);
    expect(source).not.toMatch(/^\s+vault:\s*\{/m);
    expect(source).not.toContain("burst_count:");
    expect(source).not.toContain("sustained_count:");
    expect(source).not.toContain("privacy_sample:");
  });

  it("is used directly by the browser client after retiring the temporary supplement", () => {
    const clientSource = readRequiredSource(clientPath, "Supabase client");
    expect(clientSource).toContain('import type { Database } from "./types"');
    expect(clientSource).not.toContain("secM03Database");
    expect(clientSource).toContain("createClient<Database>");
    expect(existsSync(retiredSupplementPath)).toBe(false);
  });
});
