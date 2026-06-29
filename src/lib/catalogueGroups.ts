/**
 * Catalogue groups for the public /catalogue system shared on
 * WhatsApp, Facebook, Instagram, LinkedIn and ads.
 *
 * Each group maps a buyer-friendly slug to one or more underlying
 * DB category slugs (public.categories.slug). Products are pulled
 * live from Supabase so admin edits update the catalogue instantly.
 */
export interface CatalogueGroup {
  slug: string;
  name: string;
  nameDe: string;
  tagline: string;
  description: string;
  /** Match against public.categories.slug — supports exact or `prefix*` */
  categorySlugs: string[];
  ogImage?: string;
}

export const CATALOGUE_GROUPS: CatalogueGroup[] = [
  {
    slug: "bavarian-garments",
    name: "Bavarian Garments",
    nameDe: "Bayerische Trachten",
    tagline: "Lederhosen, Dirndls, Trachten shirts & jackets",
    description:
      "Full Bavarian and Trachten range manufactured in Sialkot for Oktoberfest brands, Trachten boutiques and German importers. OEM, ODM and private label.",
    categorySlugs: ["bavarian*"],
  },
  {
    slug: "lederhosen",
    name: "Lederhosen",
    nameDe: "Lederhosen",
    tagline: "Men's Trachten leather shorts — short, knee, kniebund",
    description:
      "Suede and nubuck Lederhosen with hand embroidery, antique-brass hardware and corozo buttons. Custom embroidery, sizing and packaging available.",
    categorySlugs: ["bavarian-men"],
  },
  {
    slug: "dirndl-dresses",
    name: "Dirndl Dresses",
    nameDe: "Dirndlkleider",
    tagline: "Mini, midi and long Dirndls with blouse & apron",
    description:
      "Premium Dirndl dresses with embroidered bodice, hand-finished aprons, matching blouses. Cotton, satin and brocade options for B2B private label.",
    categorySlugs: ["bavarian-women"],
  },
  {
    slug: "trachten-accessories",
    name: "Trachten Accessories",
    nameDe: "Trachten Accessoires",
    tagline: "Charivari, hats, socks, belts, Haferl shoes",
    description:
      "Bavarian accessories to complete a Trachten line — belts, hats, socks, charivari chains and finishing details for retail packaging.",
    categorySlugs: ["bavarian-accessories"],
  },
  {
    slug: "kids-trachten",
    name: "Kids' Trachten",
    nameDe: "Kinder Trachten",
    tagline: "Lederhosen & Dirndls for children",
    description:
      "Children's Bavarian wear in matching sets — Lederhosen, Dirndls, shirts and blouses for family ranges and Oktoberfest collections.",
    categorySlugs: ["bavarian-kids"],
  },
  {
    slug: "leather-garments",
    name: "Leather Garments",
    nameDe: "Lederbekleidung",
    tagline: "Jackets, vests, bottoms, accessories",
    description:
      "Full-grain and nappa leather garments for premium B2B brands — biker, fashion and motorcycle jackets, vests, chaps, accessories.",
    categorySlugs: ["leatherwear*"],
  },
  {
    slug: "sportswear",
    name: "Sportswear",
    nameDe: "Sportbekleidung",
    tagline: "Soccer, basketball, baseball, rugby, cricket, gym",
    description:
      "Custom team and club kits with sublimation, embroidery and tackle-twill. Soccer, basketball, baseball, rugby, cricket, gym & training wear.",
    categorySlugs: ["sportswear*"],
  },
  {
    slug: "activewear",
    name: "Activewear",
    nameDe: "Aktivbekleidung",
    tagline: "Gym, training, performance fabrics",
    description:
      "Moisture-wicking activewear in compression and loose fits. Custom branding, all-over sublimation, woven labels, eco-friendly packaging.",
    categorySlugs: ["sportswear-gym"],
  },
  {
    slug: "streetwear",
    name: "Streetwear",
    nameDe: "Streetwear",
    tagline: "Hoodies, tees, oversized, heavyweight",
    description:
      "Heavyweight fleece hoodies, tees, joggers and shorts. Garment-dye, screen-print, puff-print, embroidery — built for emerging streetwear brands.",
    categorySlugs: ["streetwear*"],
  },
  {
    slug: "leisurewear",
    name: "Leisurewear",
    nameDe: "Freizeitbekleidung",
    tagline: "Loungewear & smart-casual tops and bottoms",
    description:
      "Comfortable loungewear and smart-casual ranges in cotton, modal and French terry. Perfect for retail private label and capsule collections.",
    categorySlugs: ["leisurewear*"],
  },
  {
    slug: "nightwear",
    name: "Nightwear",
    nameDe: "Nachtwäsche",
    tagline: "Sleepwear & pyjamas — men, women, kids",
    description:
      "Pyjama sets, nightdresses and loungewear in cotton, satin and modal. Soft hand-feel, durable wash, custom packaging.",
    categorySlugs: ["nightwear*"],
  },
];

export const findCatalogueGroup = (slug: string) =>
  CATALOGUE_GROUPS.find((g) => g.slug === slug);

/** Expand a list like ["bavarian*", "bavarian-men"] into a Postgres ILIKE list. */
export function matchSlugClauses(patterns: string[]): { exact: string[]; like: string[] } {
  const exact: string[] = [];
  const like: string[] = [];
  for (const p of patterns) {
    if (p.endsWith("*")) like.push(p.slice(0, -1) + "%");
    else exact.push(p);
  }
  return { exact, like };
}
