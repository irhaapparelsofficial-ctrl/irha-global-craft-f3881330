import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(
  resolve(process.cwd(), "supabase/functions/generate-mockup/index.ts"),
  "utf8",
);

describe("generate-mockup CORS safety", () => {
  it("allows only production, trusted preview and local development origins", () => {
    expect(source).toContain('const SITE_URL = "https://irhaapparels.com"');
    expect(source).toContain('url.hostname === "www.irhaapparels.com"');
    expect(source).toContain('url.hostname.endsWith(".lovable.app")');
    expect(source).toContain('url.hostname === "localhost"');
    expect(source).toContain('url.hostname === "127.0.0.1"');
    expect(source).not.toContain('"Access-Control-Allow-Origin": "*"');
  });

  it("rejects untrusted browser origins before rendering", () => {
    const rejection = source.indexOf('return respond({ error: "origin_not_allowed" }, 403)');
    const render = source.indexOf("const [frontPng, backPng]");
    expect(rejection).toBeGreaterThan(0);
    expect(render).toBeGreaterThan(rejection);
    expect(source).toContain('"Vary": "Origin"');
  });

  it("keeps OPTIONS and all JSON responses on request-specific headers", () => {
    expect(source).toContain('const headers = corsHeaders(origin)');
    expect(source).toContain('return new Response(null, { status: 204, headers })');
    expect(source).toContain('jsonResponse(body, status, headers)');
    expect(source).not.toContain("headers: corsHeaders");
  });
});
