export type ProductSeoOverride = {
  description: string;
  shortDescription: string;
  specs: string[];
  seoTitle: string;
  seoDescription: string;
};

export const PRODUCT_SEO_OVERRIDES: Record<string, ProductSeoOverride> = {
  "traditional-dirndl-dress": {
    description:
      "Traditional-inspired Dirndl dress prepared for wholesale, OEM and private-label buyer programs. Silhouette, colour combinations, decorative details, sizing, labels, packaging, sampling and production requirements are confirmed against the approved buyer specification.",
    shortDescription:
      "Traditional Dirndl dress for wholesale and private-label Trachten collections, developed to the buyer's approved design and branding brief.",
    specs: [
      "Traditional-inspired Dirndl silhouette",
      "Coordinated dress and apron program",
      "Custom colours and decorative details by buyer brief",
      "Private-label labels, trims and packaging available",
      "Material and construction confirmed against approved sample",
    ],
    seoTitle: "Traditional Dirndl Dress Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Traditional Dirndl dress manufacturing for wholesale, OEM and private-label buyers. Custom colours, sizing, labels, trims and packaging by specification.",
  },
  "dirndl-blouse": {
    description:
      "Dirndl blouse developed for coordinated Trachten ranges, wholesalers and private-label buyers. Neckline, sleeve shape, decorative treatment, sizing, branding, packaging and sampling are confirmed from the approved buyer brief.",
    shortDescription:
      "Custom Dirndl blouse for wholesale, OEM and private-label Trachten programs.",
    specs: [
      "Coordinated Dirndl and Trachten styling",
      "Custom neckline and sleeve options by buyer brief",
      "Decorative finish developed from approved reference",
      "Private-label labels and packaging available",
      "Material and construction confirmed against approved sample",
    ],
    seoTitle: "Dirndl Blouse Manufacturer & Private Label Supplier | Irha Apparels",
    seoDescription:
      "Custom Dirndl blouse manufacturing for wholesalers and private-label buyers. Neckline, sleeves, decorative details, sizing, labels and packaging by brief.",
  },
  "dirndl-apron": {
    description:
      "Dirndl apron prepared for coordinated dress ranges, Trachten retailers and private-label buyer programs. Length, shape, colour, decorative treatment, branding, packing and sampling are confirmed against the approved product brief.",
    shortDescription:
      "Coordinated Dirndl apron for wholesale and private-label Trachten collections.",
    specs: [
      "Coordinated Dirndl accessory program",
      "Custom length, shape and colour by buyer brief",
      "Decorative treatment developed from approved reference",
      "Private-label branding and packaging available",
      "Material and construction confirmed against approved sample",
    ],
    seoTitle: "Dirndl Apron Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Custom Dirndl apron manufacturing for wholesale and private-label Trachten programs, with colour, finish, labels and packaging confirmed by specification.",
  },
};
