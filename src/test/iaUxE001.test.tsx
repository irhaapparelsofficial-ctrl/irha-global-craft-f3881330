import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import ThumbnailImage from "@/components/ThumbnailImage";
import ResilientImage from "@/components/ResilientImage";
import {
  CatalogCard,
  CatalogCardActions,
  CatalogCardBody,
  CatalogCardMedia,
  CatalogCardTitle,
} from "@/components/catalog/CatalogCard";
import { ProductCatalogCard } from "@/components/catalog/CatalogListingCard";

const repositoryFile = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("IA-UX-E001 first-render architecture", () => {
  it("hides the crawler shell before buyer-visible paint and provides a current boot frame", () => {
    const html = repositoryFile("index.html");
    const policyIndex = html.indexOf('http-equiv="Content-Security-Policy"');
    const detectionIndex = html.indexOf("document.documentElement.classList.add('irha-js')");
    const rootIndex = html.indexOf('<div id="root">');

    expect(policyIndex).toBeGreaterThan(0);
    expect(policyIndex).toBeLessThan(detectionIndex);
    expect(detectionIndex).toBeLessThan(rootIndex);
    expect(html).toContain(".irha-js #irha-static-crawler-shell{display:none!important}");
    expect(html).toContain('id="irha-app-boot-shell"');
    expect(html).toContain('aria-hidden="true"');
  });

  it("keeps the boot frame within narrow mobile width and respects reduced motion", () => {
    const html = repositoryFile("index.html");

    expect(html).toContain("@media(max-width:639px)");
    expect(html).toContain(".irha-boot-logo{width:132px!important}");
    expect(html).toContain(".irha-boot-nav span:nth-child(-n+2){display:none}");
    expect(html).toContain("@media(prefers-reduced-motion:reduce)");
  });

  it("does not delay React for a deliberate static-shell paint or force a reload", () => {
    const main = repositoryFile("src/main.tsx");

    expect(main).not.toContain("allowStaticShellPaint");
    expect(main).not.toContain("replaceChildren()");
    expect(main).not.toContain("window.location.reload");
    expect(main).not.toContain("location.reload");
    expect(main).toContain("2026-07-29-v3");
    expect(main).toContain("createRoot(rootElement).render");
  });

  it("keeps route-specific crawler shells while the JS boot frame remains separate", () => {
    const generator = repositoryFile("scripts/generate-static-route-shells.ts");
    expect(generator).toContain('.replace(/<main id="irha-static-crawler-shell"');
    expect(generator).not.toContain("irha-app-boot-shell");
  });
});

