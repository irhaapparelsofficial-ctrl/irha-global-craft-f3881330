import {
  CATEGORY_MEDIA_REGISTRY,
  MAIN_CATEGORY_SLUGS,
  canonicalCategoryMedia,
  type MainCategorySlug,
} from "@/lib/categoryMediaRegistry";

/**
 * Compatibility export for callers that still need a simple category-to-source map.
 * The canonical registry owns identity, provenance, crop metadata and curation rules.
 */
export const CATEGORY_HERO_MEDIA = Object.fromEntries(
  MAIN_CATEGORY_SLUGS.map((slug) => [slug, CATEGORY_MEDIA_REGISTRY[slug].src]),
) as Record<MainCategorySlug, string>;

export type HeroCategorySlug = MainCategorySlug;

export const HERO_PROGRAMS = [
  { slug: "bavarian-trachten-wear", name: "Bavarian & Trachten", image: CATEGORY_HERO_MEDIA["bavarian-trachten-wear"] },
  { slug: "sportswear", name: "Sportswear", image: CATEGORY_HERO_MEDIA.sportswear },
  { slug: "premium-leather-apparel", name: "Leatherwear", image: CATEGORY_HERO_MEDIA["premium-leather-apparel"] },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear", image: CATEGORY_HERO_MEDIA["streetwear-activewear"] },
  { slug: "leisure-nightwear", name: "Leisure & Nightwear", image: CATEGORY_HERO_MEDIA["leisure-nightwear"] },
] as const;

export function categoryHeroImage(slug: string, fallback?: string | null) {
  return canonicalCategoryMedia(slug)?.src ?? fallback ?? "";
}

export function topCategorySlugFromPath(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}
