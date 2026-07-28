import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const repositoryRoot = resolve(process.cwd());
const liveTypesPath = resolve(process.argv[2] || "/tmp/supabase-types.ts");
const baseTypesPath = resolve(repositoryRoot, "src/integrations/supabase/types.ts");
const supplementPath = resolve(repositoryRoot, "src/integrations/supabase/secM03Database.ts");

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
  if (start < 0) throw new Error(`Live generated types are missing ${functionName}`);
  let end = start + 1;
  while (end < lines.length && !/^      [A-Za-z0-9_]+:/.test(lines[end])) end += 1;
  return { start, end, text: `${lines.slice(start, end).join("\n")}\n` };
}

const liveTypes = readRequired(liveTypesPath, "live generated public-schema types");
const baseTypes = readRequired(baseTypesPath, "committed base public-schema types");
const supplement = readRequired(supplementPath, "SEC-M03 RPC type supplement");
const liveLines = liveTypes.split("\n");
const ranges = [];

for (const [functionName, expectedBlock] of requiredBlocks) {
  const located = locateFunctionBlock(liveLines, functionName);
  if (located.text !== expectedBlock) {
    throw new Error(`${functionName} live signature differs from the reviewed SEC-M03 contract`);
  }
  ranges.push(located);
}

for (const range of ranges.sort((left, right) => right.start - left.start)) {
  liveLines.splice(range.start, range.end - range.start);
}

const liveWithoutSupplement = liveLines.join("\n");
if (liveWithoutSupplement !== baseTypes) {
  throw new Error("Live public-schema types contain changes beyond the two reviewed SEC-M03 RPCs");
}

const compact = supplement.replace(/\s+/g, "");
const requiredFragments = [
  "cleanup_edge_rate_limit_state:{Args:{p_max_rows?:number};Returns:{metric_rows_deleted:number;state_rows_deleted:number;}[];};",
  "consume_edge_rate_limit:{Args:{p_cost?:number;p_duplicate_hash?:string;p_now?:string;p_policy_key:string;p_resource_hash?:string;p_subject_hash:string;};Returns:{blocked_until:string;decision:string;duplicate_suppressed:boolean;remaining:number;retry_after_seconds:number;}[];};",
];
for (const fragment of requiredFragments) {
  if (!compact.includes(fragment)) throw new Error("Committed SEC-M03 type supplement does not match the live reviewed signature");
}

for (const forbidden of [
  "edge_rate_limit_policies:",
  "edge_rate_limit_state:",
  "edge_rate_limit_metrics_hourly:",
  "burst_count:",
  "sustained_count:",
  "privacy_sample:",
]) {
  if (supplement.includes(forbidden)) throw new Error(`Browser type supplement exposes non-public limiter detail: ${forbidden}`);
}

console.log("Supabase type parity passed: base schema is exact and the only live delta is the reviewed SEC-M03 RPC supplement.");
