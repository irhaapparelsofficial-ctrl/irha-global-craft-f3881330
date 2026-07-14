import { describe, expect, it } from "vitest";
import { BLOG_SLUGS } from "./blogPostsTrusted";
import { BUYER_INTENT_PATHS } from "./buyerIntentLandingPages";
import { MARKET_PAGES } from "./marketPages";
// @ts-expect-error The production notification script is intentionally plain ESM JavaScript.
import {
  BLOG_CHANGED_PATHS,
  BUYER_INTENT_CHANGED_PATHS,
  DEFAULT_CHANGED_PATHS,
  MARKET_GUIDE_CHANGED_PATHS,
  ORIGIN,
  buildIndexNowPayload,
} from "../../scripts/ping-search-engines.mjs";

describe("IndexNow changed-URL coverage", () => {
  it("covers every audited buyer-intent page", () => {
    expect(new Set(BUYER_INTENT_CHANGED_PATHS)).toEqual(new Set(BUYER_INTENT_PATHS));
  });

  it("covers the market hub and every country sourcing guide", () => {
    const expected = ["/markets", ...MARKET_PAGES.map((market) => `/markets/${market.slug}`)];
    expect(new Set(MARKET_GUIDE_CHANGED_PATHS)).toEqual(new Set(expected));
  });

  it("covers the blog hub and every trusted article URL", () => {
    const expected = ["/blog", ...BLOG_SLUGS.map((slug) => `/blog/${slug}`)];
    expect(new Set(BLOG_CHANGED_PATHS)).toEqual(new Set(expected));
  });

  it("keeps the default payload canonical and duplicate-free", () => {
    expect(new Set(DEFAULT_CHANGED_PATHS).size).toBe(DEFAULT_CHANGED_PATHS.length);
    for (const path of DEFAULT_CHANGED_PATHS) {
      expect(path.startsWith("/")).toBe(true);
      expect(path.startsWith("//")).toBe(false);
      expect(path).not.toContain("..");
    }

    const payload = buildIndexNowPayload(DEFAULT_CHANGED_PATHS.map((path: string) => `${ORIGIN}${path}`));
    expect(payload.host).toBe("irhaapparels.com");
    expect(payload.keyLocation).toMatch(/^https:\/\/irhaapparels\.com\/[a-f0-9]+\.txt$/);
    expect(payload.urlList).toHaveLength(DEFAULT_CHANGED_PATHS.length);
    expect(payload.urlList.every((url: string) => url.startsWith(`${ORIGIN}/`) || url === `${ORIGIN}/`)).toBe(true);
  });
});
