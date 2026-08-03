import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const edge = readFileSync("supabase/functions/sitemap-ping/index.ts", "utf8");
const provider = readFileSync("supabase/functions/_shared/googleSearchConsoleOAuth.ts", "utf8");
const controlMigration = readFileSync("supabase/migrations/20260716034000_secure_sitemap_scheduler.sql", "utf8");
const queueMigration = readFileSync("supabase/migrations/20260716035000_queue_and_finalize_sitemap_submission.sql", "utf8");
const config = readFileSync("supabase/config.toml", "utf8");

describe("secure scheduled sitemap submission", () => {
  it("submits only the canonical domain property and sitemap", () => {
    expect(edge).toContain('const SITE_PROPERTY = "sc-domain:irhaapparels.com"');
    expect(edge).toContain('const SITEMAP_URL = "https://irhaapparels.com/sitemap.xml"');
    expect(edge).not.toContain("www.irhaapparels.com");
  });

  it("reuses the owner-controlled direct Google OAuth source of truth", () => {
    expect(edge).toContain('from "../_shared/googleSearchConsoleOAuth.ts"');
    expect(edge).toContain("googleSearchConsoleFetch<null>");
    expect(edge).toContain("https://www.googleapis.com/webmasters/v3/sites/${siteEnc}/sitemaps/${sitemapEnc}");
    expect(edge).toContain('{ method: "PUT" }');
    expect(provider).toContain("/sitemaps(?:\\/[^/?#]+)?$");
    expect(edge).not.toContain("connector-gateway.lovable.dev");
    expect(edge).not.toContain("LOVABLE_API_KEY");
    expect(edge).not.toContain("GOOGLE_SEARCH_CONSOLE_API_KEY");
    expect(edge).not.toContain("X-Connection-Api-Key");
    expect(queueMigration).toContain("/functions/v1/sitemap-ping");
    expect(queueMigration).not.toContain("/functions/v1/scheduled-sitemap-submit");
  });

  it("supports verified admin/service-role auth and the separate Vault scheduler token", () => {
    expect(edge).toContain('req.headers.get("x-irha-sitemap-token")');
    expect(edge).toContain('/^[A-Za-z0-9_-]{40,120}$/');
    expect(edge).toContain("sha256Hex(schedulerToken)");
    expect(edge).toContain("constantTimeEqual(providedHash, SCHEDULER_TOKEN_HASH)");
    expect(edge).toContain('req.headers.get("Authorization")');
    expect(edge).toContain('Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")');
    expect(edge).toContain("constantTimeEqual(token, serviceRoleKey)");
    expect(edge).not.toContain("parseJwtRole(");
    expect(edge).toContain('.eq("role", "admin")');
    expect(config).toContain("[functions.sitemap-ping]\nverify_jwt = false");
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

  it("returns sanitized results without exposing provider credentials", () => {
    expect(edge).toContain('error: upstream.code');
    expect(edge).toContain("upstream_status: upstream.upstream_status ?? null");
    expect(edge).not.toContain("response_body");
    expect(edge).not.toContain("access_token");
    expect(edge).not.toContain("refresh_token");
    expect(edge).not.toContain("client_secret");
    expect(edge).not.toContain("lovable_api_key:");
    expect(edge).not.toContain("google_search_console_api_key:");
    expect(edge).not.toContain("token_value:");
  });
});
