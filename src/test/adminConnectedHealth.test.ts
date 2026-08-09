import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (path: string) => readFileSync(join(root, path), "utf8");

function sourceSection(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start + startMarker.length);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("admin connected-health contracts", () => {
  it("keeps Cloudflare deployment isolated to the preview branch", () => {
    const workflow = read(".github/workflows/cloudflare-pages-preview.yml");
    expect(workflow).toContain("PREVIEW_BRANCH: github-preview");
    expect(workflow).toContain("PREVIEW_URL: https://github-preview.irha-apparels.pages.dev");
    expect(workflow).toContain('--branch="$PREVIEW_BRANCH"');
    expect(workflow).toContain("Production custom domain changed: no");
    expect(workflow).not.toContain("--branch=main");
    expect(workflow).not.toContain("wrangler pages deploy dist --branch main");
  });

  it("validates Cloudflare credentials before building or deploying", () => {
    const workflow = read(".github/workflows/cloudflare-pages-preview.yml");
    expect(workflow).toContain("needs: preflight");
    expect(workflow).toContain("user/tokens/verify");
    expect(workflow).toContain("pages/projects/$project_name");
    expect(workflow).toContain("CLOUDFLARE_ACCOUNT_ID must be the 32-character Account ID only");
  });

  it("keeps Google Search analytics private and aligned to direct OAuth health", () => {
    const source = read("supabase/functions/gsc-analytics/index.ts");
    const config = read("supabase/config.toml");
    const health = sourceSection(source, "async function readHealth", "function formatDate");
    const queryHelper = sourceSection(source, "async function querySearchAnalytics", "function safeNumber");

    expect(config).toContain("[functions.gsc-analytics]\nverify_jwt = true");
    expect(source).toContain("auth.getUser()");
    expect(source).toContain('.eq("role", "admin")');
    expect(source).toContain('action === "health"');
    expect(source).toContain('const AUTH_MODE = "google_oauth_refresh_token"');
    expect(source).toContain('failureCode = "gsc_oauth_not_configured"');
    expect(source).toContain('code: "gsc_oauth_not_configured"');
    expect(source).toContain("Days must be 28 or 90");
    expect(source).toContain(".irha-apparels.pages.dev");

    expect(health).toContain("ready: Boolean(ready)");
    expect(health).toContain('state: ready ? "ready" : "blocked"');
    expect(health).toContain("auth_mode: AUTH_MODE");
    expect(health).toContain("configuration: state.configuration");
    expect(health).toContain("failure_code: ready ? null : failureCode");
    expect(source).toContain('if (action === "health") return json({ ok: true, ...(await readHealth()) }, 200, headers)');

    const actionBranch = source.indexOf('if (action === "health")');
    const queryState = source.indexOf("const state = configurationState();", actionBranch);
    const oauthGuard = source.indexOf("if (!state.oauthConfigured)", queryState);
    const queryCall = source.indexOf("const rows = await querySearchAnalytics", oauthGuard);
    expect(queryState).toBeGreaterThan(actionBranch);
    expect(oauthGuard).toBeGreaterThan(queryState);
    expect(queryCall).toBeGreaterThan(oauthGuard);
    expect(queryHelper).toContain("const endpoint =");
    expect(queryHelper).toContain("googleSearchConsoleFetch<SearchAnalyticsPayload>");
    expect(queryHelper).toContain("if (!upstream.ok) throw new Error(upstream.code)");
    expect(source).not.toContain("connector_gateway_key");
    expect(source).not.toContain("search_console_connection_key");
    expect(source).not.toContain("X-Connection-Api-Key");
    expect(source).not.toContain("GSC_OAUTH_CLIENT_ID");
    expect(source).not.toContain("GSC_OAUTH_CLIENT_SECRET");
    expect(source).not.toContain("GSC_OAUTH_REFRESH_TOKEN");
    expect(source).not.toContain("clientSecret");
    expect(source).not.toContain("refreshToken");
    expect(source).not.toContain("accessToken");
  });

  it("records applied runtime evidence without claiming Google data success", () => {
    const evidence = read("docs/P0_CONNECTED_HEALTH_EVIDENCE_20260714.md");
    expect(evidence).toContain("29319117894");
    expect(evidence).toContain("0 authenticated grants");
    expect(evidence).toContain("must still be visually accepted from an authenticated owner admin session");
  });
});
