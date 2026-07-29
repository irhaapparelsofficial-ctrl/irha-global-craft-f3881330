import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const products = readFileSync("src/pages/GlobalCollectionsPage.tsx", "utf8");
const homePrograms = readFileSync("src/components/sections/HomeCategoryUniverse.tsx", "utf8");
const canonicalResolver = readFileSync("src/hooks/useCanonicalCategoryMedia.ts", "utf8");
const slideshow = readFileSync("src/components/HeroMediaSlideshow.tsx", "utf8");
const main = readFileSync("src/main.tsx", "utf8");

describe("buyer route image performance contracts", () => {
  it("uses approved homepage media with resilient lazy fallbacks", () => {
    expect(homePrograms).toContain("useCanonicalCategoryMedia");
    expect(canonicalResolver).toContain("useHomepageMedia");
    expect(canonicalResolver).toContain("resolveCanonicalCategoryMediaMap");
    expect(homePrograms).toContain("<ResilientImage");
    expect(homePrograms).toContain('loading="lazy"');
    expect(homePrograms).toContain('decoding="async"');
    expect(homePrograms).toContain("program.fallbackSrc");
  });

  it("uses the canonical category media source in the products hero", () => {
    expect(products).toContain("useCanonicalCategoryMedia");
    expect(products).toContain("src: media.src");
    expect(products).not.toContain("src: category.originalImage");
    expect(products).toContain("<ThumbnailImage");
    expect(products).toContain("mediaBySlug[category.slug]");
  });

  it("does not mount every slideshow image during the initial viewport", () => {
    expect(slideshow).toContain("loadedIndexes.has(slideIndex)");
    expect(slideshow).toContain("intervalMs = 9_000");
    expect(slideshow).toContain("<ThumbnailImage");
    expect(slideshow).toContain("firstSlideReady");
    expect(slideshow).toContain("document.hidden");
  });

  it("moves legacy browser cache cleanup out of the first-paint bootstrap path", () => {
    const bootstrap = main.match(/async function bootstrap\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
    expect(main).toContain("function scheduleLegacyClientCacheHeal()");
    expect(main).toContain("requestIdleCallback");
    expect(bootstrap).toContain("scheduleLegacyClientCacheHeal();");
    expect(bootstrap).not.toContain("void healLegacyClientCacheOnce();");
  });
});
