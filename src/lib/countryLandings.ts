// Country-targeted landing pages for B2B lead capture.
// Configured here, rendered by src/pages/CountryLanding.tsx.

export type CountryLanding = {
  slug: string;
  country: string;
  countryCode: string; // ISO for hreflang context
  title: string;
  description: string;
  h1: string;
  intro: string;
  usps: { title: string; body: string }[];
  productHighlights: { label: string; href: string }[];
  faqs: { q: string; a: string }[];
};

const STANDARD_FAQS = (country: string) => [
  {
    q: `What is your MOQ for ${country} buyers?`,
    a: "Our standard MOQ is 50 pieces per design and colorway across every category — lederhosen, hoodies, sportswear, leather and nightwear. Size splits XS–3XL inside the MOQ are free.",
  },
  {
    q: `Do you ship FOB Sialkot to ${country}?`,
    a: `Yes. FOB Sialkot is our default Incoterm for ${country} buyers. Sea-freight transit averages 22–32 days; air-freight is 4–7 days. DDP delivered-duty-paid quotes are available on request.`,
  },
  {
    q: "What is your production lead time?",
    a: "45 days from approved counter-sample and 30% advance payment. Repeat orders on existing tech packs ship in 25–30 days.",
  },
  {
    q: "Do you offer private label and OEM?",
    a: "Yes — full private label (your woven labels, hangtags, polybags, mailers), OEM (your designs, our production) and ODM (our designs, your branding). Tech-pack support is free for confirmed POs.",
  },
  {
    q: `Can you provide compliance documentation for ${country} customs?`,
    a: "Yes. OEKO-TEX Standard 100, REACH, BSCI, Sedex SMETA, GSP Form A, certificate of origin, packing list, commercial invoice and B/L or AWB are issued with every shipment.",
  },
];

