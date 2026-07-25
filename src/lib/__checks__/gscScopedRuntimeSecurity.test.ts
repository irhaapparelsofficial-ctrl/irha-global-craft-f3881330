import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const analytics = readFileSync("supabase/functions/gsc-analytics/index.ts", "utf8");
const inspection = readFileSync("supabase/functions/gsc-inspect/index.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");
const functions = [analytics, inspection];
const exactProperty = "sc-domain:irhaapparels.com";
const gateway = "https://connector-gateway.lovable.dev/google_search_console";
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

describe("scoped Google Search Console managed runtime", () => {
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

  it("uses only the Search Console gateway and exactly scoped managed keys", () => {
    for (const source of functions) {
      expect(source).toContain(`const GATEWAY = "${gateway}"`);
      expect(source).toContain("function gscManagedConnectorKey()");
      expect(source).toContain('Deno.env.get("LOVABLE_API_KEY")');
      expect(source).toContain('Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")');
      expect(source).not.toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
      expect(source.match(/connector-gateway\.lovable\.dev\//g)).toHaveLength(1);
    }
  });

  it("enforces the exact domain property and rejects any conflicting override", () => {
    for (const source of functions) {
      expect(source).toContain(`const GSC_SITE_PROPERTY = "${exactProperty}"`);
      expect(source).toContain('Deno.env.get("GSC_SITE_URL")?.trim()');
      expect(source).toContain("configured !== GSC_SITE_PROPERTY");
      expect(source).toContain("gsc_property_configuration_invalid");
      expect(source).not.toContain('const DEFAULT_SITE_URL = "https://irhaapparels.com/"');
    }
  });

  it("limits operations to Search Analytics and URL Inspection read-only endpoints", () => {
    expect(analytics).toContain("/searchAnalytics/query");
    expect(inspection).toContain("/v1/urlInspection/index:inspect");
    expect(analytics).not.toContain("urlInspection/index:inspect");
    expect(inspection).not.toContain("searchAnalytics/query");
    for (const source of functions) {
      for (const fragment of forbiddenMutationFragments) expect(source).not.toContain(fragment);
    }
  });

  it("restricts inspection to Irha Apparels HTTPS hostnames and retains the batch maximum", () => {
    expect(inspection).toContain('url.protocol === "https:"');
    expect(inspection).toContain('new Set(["irhaapparels.com", "www.irhaapparels.com"])');
    expect(inspection).toContain("ALLOWED_HOSTNAMES.has(url.hostname)");
    expect(inspection).toContain("const MAX_INSPECTION_URLS = 25");
    expect(inspection).toContain("urls.length > MAX_INSPECTION_URLS");
  });

  it("never returns managed secret values and keeps the global opt-in absent", () => {
    for (const source of functions) {
      expect(source).not.toMatch(/json(?:Resp)?\s*\(\s*\{[^}]*LOVABLE_API_KEY/s);
      expect(source).not.toMatch(/json(?:Resp)?\s*\(\s*\{[^}]*GOOGLE_SEARCH_CONSOLE_API_KEY/s);
      expect(source).not.toContain("detail: payload");
    }
    expect(analytics).toContain("Secret values are never returned.");
    expect(config).not.toContain("IRHA_ENABLE_LOVABLE_RUNTIME");
  });
});
