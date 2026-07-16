import bavarianHero from "@/assets/og/og-bavarian-hero.jpg";
import sportswearHero from "@/assets/og/og-sportswear.jpg";
import leatherHero from "@/assets/og/og-leather.jpg";
import streetwearHero from "@/assets/og/og-streetwear.jpg";
import nightwearHero from "@/assets/og/og-nightwear.jpg";

export const CATEGORY_HERO_MEDIA = {
  "bavarian-trachten-wear": bavarianHero,
  sportswear: sportswearHero,
  "premium-leather-apparel": leatherHero,
  "streetwear-activewear": streetwearHero,
  "leisure-nightwear": nightwearHero,
} as const;

export type HeroCategorySlug = keyof typeof CATEGORY_HERO_MEDIA;

export const HERO_PROGRAMS = [
  { slug: "bavarian-trachten-wear", name: "Bavarian & Trachten", image: bavarianHero },
  { slug: "sportswear", name: "Sportswear", image: sportswearHero },
  { slug: "premium-leather-apparel", name: "Leatherwear", image: leatherHero },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear", image: streetwearHero },
  { slug: "leisure-nightwear", name: "Leisure & Nightwear", image: nightwearHero },
] as const;

export function categoryHeroImage(slug: string, fallback?: string | null) {
  return CATEGORY_HERO_MEDIA[slug as HeroCategorySlug] ?? fallback ?? "";
}

export function topCategorySlugFromPath(pathname: string) {
  const match = pathname.match(/^\/products\/([^/]+)\/?$/);
  return match?.[1] ?? null;
}
