import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const shared = readFileSync("supabase/functions/_shared/pinterest.ts", "utf8");
const callback = readFileSync("supabase/functions/pinterest-oauth-callback/index.ts", "utf8");
const admin = readFileSync("supabase/functions/pinterest-admin/index.ts", "utf8");
const migration = readFileSync("supabase/migrations/20260804003000_pinterest_oauth_control.sql", "utf8");

describe("Pinterest OAuth and alt-text automation", () => {
  it("uses the exact production callback and authorization-code exchange", () => {
    expect(shared).toContain('PINTEREST_CALLBACK_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co/functions/v1/pinterest-oauth-callback"');
    expect(callback).toContain('grant_type: "authorization_code"');
    expect(callback).toContain("redirect_uri: PINTEREST_CALLBACK_URL");
    expect(callback).toContain("Authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`");
  });

  it("protects OAuth state against CSRF and never persists the raw state", () => {
    expect(admin).toContain("sha256Hex(state)");
    expect(admin).toContain("state_hash: stateHash");
    expect(callback).toContain("sha256Hex(state)");
    expect(migration).toContain("state_hash text primary key");
    expect(migration).not.toContain("state text");
  });

  it("keeps Pinterest tokens service-only and encrypted at rest", () => {
    expect(shared).toContain('Deno.env.get("PINTEREST_APP_SECRET")');
    expect(shared).toContain('name: "AES-GCM"');
    expect(migration).toContain("access_token_cipher text not null");
    expect(migration).toContain("refresh_token_cipher text");
    expect(migration).toContain("enable row level security");
    expect(migration).toContain("revoke all on table public.pinterest_oauth_credentials from public, anon, authenticated");
    expect(admin).not.toContain("access_token_cipher");
  });

  it("refreshes tokens server-side before expiry", () => {
    expect(shared).toContain('grant_type: "refresh_token"');
    expect(shared).toContain("expiresAt - Date.now() < 60 * 60 * 1000");
    expect(shared).toContain("await storeTokenBundle(payload)");
  });

  it("paginates inventory safely and does not require owner bookmark handling", () => {
    expect(admin).toContain('url.searchParams.set("page_size", "250")');
    expect(admin).toContain('url.searchParams.set("bookmark", bookmark)');
    expect(admin).toContain("pages >= 10");
  });

  it("defaults write actions to dry-run and caps each live batch", () => {
    expect(admin).toContain('body?.dry_run !== false');
    expect(admin).toContain("Math.min(Math.max(Number(body?.limit) || 10, 1), 25)");
    expect(admin).toContain('method: "PATCH"');
    expect(admin).toContain("JSON.stringify({ alt_text: altText })");
  });

  it("only generates alt text for exact published Irha product links", () => {
    expect(admin).toContain('/(^|\\.)irhaapparels\\.com$/i');
    expect(admin).toContain('.eq("canonical_path", path)');
    expect(admin).toContain('.eq("is_published", true)');
    expect(admin).toContain("Product image of ${product.name}");
  });
});
