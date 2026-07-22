import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const previewWorkflowPath = ".github/workflows/cloudflare-pages-preview.yml";
const brandSignalsPath = "scripts/strengthen-brand-search-signals.mjs";
const workflowPaths = [
  previewWorkflowPath,
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

  it("verifies the deployed preview against the final generated homepage identity", () => {
    const workflow = readFileSync(resolve(previewWorkflowPath), "utf8");
    const brandSignals = readFileSync(resolve(brandSignalsPath), "utf8");
    const brandH1 = brandSignals.match(/const BRAND_H1 = "([^"]+)";/)?.[1];

    expect(brandH1).toBe(
      "Irha Apparels — Custom Apparel Manufacturer for Global B2B Buyers",
    );
    expect(workflow).toContain(`grep -Fq '${brandH1}' /tmp/preview-home.html`);
    expect(workflow).not.toContain(
      "Custom Apparel Manufacturing for Global B2B Buyers",
    );
    expect(workflow).toContain('.source_commit == $source');
    expect(workflow).toContain('.source_identity_state == "verified"');
    expect(workflow).toContain(
      'expected_preview_url="https://${PREVIEW_BRANCH}.${project_name}.pages.dev"',
    );
    expect(workflow).toContain('--commit-hash="$GITHUB_SHA"');
  });
});
