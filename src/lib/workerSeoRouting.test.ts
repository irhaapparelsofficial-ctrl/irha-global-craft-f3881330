import { describe, expect, it } from "vitest";
// @ts-expect-error Cloudflare Pages worker is intentionally plain JavaScript.
import worker, {
  isStaticBuyerPath,
  legacyAliasTarget,
  shouldNoIndex,
  shouldNoIndexCategoryQuery,
} from "../../public/_worker.js";

const GERMANY_BUYER_PATH = "/de/bekleidungshersteller-deutschland";

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

  it("recognizes the five runtime-free Germany buyer pages", () => {
    expect(isStaticBuyerPath(GERMANY_BUYER_PATH)).toBe(true);
    expect(isStaticBuyerPath(`${GERMANY_BUYER_PATH}/`)).toBe(true);
    expect(isStaticBuyerPath("/custom-sportswear-manufacturer-germany")).toBe(true);
    expect(isStaticBuyerPath("/de/sportbekleidung-hersteller")).toBe(true);
    expect(isStaticBuyerPath("/leather-apparel-manufacturer-germany")).toBe(true);
    expect(isStaticBuyerPath("/de/lederbekleidung-hersteller")).toBe(true);
    expect(isStaticBuyerPath("/products/sportswear")).toBe(false);
  });

  it("serves the canonical no-slash buyer URL directly from its static index asset", async () => {
    let fetchedUrl = "";
    const response = await worker.fetch(
      new Request(`https://irhaapparels.com${GERMANY_BUYER_PATH}?utm_source=gsc`),
      {
        ASSETS: {
          fetch: async (request: Request) => {
            fetchedUrl = request.url;
            return new Response("<html>Static Germany buyer page</html>", {
              status: 200,
              headers: { "content-type": "text/html; charset=utf-8" },
            });
          },
        },
      },
    );

    expect(response.status).toBe(200);
    expect(new URL(fetchedUrl).pathname).toBe(`${GERMANY_BUYER_PATH}/index.html`);
    expect(new URL(fetchedUrl).searchParams.get("utm_source")).toBe("gsc");
    expect(response.headers.get("content-location")).toBe(
      `https://irhaapparels.com${GERMANY_BUYER_PATH}`,
    );
    expect(response.headers.get("x-irha-static-buyer-shell")).toBe("runtime-free");
    expect(await response.text()).toContain("Static Germany buyer page");
  });

  it("permanently redirects the trailing-slash duplicate to the canonical buyer URL", async () => {
    const response = await worker.fetch(
      new Request(`https://irhaapparels.com${GERMANY_BUYER_PATH}/?utm_source=duplicate`),
      {},
    );

    expect(response.status).toBe(301);
    expect(response.headers.get("location")).toBe(
      `https://irhaapparels.com${GERMANY_BUYER_PATH}?utm_source=duplicate`,
    );
    expect(response.headers.get("x-irha-canonical-redirect")).toBe(
      "remove-trailing-slash",
    );
  });

  it("recognizes all private application route prefixes", () => {
    expect(shouldNoIndex("/admin")).toBe(true);
    expect(shouldNoIndex("/admin/live-chat")).toBe(true);
    expect(shouldNoIndex("/auth/callback")).toBe(true);
    expect(shouldNoIndex("/products")).toBe(false);
  });

  it("classifies only functional category-query variants for noindex", () => {
    expect(shouldNoIndexCategoryQuery("/products/sportswear", "q=football"))
      .toBe(true);
    expect(shouldNoIndexCategoryQuery("/products/sportswear", "sort=name"))
      .toBe(true);
    expect(
      shouldNoIndexCategoryQuery(
        "/products/sportswear/all-products",
        "subcategory=football-uniforms",
      ),
    ).toBe(true);
    expect(
      shouldNoIndexCategoryQuery(
        "/products/sportswear",
        "utm_source=google&sort=recommended&subcategory=all",
      ),
    ).toBe(false);
    expect(
      shouldNoIndexCategoryQuery(
        "/products/sportswear/custom-football-kit",
        "q=football",
      ),
    ).toBe(false);
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
    expect(response.headers.get("x-irha-noindex-reason")).toBe("private-route");
    expect(response.headers.get("cache-control")).toContain("no-store");
  });

  it("adds HTTP noindex headers to filtered category responses", async () => {
    const response = await worker.fetch(
      new Request(
        "https://irhaapparels.com/products/sportswear?q=football&sort=name",
      ),
      {
        ASSETS: {
          fetch: async () =>
            new Response("<html>Sportswear</html>", {
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
    expect(response.headers.get("x-irha-noindex-reason")).toBe(
      "functional-category-query",
    );
  });
});
