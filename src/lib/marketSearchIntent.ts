export type MarketSearchIntent = {
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  manufacturerPath: string;
  manufacturerLabel: string;
};

export const MARKET_SEARCH_INTENT: Record<string, MarketSearchIntent> = {
  germany: {
    title: "Apparel Sourcing Guide for Germany | Buyer Checklist",
    description: "Country-level apparel sourcing guidance for German importers, wholesalers and brands covering product briefs, supplier verification and approval planning.",
    h1: "Apparel Sourcing Guide for Buyers in Germany",
    eyebrow: "Germany · Buyer Sourcing Guide",
    intro: "This guide helps German importers, wholesalers, private-label brands and specialist retailers prepare a complete sourcing brief, compare relevant product programs and verify a Pakistan-based supplier. Buyers ready for a transactional manufacturing discussion can continue to the dedicated Germany apparel manufacturer page.",
    manufacturerPath: "/germany-apparel-manufacturer",
    manufacturerLabel: "Germany manufacturer page",
  },
  austria: {
    title: "Apparel Sourcing Guide for Austria | Trachten Buyers",
    description: "A country sourcing guide for Austrian Trachten, leather and private-label buyers covering specifications, sampling, verification and order preparation.",
    h1: "Apparel Sourcing Guide for Buyers in Austria",
    eyebrow: "Austria · Buyer Sourcing Guide",
    intro: "This guide helps Austrian wholesalers, Trachten retailers, importers and private-label brands organize styling, materials, samples, branding and verification before requesting commercial terms. The dedicated Austria apparel manufacturer page is available for a direct production inquiry.",
    manufacturerPath: "/austria-apparel-manufacturer",
    manufacturerLabel: "Austria manufacturer page",
  },
  switzerland: {
    title: "Apparel Sourcing Guide for Switzerland | B2B Buyers",
    description: "Country-level sourcing guidance for Swiss apparel importers and brands covering specification control, supplier evidence, samples and order scope.",
    h1: "Apparel Sourcing Guide for Buyers in Switzerland",
    eyebrow: "Switzerland · Buyer Sourcing Guide",
    intro: "This guide helps Swiss brands, importers, retailers and distributors structure a careful sourcing process around product scope, evidence, approvals and delivery responsibility. Buyers with a defined requirement can use the dedicated Switzerland apparel manufacturer page for a direct review.",
    manufacturerPath: "/switzerland-apparel-manufacturer",
    manufacturerLabel: "Switzerland manufacturer page",
  },
  netherlands: {
    title: "Apparel Sourcing Guide for the Netherlands | Brand Buyers",
    description: "A sourcing guide for Dutch brands and importers covering collection briefs, private-label packaging, supplier verification and production approvals.",
    h1: "Apparel Sourcing Guide for Buyers in the Netherlands",
    eyebrow: "Netherlands · Buyer Sourcing Guide",
    intro: "This guide helps Dutch brands, importers, wholesalers and online retailers organize collection scope, product approvals, private-label presentation and supplier verification. The dedicated Netherlands apparel manufacturer page is the next step for a defined production brief.",
    manufacturerPath: "/netherlands-apparel-manufacturer",
    manufacturerLabel: "Netherlands manufacturer page",
  },
  "united-states": {
    title: "Apparel Sourcing Guide for US Brands | Buyer Checklist",
    description: "Country-level sourcing guidance for US apparel brands and wholesalers covering product development, private labels, samples and supplier verification.",
    h1: "Apparel Sourcing Guide for Buyers in the United States",
    eyebrow: "United States · Buyer Sourcing Guide",
    intro: "This guide helps US brands, wholesalers and specialty buyers prepare product specifications, private-label requirements, approval stages and supplier checks before requesting a quote. A dedicated USA private-label clothing manufacturer page supports transactional inquiries.",
    manufacturerPath: "/usa-private-label-clothing-manufacturer",
    manufacturerLabel: "USA manufacturer page",
  },
  "united-kingdom": {
    title: "Apparel Sourcing Guide for UK Buyers | Supplier Checklist",
    description: "Country-level apparel sourcing guidance for UK brands, clubs and wholesalers covering specifications, samples, branding and supplier verification.",
    h1: "Apparel Sourcing Guide for Buyers in the United Kingdom",
    eyebrow: "United Kingdom · Buyer Sourcing Guide",
    intro: "This guide helps UK brands, sports buyers, clubs, wholesalers and importers organize product requirements, sample approvals, branding and supplier verification. Buyers ready to discuss production can continue to the dedicated UK custom apparel manufacturer page.",
    manufacturerPath: "/uk-custom-apparel-manufacturer",
    manufacturerLabel: "UK manufacturer page",
  },
  canada: {
    title: "Apparel Sourcing Guide for Canada | Importer Checklist",
    description: "A sourcing guide for Canadian apparel brands and importers covering product scope, material approvals, private labels and supplier verification.",
    h1: "Apparel Sourcing Guide for Buyers in Canada",
    eyebrow: "Canada · Buyer Sourcing Guide",
    intro: "This guide helps Canadian brands, importers, sports buyers and wholesalers prepare product scope, material approvals, labeling and supplier verification. The dedicated Canada apparel manufacturer page supports buyers with a defined manufacturing brief.",
    manufacturerPath: "/canada-apparel-manufacturer",
    manufacturerLabel: "Canada manufacturer page",
  },
  australia: {
    title: "Apparel Sourcing Guide for Australia | B2B Checklist",
    description: "Country-level apparel sourcing guidance for Australian brands, clubs and importers covering specifications, samples and logistics planning.",
    h1: "Apparel Sourcing Guide for Buyers in Australia",
    eyebrow: "Australia · Buyer Sourcing Guide",
    intro: "This guide helps Australian brands, clubs, wholesalers and importers prepare clear product specifications, approvals and long-distance delivery assumptions before commercial review. Buyers can continue to the dedicated Australia apparel manufacturer page when the requirement is ready.",
    manufacturerPath: "/australia-apparel-manufacturer",
    manufacturerLabel: "Australia manufacturer page",
  },
  "new-zealand": {
    title: "Apparel Sourcing Guide for New Zealand | Buyer Checklist",
    description: "A sourcing guide for New Zealand brands, clubs and importers covering product briefs, samples, repeat orders and supplier verification.",
    h1: "Apparel Sourcing Guide for Buyers in New Zealand",
    eyebrow: "New Zealand · Buyer Sourcing Guide",
    intro: "This guide helps New Zealand brands, clubs, schools and importers organize product requirements, sample approval, repeat-order records and supplier verification. The dedicated New Zealand apparel manufacturer page is available for direct production discussions.",
    manufacturerPath: "/new-zealand-apparel-manufacturer",
    manufacturerLabel: "New Zealand manufacturer page",
  },
};

export function getMarketSearchIntent(slug: string): MarketSearchIntent {
  const profile = MARKET_SEARCH_INTENT[slug];
  if (!profile) throw new Error(`Missing market search-intent profile for ${slug}`);
  return profile;
}
