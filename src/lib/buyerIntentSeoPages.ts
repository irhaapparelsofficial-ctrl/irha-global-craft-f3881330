import {
  BUYER_INTENT_FOOTER_LINKS,
  BUYER_INTENT_LANDING_PAGES,
  type BuyerIntentLandingPage,
} from "./buyerIntentLandingPages";
import { GERMAN_BUYER_JOURNEY_PAGES } from "./germanBuyerJourneyPages";
import { WAVE2_BUYER_JOURNEY_PAGES } from "./wave2BuyerJourneyPages";

const germanyBroadAlternates = [
  { locale: "en", href: "/germany-apparel-manufacturer" },
  { locale: "de", href: "/de/bekleidungshersteller-deutschland" },
];

const sportsAlternates = [
  { locale: "en", href: "/custom-sportswear-manufacturer-germany" },
  { locale: "de", href: "/de/sportbekleidung-hersteller" },
];

const leatherAlternates = [
  { locale: "en", href: "/leather-apparel-manufacturer-germany" },
  { locale: "de", href: "/de/lederbekleidung-hersteller" },
];

const ENGLISH_BUYER_INTENT_EXPANSION: BuyerIntentLandingPage[] = [
  {
    path: "/custom-sportswear-manufacturer-germany",
    locale: "en-DE",
    direction: "ltr",
    title: "Sportswear Manufacturer for Germany | Teamwear & Private Label",
    description: "Custom sportswear and teamwear manufacturing for German clubs, distributors and brands with artwork, samples, sizing, labels and repeat-order planning.",
    h1: "Custom Sportswear Manufacturer for German B2B Buyers",
    eyebrow: "Germany · Sportswear Manufacturing",
    intro: "Irha Apparels develops custom teamwear, training apparel and private-label sportswear for German clubs, distributors, wholesalers and brands. The sport, artwork, material direction, size range, decoration, packaging and repeat-order needs are reviewed before quotation or production commitments.",
    market: "Germany",
    productFocus: "custom teamwear, training apparel and private-label sportswear",
    categoryPath: "/products/sportswear",
    primaryLabel: "Request a sportswear quote",
    secondaryLabel: "Book a factory video call",
    sections: [
      {
        heading: "Sportswear programs for clubs and distributors",
        body: "A buyer can develop match apparel, training wear and related garments under one approved colour, artwork and size system.",
        bullets: ["Football, basketball, rugby, cricket and hockey kits", "Tracksuits, warm-up tops, training shirts, shorts and pants", "Club, academy, school and distributor programs", "Private-label teamwear and branded performance collections"],
      },
      {
        heading: "Artwork, materials and construction review",
        body: "The decoration and construction route is selected from the actual design and intended use instead of being assumed from a generic product name.",
        bullets: ["Club colours, crests, sponsor marks, names and numbers", "Sublimation, embroidery, DTF or another approved method", "Fabric composition, weight, stretch and construction direction", "Measurements, size ratios, grading and packing breakdown"],
      },
      {
        heading: "Sample and approval route",
        body: "Sampling can be used to review fit, appearance, artwork and workmanship before the bulk order is confirmed against written buyer comments.",
        bullets: ["Reference or tech-pack review before development", "Artwork proof and placement approval", "Sample comments and revisions documented", "MOQ, price, production timing and shipping confirmed after review"],
      },
      {
        heading: "Repeat-order preparation",
        body: "Approved files and order references can support later top-ups, while fabric and component continuity are checked again before each production run.",
        bullets: ["Approved colour and artwork references retained", "Size charts and roster formats recorded", "Material availability rechecked before repeat production", "Packing and carton information prepared per order"],
      },
    ],
    faqs: [
      { question: "Can you manufacture custom team kits for German clubs?", answer: "Yes. Kits and training garments can be reviewed with club colours, crests, sponsor artwork, player details, size ratios and repeat-order requirements." },
      { question: "Can individual player names and numbers be added?", answer: "Yes, when the final roster is supplied in the agreed format before production. Method, placement and approval responsibility are confirmed with the order." },
      { question: "Can a sportswear sample be approved before bulk production?", answer: "Yes. Sampling can cover fit, fabric, construction, artwork and decoration, with the required revisions agreed before bulk production is confirmed." },
      { question: "Is one MOQ used for every sportswear style?", answer: "No. Quantity depends on the garment, fabric, colours, decoration, size ratio and packing, so an achievable MOQ is confirmed after the brief is reviewed." },
    ],
    relatedPaths: ["/de/sportbekleidung-hersteller", "/products/sportswear", "/markets/germany", "/germany-apparel-manufacturer", "/repeat-order"],
    alternates: sportsAlternates,
  },
  {
    path: "/leather-apparel-manufacturer-germany",
    locale: "en-DE",
    direction: "ltr",
    title: "Leather Apparel Manufacturer for Germany | Private Label B2B",
    description: "Custom leather apparel manufacturing for German brands and wholesalers with leather, lining, hardware, sizing, samples, labels and packaging approval.",
    h1: "Custom Leather Apparel Manufacturer for German Buyers",
    eyebrow: "Germany · Leather Apparel Manufacturing",
    intro: "Irha Apparels develops custom leather jackets, vests, trousers and selected accessories for German brands, importers and wholesalers. Leather type, thickness, finish, lining, hardware, fit, branding, packaging and approval requirements are reviewed before price or production timing is confirmed.",
    market: "Germany",
    productFocus: "custom leather jackets, vests, trousers and private-label leather apparel",
    categoryPath: "/products/premium-leather-apparel",
    primaryLabel: "Request a leatherwear quote",
    secondaryLabel: "Book a factory video call",
    sections: [
      {
        heading: "Leather products for B2B programs",
        body: "A buyer can begin with one outerwear style or coordinate a broader private-label range, subject to product-by-product feasibility review.",
        bullets: ["Biker, fashion, bomber and varsity-inspired jackets", "Leather vests, waistcoats, trousers and outerwear", "Belts, gloves, bags and selected accessories", "Custom lining, embroidery, patches, labels and packaging"],
      },
      {
        heading: "Approve leather and components",
        body: "Because natural leather varies, the approved specification must define the material and component references used to judge production consistency.",
        bullets: ["Leather type, thickness, shade, grain and hand-feel", "Zippers, snaps, buckles, buttons and other hardware", "Lining, insulation, reinforcement and seam construction", "Measurement chart, fit, grading and tolerance review"],
      },
      {
        heading: "Sampling and workmanship review",
        body: "A sample can align leather appearance, fit, construction, hardware and branding before the bulk order is released.",
        bullets: ["Buyer-owned reference, sketch or tech-pack review", "Leather swatch or approved sample comparison", "Fit, workmanship and component comments documented", "Pre-production approval used when required by the program"],
      },
      {
        heading: "Commercial scope after technical review",
        body: "The quotation separates product construction, branding, packing and shipping assumptions so the buyer knows what is included before commitment.",
        bullets: ["MOQ confirmed from leather and production requirements", "Pricing based on approved material and construction", "Production timing confirmed after sample and material review", "Incoterms and delivery responsibility agreed in writing"],
      },
    ],
    faqs: [
      { question: "Which leather types can be used for German buyer programs?", answer: "The proposed leather depends on style, finish, construction and commercial requirements. The quotation identifies the intended specification and substitute rules." },
      { question: "Can zippers, lining and hardware be customized?", answer: "Yes. Hardware, lining, insulation and internal branding can be reviewed against the style and approved component references before production." },
      { question: "Can a leather jacket sample be approved first?", answer: "Yes. A sample can be used to review leather, fit, construction, hardware, labels and finishing before bulk production is confirmed." },
      { question: "Is there one MOQ for all leather products?", answer: "No. Quantity depends on leather availability, construction, colours, hardware, decoration, sizes and packaging, so it is confirmed after review." },
    ],
    relatedPaths: ["/de/lederbekleidung-hersteller", "/products/premium-leather-apparel", "/markets/germany", "/germany-apparel-manufacturer", "/buyer-trust"],
    alternates: leatherAlternates,
  },
];

