import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const supplementPath = resolve(repositoryRoot, "src/integrations/supabase/secM03Database.ts");
const clientPath = resolve(repositoryRoot, "src/integrations/supabase/client.ts");

function readRequiredSource(path: string, label: string) {
  try {
    return readFileSync(path, "utf8");
  } catch (error) {
    throw new Error(`Required ${label} source is missing at ${path}: ${String(error)}`);
  }
}

describe("SEC-M03 generated public RPC supplement", () => {
  it("matches the reviewed live public RPC surface without private limiter detail", () => {
    const source = readRequiredSource(supplementPath, "SEC-M03 type supplement");
    expect(source).toContain("cleanup_edge_rate_limit_state");
    expect(source).toContain("consume_edge_rate_limit");
    expect(source).toContain("p_resource_hash?: string");
    expect(source).toContain("retry_after_seconds: number");
    expect(source).toContain("duplicate_suppressed: boolean");
    expect(source).not.toContain("edge_rate_limit_policies:");
    expect(source).not.toContain("edge_rate_limit_state:");
    expect(source).not.toContain("edge_rate_limit_metrics_hourly:");
    expect(source).not.toContain("burst_count:");
    expect(source).not.toContain("sustained_count:");
    expect(source).not.toContain("privacy_sample:");
  });

  it("is the database type used by the browser Supabase client", () => {
    const clientSource = readRequiredSource(clientPath, "Supabase client");
    expect(clientSource).toContain('import type { Database } from "./secM03Database"');
    expect(clientSource).toContain("createClient<Database>");
  });
});