export const COUNTRY_LANDINGS: CountryLanding[] = [
  {
    slug: "usa-manufacturer",
    country: "USA",
    countryCode: "US",
    title: "USA Apparel Sourcing from Pakistan | MOQ 50 | FOB Sialkot Manufacturer",
    description:
      "B2B apparel manufacturer for USA brands. MOQ 50, FOB Sialkot to LA, NY, Miami. Private label hoodies, sportswear, leather jackets, lederhosen.",
    h1: "USA Apparel Sourcing from Pakistan | MOQ 50",
    intro:
      "Irha Apparels is a Sialkot-based B2B clothing manufacturer supplying US brands, startups and retailers with private-label sportswear, streetwear, leather jackets, lederhosen and sleepwear. MOQ starts at 50 pieces per design, FOB Sialkot pricing ships to Los Angeles, New York, Miami, Houston and Chicago in 22–28 days by sea or 5–7 days by air. We hold WRAP, OEKO-TEX Standard 100, BSCI and Sedex SMETA 4-Pillar audits and issue GSP Form A, REACH and certificate-of-origin paperwork with every shipment — so US customs clears Sialkot apparel without delay. Our in-house dye-sublimation, 12-head Tajima embroidery, garment dye and finishing eliminate vendor margin stacking, which is why DTC labels and startup brands in the US are shifting their cut-and-sew programs from China and Bangladesh to Sialkot.",
    usps: [
      { title: "MOQ 50 pieces", body: "Per design and colorway. Same heavyweight fabrics, finishing and trims that larger brands use." },
      { title: "FOB Sialkot to US ports", body: "Sea freight 22–28 days to LA/NY/Miami. Air freight 5–7 days. DDP available." },
      { title: "US-compliant documentation", body: "GSP Form A, REACH, OEKO-TEX, WRAP audit, BSCI — issued with every shipment." },
    ],
    productHighlights: [
      { label: "Custom Hoodies & Streetwear", href: "/products/streetwear" },
      { label: "Sublimated Sportswear", href: "/products/sportswear" },
      { label: "Custom Leather Jackets", href: "/products/leather" },
    ],
    faqs: STANDARD_FAQS("the USA"),
  },
  {
    slug: "uk-manufacturer",
    country: "UK",
    countryCode: "GB",
    title: "UK Apparel Sourcing from Pakistan | MOQ 50 | FOB Sialkot Manufacturer",
    description:
      "B2B clothing manufacturer for UK brands. MOQ 50, FOB Sialkot to Felixstowe & Southampton. Custom hoodies, sportswear, leather jackets, private label.",
    h1: "UK Apparel Sourcing from Pakistan | MOQ 50",
    intro:
      "Irha Apparels manufactures private-label and OEM apparel for UK brands, boutiques and e-commerce retailers from our Sialkot atelier. MOQ 50 per design, FOB Sialkot to Felixstowe, Southampton and London Gateway with 18–22 day sea-freight transit. We supply custom streetwear hoodies, sublimated sportswear, leather jackets, lederhosen and sleepwear to retailers across London, Manchester, Birmingham, Leeds and Glasgow. Post-Brexit tariff codes are pre-checked on every shipment and we provide REX (Registered Exporter) declarations alongside REACH, OEKO-TEX and BSCI documentation so HMRC clears Sialkot apparel in 3–5 working days.",
    usps: [
      { title: "MOQ 50 pieces", body: "Per design. Built for UK indie brands, boutiques and emerging streetwear labels." },
      { title: "FOB Sialkot to UK ports", body: "Felixstowe & Southampton sea freight 18–22 days. Air freight to Heathrow 4–6 days." },
      { title: "Post-Brexit ready", body: "REX exporter declarations, HS code pre-check, REACH, OEKO-TEX, BSCI." },
    ],
    productHighlights: [
      { label: "Custom Hoodies & Tees", href: "/products/streetwear" },
      { label: "Sublimated Jerseys", href: "/products/sportswear" },
      { label: "Lederhosen & Trachten", href: "/products/bavarian" },
    ],
    faqs: STANDARD_FAQS("the UK"),
  },
  {
    slug: "germany-manufacturer",
    country: "Germany",
    countryCode: "DE",
    title: "Germany Apparel & Lederhosen Sourcing from Pakistan | MOQ 50 | FOB Sialkot",
    description:
      "B2B Hersteller für Deutschland. MOQ 50, FOB Sialkot to Hamburg. Custom Lederhosen, Dirndl, Sportswear, Streetwear. Private Label OEM ODM.",
    h1: "Germany Apparel Sourcing from Pakistan | MOQ 50",
    intro:
      "Irha Apparels is the trachten and apparel partner of choice for German wholesalers, Oktoberfest retailers and DTC fashion brands. Our largest export program ships from Sialkot to Hamburg, Bremerhaven and Munich (via Frankfurt air cargo) every week. MOQ 50 sets across lederhosen, dirndl, bundhosen, sportswear, streetwear and leather — with OEKO-TEX Standard 100, REACH compliance and EU customs paperwork issued before container loading. Sea-freight transit to Hamburg averages 25–30 days; air-freight to Frankfurt is 3–5 days. We handle EORI registration support, German VAT (USt-IdNr) invoicing and Intrastat declarations so importers in Munich, Berlin, Hamburg, Düsseldorf and Stuttgart clear shipments in under a week.",
    usps: [
      { title: "Trachten specialists", body: "Authentic deer suede, hand-embroidery, antique alpine hardware. Pre-Oktoberfest production windows open Jan–May." },
      { title: "FOB Sialkot to Hamburg", body: "Sea freight 25–30 days. Frankfurt air freight 3–5 days. DDP to Munich available." },
      { title: "EU-compliant paperwork", body: "OEKO-TEX Std 100, REACH, BSCI, GSP Form A, EORI support, USt-IdNr invoices." },
    ],
    productHighlights: [
      { label: "Lederhosen & Dirndl", href: "/products/bavarian" },
      { label: "Custom Sportswear", href: "/products/sportswear" },
      { label: "Heavyweight Streetwear", href: "/products/streetwear" },
    ],
    faqs: STANDARD_FAQS("Germany"),
  },
  {
    slug: "canada-manufacturer",
    country: "Canada",
    countryCode: "CA",
    title: "Canada Apparel & Custom Hoodies Sourcing from Pakistan | MOQ 50 | FOB Sialkot",
    description:
      "B2B clothing manufacturer for Canadian brands. MOQ 50, FOB Sialkot to Vancouver, Toronto & Montreal. Custom hoodies, streetwear, sportswear, leather.",
    h1: "Canada Apparel Sourcing from Pakistan | MOQ 50",
    intro:
      "Irha Apparels supplies Canadian streetwear brands, snowboard and outdoor labels, sports clubs and university merch stores from our Sialkot factory. MOQ 50 per design, FOB Sialkot to Vancouver (32–36 day sea transit), Toronto and Montreal (via Halifax, 28–34 days). Heavyweight 320–500 GSM hoodies, brushed-back fleece, oversized tees, sublimated jerseys and leather outerwear — built to handle Canadian winters and the Canadian streetwear aesthetic. We pre-check Canadian tariff classifications (HS Chapter 61 and 62), issue NAFTA/CUSMA-style certificates of origin where applicable, plus OEKO-TEX, BSCI and Sedex SMETA paperwork so CBSA clears Sialkot apparel without delay in Toronto, Vancouver and Montreal.",
    usps: [
      { title: "Heavyweight hoodies", body: "320–500 GSM brushed fleece for Canadian winters. Garment dye, acid wash, puff print, embroidery." },
      { title: "FOB Sialkot to Canada", body: "Vancouver 32–36 days, Halifax/Toronto 28–34 days, Montreal 30–35 days. Air freight to YYZ 5–7 days." },
      { title: "CBSA-ready paperwork", body: "HS pre-classification, certificate of origin, OEKO-TEX, BSCI, REACH." },
    ],
    productHighlights: [
      { label: "Custom Hoodies", href: "/products/streetwear" },
      { label: "Sublimated Sportswear", href: "/products/sportswear" },
      { label: "Leather Outerwear", href: "/products/leather" },
    ],
    faqs: STANDARD_FAQS("Canada"),
  },
  {
    slug: "australia-manufacturer",
    country: "Australia",
    countryCode: "AU",
    title: "Australia Apparel & Activewear Sourcing from Pakistan | MOQ 50 | FOB Sialkot",
    description:
      "B2B activewear manufacturer for Australian brands. MOQ 50, FOB Sialkot to Sydney, Melbourne, Brisbane. Sublimated sportswear, gym wear, streetwear.",
    h1: "Australia Apparel Sourcing from Pakistan | MOQ 50",
    intro:
      "Irha Apparels manufactures private-label sportswear, gym wear, streetwear and athleisure for Australian fitness brands, footy clubs and DTC labels from our Sialkot factory. MOQ 50 per design, FOB Sialkot to Sydney, Melbourne, Brisbane, Perth and Adelaide with sea-freight transit of 28–35 days or air freight of 5–7 days. We run in-house dye-sublimation for AFL, NRL and rugby kits, GRS-recycled polyester for sustainable activewear brands, and 320–420 GSM heavyweight fleece for streetwear drops. ABF customs paperwork — OEKO-TEX, REACH, BSCI, Sedex SMETA, GSP Form A and certificate of origin — is issued with every container, and we pre-check Australian tariff classifications so customs clears Sialkot apparel inside a week.",
    usps: [
      { title: "Sublimated activewear", body: "AFL, NRL, rugby kits + gym wear. In-house dye sublimation, GRS-recycled polyester." },
      { title: "FOB Sialkot to Australia", body: "Sydney/Melbourne/Brisbane 28–35 days. Air freight to SYD/MEL 5–7 days. DDP available." },
      { title: "ABF-ready documentation", body: "HS pre-classification, OEKO-TEX, BSCI, Sedex SMETA, REACH, GSP Form A." },
    ],
    productHighlights: [
      { label: "Custom Activewear", href: "/products/sportswear" },
      { label: "Heavyweight Hoodies", href: "/products/streetwear" },
      { label: "Custom Leather Jackets", href: "/products/leather" },
    ],
    faqs: STANDARD_FAQS("Australia"),
  },
];

export const COUNTRY_SLUGS = COUNTRY_LANDINGS.map((c) => c.slug);

export function findCountryLanding(slug: string) {
  return COUNTRY_LANDINGS.find((c) => c.slug === slug);
}
