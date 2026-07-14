import { describe, expect, it } from "vitest";
// @ts-expect-error Cloudflare Pages worker is intentionally plain JavaScript.
import worker, { legacyAliasTarget, shouldNoIndex } from "../../public/_worker.js";

describe("Cloudflare SEO routing", () => {
  it("maps legacy buyer and UUID URLs to canonical paths", () => {
    expect(legacyAliasTarget("/buyer-trust-center")).toBe("/buyer-trust");
    expect(legacyAliasTarget("/buyer-trust-centre/")).toBe("/buyer-trust");
    expect(
      legacyAliasTarget(
        "/products/d22ac15e-d657-4a4c-804c-fb8697ceb050/plush-bathrobe-sleep-robe",
      ),
    ).toBe("/products/leisure-nightwear/plush-bathrobe-sleep-robe");
  });

  it("returns one-hop permanent redirects and preserves query parameters", async () => {
    const response = await worker.fetch(
      new Request(
        "https://irhaapparels.com/buyer-trust-center?utm_source=legacy",
      ),
      {},
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      "https://irhaapparels.com/buyer-trust?utm_source=legacy",
    );
    expect(response.headers.get("x-irha-legacy-redirect")).toBe(
      "canonical-alias",
    );
  });

  it("recognizes all private application route prefixes", () => {
    expect(shouldNoIndex("/admin")).toBe(true);
    expect(shouldNoIndex("/admin/live-chat")).toBe(true);
    expect(shouldNoIndex("/auth/callback")).toBe(true);
    expect(shouldNoIndex("/products")).toBe(false);
  });

  it("adds HTTP noindex headers to private asset responses", async () => {
    const response = await worker.fetch(
      new Request("https://irhaapparels.com/admin/live-chat"),
      {
        ASSETS: {
          fetch: async () =>
            new Response("<html>Admin</html>", {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            }),
        },
      },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("x-robots-tag")).toBe(
      "noindex, nofollow, noarchive",
    );
    expect(response.headers.get("cache-control")).toContain("no-store");
  });
});
