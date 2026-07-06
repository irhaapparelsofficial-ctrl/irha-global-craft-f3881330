export interface CatalogueGroup {
  slug: string;
  name: string;
  nameDe: string;
  tagline: string;
  description: string;
  /** Match published category slugs. Prefix patterns end with *. */
  categorySlugs: string[];
  ogImage?: string;
}

export const CATALOGUE_GROUPS: CatalogueGroup[] = [
  {
    slug: "bavarian-garments",
    name: "Bavarian Garments",
    nameDe: "Bayerische Trachten",
    tagline: "Lederhosen, Dirndls and Trachten programs",
    description:
      "Custom Bavarian and Trachten apparel programs for wholesalers, retailers, importers and private-label buyers. Product details and commercial terms are reviewed per requirement.",
    categorySlugs: ["bavarian-trachten-wear", "bavarian*"],
  },
  {
    slug: "lederhosen",
    name: "Lederhosen",
    nameDe: "Lederhosen",
    tagline: "Custom short, knee and traditional styles",
    description:
      "Custom Lederhosen programs developed around buyer references, sizing, materials, decoration and branding requirements.",
    categorySlugs: ["bavarian-men", "*lederhosen*"],
  },
  {
    slug: "dirndl-dresses",
    name: "Dirndl Dresses",
    nameDe: "Dirndlkleider",
    tagline: "Mini, midi and long Dirndl programs",
    description:
      "Custom Dirndl programs for B2B buyers. Fabric, bodice, apron, blouse, decoration and packaging requirements are reviewed before quotation.",
    categorySlugs: ["bavarian-women", "*dirndl*"],
  },
  {
    slug: "trachten-accessories",
    name: "Trachten Accessories",
    nameDe: "Trachten Accessoires",
    tagline: "Accessories and finishing details",
    description:
      "Trachten accessory requirements can be reviewed alongside apparel programs for coordinated branding and retail presentation.",
    categorySlugs: ["bavarian-accessories", "*accessor*"],
  },
  {
    slug: "kids-trachten",
    name: "Kids' Trachten",
    nameDe: "Kinder Trachten",
    tagline: "Children's Bavarian apparel programs",
    description:
      "Custom children's Trachten requirements can be reviewed for coordinated family, retail and seasonal programs.",
    categorySlugs: ["bavarian-kids", "*kids*", "*children*"],
  },
  {
    slug: "leather-garments",
    name: "Leather Garments",
    nameDe: "Lederbekleidung",
    tagline: "Custom jackets, vests and leather apparel",
    description:
      "Custom leather apparel programs for brands, wholesalers and private-label buyers. Materials, construction and commercial terms are confirmed after review.",
    categorySlugs: ["premium-leather-apparel", "leatherwear*", "*leather*"],
  },
  {
    slug: "sportswear",
    name: "Sportswear",
    nameDe: "Sportbekleidung",
    tagline: "Teamwear, training wear and custom sports programs",
    description:
      "Custom sportswear programs for brands, clubs, wholesalers and private-label buyers. Product and decoration requirements are reviewed before confirmation.",
    categorySlugs: ["sportswear", "sportswear*"],
  },
  {
    slug: "activewear",
    name: "Activewear",
    nameDe: "Aktivbekleidung",
    tagline: "Gym, training and performance apparel",
    description:
      "Custom activewear programs developed around buyer fit, fabric, construction, branding and packaging requirements.",
    categorySlugs: ["streetwear-activewear", "sportswear-gym", "*activewear*", "*gym*"],
  },
  {
    slug: "streetwear",
    name: "Streetwear",
    nameDe: "Streetwear",
    tagline: "Hoodies, tees, joggers and custom programs",
    description:
      "Custom streetwear programs built around the buyer's product brief, fit, fabric, decoration, labels and packaging requirements.",
    categorySlugs: ["streetwear-activewear", "streetwear*", "*streetwear*"],
  },
  {
    slug: "leisurewear",
    name: "Leisurewear",
    nameDe: "Freizeitbekleidung",
    tagline: "Loungewear and casual apparel programs",
    description:
      "Custom leisurewear and loungewear requirements for brands, wholesalers and private-label buyers.",
    categorySlugs: ["leisure-nightwear", "leisurewear*", "*leisure*", "*lounge*"],
  },
  {
    slug: "nightwear",
    name: "Nightwear",
    nameDe: "Nachtwäsche",
    tagline: "Sleepwear and pyjama programs",
    description:
      "Custom nightwear and sleepwear programs reviewed against buyer requirements for materials, construction, branding and packaging.",
    categorySlugs: ["leisure-nightwear", "nightwear*", "*nightwear*", "*sleepwear*", "*pyjama*"],
  },
];

export const findCatalogueGroup = (slug: string) =>
  CATALOGUE_GROUPS.find((g) => g.slug === slug);

export function matchesCategorySlug(slug: string, patterns: string[]): boolean {
  const value = slug.toLowerCase();
  return patterns.some((pattern) => {
    const p = pattern.toLowerCase();
    if (!p.includes("*")) return value === p;
    const escaped = p.replace(/[.+?^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
    return new RegExp(`^${escaped}$`).test(value);
  });
}
