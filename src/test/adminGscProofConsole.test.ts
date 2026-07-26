import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const admin = readFileSync("src/pages/Admin.tsx", "utf8");
const center = readFileSync("src/components/admin/GoogleSearchCenter.tsx", "utf8");
const exactProperty = "sc-domain:irhaapparels.com";

function functionBody(source: string, name: string, nextName: string) {
  const start = source.indexOf(`function ${name}`);
  const end = source.indexOf(`function ${nextName}`, start + 1);
  expect(start).toBeGreaterThanOrEqual(0);
  expect(end).toBeGreaterThan(start);
  return source.slice(start, end);
}

describe("authenticated admin GSC proof console", () => {
  it("mounts GoogleSearchCenter beside MultilingualSeoPanel without weakening admin authentication", () => {
    expect(admin).toContain('import GoogleSearchCenter from "@/components/admin/GoogleSearchCenter"');
    expect(admin).toMatch(/case "seo":\s*return\s*\(\s*<div[^>]*space-y-[^>]*>\s*<MultilingualSeoPanel\s*\/>\s*<GoogleSearchCenter\s*\/>/s);
    expect(admin).toContain('if (!user) return <Navigate to="/auth" replace />');
    expect(admin).toContain("{!isAdmin ? (");
    expect(admin).toContain("<AccessDenied email={user.email} />");
  });

  it("runs only scoped GSC functions for health, query, page and homepage Inspection", () => {
    const invoked = [...center.matchAll(/supabase\.functions\.invoke\("([^"]+)"/g)].map((match) => match[1]);
    expect(new Set(invoked)).toEqual(new Set(["gsc-analytics", "gsc-inspect"]));
    expect(center).toContain('body: { action: "health" }');
    expect(center).toContain('runAnalyticsProof("query")');
    expect(center).toContain('runAnalyticsProof("page")');
    expect(center).toContain('body: { urls: [HOME_URL] }');
    expect(center).toContain('const HOME_URL = `${SITE}/`');
  });

  it("requires the direct-OAuth health contract and exact Domain property", () => {
    expect(center).toContain(`const GSC_PROPERTY = "${exactProperty}"`);
    expect(center).toContain('const GSC_AUTH_MODE = "google_oauth_refresh_token"');
    for (const field of [
      "oauthClientIdConfigured",
      "oauthClientSecretConfigured",
      "oauthRefreshTokenConfigured",
      "tokenExchangeVerified",
      "propertyAccessVerified",
      "permissionLevel",
      "authMode",
    ]) expect(center).toContain(field);
    expect(center).not.toContain("connectorGatewayConfigured");
    expect(center).not.toContain("gscConnectionConfigured");
    expect(center).not.toContain("Connector gateway");
    expect(center).not.toContain("GSC connection");
  });

  it("keeps mutations absent and approved Inspection hosts enforced", () => {
    expect(center).toContain('new Set(["irhaapparels.com", "www.irhaapparels.com"])');
    expect(center).not.toContain("sitemap-ping");
    expect(center).not.toContain("Submit sitemap");
    expect(center).not.toContain("Request indexing");
    expect(center).not.toContain("urlNotifications:publish");
    expect(center).not.toContain("indexing.googleapis.com");
  });

  it("does not manually read or expose the browser session or Google credentials", () => {
    expect(center).not.toContain("getSession(");
    expect(center).not.toContain("getUser(");
    expect(center).not.toContain("Authorization");
    expect(center).not.toContain("access_token");
    expect(center).not.toContain("GSC_OAUTH_CLIENT_ID");
    expect(center).not.toContain("GSC_OAUTH_CLIENT_SECRET");
    expect(center).not.toContain("GSC_OAUTH_REFRESH_TOKEN");
    expect(center).not.toContain("localStorage");
    expect(center).not.toContain("sessionStorage");
  });

  it("copies a strict field-by-field allowlist without internal payloads, rows, query keys or credentials", () => {
    const safeReport = functionBody(center, "buildSafeProofReport", "GoogleSearchCenter");

    for (const mapping of [
      "executionTimestamp: proof.executionTimestamp",
      "productionBuildSha: proof.productionBuildSha",
      "functionSuccess: proof.health.functionSuccess",
      "ok: proof.health.ok",
      "ready: proof.health.ready",
      "state: proof.health.state",
      "authMode: proof.health.authMode",
      "oauthClientIdConfigured: proof.health.oauthClientIdConfigured",
      "oauthClientSecretConfigured: proof.health.oauthClientSecretConfigured",
      "oauthRefreshTokenConfigured: proof.health.oauthRefreshTokenConfigured",
      "siteUrlConfigured: proof.health.siteUrlConfigured",
      "tokenExchangeVerified: proof.health.tokenExchangeVerified",
      "propertyAccessVerified: proof.health.propertyAccessVerified",
      "permissionLevel: proof.health.permissionLevel",
      "effectiveProperty: proof.health.effectiveProperty",
    ]) expect(safeReport).toContain(mapping);

    for (const section of ["queryAnalytics", "pageAnalytics"]) {
      for (const field of [
        "dimension",
        "days",
        "property",
        "rowCount",
        "totalClicks",
        "totalImpressions",
        "weightedCtr",
        "weightedAveragePosition",
        "pass",
      ]) {
        expect(safeReport).toContain(`${field}: proof.${section}.${field}`);
      }
    }

    for (const field of [
      "url",
      "property",
      "verdict",
      "coverageState",
      "robotsTxtState",
      "indexingState",
      "pageFetchState",
      "lastCrawlTime",
      "userCanonical",
      "googleCanonical",
      "sitemapAssociation",
      "pass",
    ]) {
      expect(safeReport).toContain(`${field}: proof.homepageInspection.${field}`);
    }

    expect(safeReport).not.toContain("...");
    expect(safeReport).not.toMatch(/proof\.(?:health|queryAnalytics|pageAnalytics|homepageInspection)\.(?:rows|keys|error|inspectionLink)\b/);
    expect(safeReport).not.toMatch(/\berror\s*:/);
    expect(safeReport).not.toContain("inspectionLink");
    expect(safeReport).not.toContain("accessToken");
    expect(safeReport).not.toContain("refreshToken");
    expect(safeReport).not.toContain("clientId");
    expect(safeReport).not.toContain("clientSecret");
    expect(safeReport).not.toContain("Authorization");
    expect(safeReport).not.toContain("session");
    expect(safeReport).not.toContain("raw");
    expect(center).toContain("JSON.stringify(buildSafeProofReport(proof), null, 2)");
  });
});
