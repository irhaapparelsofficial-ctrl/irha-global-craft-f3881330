import type { HeroMediaSlide } from "@/components/HeroMediaSlideshow";
import type { NormalizedProduct } from "@/hooks/usePublicCategoryData";
import {
  canonicalCategoryMedia,
  type CanonicalCategoryMedia,
  type MainCategorySlug,
} from "@/lib/categoryMediaRegistry";

export type CategorySlideshowScope = "category" | "audience" | "collection";

type CurateCategorySlidesInput = {
  categorySlug: string;
  products: NormalizedProduct[];
  media?: CanonicalCategoryMedia | null;
  scope?: CategorySlideshowScope;
  limit?: number;
};

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function productIdentity(product: NormalizedProduct): string {
  return normalize(`${product.sku ?? ""} ${product.slug} ${product.name}`);
}

function productSource(product: NormalizedProduct): string {
  return product.originalImage ?? product.gallery?.[0] ?? product.image ?? "";
}

function containsAny(identity: string, terms: readonly string[]): boolean {
  return terms.some((term) => identity.includes(normalize(term)));
}

function isExcluded(identity: string, terms: readonly string[]): boolean {
  return terms.some((term) => identity.includes(normalize(term)));
}

function productSlide(product: NormalizedProduct, category: CanonicalCategoryMedia): HeroMediaSlide | null {
  const src = productSource(product);
  if (!src) return null;
  return {
    src,
    alt: `${product.name} for ${category.name} custom manufacturing`,
    fit: "contain",
    position: "center center",
    backgroundClassName: category.backgroundClassName,
  };
}

export function curateCategorySlides({
  categorySlug,
  products,
  media = canonicalCategoryMedia(categorySlug),
  scope = "category",
  limit = 6,
}: CurateCategorySlidesInput): HeroMediaSlide[] {
  if (!media || limit < 1) return [];

  const selected = new Set<string>();
  const slides: HeroMediaSlide[] = [];
  const candidates = products.filter((product) => Boolean(productSource(product)));
  const rootCandidates = scope === "category"
    ? candidates.filter((product) => !isExcluded(productIdentity(product), media.rootExclusions))
    : candidates;
  const primaryPool = rootCandidates.length > 0 ? rootCandidates : candidates;

  if (scope === "category") {
    slides.push({
      src: media.src,
      alt: media.alt,
      fit: media.fit,
      position: media.position,
      backgroundClassName: media.backgroundClassName,
    });
    selected.add(media.src);
  }

  for (const rule of media.curation) {
    if (slides.length >= limit) break;
    const product = primaryPool.find((candidate) => {
      const src = productSource(candidate);
      const identity = productIdentity(candidate);
      return !selected.has(src)
        && containsAny(identity, rule.anyOf)
        && !isExcluded(identity, rule.exclude ?? []);
    });
    if (!product) continue;
    const slide = productSlide(product, media);
    if (!slide) continue;
    slides.push(slide);
    selected.add(slide.src);
  }

  for (const product of primaryPool) {
    if (slides.length >= limit) break;
    const slide = productSlide(product, media);
    if (!slide || selected.has(slide.src)) continue;
    slides.push(slide);
    selected.add(slide.src);
  }

  if (slides.length === 0) {
    slides.push({
      src: media.src,
      alt: media.alt,
      fit: media.fit,
      position: media.position,
      backgroundClassName: media.backgroundClassName,
    });
  }

  return slides;
}

export function categorySlidesAreRelevant(
  categorySlug: MainCategorySlug,
  products: NormalizedProduct[],
): boolean {
  const media = canonicalCategoryMedia(categorySlug)!;
  const slides = curateCategorySlides({ categorySlug, products, media, scope: "category" });
  if (slides[0]?.src !== media.src) return false;
  return slides.slice(1).every((slide) => products.some((product) => productSource(product) === slide.src));
}
