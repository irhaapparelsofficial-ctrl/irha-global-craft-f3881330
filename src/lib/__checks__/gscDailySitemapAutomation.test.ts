import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const source = readFileSync("supabase/functions/operations-orchestrator/index.ts", "utf8");

describe("daily Google Search Console sitemap automation", () => {
  it("uses the canonical apex origin for public smoke tests and sitemap evidence", () => {
    expect(source).toContain('const PROJECT_SITE = "https://irhaapparels.com"');
    expect(source).not.toContain('const PROJECT_SITE = "https://www.irhaapparels.com"');
    expect(source).toContain('`${PROJECT_SITE}/sitemap.xml`');
  });

  it("submits the canonical sitemap during every secure daily operation", () => {
    expect(source).toContain("daily(service, run.id, control, url, serviceKey)");
    expect(source).toContain("submitCanonicalSitemap(url, serviceKey)");
    expect(source).toContain('`${url}/functions/v1/sitemap-ping`');
    expect(source).toContain('authorization: `Bearer ${serviceKey}`');
    expect(source).toContain("apikey: serviceKey");
    expect(source).toContain("sitemap_submission: sitemapSubmission");
  });

  it("records a truthful partial result instead of hiding Google submission failures", () => {
    expect(source).toContain('error: "sitemap_submission_failed"');
    expect(source).toContain('error: "sitemap_submission_request_failed"');
    expect(source).toContain("sitemapSubmission.ok !== false");
    expect(source).toContain('error: ok ? null : "daily_operations_degraded"');
  });

  it("checks GSC readiness against the direct OAuth credentials used by sitemap-ping", () => {
    expect(source).toContain("function gscOAuthConfigured(): boolean");
    expect(source).toContain('Deno.env.get("GSC_OAUTH_CLIENT_ID")?.trim()');
    expect(source).toContain('Deno.env.get("GSC_OAUTH_CLIENT_SECRET")?.trim()');
    expect(source).toContain('Deno.env.get("GSC_OAUTH_REFRESH_TOKEN")?.trim()');
    expect(source).toContain("gsc: gscOAuthConfigured()");
    expect(source).not.toContain('gsc: Boolean(irhaLovableRuntimeKey())');
    expect(source).not.toContain('gsc: Boolean(Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY"))');
  });
});
