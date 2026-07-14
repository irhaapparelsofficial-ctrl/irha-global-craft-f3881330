export type ProductSeoOverride = {
  description: string;
  shortDescription: string;
  specs: string[];
  seoTitle: string;
  seoDescription: string;
};

type SportswearOverrideInput = {
  productName: string;
  buyerPrograms: string;
  construction: string;
  customization: string;
  seoName?: string;
};

const sportswearOverride = ({
  productName,
  buyerPrograms,
  construction,
  customization,
  seoName,
}: SportswearOverrideInput): ProductSeoOverride => ({
  description:
    `${productName} developed for ${buyerPrograms}, wholesale, OEM and private-label programs. ` +
    `${construction}, material composition, fabric weight, stretch and recovery where applicable, fit, colour, artwork method, trims, sizing and packing are confirmed against the buyer-approved sample and order specification.`,
  shortDescription:
    `Custom ${productName.toLowerCase()} for ${buyerPrograms}, wholesale and private-label programs.`,
  specs: [
    construction,
    "Material composition and fabric weight confirmed by approved sample",
    customization,
    "Fit, colour and size grading confirmed by buyer brief",
    "Private-label labels and packaging available",
  ],
  seoTitle: `${seoName ?? productName} Manufacturer & Private Label Supplier | Irha Apparels`,
  seoDescription:
    `Custom ${productName.toLowerCase()} manufacturing for ${buyerPrograms}, wholesalers and private-label buyers, with material, construction, artwork, sizing and branding confirmed by specification.`,
});

type StreetwearOverrideInput = {
  productName: string;
  construction: string;
  customization: string;
};

