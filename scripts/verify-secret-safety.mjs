import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";

const ROOT = process.cwd();
const SKIP_DIRS = new Set([".git", "node_modules", "dist", ".cache", "coverage", "public"]);
const SKIP_FILES = new Set(["package-lock.json", "pnpm-lock.yaml", "yarn.lock"]);
const TEXT_EXTENSIONS = new Set([
  ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".json", ".toml", ".yml", ".yaml",
  ".md", ".txt", ".sql", ".html", ".css", ".env", "",
]);

const RULES = [
  { id: "private-key", pattern: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/g },
  { id: "supabase-secret-key", pattern: /sb_secret_[A-Za-z0-9_-]{12,}/g },
  { id: "openai-api-key", pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g },
  { id: "google-client-secret", pattern: /\bGOCSPX-[A-Za-z0-9_-]{16,}\b/g },
  { id: "github-token", pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g },
  { id: "slack-token", pattern: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g },
  { id: "sendgrid-key", pattern: /\bSG\.[A-Za-z0-9_-]{16,}\.[A-Za-z0-9_-]{16,}\b/g },
  { id: "aws-access-key", pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g },
  { id: "service-role-literal", pattern: /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["'][^"'\n]{12,}["']/g },
  { id: "oauth-secret-literal", pattern: /(?:CLIENT_SECRET|OAUTH_SECRET)\s*[:=]\s*["'][^"'\n]{12,}["']/gi },
  { id: "password-literal", pattern: /(?:OWNER_|ADMIN_)?PASSWORD\s*[:=]\s*["'](?!change-me|example|placeholder)[^"'\n]{8,}["']/gi },
];

const PUBLIC_ENV_VALIDATORS = new Map([
  ["VITE_SUPABASE_PROJECT_ID", /^[a-z0-9]{20}$/i],
  ["VITE_SUPABASE_URL", /^https:\/\/[a-z0-9]{20}\.supabase\.co\/?$/i],
  ["VITE_SUPABASE_PUBLISHABLE_KEY", /^sb_publishable_[A-Za-z0-9_-]{20,}$/],
]);

async function walk(directory, output = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.isDirectory() && SKIP_DIRS.has(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) await walk(absolute, output);
    else output.push(absolute);
  }
  return output;
}

function isTextCandidate(relative, info) {
  if (SKIP_FILES.has(path.basename(relative))) return false;
  if (info.size > 2_000_000) return false;
  if (relative.startsWith("public/media/") || relative.startsWith("public/catalogs/")) return false;
  if (path.basename(relative).startsWith(".env") && path.basename(relative) !== ".env.example") return true;
  return TEXT_EXTENSIONS.has(path.extname(relative).toLowerCase());
}

function validateCommittedEnv(relative, text, findings) {
  const lines = text.split(/\r?\n/);
  for (const [index, rawLine] of lines.entries()) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) {
      findings.push({ file: relative, rule: "invalid-env-line", line: index + 1 });
      continue;
    }
    const [, name, rawValue] = match;
    const value = rawValue.trim().replace(/^(["'])(.*)\1$/, "$2");
    const validator = PUBLIC_ENV_VALIDATORS.get(name);
    if (!validator || !validator.test(value)) {
      findings.push({ file: relative, rule: "non-public-committed-env-value", line: index + 1 });
    }
  }
}

const findings = [];
for (const absolute of await walk(ROOT)) {
  const relative = path.relative(ROOT, absolute).split(path.sep).join("/");
  const info = await stat(absolute);
  if (!isTextCandidate(relative, info)) continue;

  let text;
  try {
    text = await readFile(absolute, "utf8");
  } catch {
    continue;
  }

  if (path.basename(relative).startsWith(".env") && path.basename(relative) !== ".env.example") {
    validateCommittedEnv(relative, text, findings);
  }

  for (const rule of RULES) {
    rule.pattern.lastIndex = 0;
    for (const match of text.matchAll(rule.pattern)) {
      const line = text.slice(0, match.index ?? 0).split("\n").length;
      findings.push({ file: relative, rule: rule.id, line });
    }
  }
}

if (findings.length) {
  console.error("Secret-safety verification failed. Potential committed credentials were found:");
  for (const finding of findings) console.error(`- ${finding.file}:${finding.line} [${finding.rule}]`);
  console.error("Only credential locations are shown; matched values are intentionally hidden.");
  process.exit(1);
}

console.log("Secret-safety verification passed: only approved browser-public Supabase values are committed.");