describe("IA-UX-E001 managed image states", () => {
  it("reserves explicit dimensions and transitions from loading to loaded", async () => {
    render(
      <ThumbnailImage
        src="/product-media/example/front.webp"
        alt="Example product"
        width={960}
        height={1200}
      />,
    );
    const image = screen.getByRole("img", { name: "Example product" });

    expect(image).toHaveAttribute("width", "960");
    expect(image).toHaveAttribute("height", "1200");
    await waitFor(() => expect(image).toHaveAttribute("data-image-state", "loading"));
    expect(image).toHaveStyle({ visibility: "hidden" });

    fireEvent.load(image);
    expect(image).toHaveAttribute("data-image-state", "loaded");
    expect(image).toHaveStyle({ visibility: "visible" });
  });

  it("never exposes the legacy placeholder or a native broken-image state", async () => {
    const diagnostic = vi.fn();
    window.addEventListener("irha:image-load-failed", diagnostic);
    render(<ThumbnailImage src="/product-media/missing/front.webp" alt="Missing product" width={960} height={1200} />);
    const image = screen.getByRole("img", { name: "Missing product" });

    await waitFor(() => expect(image).toHaveAttribute("data-image-state", "loading"));
    fireEvent.error(image);
    fireEvent.error(image);
    fireEvent.error(image);

    await waitFor(() => expect(image).toHaveAttribute("data-fallback-active", "true"));
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
    expect(image.getAttribute("src")).not.toContain("placeholder.svg");
    expect(image.getAttribute("src")).not.toContain("?");
    expect(image).toHaveAttribute("data-image-state", "failed");
    expect(image).toHaveStyle({ visibility: "visible" });
    expect(diagnostic).toHaveBeenCalledTimes(1);
    window.removeEventListener("irha:image-load-failed", diagnostic);
  });

  it("rejects a legacy placeholder even when an older caller supplies it directly", async () => {
    render(
      <ResilientImage
        sources={["/placeholder.svg"]}
        alt="Unavailable product"
        width={960}
        height={1200}
      />,
    );
    const image = screen.getByRole("img", { name: "Unavailable product" });

    await waitFor(() => expect(image).toHaveAttribute("data-fallback-active", "true"));
    expect(image.getAttribute("src")).toMatch(/^data:image\/svg\+xml,/);
    expect(image.getAttribute("src")).not.toContain("placeholder.svg");
  });

  it("does not promote every eager image to high priority", () => {
    render(<ResilientImage sources={["/hero.webp"]} alt="Hero" loading="eager" width={1200} height={900} />);
    const image = screen.getByRole("img", { name: "Hero" });
    expect(image).not.toHaveAttribute("fetchpriority", "high");
    expect(image).toHaveAttribute("decoding", "async");
  });

  it("preserves responsive srcset and below-fold lazy loading", () => {
    render(<ThumbnailImage src="/product-media/example/front.webp" alt="Responsive product" width={960} height={1200} />);
    const image = screen.getByRole("img", { name: "Responsive product" });
    expect(image).toHaveAttribute("loading", "lazy");
    expect(image.getAttribute("srcset")).toContain("360w");
    expect(image.getAttribute("srcset")).toContain("720w");
    expect(image.getAttribute("srcset")).toContain("1200w");
    expect(image.getAttribute("srcset")).toContain("1600w");
    expect(image).toHaveAttribute("sizes");
  });
});

describe("IA-UX-E001 canonical card contract", () => {
  it("keeps a stable media ratio, bounded long title and footer alignment", () => {
    render(
      <CatalogCard>
        <CatalogCardMedia ratio="portrait"><span>media</span></CatalogCardMedia>
        <CatalogCardBody>
          <CatalogCardTitle>Sehr lange maßgeschneiderte Sportbekleidungs-Herstellerkollektion für internationale Käufer</CatalogCardTitle>
          <CatalogCardActions><button type="button">Open</button></CatalogCardActions>
        </CatalogCardBody>
      </CatalogCard>,
    );

    expect(screen.getByText("media").parentElement).toHaveClass("aspect-[4/5]");
    expect(screen.getByRole("heading")).toHaveClass("line-clamp-2", "min-h-[2.35em]", "break-words");
    expect(screen.getByRole("button").parentElement).toHaveClass("mt-auto");
  });

  it("renders product links and actions as separate accessible touch targets", () => {
    render(
      <MemoryRouter>
        <ProductCatalogCard
          href="/products/example"
          name="Example Product"
          image="/product-media/example/front.webp"
          eyebrow="Streetwear · Oversized hoodies"
          actions={<button type="button" className="min-h-11">Save product</button>}
        />
      </MemoryRouter>,
    );

    expect(screen.getAllByRole("link", { name: /Example Product/i }).length).toBeGreaterThan(0);
    expect(screen.getByRole("button", { name: "Save product" })).toHaveClass("min-h-11");
  });

  it("uses one shared product-card implementation on finder and taxonomy pages", () => {
    const finder = repositoryFile("src/pages/AllProductsPage.tsx");
    const taxonomy = repositoryFile("src/pages/CategoryTaxonomyPage.tsx");

    expect(finder).toContain("ProductCatalogCard");
    expect(taxonomy).toContain("ProductCatalogCard");
    expect(taxonomy).toContain("CollectionCatalogCard");
    expect(finder).not.toContain("<ThumbnailImage");
    expect(taxonomy).not.toMatch(/<img\s/);
  });

  it("locks the required responsive grid thresholds without horizontal carousel cards", () => {
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
    const slideshow = repositoryFile("src/components/HeroMediaSlideshow.tsx");

    expect(slideshow).toContain("loadedIndexes.has(slideIndex)");
    expect(slideshow).toContain("min-h-11 min-w-11");
    expect(slideshow).toContain("motion-reduce:transition-none");
  });
});
