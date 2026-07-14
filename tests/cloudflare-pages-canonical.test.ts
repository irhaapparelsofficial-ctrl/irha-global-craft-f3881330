import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const worker = readFileSync(resolve(process.cwd(), "public/_worker.js"), "utf8");

describe("Cloudflare Pages canonical host worker", () => {
  it("redirects www to the HTTPS apex while preserving path and query", () => {
    expect(worker).toContain('const APEX_ORIGIN = "https://irhaapparels.com"');
    expect(worker).toContain('const WWW_HOST = "www.irhaapparels.com"');
    expect(worker).toContain("`${url.pathname}${url.search}`");
    expect(worker).toContain('"X-Irha-Canonical-Redirect": "www-to-apex"');
  });

  it("uses permanent redirect semantics and preserves non-GET methods", () => {
    expect(worker).toContain('request.method === "GET" || request.method === "HEAD" ? 301 : 308');
  });

  it("serves the existing Pages application through the static asset binding", () => {
    expect(worker).toContain("env.ASSETS.fetch(request)");
    expect(worker).toContain('status: 503');
    expect(worker).not.toContain("return fetch(request)");
  });
});
