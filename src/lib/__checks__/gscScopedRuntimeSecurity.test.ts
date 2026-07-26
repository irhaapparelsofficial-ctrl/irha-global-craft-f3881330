import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const provider = readFileSync("supabase/functions/_shared/googleSearchConsoleOAuth.ts", "utf8");
const analytics = readFileSync("supabase/functions/gsc-analytics/index.ts", "utf8");
const inspection = readFileSync("supabase/functions/gsc-inspect/index.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");
const functions = [analytics, inspection];
const runtimeSources = [provider, analytics, inspection];
const exactProperty = "sc-domain:irhaapparels.com";
const forbiddenMutationFragments = [
  "sitemaps/submit",
  "sitemaps/delete",
  "urlNotifications:publish",
  "indexing.googleapis.com",
  "sites.add",
  "sites.delete",
  "permissions.create",
  "permissions.delete",
];
const forbiddenLegacyFragments = [
  "LOVABLE_API_KEY",
  "GOOGLE_SEARCH_CONSOLE_API_KEY",
  "IRHA_ENABLE_LOVABLE_RUNTIME",
  "connector-gateway.lovable.dev",
  "X-Connection-Api-Key",
  "gscManagedConnectorKey",
];

describe("direct Google Search Console OAuth runtime", () => {
  it("keeps both functions JWT verified and admin authorized", () => {
    expect(config).toMatch(/\[functions\.gsc-inspect\]\s+verify_jwt\s*=\s*true/);
    expect(config).toMatch(/\[functions\.gsc-analytics\]\s+verify_jwt\s*=\s*true/);
    for (const source of functions) {
      expect(source).toContain("auth.getUser()");
      expect(source).toContain('.from("user_roles")');
      expect(source).toContain('.eq("role", "admin")');
      expect(source).toContain('"Cache-Control": "no-store"');
    }
  });

  it("uses the owner-controlled refresh-token provider and no legacy GSC gateway runtime", () => {
    expect(provider).toContain('Deno.env.get("GSC_OAUTH_CLIENT_ID")');
    expect(provider).toContain('Deno.env.get("GSC_OAUTH_CLIENT_SECRET")');
    expect(provider).toContain('Deno.env.get("GSC_OAUTH_REFRESH_TOKEN")');
    expect(provider).toContain('"https://oauth2.googleapis.com/token"');
    for (const source of runtimeSources) {
      for (const fragment of forbiddenLegacyFragments) expect(source).not.toContain(fragment);
    }
  });

  it("enforces the exact domain property and rejects any conflicting override", () => {
    for (const source of functions) {
      expect(source).toContain(`const GSC_SITE_PROPERTY = "${exactProperty}"`);
      expect(source).toContain('Deno.env.get("GSC_SITE_URL")?.trim()');
      expect(source).toContain("configured !== GSC_SITE_PROPERTY");
      expect(source).toContain("gsc_property_configuration_invalid");
    }
  });

  it("limits operations to direct Search Analytics, sites.list and URL Inspection read-only endpoints", () => {
    expect(analytics).toContain('"https://www.googleapis.com/webmasters/v3/sites"');
    expect(analytics).toContain("/searchAnalytics/query");
    expect(inspection).toContain('"https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"');
    for (const source of runtimeSources) {
      for (const fragment of forbiddenMutationFragments) expect(source).not.toContain(fragment);
    }
  });

  it("uses strict CORS and restricts Inspection to approved HTTPS hostnames and batch maximum", () => {
    expect(inspection).not.toContain('"Access-Control-Allow-Origin": "*"');
    expect(inspection).toContain("isAllowedOrigin(origin)");
    expect(inspection).toContain('url.protocol === "https:"');
    expect(inspection).toContain('new Set(["irhaapparels.com", "www.irhaapparels.com"])');
    expect(inspection).toContain("ALLOWED_HOSTNAMES.has(url.hostname)");
    expect(inspection).toContain("const MAX_INSPECTION_URLS = 25");
    expect(inspection).toContain("urls.length > MAX_INSPECTION_URLS");
  });

  it("keeps health output boolean-only for configuration and sanitized for Google verification", () => {
    expect(analytics).toContain('auth_mode: AUTH_MODE');
    expect(analytics).toContain('const AUTH_MODE = "google_oauth_refresh_token"');
    expect(analytics).toContain("oauth_client_id");
    expect(analytics).toContain("oauth_client_secret");
    expect(analytics).toContain("oauth_refresh_token");
    expect(analytics).toContain("token_exchange");
    expect(analytics).toContain("property_access");
    expect(analytics).toContain("permission_level");
    expect(analytics).not.toContain("detail: payload");
  });
});
