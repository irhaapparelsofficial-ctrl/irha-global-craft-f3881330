export type BavarianWomensCollection = {
  slug: string;
  name: string;
  shortName: string;
  eyebrow: string;
  title: string;
  description: string;
  seoTitle: string;
  seoDescription: string;
  hero: string;
  matches: (slug: string, name: string) => boolean;
};

const text = (slug: string, name: string) => `${slug} ${name}`.toLowerCase();

export const BAVARIAN_WOMENS_COLLECTIONS: BavarianWomensCollection[] = [
  {
    slug: "dirndl-dresses",
    name: "Dirndl Dresses",
    shortName: "Dirndl Dresses",
    eyebrow: "Women's Trachten · Wholesale Collection",
    title: "Dirndl Dress Manufacturer for Wholesale & Private Label",
    description:
      "Traditional-inspired Dirndl dress programs for wholesalers, Trachten retailers and private-label buyers. Silhouette, colours, decorative details, sizing, labels, packaging and sampling are confirmed against each approved buyer specification.",
    seoTitle: "Dirndl Dress Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Custom Dirndl dress manufacturing for wholesale, OEM and private-label buyers. Colours, trims, sizing, labels and packaging are developed to buyer specification.",
    hero: "/__l5e/assets-v1/43cadee1-33ad-4e75-abce-3364e8a0027b/irha-0061.jpg",
    matches: (slug, name) => {
      const value = text(slug, name);
      return value.includes("dirndl dress") || value.includes("traditional dirndl");
    },
  },
  {
    slug: "dirndl-blouses",
    name: "Dirndl Blouses",
    shortName: "Dirndl Blouses",
    eyebrow: "Women's Trachten · Wholesale Collection",
    title: "Dirndl Blouse Manufacturer for B2B Buyers",
    description:
      "Dirndl blouses developed for coordinated Trachten ranges and private-label programs. Neckline, sleeve shape, decorative finish, sizing, labels and packing are reviewed from the buyer brief before quotation.",
    seoTitle: "Dirndl Blouse Manufacturer & Private Label Supplier | Irha Apparels",
    seoDescription:
      "Wholesale and private-label Dirndl blouse manufacturing from Irha Apparels. Custom neckline, sleeves, decorative details, labels and packaging by buyer brief.",
    hero: "/__l5e/assets-v1/a13947fc-2bc7-432a-8f53-e16b7e6acbee/irha-0058.jpg",
    matches: (slug, name) => text(slug, name).includes("dirndl blouse"),
  },
  {
    slug: "dirndl-aprons",
    name: "Dirndl Aprons",
    shortName: "Dirndl Aprons",
    eyebrow: "Women's Trachten · Wholesale Collection",
    title: "Dirndl Apron Manufacturer & Wholesale Supplier",
    description:
      "Coordinated Dirndl aprons for wholesale, retail and private-label Trachten collections. Shape, length, colour, decorative treatment, branding and packaging are confirmed against the approved dress or accessory program.",
    seoTitle: "Dirndl Apron Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Custom Dirndl aprons for wholesale and private-label Trachten programs, with colour, decorative finish, labels and packaging confirmed to buyer specification.",
    hero: "/__l5e/assets-v1/2816ff1a-d4c6-43fe-9061-45fe68cdd1ba/irha-fix-0014.jpg",
    matches: (slug, name) => text(slug, name).includes("dirndl apron"),
  },
];

export function getBavarianWomensCollection(slug?: string) {
  return BAVARIAN_WOMENS_COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
}
