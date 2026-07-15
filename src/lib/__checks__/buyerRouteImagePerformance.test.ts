import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const catalogue = readFileSync("src/pages/Catalogue.tsx", "utf8");
const products = readFileSync("src/pages/GlobalCollectionsPage.tsx", "utf8");
const slideshow = readFileSync("src/components/HeroMediaSlideshow.tsx", "utf8");

describe("buyer route image performance contracts", () => {
  it("keeps the catalogue index static and optimized above the fold", () => {
    expect(catalogue).not.toContain("@/integrations/supabase/client");
    expect(catalogue).not.toContain("groupImages");
    expect(catalogue).toContain("?w=960&format=webp&quality=68");
    expect(catalogue).toContain("STATIC_GROUP_IMAGES[group.slug]");
  });

  it("uses category thumbnails rather than originals in the products hero", () => {
    expect(products).toContain("src: category.image");
    expect(products).not.toContain("src: category.originalImage");
    expect(products).toContain("<ThumbnailImage");
  });

  it("does not mount every slideshow image during the initial viewport", () => {
    expect(slideshow).toContain("loadedIndexes.has(slideIndex)");
    expect(slideshow).toContain("intervalMs = 9_000");
    expect(slideshow).toContain("<ThumbnailImage");
  });
});
