const SITE_MEDIA_ROOT = "https://pvzjiozismyxqrzmtfbi.supabase.co/storage/v1/object/public/site-media";

/**
 * Curated studio/render assets for homepage and category hero placements.
 * Never map original factory/Drive photography into these featured slots.
 */
export const CATEGORY_HERO_MEDIA = {
  "bavarian-trachten-wear": "/product-media/premium-embroidered-lederhosen/web/premium-embroidered-lederhosen-design-01-front-web-1600.webp",
  sportswear: `${SITE_MEDIA_ROOT}/migrated-lovable/06/06a0ca39e249179c78d66560a2e869b8be2eaa26f91492dfc74cd0b47531b49c.png`,
  "premium-leather-apparel": `${SITE_MEDIA_ROOT}/catalog-migrated/2413dfaf-52c6-4495-bdee-84ed4f7bcc7e/6f7593c5f41340cd1cb6.png`,
  "streetwear-activewear": `${SITE_MEDIA_ROOT}/catalog-migrated/a9a240d8-d213-4e32-96fb-502ad97af81e/03846f889cb017b8911c.png`,
  "leisure-nightwear": `${SITE_MEDIA_ROOT}/catalog-migrated/7e5c462f-cfef-47b1-a5f5-690b1f42f4c6/ecb3eae8a15738828efc.png`,
} as const;

export type HeroCategorySlug = keyof typeof CATEGORY_HERO_MEDIA;

export const HERO_PROGRAMS = [
  { slug: "bavarian-trachten-wear", name: "Bavarian & Trachten", image: CATEGORY_HERO_MEDIA["bavarian-trachten-wear"] },
  { slug: "sportswear", name: "Sportswear", image: CATEGORY_HERO_MEDIA.sportswear },
  { slug: "premium-leather-apparel", name: "Leatherwear", image: CATEGORY_HERO_MEDIA["premium-leather-apparel"] },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear", image: CATEGORY_HERO_MEDIA["streetwear-activewear"] },
  { slug: "leisure-nightwear", name: "Leisure & Nightwear", image: CATEGORY_HERO_MEDIA["leisure-nightwear"] },
] as const;

export function categoryHeroImage(slug: string, fallback?: string | null) {
  return CATEGORY_HERO_MEDIA[slug as HeroCategorySlug] ?? fallback ?? "";
}

export function topCategorySlugFromPath(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}
