import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const liveTypesPath = resolve(process.argv[2] || "/tmp/supabase-types.ts");
const committedTypesPath = resolve(repositoryRoot, "src/integrations/supabase/types.ts");
const retiredSupplementPath = resolve(repositoryRoot, "src/integrations/supabase/secM03Database.ts");
const clientPath = resolve(repositoryRoot, "src/integrations/supabase/client.ts");

const requiredBlocks = new Map([
  [
    "cleanup_edge_rate_limit_state",
    `      cleanup_edge_rate_limit_state: {
        Args: { p_max_rows?: number }
        Returns: {
          metric_rows_deleted: number
          state_rows_deleted: number
        }[]
      }
`,
  ],
  [
    "consume_edge_rate_limit",
    `      consume_edge_rate_limit: {
        Args: {
          p_cost?: number
          p_duplicate_hash?: string
          p_now?: string
          p_policy_key: string
          p_resource_hash?: string
          p_subject_hash: string
        }
        Returns: {
          blocked_until: string
          decision: string
          duplicate_suppressed: boolean
          remaining: number
          retry_after_seconds: number
        }[]
      }
`,
  ],
]);

function readRequired(path, label) {
  try {
    return readFileSync(path, "utf8").replace(/\r\n/g, "\n");
  } catch (error) {
    throw new Error(`Required ${label} is missing at ${path}: ${String(error)}`);
  }
}

function locateFunctionBlock(lines, functionName) {
  const start = lines.findIndex((line) => line === `      ${functionName}: {`);
  if (start < 0) throw new Error(`Official public types are missing ${functionName}`);
  let end = start + 1;
  while (end < lines.length && !/^      [A-Za-z0-9_]+:/.test(lines[end])) end += 1;
  return `${lines.slice(start, end).join("\n")}\n`;
}

const liveTypes = readRequired(liveTypesPath, "live generated public-schema types");
const committedTypes = readRequired(committedTypesPath, "committed public-schema types");
const client = readRequired(clientPath, "Supabase client");

if (liveTypes !== committedTypes) {
  throw new Error("Committed Supabase types are not byte-for-byte current with official public-schema generation");
}

const liveLines = liveTypes.split("\n");
for (const [functionName, expectedBlock] of requiredBlocks) {
  if (locateFunctionBlock(liveLines, functionName) !== expectedBlock) {
    throw new Error(`${functionName} official signature differs from the reviewed SEC-M03 contract`);
  }
}

for (const forbidden of [
  /^\s+edge_rate_limit_policies:\s*\{/m,
  /^\s+edge_rate_limit_state:\s*\{/m,
  /^\s+edge_rate_limit_metrics_hourly:\s*\{/m,
  /\bVault\b/,
  /\bprivate:\s*\{/,
  /\bmigration_archive\b/,
]) {
  if (forbidden.test(liveTypes)) {
    throw new Error(`Official browser types expose a forbidden private declaration: ${forbidden}`);
  }
}

if (existsSync(retiredSupplementPath)) {
  throw new Error("Temporary SEC-M03 type supplement still exists after official type generation");
}
if (!client.includes('import type { Database } from "./types";')) {
  throw new Error("Supabase client does not consume the official generated Database type directly");
}
if (client.includes("secM03Database")) {
  throw new Error("Supabase client still references the retired SEC-M03 type supplement");
}

console.log("Supabase type parity passed: official public types are current, limiter RPCs are present, and private schemas remain excluded.");
