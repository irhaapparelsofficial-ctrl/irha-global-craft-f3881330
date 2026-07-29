import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const slideshow = readFileSync(resolve(process.cwd(), "src/components/HeroMediaSlideshow.tsx"), "utf8");

describe("IA-UX-E002 slideshow delivery contract", () => {
  it("waits for the first frame and pauses autoplay while the document is hidden", () => {
    expect(slideshow).toContain("firstSlideReady");
    expect(slideshow).toContain("document.hidden");
    expect(slideshow).toContain('document.addEventListener("visibilitychange", update)');
    expect(slideshow).toContain("!firstSlideReady");
    expect(slideshow).toContain("documentHidden");
  });

  it("eagerly requests only the first visible frame and defers unvisited slides", () => {
    expect(slideshow).toContain("loadedIndexes.has(slideIndex)");
    expect(slideshow).toContain('loading={priority && slideIndex === 0 ? "eager" : "lazy"}');
    expect(slideshow).toContain('fetchPriority={priority && slideIndex === 0 ? "high" : "low"}');
    expect(slideshow).not.toContain("normalizedSlides.map((slide) => new Image");
  });

  it("supports keyboard, swipe, reduced motion and 44px controls", () => {
    expect(slideshow).toContain('event.key === "ArrowLeft"');
    expect(slideshow).toContain('event.key === "ArrowRight"');
    expect(slideshow).toContain("onTouchStart");
    expect(slideshow).toContain("onTouchEnd");
    expect(slideshow).toContain("prefers-reduced-motion: reduce");
    expect(slideshow).toContain("min-h-11 min-w-11");
    expect(slideshow).toContain("aria-current");
  });
});