const streetwearOverride = ({
  productName,
  construction,
  customization,
}: StreetwearOverrideInput): ProductSeoOverride => ({
  description:
    `${productName} developed for streetwear brands, wholesalers, OEM and private-label programs. ` +
    `${construction}, material composition, fabric weight, finish or wash where applicable, fit, colour, artwork method, trims, sizing and packing are confirmed against the buyer-approved sample and order specification.`,
  shortDescription:
    `Custom ${productName.toLowerCase()} for wholesale, OEM and private-label streetwear collections.`,
  specs: [
    construction,
    "Material composition and fabric weight confirmed by approved sample",
    customization,
    "Fit, colour, finish and size grading confirmed by buyer brief",
    "Private-label labels, trims and packaging available",
  ],
  seoTitle: `${productName} Manufacturer & Private Label Supplier | Irha Apparels`,
  seoDescription:
    `Custom ${productName.toLowerCase()} manufacturing for streetwear brands, wholesalers and private-label buyers, with material, construction, fit, artwork and branding confirmed by specification.`,
});

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
  "sublimated-soccer-uniform-kit": sportswearOverride({
    productName: "Soccer Uniform Kit",
    buyerPrograms: "clubs, academies and teamwear buyers",
    construction: "Jersey and short construction developed from the approved team kit brief",
    customization: "Names, numbers, crests and sponsor artwork applied by the buyer-approved decoration method",
  }),
  "cricket-jersey": sportswearOverride({
    productName: "Cricket Jersey",
    buyerPrograms: "clubs, schools and cricket apparel buyers",
    construction: "Collar, placket, sleeve and body construction developed from the approved jersey brief",
    customization: "Club crests, player details and sponsor artwork applied by the buyer-approved decoration method",
  }),
  "cricket-uniform-kit": sportswearOverride({
    productName: "Cricket Uniform Kit",
    buyerPrograms: "clubs, schools and teamwear buyers",
    construction: "Shirt and trouser construction coordinated from the approved cricket kit brief",
    customization: "Club crests, player details and sponsor artwork applied by the buyer-approved decoration method",
  }),
  "baseball-jersey": sportswearOverride({
    productName: "Baseball Jersey",
    buyerPrograms: "clubs, schools and baseball apparel buyers",
    construction: "Button placket, sleeve, hem and body construction developed from the approved jersey brief",
    customization: "Team marks, names and numbers applied by the buyer-approved decoration method",
  }),
  "baseball-uniform-kit": sportswearOverride({
    productName: "Baseball Uniform Kit",
    buyerPrograms: "clubs, schools and teamwear buyers",
    construction: "Jersey and trouser construction coordinated from the approved baseball kit brief",
    customization: "Team marks, player names and numbers applied by the buyer-approved decoration method",
  }),
  "basketball-mesh-jersey": sportswearOverride({
    productName: "Basketball Jersey",
    buyerPrograms: "clubs, schools and basketball apparel buyers",
    construction: "Sleeveless neckline, armhole, panel and hem construction developed from the approved jersey brief",
    customization: "Team marks, player names and numbers applied by the buyer-approved decoration method",
  }),
  "basketball-uniform-kit": sportswearOverride({
    productName: "Basketball Uniform Kit",
    buyerPrograms: "clubs, schools and teamwear buyers",
    construction: "Jersey and short construction coordinated from the approved basketball kit brief",
    customization: "Team marks, player names and numbers applied by the buyer-approved decoration method",
  }),
  "rugby-jersey": sportswearOverride({
    productName: "Rugby Jersey",
    buyerPrograms: "clubs, schools and rugby apparel buyers",
    construction: "Collar, panel, seam and sleeve construction developed from the approved rugby jersey brief",
    customization: "Club crests, player details and sponsor artwork applied by the buyer-approved decoration method",
  }),
  "rugby-uniform-kit": sportswearOverride({
    productName: "Rugby Uniform Kit",
    buyerPrograms: "clubs, schools and teamwear buyers",
    construction: "Jersey and short construction coordinated from the approved rugby kit brief",
    customization: "Club crests, player details and sponsor artwork applied by the buyer-approved decoration method",
  }),
  "athletic-onesie": sportswearOverride({
    productName: "Athletic Onesie",
    buyerPrograms: "fitness brands, studios and activewear buyers",
    construction: "One-piece pattern, neckline, seam and leg opening developed from the approved activewear sample",
    customization: "Logo placement and decorative treatment confirmed by buyer artwork",
  }),
  "compression-performance-top": sportswearOverride({
    productName: "Compression Performance Top",
    buyerPrograms: "fitness brands, teams and activewear buyers",
    construction: "Close-fit pattern, panel and seam layout developed from the approved performance top sample",
    customization: "Logo placement, panel accents and decorative treatment confirmed by buyer artwork",
  }),
  "gym-leggings": sportswearOverride({
    productName: "Gym Leggings",
    buyerPrograms: "fitness brands, studios and activewear buyers",
    construction: "Rise, waistband, seam, pocket and leg profile developed from the approved leggings sample",
    customization: "Logo placement, panel accents and decorative treatment confirmed by buyer artwork",
  }),
  "gym-tank-top": sportswearOverride({
    productName: "Gym Tank Top",
    buyerPrograms: "fitness brands, gyms and activewear buyers",
    construction: "Neckline, armhole, shoulder and body fit developed from the approved tank top sample",
    customization: "Logo placement and decorative treatment confirmed by buyer artwork",
  }),
  "performance-gym-hoodie": sportswearOverride({
    productName: "Performance Gym Hoodie",
    buyerPrograms: "fitness brands, teams and activewear buyers",
    construction: "Hood, pocket, sleeve, cuff and hem construction developed from the approved hoodie sample",
    customization: "Logo placement, trims and decorative treatment confirmed by buyer artwork",
  }),
  "performance-sports-bra": sportswearOverride({
    productName: "Performance Sports Bra",
    buyerPrograms: "fitness brands, studios and activewear buyers",
    construction: "Support level, neckline, strap, underband and seam construction confirmed by the approved sample",
    customization: "Logo placement, panel accents and decorative treatment confirmed by buyer artwork",
  }),
  "performance-tracksuit-set": sportswearOverride({
    productName: "Performance Tracksuit Set",
    buyerPrograms: "clubs, teams and activewear buyers",
    construction: "Jacket and trouser fit, collar, cuff, waistband and pocket construction coordinated from the approved set",
    customization: "Team branding, logo placement and trims confirmed by buyer artwork",
  }),
  "quarter-zip-pullover": sportswearOverride({
    productName: "Quarter-Zip Pullover",
    buyerPrograms: "clubs, teams and activewear buyers",
    construction: "Collar, zip, sleeve, cuff and hem construction developed from the approved pullover sample",
    customization: "Logo placement, panel accents and trims confirmed by buyer artwork",
  }),
  "running-shorts": sportswearOverride({
    productName: "Running Shorts",
    buyerPrograms: "running clubs, fitness brands and activewear buyers",
    construction: "Inseam, waistband, lining, pocket and hem construction developed from the approved shorts sample",
    customization: "Logo placement, panel accents and reflective details where requested by the buyer",
  }),
  "track-pants": sportswearOverride({
    productName: "Track Pants",
    buyerPrograms: "clubs, teams and activewear buyers",
    construction: "Fit, waistband, pocket, cuff and leg opening developed from the approved track pant sample",
    customization: "Team branding, logo placement, panel accents and trims confirmed by buyer artwork",
  }),
  "training-shirt": sportswearOverride({
    productName: "Training Shirt",
    buyerPrograms: "clubs, academies and teamwear buyers",
    construction: "Neckline, sleeve, body fit and seam construction developed from the approved training shirt sample",
    customization: "Team marks, names, numbers and sponsor artwork applied by the buyer-approved decoration method",
  }),
  "zip-up-fleece-jacket": sportswearOverride({
    productName: "Zip-Up Fleece Jacket",
    buyerPrograms: "clubs, teams and activewear buyers",
    construction: "Collar, zip, pocket, sleeve, cuff and hem construction developed from the approved jacket sample",
    customization: "Team branding, logo placement and trims confirmed by buyer artwork",
  }),
  "bomber-jacket": streetwearOverride({
    productName: "Bomber Jacket",
    construction: "Collar, front closure, pocket, sleeve, cuff and hem construction developed from the approved jacket sample",
    customization: "Artwork placement, embroidery, print, patches and trims confirmed by buyer brief",
  }),
  "long-sleeve-streetwear-tee": streetwearOverride({
    productName: "Long-Sleeve Streetwear Tee",
    construction: "Neckline, shoulder, sleeve, cuff, body fit and hem construction developed from the approved tee sample",
    customization: "Artwork placement, print, embroidery and label treatment confirmed by buyer brief",
  }),
  "oversized-graphic-t-shirt": streetwearOverride({
    productName: "Oversized Graphic T-Shirt",
    construction: "Neckline, shoulder drop, sleeve, body proportion and hem developed from the approved T-shirt sample",
    customization: "Graphic placement, print, embroidery and label treatment confirmed by buyer artwork",
  }),
  "oversized-streetwear-hoodie": streetwearOverride({
    productName: "Oversized Streetwear Hoodie",
    construction: "Hood, shoulder, sleeve, cuff, pocket, body proportion and hem developed from the approved hoodie sample",
    customization: "Artwork placement, print, embroidery, patches and trims confirmed by buyer brief",
  }),
  "casual-sweatpants": streetwearOverride({
    productName: "Casual Sweatpants",
    construction: "Rise, waistband, drawcord, pocket, leg profile, cuff and hem developed from the approved sweatpant sample",
    customization: "Artwork placement, embroidery, print, labels and trims confirmed by buyer brief",
  }),
  "streetwear-shorts": streetwearOverride({
    productName: "Streetwear Shorts",
    construction: "Rise, waistband, drawcord, pocket, inseam and hem construction developed from the approved shorts sample",
    customization: "Artwork placement, embroidery, print, labels and trims confirmed by buyer brief",
  }),
  "tactical-cargo-pants": streetwearOverride({
    productName: "Tactical Cargo Pants",
    construction: "Rise, waistband, cargo pocket, knee, leg profile, adjustment and hem construction developed from the approved trouser sample",
    customization: "Pocket layout, hardware, labels, patches and trims confirmed by buyer brief",
  }),
};