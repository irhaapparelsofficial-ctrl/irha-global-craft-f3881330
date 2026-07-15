import { describe, expect, it } from "vitest";
// @ts-expect-error Cloudflare Pages worker is intentionally plain JavaScript.
import worker, { robotsText } from "../../../public/_worker.js";

const BUYER_PATH = "/de/bekleidungshersteller-deutschland";

describe("final Lighthouse SEO and best-practices contract", () => {
  it("serves a standards-valid robots.txt directly from the worker", async () => {
    const response = await worker.fetch(
      new Request("https://irhaapparels.com/robots.txt"),
      {},
    );
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/plain; charset=utf-8");
    expect(response.headers.get("cache-control")).toContain("no-transform");
    expect(response.headers.get("x-irha-robots-source")).toBe("worker-valid");
    expect(body).toBe(robotsText());
    expect(body).toContain("User-agent: *");
    expect(body).toContain("Sitemap: https://irhaapparels.com/sitemap.xml");
    expect(body).not.toContain("Content-Signal");
  });

  it("allows the Cloudflare Web Analytics beacon without weakening other CSP controls", async () => {
    const response = await worker.fetch(
      new Request(`https://irhaapparels.com${BUYER_PATH}`),
      {
        ASSETS: {
          fetch: async () =>
            new Response("<html>Static Germany buyer page</html>", {
              status: 200,
              headers: {
                "content-type": "application/octet-stream",
                "content-security-policy": "default-src 'none'",
              },
            }),
        },
      },
    );
    const csp = response.headers.get("content-security-policy") || "";

    expect(response.status).toBe(200);
    expect(csp).toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("script-src-elem 'self' 'unsafe-inline'");
    expect(csp).toContain("https://static.cloudflareinsights.com");
    expect(csp).toContain("https://cloudflareinsights.com");
    expect(csp).toContain("https://*.cloudflareinsights.com");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'self'");
    expect(csp).toContain("upgrade-insecure-requests");
  });
});
