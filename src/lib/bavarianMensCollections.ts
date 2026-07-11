export type BavarianMensCollection = {
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

export const BAVARIAN_MENS_COLLECTIONS: BavarianMensCollection[] = [
  {
    slug: "short-lederhosen",
    name: "Short Lederhosen",
    shortName: "Short Lederhosen",
    eyebrow: "Men's Trachten · Wholesale Collection",
    title: "Short Lederhosen Manufacturer for Wholesale & Private Label",
    description:
      "Buyer-ready short Lederhosen styles with distinct embroidery, piping and suspender options. Materials, labels, trims, packaging, sampling and production details are confirmed against each buyer program.",
    seoTitle: "Short Lederhosen Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Wholesale and private-label short Lederhosen from Irha Apparels, an experienced B2B garment manufacturer in Sialkot. Custom embroidery, trims, labels and packaging available by buyer specification.",
    hero: "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp",
    matches: (slug, name) => text(slug, name).includes("short lederhosen"),
  },
  {
    slug: "knee-length-lederhosen-bundhosen",
    name: "Knee-Length Lederhosen & Bundhosen",
    shortName: "Bundhosen",
    eyebrow: "Men's Trachten · Wholesale Collection",
    title: "Knee-Length Lederhosen & Bundhosen Manufacturer",
    description:
      "Traditional knee-length Lederhosen and Bundhosen programs for importers, Trachten retailers and private-label buyers. Construction, leather selection and decoration are developed from the approved buyer brief.",
    seoTitle: "Knee-Length Lederhosen & Bundhosen Manufacturer | Irha Apparels",
    seoDescription:
      "Knee-length Lederhosen and Bundhosen manufacturing for wholesale, OEM and private-label buyers. Custom embroidery, suspenders, labels and packaging confirmed per program.",
    hero: "/product-media/traditional-lederhosen/01-hero-front.webp",
    matches: (slug, name) => {
      const value = text(slug, name);
      return (
        value.includes("bundhosen") ||
        value.includes("kniebund") ||
        value.includes("traditional lederhosen") ||
        value.includes("white embroidered lederhosen")
      );
    },
  },
  {
    slug: "long-leather-pants",
    name: "Long Leather Pants",
    shortName: "Long Leather Pants",
    eyebrow: "Men's Trachten · Wholesale Collection",
    title: "Long Bavarian Leather Pants Manufacturer",
    description:
      "Full-length Bavarian-inspired leather pants for wholesale and private-label ranges, including contrast piping, embroidery and panelled constructions. Commercial and material details are confirmed after requirement review.",
    seoTitle: "Long Bavarian Leather Pants Manufacturer | Irha Apparels",
    seoDescription:
      "Long Bavarian leather pants for wholesale, OEM and private-label programs from Irha Apparels. Custom construction, embroidery, labels and packaging available by specification.",
    hero: "/product-media/black-contrast-piped-long-leather-pants/01-hero-front.webp",
    matches: (slug, name) => {
      const value = text(slug, name);
      return value.includes("long leather pants") || value.includes("long-leather-pants");
    },
  },
  {
    slug: "trachten-shirts",
    name: "Trachten Shirts",
    shortName: "Trachten Shirts",
    eyebrow: "Men's Trachten · Wholesale Collection",
    title: "Trachten Shirts Manufacturer for B2B Buyers",
    description:
      "Check, gingham, band-collar and traditional-inspired Trachten shirts for wholesale and private-label programs. Fabric, colour, fit, branding and packing are approved against the buyer's specification.",
    seoTitle: "Trachten Shirts Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Custom Trachten shirts for wholesalers, importers and private-label brands. Gingham, check and band-collar options with custom labels, trims and packaging.",
    hero: "/product-media/classic-blue-micro-check-trachten-shirt/01-hero-front.webp",
    matches: (slug, name) => {
      const value = text(slug, name);
      return value.includes("trachten shirt") || value.includes("checkered shirt") || value.includes("gingham shirt");
    },
  },
  {
    slug: "trachten-vests-jankers",
    name: "Trachten Vests & Jankers",
    shortName: "Vests & Jankers",
    eyebrow: "Men's Trachten · Wholesale Collection",
    title: "Trachten Vests & Jankers Manufacturer",
    description:
      "Traditional-inspired vests, waistcoats and Jankers developed for Trachten retailers, wholesalers and private-label buyers. Fabric, lining, buttons, embroidery and branding are confirmed per program.",
    seoTitle: "Trachten Vests & Jankers Manufacturer | Irha Apparels",
    seoDescription:
      "B2B Trachten vest, waistcoat and Janker manufacturing for wholesale and private-label programs, with custom trims, embroidery, labels and packaging.",
    hero: "/assets/lederhosen/cat-herren-westen.jpg",
    matches: (slug, name) => {
      const value = text(slug, name);
      return value.includes("vest") || value.includes("waistcoat") || value.includes("janker");
    },
  },
  {
    slug: "bavarian-accessories",
    name: "Bavarian Accessories",
    shortName: "Accessories",
    eyebrow: "Men's Trachten · Wholesale Collection",
    title: "Bavarian Accessories Manufacturer & Supplier",
    description:
      "Coordinated Bavarian accessories for complete wholesale programs, including suspenders, belts, hats, socks and footwear where available. Product scope is confirmed from the buyer brief and approved samples.",
    seoTitle: "Bavarian Accessories Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Bavarian accessories for wholesale and private-label programs, including suspenders, belts, hats, socks and coordinated Trachten accessories by buyer specification.",
    hero: "/assets/lederhosen/cat-accessories.jpg",
    matches: (slug, name) => {
      const value = text(slug, name);
      return ["suspender", "belt", "hat", "sock", "shoe", "accessor"].some((term) => value.includes(term));
    },
  },
];

export function getBavarianMensCollection(slug?: string) {
  return BAVARIAN_MENS_COLLECTIONS.find((collection) => collection.slug === slug) ?? null;
}
