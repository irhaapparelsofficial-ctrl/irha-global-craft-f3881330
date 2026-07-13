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
  "bomber-leather-jacket": {
    description:
      "Bomber-style leather jacket prepared for wholesale, OEM and private-label outerwear programs. Leather or alternative material grade, collar and cuff construction, closure hardware, lining, colour, sizing and branding are confirmed against the buyer-approved sample.",
    shortDescription:
      "Custom bomber-style leather jacket for wholesale and private-label outerwear collections.",
    specs: [
      "Bomber-inspired outerwear silhouette",
      "Rib, collar, pocket and closure configuration by buyer brief",
      "Leather or alternative material grade confirmed by approved sample",
      "Custom lining, hardware, colour and size grading available",
      "Private-label labels, trims and packaging available",
    ],
    seoTitle: "Bomber Leather Jacket Manufacturer & Private Label Supplier | Irha Apparels",
    seoDescription:
      "Custom bomber leather jacket manufacturing for wholesalers and private-label brands, with material, lining, hardware, sizing and branding confirmed by specification.",
  },
  "classic-biker-leather-jacket": {
    description:
      "Biker-style leather jacket developed for wholesale, OEM and private-label outerwear programs. Panel layout, lapel and collar shape, pocket placement, closure hardware, lining, colour, sizing and branding are finalized from the approved buyer reference.",
    shortDescription:
      "Custom biker-style leather jacket for wholesale and private-label collections.",
    specs: [
      "Biker-inspired panelled silhouette",
      "Lapel, pocket and closure layout by buyer brief",
      "Leather or alternative material grade confirmed by approved sample",
      "Custom lining, hardware, colour and size grading available",
      "Private-label labels, trims and packaging available",
    ],
    seoTitle: "Biker Leather Jacket Manufacturer & OEM Supplier | Irha Apparels",
    seoDescription:
      "Biker leather jacket manufacturing for wholesale, OEM and private-label buyers, with panels, material, hardware, lining, sizing and branding developed by brief.",
  },
  "leather-vest-waistcoat": {
    description:
      "Leather vest or waistcoat prepared for wholesale, OEM and private-label ranges. Front profile, pocket layout, closure style, lining, material grade, colour, sizing and branding are confirmed against the buyer-approved design and sample.",
    shortDescription:
      "Custom leather vest or waistcoat for wholesale and private-label buyer programs.",
    specs: [
      "Sleeveless vest and waistcoat program",
      "Pocket and closure configuration by buyer brief",
      "Leather or alternative material grade confirmed by approved sample",
      "Custom lining, colour and size grading available",
      "Private-label labels, trims and packaging available",
    ],
    seoTitle: "Leather Vest & Waistcoat Manufacturer | Irha Apparels",
    seoDescription:
      "Custom leather vest and waistcoat manufacturing for wholesalers and private-label brands, with material, closure, lining, sizing and branding by specification.",
  },
  "leather-trousers": {
    description:
      "Leather trousers developed for wholesale, OEM and private-label apparel programs. Fit, rise, leg profile, waistband, pocket construction, closure hardware, material grade, colour and size grading are confirmed from the approved buyer sample.",
    shortDescription:
      "Custom leather trousers for wholesale, OEM and private-label apparel ranges.",
    specs: [
      "Buyer-specified trouser fit and leg profile",
      "Waistband, pocket and closure construction by brief",
      "Leather or alternative material grade confirmed by approved sample",
      "Custom colour and size grading available",
      "Private-label labels, trims and packaging available",
    ],
    seoTitle: "Leather Trousers Manufacturer & Private Label Supplier | Irha Apparels",
    seoDescription:
      "Custom leather trouser manufacturing for wholesale and private-label buyers, with fit, material, pockets, hardware, sizing and branding developed by specification.",
  },
  "full-grain-leather-belt": {
    description:
      "Custom leather belt prepared for wholesale, OEM and private-label accessory programs. Strap width, length grading, edge finish, buckle style, material grade, colour, embossing and packaging are confirmed against the buyer-approved reference.",
    shortDescription:
      "Custom leather belt for wholesale and private-label accessory collections.",
    specs: [
      "Buyer-specified strap width and length grading",
      "Custom buckle, edge and hole configuration",
      "Leather or alternative material grade confirmed by approved sample",
      "Embossing and private-label branding available",
      "Custom packaging developed by buyer brief",
    ],
    seoTitle: "Custom Leather Belt Manufacturer & Wholesale Supplier | Irha Apparels",
    seoDescription:
      "Custom leather belt manufacturing for wholesalers and private-label brands, with strap, buckle, material, embossing, sizing and packaging confirmed by specification.",
  },
  "leather-gloves": {
    description:
      "Leather gloves developed for wholesale, OEM and private-label accessory ranges. Glove pattern, finger construction, cuff length, lining, material grade, colour, sizing and branding are confirmed from the buyer-approved sample.",
    shortDescription:
      "Custom leather gloves for wholesale and private-label accessory programs.",
    specs: [
      "Buyer-specified glove pattern and cuff profile",
      "Finger, seam and lining construction by approved sample",
      "Leather or alternative material grade confirmed by buyer brief",
      "Custom colour and size grading available",
      "Private-label branding and packaging available",
    ],
    seoTitle: "Leather Gloves Manufacturer & Private Label Supplier | Irha Apparels",
    seoDescription:
      "Custom leather glove manufacturing for wholesalers and private-label buyers, with pattern, material, lining, colour, sizing and branding developed by brief.",
  },
  "leather-wallet": {
    description:
      "Leather wallet prepared for wholesale, OEM and private-label accessory programs. Fold format, card and note compartments, closure, edge finish, material grade, colour, branding and packaging are confirmed against the buyer-approved reference.",
    shortDescription:
      "Custom leather wallet for wholesale and private-label accessory collections.",
    specs: [
      "Buyer-specified wallet format and compartment layout",
      "Custom edge, stitch and closure configuration",
      "Leather or alternative material grade confirmed by approved sample",
      "Embossing and private-label branding available",
      "Custom presentation packaging available",
    ],
    seoTitle: "Leather Wallet Manufacturer & OEM Supplier | Irha Apparels",
    seoDescription:
      "Custom leather wallet manufacturing for wholesale and private-label buyers, with layout, material, finishing, branding and packaging confirmed by specification.",
  },
  "premium-leather-bag": {
    description:
      "Leather bag developed for wholesale, OEM and private-label accessory ranges. Bag silhouette, dimensions, handles and straps, compartment layout, closure hardware, lining, material grade, colour and branding are finalized from the approved buyer sample.",
    shortDescription:
      "Custom leather bag for wholesale, OEM and private-label accessory programs.",
    specs: [
      "Buyer-specified bag silhouette and dimensions",
      "Handle, strap, pocket and closure layout by brief",
      "Leather or alternative material grade confirmed by approved sample",
      "Custom lining, hardware and colour available",
      "Private-label branding and packaging available",
    ],
    seoTitle: "Custom Leather Bag Manufacturer & Private Label Supplier | Irha Apparels",
    seoDescription:
      "Custom leather bag manufacturing for wholesalers and private-label brands, with shape, material, hardware, lining, branding and packaging developed by specification.",
  },
};