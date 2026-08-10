import { describe, expect, it } from "vitest";
import {
  STATIC_LEGACY_REDIRECTS,
  hasLoopOrSelfRedirect,
  resolveStaticRedirect,
} from "./legacyRedirects";

describe("legacyRedirects", () => {
  it("resolves known aliases and returns null for unknown paths", () => {
    expect(resolveStaticRedirect("/privacy")).toEqual({
      to: "/privacy-policy",
      source: "static",
    });
    expect(resolveStaticRedirect("/dashboard")).toEqual({
      to: "/admin",
      source: "static",
    });
    expect(resolveStaticRedirect("/sportswear-manufacturer-sialkot")).toEqual({
      to: "/products/sportswear",
      source: "static",
    });
    expect(resolveStaticRedirect("/nonexistent-path")).toBeNull();
  });

  it("has no duplicate `from` keys", () => {
    const froms = STATIC_LEGACY_REDIRECTS.map((r) => r.from);
    expect(new Set(froms).size).toBe(froms.length);
  });

  it("all entries are marked 'auto' confidence (no speculation shipped)", () => {
    for (const r of STATIC_LEGACY_REDIRECTS) {
      expect(r.confidence).toBe("auto");
    }
  });

  it("`from` and `to` are never equal (no self-redirects)", () => {
    for (const r of STATIC_LEGACY_REDIRECTS) {
      expect(r.from).not.toBe(r.to);
    }
  });

  it("the shipped rule set has no loops", () => {
    expect(hasLoopOrSelfRedirect(STATIC_LEGACY_REDIRECTS)).toBe(false);
  });

  it("detects a manufactured loop", () => {
    expect(
      hasLoopOrSelfRedirect([
        { from: "/a", to: "/b", confidence: "auto" },
        { from: "/b", to: "/a", confidence: "auto" },
      ]),
    ).toBe(true);
  });

  it("every target starts with `/`", () => {
    for (const r of STATIC_LEGACY_REDIRECTS) {
      expect(r.to.startsWith("/")).toBe(true);
    }
  });
});
