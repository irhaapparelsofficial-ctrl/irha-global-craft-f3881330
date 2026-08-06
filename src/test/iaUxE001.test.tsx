import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const repositoryFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");
const index = repositoryFile("index.html");
const main = repositoryFile("src/main.tsx");
const thumbnail = repositoryFile("src/components/ThumbnailImage.tsx");
const resilient = repositoryFile("src/components/ResilientImage.tsx");
const loading = repositoryFile("src/lib/imageLoading.ts");
const cards = repositoryFile("src/components/catalog/CatalogCard.tsx");
const listings = repositoryFile("src/components/catalog/CatalogListingCard.tsx");
const slideshow = repositoryFile("src/components/HeroMediaSlideshow.tsx");

describe("IA-UX-E001 first-render architecture", () => {
  it("hides the crawler shell before buyer-visible paint and provides a current boot frame", () => {
    const policyIndex = index.indexOf('http-equiv="Content-Security-Policy"');
    const detectionIndex = index.indexOf("document.documentElement.classList.add('irha-js')");
    const rootIndex = index.indexOf('<div id="root">');

    expect(policyIndex).toBeGreaterThan(0);
    expect(policyIndex).toBeLessThan(detectionIndex);
    expect(detectionIndex).toBeLessThan(rootIndex);
    expect(index).toContain(".irha-js #irha-static-crawler-shell{display:none!important}");
    expect(index).toContain('id="irha-app-boot-shell"');
    expect(index).toContain('aria-hidden="true"');
  });

  it("keeps the boot frame within narrow mobile width and respects reduced motion", () => {
    expect(index).toContain("@media(max-width:639px)");
    expect(index).toContain(".irha-boot-logo{width:132px!important}");
    expect(index).toContain(".irha-boot-nav span:nth-child(-n+2){display:none}");
    expect(index).toContain("@media(prefers-reduced-motion:reduce)");
  });

  it("does not delay React for a deliberate static-shell paint and limits reload to one-time stale-asset recovery", () => {
    const bootstrap = main.match(/async function bootstrap\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";
    const recovery = main.match(/function installVitePreloadRecovery\(\) \{([\s\S]*?)\n\}/)?.[1] ?? "";

    expect(main).not.toContain("allowStaticShellPaint");
    expect(main).not.toContain("replaceChildren()");
    expect(main).toContain('const CACHE_HEAL_VERSION = "2026-08-07-v4"');
    expect(main).toContain('window.addEventListener("vite:preloadError"');
    expect(recovery).toContain("claimOneTimeAssetRecovery(route)");
    expect(recovery).toContain("preloadEvent.preventDefault()");
    expect(recovery).toContain("window.location.reload()");
    expect(bootstrap).not.toContain("window.location.reload()");
    expect(main).toContain("createRoot(rootElement).render");
  });

  it("keeps route-specific crawler shells while the JS boot frame remains separate", () => {
    const generator = repositoryFile("scripts/generate-static-route-shells.ts");
    expect(generator).toContain('.replace(/<main id="irha-static-crawler-shell"');
    expect(generator).not.toContain("irha-app-boot-shell");
  });
});

describe("IA-UX-E001 managed image states", () => {
  it("implements the complete finite-state image lifecycle", () => {
    for (const state of ["idle", "requested", "loading", "loaded", "failed"]) {
      expect(loading).toContain(`"${state}"`);
    }
    expect(thumbnail).toContain('useState<ImageLoadState>("idle")');
    expect(resilient).toContain('useState<ImageLoadState>("idle")');
    expect(thumbnail).toContain('data-image-state={imageState}');
    expect(resilient).toContain('data-image-state={imageState}');
  });

  it("preserves dimensions while preventing native broken-image rendering", () => {
    expect(thumbnail).toContain('visibility: visible ? "visible" : "hidden"');
    expect(resilient).toContain('visibility: visible ? "visible" : "hidden"');
    expect(listings).toContain("width={960}");
    expect(listings).toContain("height={1200}");
    expect(listings).toContain("width={960}");
    expect(listings).toContain("height={720}");
  });

  it("uses the official Irha fallback and privacy-safe diagnostics without technical buyer wording", () => {
    expect(loading).toContain("CONTROLLED_IMAGE_FALLBACK");
    expect(loading).toContain("CONTROLLED_IMAGE_FALLBACK = BRAND_ASSETS.controlledFallback");
    expect(loading).toContain('new CustomEvent("irha:image-load-failed"');
    expect(loading).toContain("source.split(/[?#]/, 1)[0]");
    expect(loading).not.toMatch(/IMAGE UNAVAILABLE|question-mark/i);
    expect(resilient).toContain('data-brand-fallback={controlledFallbackActive ? "irha-official-crest" : undefined}');
  });

  it("rejects legacy placeholders even when older callers supply them", () => {
    expect(thumbnail).toContain("LEGACY_PLACEHOLDER");
    expect(resilient).toContain("LEGACY_PLACEHOLDER");
    expect(thumbnail).toContain("filter(usableSource)");
    expect(resilient).toContain("filter(usableSource)");
    expect(thumbnail).not.toContain('?? "/placeholder.svg"');
    expect(resilient).not.toContain('?? "/placeholder.svg"');
  });

  it("does not promote every eager image to high priority", () => {
    expect(thumbnail).toContain('fetchPriority={fetchPriority ?? (loading === "lazy" ? "low" : undefined)}');
    expect(resilient).toContain('fetchPriority={fetchPriority ?? (loading === "lazy" ? "low" : undefined)}');
  });

  it("preserves responsive tiers and below-fold lazy loading", () => {
    const imageThumbnails = repositoryFile("src/lib/imageThumbnails.ts");
    expect(imageThumbnails).toContain("[360, 720, 1200, 1600]");
    expect(listings).toContain('loading="lazy"');
    expect(listings).toContain("sizes={PRODUCT_SIZES}");
    expect(listings).toContain("sizes={COLLECTION_SIZES}");
  });
});

describe("IA-UX-E001 canonical card contract", () => {
  it("keeps stable media ratios, bounded long titles and footer alignment", () => {
    expect(cards).toContain('portrait: "aspect-[4/5]"');
    expect(cards).toContain('landscape: "aspect-[4/3]"');
    expect(cards).toContain("line-clamp-2 min-h-[2.35em] break-words");
    expect(cards).toContain('className={classes("mt-auto pt-4"');
  });

  it("renders product navigation and actions as separate accessible targets", () => {
    expect(listings).toContain("<Link");
    expect(listings).toContain("CatalogCardActions");
    expect(listings).toContain("focus-visible:ring-2");
    expect(listings).not.toContain("<button\n        <Link");
  });

  it("uses one shared implementation on finder and taxonomy pages", () => {
    const finder = repositoryFile("src/pages/AllProductsPage.tsx");
    const taxonomy = repositoryFile("src/pages/CategoryTaxonomyPage.tsx");

    expect(finder).toContain("ProductCatalogCard");
    expect(taxonomy).toContain("ProductCatalogCard");
    expect(taxonomy).toContain("CollectionCatalogCard");
    expect(finder).not.toContain("<ThumbnailImage");
    expect(taxonomy).not.toMatch(/<img\s/);
  });

  it("locks responsive grid thresholds without horizontal category-card carousels", () => {
    const home = repositoryFile("src/components/sections/HomeCategoryUniverse.tsx");
    const finder = repositoryFile("src/pages/AllProductsPage.tsx");

    expect(home).toContain("min-[520px]:grid-cols-2");
    expect(home).toContain("lg:grid-cols-3");
    expect(home).toContain("xl:grid-cols-4");
    expect(home).toContain("2xl:grid-cols-5");
    expect(home).not.toContain("overflow-x-auto");
    expect(finder).toContain("min-[380px]:grid-cols-2");
  });

  it("keeps slideshow controls touch-sized and defers unvisited frames", () => {
    expect(slideshow).toContain("loadedIndexes.has(slideIndex)");
    expect(slideshow).toContain("min-h-11 min-w-11");
    expect(slideshow).toContain("motion-reduce:transition-none");
  });
});