const enhancedEnglishBasePages = BUYER_INTENT_LANDING_PAGES
  .filter((page) => !page.path.startsWith("/de/"))
  .map((page) => page.path === "/germany-apparel-manufacturer" ? { ...page, alternates: germanyBroadAlternates } : page);

export const SEO_BUYER_INTENT_EXPANSION: BuyerIntentLandingPage[] = [
  ...ENGLISH_BUYER_INTENT_EXPANSION,
  ...GERMAN_BUYER_JOURNEY_PAGES.filter((page) => [
    "/de/bekleidungshersteller-deutschland",
    "/de/sportbekleidung-hersteller",
    "/de/lederbekleidung-hersteller",
  ].includes(page.path)),
  ...WAVE2_BUYER_JOURNEY_PAGES,
];

export const SEO_BUYER_INTENT_LANDING_PAGES: BuyerIntentLandingPage[] = [
  ...enhancedEnglishBasePages,
  ...ENGLISH_BUYER_INTENT_EXPANSION,
  ...GERMAN_BUYER_JOURNEY_PAGES,
  ...WAVE2_BUYER_JOURNEY_PAGES,
];

export const SEO_BUYER_INTENT_PATHS = SEO_BUYER_INTENT_LANDING_PAGES.map((page) => page.path);

export const SEO_BUYER_INTENT_FOOTER_LINKS = [
  ...BUYER_INTENT_FOOTER_LINKS,
  { label: "Deutsch · Bekleidungshersteller", href: "/de/bekleidungshersteller-deutschland" },
  { label: "Deutsch · Sportbekleidung", href: "/de/sportbekleidung-hersteller" },
  { label: "Deutsch · Lederbekleidung", href: "/de/lederbekleidung-hersteller" },
  { label: "Français · Fabricant de vêtements", href: "/fr/fabricant-vetements" },
  { label: "Français · Vêtements de sport", href: "/fr/fabricant-vetements-sport" },
  { label: "Nederlands · Kledingfabrikant", href: "/nl/kledingfabrikant" },
  { label: "Nederlands · Sportkleding", href: "/nl/sportkleding-fabrikant" },
] as const;

export function getSeoBuyerIntentLandingPage(pathname: string) {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  const route = normalized === "/fr" || normalized === "/nl" ? `${normalized}/` : normalized;
  return SEO_BUYER_INTENT_LANDING_PAGES.find((page) => page.path === route);
}
