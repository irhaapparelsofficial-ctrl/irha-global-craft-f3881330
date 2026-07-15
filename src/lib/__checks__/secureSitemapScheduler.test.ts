import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edge = readFileSync("supabase/functions/scheduled-sitemap-submit/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260716034000_secure_sitemap_scheduler.sql", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");

describe("secure scheduled sitemap submission", () => {
  it("submits only the canonical domain property and sitemap", () => {
    expect(edge).toContain('const SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(edge).toContain('const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml"');
    expect(edge).not.toContain("www.irhaapparels.com");
  });

  it("uses a separate high-entropy scheduler token and database claim", () => {
    expect(edge).toContain('req.headers.get("x-irha-sitemap-token")');
    expect(edge).toContain('/^[A-Za-z0-9_-]{40,120}$/');
    expect(edge).toContain('supabase.rpc("claim_sitemap_submission"');
    expect(edge).toContain('supabase.rpc("record_sitemap_submission_result"');
    expect(config).toContain("[functions.scheduled-sitemap-submit]");
    expect(config).toContain("verify_jwt = false");
  });

  it("stores only the token hash and enforces bounded submission frequency", () => {
    expect(migration).toContain("token_hash text not null");
    expect(migration).toContain("extensions.digest(_token, 'sha256')");
    expect(migration).toContain("interval '20 hours'");
    expect(migration).toContain("interval '30 minutes'");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.sitemap_submission_control");
  });

  it("returns minimal results without exposing provider response bodies", () => {
    expect(edge).toContain('error: "google_submission_failed"');
    expect(edge).toContain('error: "submission_request_failed"');
    expect(edge).not.toContain("response_body");
    expect(edge).not.toContain("gatewayKey,");
  });
});
