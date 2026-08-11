import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const read = (path: string) => readFileSync(path, "utf8");

describe("GP-4V-R2 canonical ownership closure", () => {
  it("runs the SPA SEO ownership seal after the final broad public-contract normalizer", () => {
    const versioner = read("scripts/version-official-brand-assets.mjs");
    const phase1Index = versioner.indexOf('await import("./finalize-phase1-public-contract.mjs")');
    const ownershipIndex = versioner.indexOf('await import("./finalize-spa-seo-ownership.mjs")');
    expect(phase1Index).toBeGreaterThan(-1);
    expect(ownershipIndex).toBeGreaterThan(phase1Index);
  });

  it("requires one marked static canonical before React takes ownership", () => {
    const seal = read("scripts/finalize-spa-seo-ownership.mjs");
    expect(seal).toContain('data-irha-fallback-seo="true"');
    expect(seal).toContain("expected exactly one static canonical before SPA ownership seal");
    expect(seal).toContain("static canonical ownership marker was not sealed deterministically");
    expect(seal).toContain("route.canonicalUrl");
  });

  it("derives published core Cloudflare routes from the authoritative runtime route-content map", () => {
    const seal = read("scripts/finalize-spa-seo-ownership.mjs");
    const routeContent = read("src/lib/routeContent.mjs");
    expect(seal).toContain("CORE_ROUTE_CONTENT");
    expect(seal).toContain('const setName = "GP4V_PUBLISHED_CORE_PATHS";');
    expect(seal).toContain("if (${setName}.has(normalized)) return true;");
    expect(routeContent).toContain('"/factory-capability-video": route({');
  });

  it("keeps React cleanup central and marker-based rather than route-specific", () => {
    const seo = read("src/components/SEO.tsx");
    expect(seo).toContain(`document.querySelectorAll('[data-irha-fallback-seo="true"]')`);
    expect(seo).not.toContain('pathname === "/factory-capability-video"');
  });

  it("keeps real R2 browser acceptance strict across static, runtime, SPA, media and enlargement contracts", () => {
    const acceptance = read("scripts/ci/gp4v-r2-browser-acceptance.mjs");
    expect(acceptance).toContain("verifyRawStaticCanonicals");
    expect(acceptance).toContain("assertSingleCanonical");
    expect(acceptance).toContain("fallbackSeoNodeCount === 0");
    expect(acceptance).toContain("homepageMp4BeforeIntent: 0");
    expect(acceptance).toContain("currentTime > 0.2");
    expect(acceptance).toContain("playback.duration > 74 && playback.duration < 76");
    expect(acceptance).toContain("seekTarget = 8");
    expect(acceptance).toContain("assertMeasuredEnlargement");
    expect(acceptance).toContain("standardFullscreen");
    expect(acceptance).toContain("webkitFullscreen");
    expect(acceptance).toContain("theaterFallback");
    expect(acceptance).toContain("WebKit phone portrait emulation");
    expect(acceptance).toContain("WebKit phone landscape emulation");
  });
});