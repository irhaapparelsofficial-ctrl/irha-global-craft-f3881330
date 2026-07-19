import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const edge = read("supabase/functions/release-health/index.ts");
const panel = read("src/components/admin/ReleaseHealthPanel.tsx");
const shell = read("src/pages/Admin.tsx");
const config = read("supabase/config.toml");

describe("admin release health", () => {
  it("requires platform JWT plus an explicit admin role", () => {
    expect(config).toContain("[functions.release-health]\nverify_jwt = true");
    expect(edge).toContain("userClient.auth.getUser()");
    expect(edge).toContain('.from("user_roles")');
    expect(edge).toContain('.eq("role", "admin")');
    expect(edge).toContain('return json({ error: "Admin only" }, 403, cors)');
  });

  it("keeps GitHub and service-role credentials server-side", () => {
    expect(edge).toContain('Deno.env.get("GITHUB_READ_TOKEN")');
    expect(edge).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(panel).not.toContain("GITHUB_READ_TOKEN");
    expect(panel).not.toContain("SUPABASE_SERVICE_ROLE_KEY");
    expect(edge).toContain("Bearer [redacted]");
  });

  it("collects exact release identity and fail-closed production HTTP evidence", () => {
    for (const token of [
      "/commits/main",
      "/actions/runs?branch=main&per_page=100",
      "/build.json?release_health=",
      "production_source_identity_unverified",
      "production_source_branch_not_main",
      "production_repository_identity_mismatch",
      "production_main_sha_mismatch_or_unproven",
      "www_canonical_redirect_failed",
      "real_404_failed",
      "security_headers_incomplete",
      "sitemap_missing_or_empty",
      "wrong_production_supabase_project",
    ]) {
      expect(edge).toContain(token);
    }
    expect(edge).toContain('redirect: "manual"');
    expect(edge).toContain("fetchWithTimeout");
    expect(edge).toContain('source_identity_state !== "verified"');
    expect(edge).toContain('source_branch !== "main"');
  });

  it("verifies every required security response header including CSP frame-ancestors", () => {
    for (const header of [
      "strict-transport-security",
      "content-security-policy",
      "x-content-type-options",
      "referrer-policy",
      "permissions-policy",
    ]) {
      expect(edge).toContain(`"${header}"`);
    }
    expect(edge).toContain("frame-ancestors");
  });

  it("does not fake backup or controlled-form completion", () => {
    expect(edge).toContain('status: "unverified"');
    expect(edge).toContain('controlled_current_release_test: "unverified"');
    expect(edge).toContain("A verified backup identifier is required before production DDL");
    expect(panel).toContain("Controlled current-release forms");
    expect(panel).toContain("Fresh database backup");
  });

  it("is read-only and does not expose deployment or message actions", () => {
    expect(edge).toContain("destructive_write: false");
    expect(edge).not.toMatch(/\.insert\s*\(|\.update\s*\(|\.delete\s*\(|\.upsert\s*\(/);
    expect(edge).not.toContain("wrangler");
    expect(edge).not.toContain("supabase db push");
    expect(edge).not.toContain("send_email");
    expect(edge).not.toContain("whatsapp_messages");
    expect(panel).not.toContain("Publish now");
    expect(panel).not.toContain("Apply migration");
  });

  it("shows the release panel before existing production health diagnostics", () => {
    expect(shell).toContain('import ReleaseHealthPanel from "@/components/admin/ReleaseHealthPanel"');
    expect(shell).toContain("<><ReleaseHealthPanel /><ProductionHealthPanel /></>");
    expect(shell.indexOf("<ReleaseHealthPanel />")).toBeLessThan(shell.indexOf("<ProductionHealthPanel />"));
  });

  it("surfaces every required owner release-health field", () => {
    for (const label of [
      "Latest GitHub main",
      "Production build",
      "Owner Supabase",
      "Quality Gate",
      "Dependency Security",
      "Production Smoke",
      "Cloudflare release",
      "www → apex",
      "Random unknown URL",
      "Security headers",
      "Route sitemap",
      "Controlled current-release forms",
      "Search Console sitemap",
      "Fresh database backup",
      "Rollback reference",
    ]) {
      expect(panel).toContain(label);
    }
  });
});
