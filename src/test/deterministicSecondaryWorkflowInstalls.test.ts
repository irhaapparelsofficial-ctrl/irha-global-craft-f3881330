import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const workflowPaths = [
  ".github/workflows/cloudflare-pages-preview.yml",
  ".github/workflows/cloudflare-pages-production.yml",
  ".github/workflows/deploy-chat-current-main.yml",
  ".github/workflows/deploy-workers-ai-guide-current-main.yml",
  ".github/workflows/pr-auto-fixer.yml",
  ".github/workflows/supabase-functions-auto.yml",
  ".github/workflows/supabase-owner-release.yml",
  ".github/workflows/workers-ai-guide-gate.yml",
] as const;

describe("secondary workflow dependency installs", () => {
  it.each(workflowPaths)("uses the committed lockfile in %s", (workflowPath) => {
    const workflow = readFileSync(resolve(workflowPath), "utf8");

    expect(workflow).toContain("npm ci --legacy-peer-deps --no-audit --no-fund");
    expect(workflow).not.toContain(
      "npm install --legacy-peer-deps --no-audit --no-fund",
    );
  });
});
