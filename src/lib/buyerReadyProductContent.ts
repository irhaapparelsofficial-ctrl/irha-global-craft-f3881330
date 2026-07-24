export type BuyerReadyProductContentInput = {
  name: string;
  seo_title?: string | null;
  seo_description?: string | null;
  short_description?: string | null;
  description?: string | null;
};

const BLOCKED_PUBLIC_TERMS = [
  "moq",
  "lead time",
  "production timeline",
  "sample timeline",
  "shipping time",
  "delivery time",
  "oeko",
  "bsci",
  "sedex",
  "iso 9001",
  "gots",
  "wrap",
  "reach",
  "ddp",
  "fob",
  "weekly shipment",
  "container load",
] as const;

export function hasBlockedBuyerReadyTerm(value: string) {
  const lower = value.toLowerCase();
  return BLOCKED_PUBLIC_TERMS.some((term) => lower.includes(term));
}

export function buyerReadyProgramDescription(mainCategorySlug: string, productName: string) {
  switch (mainCategorySlug) {
    case "bavarian-trachten-wear":
      return `${productName} custom manufacturing for Trachten retailers, wholesalers and private-label buyers. Material, embroidery, trims, sizing, packaging and order requirements are confirmed after buyer and factory review.`;
    case "premium-leather-apparel":
      return `${productName} custom development for wholesale and private-label leather apparel programs. Leather type, construction, hardware, lining, fit, branding and packaging are confirmed against the approved buyer specification.`;
    case "sportswear":
      return `${productName} custom development for teams, clubs, distributors and private-label sportswear buyers. Fabric, panel construction, sizing, decoration, colors, packaging and production requirements are confirmed after review.`;
    case "streetwear-activewear":
      return `${productName} custom manufacturing for streetwear, activewear and private-label brand programs. Fabric, weight, fit, construction, decoration, labels, colors and packaging are confirmed against the buyer brief.`;
    case "leisure-nightwear":
      return `${productName} custom manufacturing for leisurewear, loungewear, sleepwear and hospitality buyer programs. Fabric, comfort, fit, construction, trims, branding and packaging are confirmed after requirement review.`;
    default:
      return `${productName} custom manufacturing for wholesale, OEM, ODM and private-label buyers. Specifications are confirmed after buyer and factory review.`;
  }
}

function safeSource(values: Array<string | null | undefined>, fallback: string) {
  for (const value of values) {
    const trimmed = value?.trim();
    if (trimmed && !hasBlockedBuyerReadyTerm(trimmed)) return trimmed;
  }
  return fallback;
}

export function resolveBuyerReadyProductContent(
  input: BuyerReadyProductContentInput,
  mainCategorySlug: string,
) {
  const name = input.name.trim();
  const fallbackDescription = buyerReadyProgramDescription(mainCategorySlug, name);
  return {
    name,
    h1: name,
    seoTitle: input.seo_title?.trim() || `${name} Wholesale Manufacturer | Sialkot Garment Factory`,
    description: safeSource(
      [input.seo_description, input.short_description, input.description],
      fallbackDescription,
    ),
  };
}
