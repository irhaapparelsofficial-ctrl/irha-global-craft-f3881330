import { readFileSync, writeFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { extname } from "node:path";

const logPath = process.argv[2];
const changedFilesPath = process.argv[3];
const outputPath = process.argv[4] || "/tmp/auto-fix-result.json";

if (!logPath || !changedFilesPath) {
  console.error("usage: node scripts/ci/apply-safe-auto-fixes.mjs <failed.log> <changed-files.txt> [result.json]");
  process.exit(64);
}

const logs = readFileSync(logPath, "utf8");
const changedFiles = readFileSync(changedFilesPath, "utf8")
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean);

const actions = [];
const commands = [];

function run(command, args) {
  const rendered = [command, ...args].join(" ");
  const result = spawnSync(command, args, {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
    stdio: "pipe",
    maxBuffer: 20 * 1024 * 1024,
  });
  commands.push({
    command: rendered,
    status: result.status,
    stdout: result.stdout?.slice(-4000) || "",
    stderr: result.stderr?.slice(-4000) || "",
  });
  return result.status === 0;
}

const dependencySignal = /(package-lock|npm\s+(ci|install)|ERESOLVE|lockfile|lock file|missing from lock)/i.test(logs);
const dependencyFilesChanged = changedFiles.some((file) => file === "package.json" || file === "package-lock.json");
if (dependencySignal && dependencyFilesChanged) {
  const ok = run("npm", ["install", "--package-lock-only", "--legacy-peer-deps", "--no-audit", "--no-fund"]);
  actions.push({ type: "package-lock", attempted: true, ok });
}

const lintSignal = /(eslint|lint error|prettier|formatting)/i.test(logs);
const lintableExtensions = new Set([".js", ".jsx", ".mjs", ".cjs", ".ts", ".tsx"]);
const lintableFiles = changedFiles
  .filter((file) => lintableExtensions.has(extname(file)))
  .filter((file) => !file.startsWith("supabase/migrations/"))
  .slice(0, 100);

if (lintSignal && lintableFiles.length > 0) {
  const ok = run("npx", ["eslint", "--fix", ...lintableFiles]);
  actions.push({ type: "eslint-fix", attempted: true, ok, files: lintableFiles });
}

const searchRouteStateSignal = /Committed material search route state is stale\. Run node scripts\/generate-search-route-state\.mjs --write before merging\./i.test(logs);
if (searchRouteStateSignal) {
  const prepared = run("npm", ["run", "prepare:public-assets"]);
  const generated = prepared && run("node", [
    "scripts/generate-search-route-state.mjs",
    "--input",
    "public/seo-route-manifest.json",
    "--output",
    "seo/search-route-state.json",
    "--write",
  ]);
  actions.push({
    type: "search-route-state",
    attempted: true,
    ok: prepared && generated,
    prerequisite: "npm run prepare:public-assets",
    input: "public/seo-route-manifest.json",
    output: "seo/search-route-state.json",
  });
}

const gitStatus = spawnSync("git", ["status", "--porcelain"], {
  cwd: process.cwd(),
  encoding: "utf8",
  stdio: "pipe",
});
const changed = Boolean(gitStatus.stdout?.trim());

const result = {
  changed,
  actions,
  commands,
  policy: "Only deterministic mechanical dependency-lock, lint and material search-route-state repairs are permitted. Search-route state regeneration first materializes the repository's authoritative public SEO manifest through prepare:public-assets, then invokes the supported generator with explicit input/output paths. The existing workflow must pass full TypeScript, tests and production build validation before any repair commit is pushed. SQL, release contracts, business logic, secrets, deployment identity and production data are never rewritten automatically.",
};

writeFileSync(outputPath, `${JSON.stringify(result, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(result)}\n`);
