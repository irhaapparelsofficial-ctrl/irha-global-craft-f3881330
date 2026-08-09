import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const provider = readFileSync("supabase/functions/_shared/googleSearchConsoleOAuth.ts", "utf8");
const analytics = readFileSync("supabase/functions/gsc-analytics/index.ts", "utf8");
const inspection = readFileSync("supabase/functions/gsc-inspect/index.ts", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");
const runtime = `${provider}\n${analytics}\n${inspection}`;
const exactProperty = "sc-domain:irhaapparels.com";
const googleAuthorizationInjection = 'headers.set("Authorization", `Bearer ${token.accessToken}`)';

const forbiddenMutations = [
  "sitemaps/submit",
  "sitemaps/delete",
  "urlNotifications:publish",
  "indexing.googleapis.com",
  "sites.add",
  "sites.delete",
  "permissions.create",
  "permissions.delete",
  "permissions.update",
  "searchConsole.users",
];

const forbiddenLegacy = [
  "connector-gateway.lovable.dev",
  "LOVABLE_API_KEY",
  "GOOGLE_SEARCH_CONSOLE_API_KEY",
  "X-Connection-Api-Key",
  "gscManagedConnectorKey",
];

describe("owner-controlled direct Google OAuth GSC contract", () => {
  it("reads exactly the three approved OAuth secret names and posts form-urlencoded refresh-token exchange", () => {
    const reads = [...provider.matchAll(/Deno\.env\.get\("(GSC_OAUTH_[A-Z_]+)"\)/g)].map((match) => match[1]);
    expect(new Set(reads)).toEqual(new Set([
      "GSC_OAUTH_CLIENT_ID",
      "GSC_OAUTH_CLIENT_SECRET",
      "GSC_OAUTH_REFRESH_TOKEN",
    ]));
    expect(provider).toContain('GSC_OAUTH_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"');
    expect(provider).toContain('"Content-Type": "application/x-www-form-urlencoded"');
    expect(provider).toContain('grant_type: "refresh_token"');
    expect(provider).toContain("client_id: credentials.clientId");
    expect(provider).toContain("client_secret: credentials.clientSecret");
    expect(provider).toContain("refresh_token: credentials.refreshToken");
  });

  it("separates Supabase caller-JWT forwarding from Google access-token injection", () => {
    expect(inspection).toContain('req.headers.get("Authorization")');
    expect(inspection).toContain('.replace(/^Bearer\\s+/i, "")');
    expect(inspection).toContain('Authorization: `Bearer ${token}`');
    expect(inspection).toContain("auth.getUser()");
    expect(inspection).toContain('.eq("role", "admin")');
    expect(inspection).toContain('from "../_shared/googleSearchConsoleOAuth.ts"');
    expect(inspection).toContain("googleSearchConsoleFetch<InspectionPayload>");
    expect(inspection).toContain("await googleSearchConsoleFetch<InspectionPayload>");

    for (const secretName of [
      "GSC_OAUTH_CLIENT_ID",
      "GSC_OAUTH_CLIENT_SECRET",
      "GSC_OAUTH_REFRESH_TOKEN",
    ]) {
      expect(analytics).not.toContain(secretName);
      expect(inspection).not.toContain(secretName);
    }
    expect(analytics).not.toContain("https://oauth2.googleapis.com/token");
    expect(inspection).not.toContain("https://oauth2.googleapis.com/token");
    expect(analytics).not.toContain("token.accessToken");
    expect(inspection).not.toContain("token.accessToken");
    expect(analytics).not.toContain('headers.set("Authorization"');
    expect(inspection).not.toContain('headers.set("Authorization"');

    expect(provider).toContain(googleAuthorizationInjection);
    expect(analytics).not.toContain(googleAuthorizationInjection);
    expect(inspection).not.toContain(googleAuthorizationInjection);
    expect(runtime.split(googleAuthorizationInjection)).toHaveLength(2);
  });

  it("validates token shape, caches only in module memory and never returns the Google token to callers", () => {
    expect(provider).toContain("let cachedAccessToken");
    expect(provider).toContain("TOKEN_EXPIRY_SAFETY_SECONDS = 60");
    expect(provider).toContain("payload?.access_token");
    expect(provider).toContain("payload?.expires_in");
    expect(provider).toContain("payload?.token_type");
    expect(provider).toContain('return { ok: true, token_exchange: true, status: response.status, data }');
    const exportedResultType = provider.slice(
      provider.indexOf("export type GoogleSearchConsoleFetchResult"),
      provider.indexOf("let cachedAccessToken"),
    );
    expect(exportedResultType).not.toContain("accessToken");
    const publicFetch = provider.slice(provider.indexOf("export async function googleSearchConsoleFetch"));
    expect(publicFetch).not.toContain("accessToken: token.accessToken");
    expect(provider).not.toContain("localStorage");
    expect(provider).not.toContain("sessionStorage");
    expect(provider).not.toContain("indexedDB");
    for (const method of ["log", "error", "warn", "info", "debug", "trace", "dir", "table"]) {
      expect(provider).not.toMatch(new RegExp(`\\bconsole\\s*\\.\\s*${method}\\s*\\(`));
    }
    expect(provider).not.toMatch(/\bDeno\s*\.\s*inspect\s*\(/);
    expect(provider).not.toMatch(/\bJSON\s*\.\s*stringify\s*\(\s*token\b/);
    expect(provider).not.toMatch(/\bJSON\s*\.\s*stringify\s*\(\s*credentials\b/);
    for (const field of ["access_token", "refreshToken", "clientSecret", "payload", "response"]) {
      expect(provider).not.toMatch(
        new RegExp(
          `\\bconsole\\s*\\.\\s*(?:log|error|warn|info|debug|trace|dir|table)\\s*\\([^)]*\\b${field}\\b`,
          "s",
        ),
      );
    }
  });

  it("uses deterministic timeouts and sanitized internal failure codes", () => {
    expect(provider).toContain("OAUTH_TIMEOUT_MS");
    expect(provider).toContain("GOOGLE_REQUEST_TIMEOUT_MS");
    for (const code of [
      "gsc_oauth_not_configured",
      "gsc_oauth_invalid_client",
      "gsc_oauth_reauthorization_required",
      "gsc_oauth_rate_limited",
      "gsc_oauth_token_exchange_failed",
      "gsc_google_request_failed",
    ]) expect(provider).toContain(code);
    expect(provider).not.toContain("error_description");
    expect(provider).not.toContain("JSON.stringify(payload)");
  });

  it("uses exact read-only Google endpoints and sites.list health verification", () => {
    expect(provider).toContain('GSC_SITES_LIST_ENDPOINT = "https://www.googleapis.com/webmasters/v3/sites"');
    expect(analytics).toContain("GSC_SITES_LIST_ENDPOINT");
    expect(analytics).toContain("/searchAnalytics/query");
    expect(inspection).toContain('URL_INSPECTION_ENDPOINT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"');
    expect(inspection).toContain("inspectionUrl: url, siteUrl: property");
    for (const fragment of forbiddenMutations) expect(runtime).not.toContain(fragment);
  });

  it("enforces exact property, intended gateway boundary, admin role, strict hosts and maximum sequential batch", () => {
    expect(analytics).toContain(`GSC_SITE_PROPERTY = "${exactProperty}"`);
    expect(inspection).toContain(`GSC_SITE_PROPERTY = "${exactProperty}"`);
    expect(config).toMatch(/\[functions\.gsc-analytics\]\s+verify_jwt\s*=\s*false/);
    expect(config).toMatch(/\[functions\.gsc-inspect\]\s+verify_jwt\s*=\s*true/);
    for (const source of [analytics, inspection]) {
      expect(source).toContain("auth.getUser()");
      expect(source).toContain('.eq("role", "admin")');
    }
    expect(inspection).toContain('new Set(["irhaapparels.com", "www.irhaapparels.com"])');
    expect(inspection).toContain("const MAX_INSPECTION_URLS = 25");
    expect(inspection).toMatch(/for \(const url of urls\) results\.push\(await inspect\(url, site\.property\)\)/);
    expect(inspection).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("contains no Lovable gateway or old GSC credentials in the direct-OAuth runtime", () => {
    for (const fragment of forbiddenLegacy) expect(runtime).not.toContain(fragment);
  });
});
