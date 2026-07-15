import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edge = readFileSync("supabase/functions/scheduled-sitemap-submit/index.ts", "utf8");
const controlMigration = readFileSync("supabase/migrations/20260716034000_secure_sitemap_scheduler.sql", "utf8");
const queueMigration = readFileSync("supabase/migrations/20260716035000_queue_and_finalize_sitemap_submission.sql", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");

describe("secure scheduled sitemap submission", () => {
  it("submits only the canonical domain property and sitemap", () => {
    expect(edge).toContain('const SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(edge).toContain('const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml"');
    expect(edge).not.toContain("www.irhaapparels.com");
  });

  it("uses the same working connector contract as the authenticated sitemap tool", () => {
    expect(edge).toContain('const GATEWAY = "https://connector-gateway.lovable.dev/google_search_console"');
    expect(edge).toContain('Deno.env.get("LOVABLE_API_KEY")');
    expect(edge).toContain('Deno.env.get("GOOGLE_SEARCH_CONSOLE_API_KEY")');
    expect(edge).toContain('"X-Connection-Api-Key": gscKey');
  });

  it("verifies the high-entropy Vault token twice without storing the raw value in source", () => {
    expect(edge).toContain('req.headers.get("x-irha-sitemap-token")');
    expect(edge).toContain('/^[A-Za-z0-9_-]{40,120}$/');
    expect(edge).toContain("sha256Hex(token)");
    expect(edge).toContain("constantTimeEqual(providedHash, SCHEDULER_TOKEN_HASH)");
    expect(config).toContain("[functions.scheduled-sitemap-submit]");
    expect(config).toContain("verify_jwt = false");
    expect(controlMigration).toContain("token_hash text not null");
    expect(controlMigration).toContain("extensions.digest(_token, 'sha256')");
  });

  it("rate-limits, queues and finalizes database-audited submissions", () => {
    expect(controlMigration).toContain("interval '20 hours'");
    expect(controlMigration).toContain("interval '30 minutes'");
    expect(controlMigration).toContain("enable row level security");
    expect(queueMigration).toContain("public.queue_sitemap_submission");
    expect(queueMigration).toContain("public.finalize_sitemap_submission");
    expect(queueMigration).toContain("last_request_id bigint");
    expect(queueMigration).toContain("net.http_post");
    expect(queueMigration).toContain("net._http_response");
  });

  it("returns minimal results without exposing provider response bodies or credential values", () => {
    expect(edge).toContain('error: "google_submission_failed"');
    expect(edge).toContain('error: "submission_request_failed"');
    expect(edge).not.toContain("response_body");
    expect(edge).not.toContain("lovable_api_key:");
    expect(edge).not.toContain("google_search_console_api_key:");
    expect(edge).not.toContain("token_value:");
  });
});
