export type MarketSection = {
  heading: string;
  body: string;
  bullets: string[];
};

export type MarketFaq = {
  question: string;
  answer: string;
};

export type MarketPage = {
  slug: string;
  country: string;
  locale: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  summary: string;
  priorityPrograms: Array<{ label: string; href: string; note: string }>;
  sections: MarketSection[];
  faqs: MarketFaq[];
};

const commonPrograms = {
  bavarian: { label: "Bavarian & Trachten Wear", href: "/products/bavarian-trachten-wear" },
  leather: { label: "Premium Leather Apparel", href: "/products/premium-leather-apparel" },
  sports: { label: "Sportswear", href: "/products/sportswear" },
  street: { label: "Streetwear & Activewear", href: "/products/streetwear-activewear" },
  leisure: { label: "Leisure & Nightwear", href: "/products/leisure-nightwear" },
};

export const MARKET_PAGES: MarketPage[] = [
  {
    slug: "germany",
    country: "Germany",
    locale: "en-DE",
    title: "Custom Apparel Manufacturer for German B2B Buyers | Irha Apparels",
    description: "Requirement-led OEM, ODM and private-label apparel manufacturing for German importers, wholesalers, brands and Trachten buyers.",
    h1: "Custom Apparel Manufacturing for Buyers in Germany",
    eyebrow: "Germany · B2B Manufacturing Programs",
    intro: "Irha Apparels works with German importers, wholesalers, private-label brands and specialist retailers that need a clear development path before bulk production. Our team in Sialkot reviews the product brief, construction, materials, branding, packaging and destination requirements before confirming commercial terms.",
    summary: "Germany-focused sourcing page for Trachten, leather, sportswear and private-label apparel programs.",
    priorityPrograms: [
      { ...commonPrograms.bavarian, note: "Lederhosen, dirndl, shirts, vests and accessories developed to the buyer brief." },
      { ...commonPrograms.leather, note: "Custom jackets, vests, trousers and leather accessories with reviewed construction details." },
      { ...commonPrograms.sports, note: "Teamwear and performance programs for clubs, distributors and private labels." },
    ],
    sections: [
      {
        heading: "Programs suited to a German sourcing brief",
        body: "German inquiries often arrive with precise references, specification sheets or established retail requirements. We can review both new developments and repeat-program concepts without presenting off-the-shelf pricing as a substitute for technical review.",
        bullets: [
          "Trachten and Oktoberfest-related collections for wholesale or private-label programs",
          "Leather apparel with construction, hardware and finish reviewed per style",
          "Sportswear, club kits and training apparel developed from artwork or tech packs",
          "Woven labels, care labels, hangtags and packaging scoped to the brand system",
        ],
      },
      {
        heading: "What to send before quotation",
        body: "A useful quotation starts with enough information to understand the intended product and order. Where a complete tech pack is not available, a clear reference image, target measurements and branding notes can be used to begin the review.",
        bullets: [
          "Product category, reference images or technical drawings",
          "Expected quantity range by style, colour and size",
          "Material, weight, lining, trim and decoration preferences",
          "Packaging, labelling, documentation and destination details",
        ],
      },
      {
        heading: "Verification before commitment",
        body: "Irha Apparels is an experienced manufacturer and the current website is newly built. Buyers can request a live factory video call to review the working environment, discuss the program and confirm the people responsible for follow-up before moving to sampling or bulk planning.",
        bullets: [
          "Live factory-view video call available by appointment",
          "Sampling route confirmed before bulk production",
          "Measurements, workmanship and finishing requirements reviewed per program",
          "Pricing, MOQ, timing and shipping confirmed only after requirement review",
        ],
      },
    ],
    faqs: [
      { question: "Can you manufacture Lederhosen and Dirndl programs for Germany?", answer: "Yes. We can review custom Lederhosen, Dirndl, Trachten shirts, vests and accessory programs for wholesalers, retailers and private-label buyers. Materials, construction and quantities are confirmed against the specific brief." },
      { question: "Do you publish fixed wholesale prices for German buyers?", answer: "No. Pricing is prepared after reviewing quantity, material, construction, branding, packaging and destination requirements." },
      { question: "Can we verify the factory before placing an order?", answer: "Yes. A live factory video call can be arranged so the buyer can meet the team and review the facility before progressing." },
      { question: "Can you work from a reference sample instead of a full tech pack?", answer: "A reference sample, clear images or sketches can be reviewed. The development path and missing technical details are then clarified before quotation or sampling." },
    ],
  },
  {
    slug: "austria",
    country: "Austria",
    locale: "en-AT",
    title: "Private-Label Apparel Manufacturer for Austria | Irha Apparels",
    description: "Custom Trachten, leather and branded apparel manufacturing for Austrian wholesalers, retailers, importers and event-supply buyers.",
    h1: "Private-Label Apparel Programs for Buyers in Austria",
    eyebrow: "Austria · Trachten & Custom Apparel",
    intro: "For Austrian buyers, Irha Apparels provides a requirement-led route from product idea to sampling and production review. The strongest fit is custom Trachten, leather apparel and branded garments for wholesalers, specialist retailers, private labels and event-related suppliers.",
    summary: "Austria-focused sourcing page for Trachten, leather and custom private-label apparel.",
    priorityPrograms: [
      { ...commonPrograms.bavarian, note: "Traditional and modern Trachten programs developed around the buyer's styling and quality brief." },
      { ...commonPrograms.leather, note: "Leather jackets, waistcoats, trousers, belts and related accessories." },
      { ...commonPrograms.leisure, note: "Private-label basics, leisurewear and nightwear with custom labels and packaging." },
    ],
    sections: [
      {
        heading: "Trachten development without catalogue limitations",
        body: "Austrian buyers may need a traditional silhouette, a modern retail interpretation or a coordinated collection. Instead of limiting the project to a fixed catalogue item, we review reference styling, embroidery direction, trims, fit and branding as one product program.",
        bullets: [
          "Lederhosen and leather trousers in buyer-defined constructions",
          "Dirndl dresses, blouses, aprons and coordinated accessories",
          "Trachten shirts, waistcoats, Janker-style concepts and belts",
          "Private-label presentation including labels, tags and packaging",
        ],
      },
      {
        heading: "Sampling and approval path",
        body: "The sample route is agreed according to the complexity of the style. Fit, appearance, decoration and material decisions should be approved before the production schedule is committed.",
        bullets: [
          "Review of sketches, references, existing samples or tech packs",
          "Clarification of size range and measurement expectations",
          "Branding and packaging review before bulk planning",
          "Approval points recorded for production follow-up",
        ],
      },
      {
        heading: "A direct manufacturer relationship",
        body: "The company has manufacturing experience even though the present website is new. Austrian buyers can communicate directly with the team, request a live factory video call and use the inquiry workflow to keep product requirements in one place.",
        bullets: [
          "Direct B2B communication from Sialkot",
          "Factory view available through live video",
          "Commercial terms confirmed per order, not assumed",
          "Destination documentation reviewed before confirmation",
        ],
      },
    ],
    faqs: [
      { question: "Can Irha Apparels develop both traditional and modern Trachten?", answer: "Yes. The styling can be reviewed from a traditional reference, an updated retail concept or the buyer's own brand direction. Feasibility is confirmed style by style." },
      { question: "Can labels and packaging carry our Austrian brand?", answer: "Private-label options can include woven labels, care labels, hangtags and packaging. Final details are reviewed with the product and order requirements." },
      { question: "Is there a standard MOQ for every product?", answer: "No single MOQ is published for all categories. The workable quantity depends on the product, materials, decoration and production setup." },
      { question: "How do we begin a sample?", answer: "Send the product reference, expected quantity, size range, material direction and branding needs. The team will review what is complete and what must be clarified before sampling." },
    ],
  },
  {
    slug: "switzerland",
    country: "Switzerland",
    locale: "en-CH",
    title: "Custom Clothing Manufacturer for Swiss B2B Buyers | Irha Apparels",
    description: "OEM, ODM and private-label apparel programs for Swiss brands, distributors, retailers and specialist B2B buyers.",
    h1: "Custom Clothing Manufacturing for Buyers in Switzerland",
    eyebrow: "Switzerland · Requirement-Led B2B Supply",
    intro: "Swiss buyers can use Irha Apparels for carefully scoped apparel programs where the product, finish, branding and documentation expectations are established before production. We support importers, private labels, retailers and specialist distributors across heritage, leather, performance and leisure categories.",
    summary: "Switzerland-focused page for carefully scoped private-label and custom apparel sourcing.",
    priorityPrograms: [
      { ...commonPrograms.leather, note: "Premium leather concepts reviewed for material, construction, hardware and finishing." },
      { ...commonPrograms.bavarian, note: "Trachten and Alpine-inspired programs for specialist retail and event supply." },
      { ...commonPrograms.street, note: "Heavyweight streetwear, activewear and branded capsule programs." },
    ],
    sections: [
      {
        heading: "A controlled product-development brief",
        body: "The most effective Swiss sourcing inquiry defines the intended use, sales channel and quality level before commercial discussion. We review the complete product rather than offering unsupported assumptions about fabric, leather, trim or compliance.",
        bullets: [
          "Product purpose and target customer segment",
          "Material, construction and finish expectations",
          "Brand identity, decoration and packaging requirements",
          "Required documents and destination details for review",
        ],
      },
      {
        heading: "Product programs that can be scoped",
        body: "A buyer may begin with one style, a coordinated capsule or an ongoing program. Each category follows its own feasibility and sampling review.",
        bullets: [
          "Leather jackets, vests, trousers, belts, gloves and bags",
          "Bavarian and Trachten garments with coordinated accessories",
          "Sportswear and teamwear developed from club or brand artwork",
          "Streetwear, leisurewear and nightwear with private-label finishing",
        ],
      },
      {
        heading: "Transparent buyer verification",
        body: "The website is newly built, but Irha Apparels is not a new manufacturing operation. A live factory video call is available to support verification, introduce the responsible team and discuss how the buyer's approvals will be managed.",
        bullets: [
          "Live factory and team introduction",
          "Sample and bulk approval stages discussed in advance",
          "No fixed claims before product review",
          "Clear inquiry record for references and specifications",
        ],
      },
    ],
    faqs: [
      { question: "Can you support a small Swiss brand developing its first collection?", answer: "The team can review an early-stage collection, but feasibility and quantities depend on the actual products, materials and decoration. A focused first brief is usually the best starting point." },
      { question: "Do you guarantee delivery dates before reviewing the product?", answer: "No. Production and shipping timing are confirmed only after the product, sample route, materials, quantity and destination requirements are understood." },
      { question: "Can we request product documentation?", answer: "Buyers should state the documents they require. Availability and applicability are then reviewed for the specific order before commitment." },
      { question: "Can we see the factory remotely from Switzerland?", answer: "Yes. A live video call can be arranged for factory viewing and an initial program discussion." },
    ],
  },
  {
    slug: "netherlands",
    country: "Netherlands",
    locale: "en-NL",
    title: "Private-Label Clothing Manufacturer for the Netherlands | Irha Apparels",
    description: "Custom streetwear, sportswear, leather and leisure apparel for Dutch brands, importers, wholesalers and online retailers.",
    h1: "Private-Label Clothing Programs for Buyers in the Netherlands",
    eyebrow: "Netherlands · Brand & Import Programs",
    intro: "Irha Apparels supports Dutch private-label brands, importers, wholesalers and retail businesses that need custom product development rather than generic stock garments. The process can begin from a tech pack, sketch, reference sample or structured visual brief.",
    summary: "Netherlands-focused sourcing page for streetwear, sportswear, leather and private-label apparel.",
    priorityPrograms: [
      { ...commonPrograms.street, note: "Custom hoodies, sweatshirts, tees, bottoms and activewear capsules." },
      { ...commonPrograms.sports, note: "Teamwear, training apparel and performance products with custom graphics." },
      { ...commonPrograms.leisure, note: "Leisure and nightwear programs prepared for private-label presentation." },
    ],
    sections: [
      {
        heading: "Built around a brand brief",
        body: "Dutch brand and e-commerce inquiries often need coordinated styling, decoration and packaging across multiple garments. We review the collection structure first so the sampling route reflects the actual launch plan instead of treating each item as an unrelated product.",
        bullets: [
          "Streetwear capsules with coordinated fabric and colour direction",
          "Embroidery, printing, patches and heat-transfer requirements reviewed per style",
          "Neck labels, care labels, hangtags and packaging scoped together",
          "Product images or visual references accepted when a full tech pack is not ready",
        ],
      },
      {
        heading: "Sportswear and team programs",
        body: "For sports clubs, distributors and teamwear brands, the artwork, size range, fabric performance expectations and decoration method are reviewed before pricing. Sublimation, cut-and-sew and other routes are selected according to the actual design.",
        bullets: [
          "Football, basketball, rugby, cricket and training concepts",
          "Tracksuits, training tops, shorts and related team apparel",
          "Club, sponsor and player artwork placement review",
          "Packing and size breakdown prepared against the buyer order",
        ],
      },
      {
        heading: "Direct access to the manufacturing team",
        body: "Irha Apparels is an experienced manufacturer with a newly built website. Buyers in the Netherlands can request a live factory video call, share references through the inquiry form and keep the commercial discussion tied to the approved product specification.",
        bullets: [
          "Live factory verification available",
          "Sample route discussed before bulk",
          "No public fixed pricing or unsupported delivery promises",
          "Shipping and documentation requirements reviewed per destination",
        ],
      },
    ],
    faqs: [
      { question: "Can you manufacture a complete streetwear capsule for a Dutch brand?", answer: "Yes, the team can review a coordinated capsule including tops, bottoms, labels, decoration and packaging. Feasibility and quantities are confirmed after the full brief is reviewed." },
      { question: "Can we send Adobe artwork and garment references?", answer: "Artwork, mockups, tech packs, sketches and reference images can be shared. The team will identify any missing production information before quotation." },
      { question: "Do you offer private-label packaging?", answer: "Packaging and presentation options can be reviewed together with the product program. Final specifications and cost depend on the order requirements." },
      { question: "Can we arrange an online factory meeting?", answer: "Yes. A live factory video call can be booked for verification and product discussion." },
    ],
  },
  {
    slug: "united-states",
    country: "United States",
    locale: "en-US",
    title: "Custom Apparel Manufacturer for US Brands | Irha Apparels",
    description: "OEM, ODM and private-label apparel manufacturing for US brands, importers, wholesalers, teams and promotional programs.",
    h1: "Custom Apparel Manufacturing for Buyers in the United States",
    eyebrow: "United States · OEM, ODM & Private Label",
    intro: "US brands, importers, wholesalers, sports organizations and promotional buyers can use Irha Apparels for product development across apparel categories. Every program is quoted after the product, quantity, customization, packaging and destination requirements are reviewed.",
    summary: "United States-focused page for private-label, sportswear, streetwear and leather apparel programs.",
    priorityPrograms: [
      { ...commonPrograms.sports, note: "Custom teamwear, uniforms, training apparel and performance programs." },
      { ...commonPrograms.street, note: "Private-label streetwear, activewear and branded merchandise capsules." },
      { ...commonPrograms.leather, note: "Leather jackets, vests and accessories developed to the buyer specification." },
    ],
    sections: [
      {
        heading: "From concept to a production-ready brief",
        body: "US inquiries range from established tech-pack programs to early concepts. We can review the available material and identify the decisions needed for a useful sample and quotation.",
        bullets: [
          "Tech packs, graded measurements, artwork or reference samples",
          "Fabric or leather direction and target product use",
          "Print, embroidery, patch and label placement",
          "Quantity breakdown, packaging and destination information",
        ],
      },
      {
        heading: "Programs for brands, teams and distributors",
        body: "The production route is selected by product rather than by a generic price list. This allows a US buyer to combine different categories while keeping each style's materials, decoration and approvals clear.",
        bullets: [
          "Sports uniforms and training apparel for team or resale programs",
          "Streetwear and activewear for private-label brands",
          "Leather apparel for retail, motorcycle or lifestyle collections",
          "Leisurewear and nightwear with custom brand presentation",
        ],
      },
      {
        heading: "Commercial terms confirmed after review",
        body: "Irha Apparels does not publish a universal MOQ, fixed price or guaranteed lead time. Those points are confirmed after the product and order are understood. The company is an experienced manufacturer; the public website itself is newly built.",
        bullets: [
          "Requirement-led quotation",
          "Sampling and approval route before bulk commitment",
          "Live factory video call for remote verification",
          "Shipping method and order documentation reviewed per destination",
        ],
      },
    ],
    faqs: [
      { question: "Can you manufacture private-label apparel for a US startup?", answer: "A startup program can be reviewed if the product direction, expected quantities and branding needs are clear. Feasibility and commercial terms depend on the actual styles." },
      { question: "Can you make team uniforms with custom player and sponsor graphics?", answer: "Yes. Artwork placement, numbering, sizing, fabric and decoration method are reviewed before quotation and sampling." },
      { question: "Do you quote landed or delivered prices to the United States?", answer: "Available shipping terms are reviewed for the specific order and destination. No universal delivered-price promise is published." },
      { question: "How can a US buyer verify Irha Apparels?", answer: "The buyer can arrange a live factory video call, review the website's buyer-trust information and discuss the program directly with the manufacturing team." },
    ],
  },
  {
    slug: "united-kingdom",
    country: "United Kingdom",
    locale: "en-GB",
    title: "Private-Label Clothing Manufacturer for UK Buyers | Irha Apparels",
    description: "Custom apparel manufacturing for UK brands, wholesalers, importers, sports clubs and specialist retailers.",
    h1: "Private-Label Clothing Manufacturing for Buyers in the UK",
    eyebrow: "United Kingdom · Custom B2B Apparel",
    intro: "Irha Apparels works with UK private-label brands, wholesalers, importers, sports clubs and specialist retailers that need custom garments produced to an agreed brief. The team reviews the specification and buyer requirements before confirming price, quantity, production timing or shipping.",
    summary: "United Kingdom-focused sourcing page for private-label, teamwear, leather and heritage apparel.",
    priorityPrograms: [
      { ...commonPrograms.street, note: "Streetwear and activewear programs for brands and merchandise buyers." },
      { ...commonPrograms.sports, note: "Custom club kits, training apparel and coordinated teamwear." },
      { ...commonPrograms.leather, note: "Leather apparel and accessories developed from references or technical packs." },
    ],
    sections: [
      {
        heading: "Private-label development for UK brands",
        body: "A UK brand can begin with one hero product or a broader range. We review the intended fit, fabric, decoration and presentation so the sample represents the commercial product rather than an unapproved assumption.",
        bullets: [
          "Heavyweight tees, hoodies, sweatshirts and coordinated bottoms",
          "Activewear and leisure products with custom labels",
          "Embroidery, DTF, patches and other decoration reviewed per artwork",
          "Care labels, woven labels, hangtags and packaging options",
        ],
      },
      {
        heading: "Club and teamwear programs",
        body: "Sportswear inquiries should include the sport, team structure, artwork and size breakdown. The team then reviews the appropriate fabric and construction path before sampling.",
        bullets: [
          "Football, rugby, cricket, basketball and training concepts",
          "Tracksuits, warm-up garments and training layers",
          "Player, sponsor and club identity placement",
          "Repeat-order references retained through the buyer workflow",
        ],
      },
      {
        heading: "Buyer confidence before the first order",
        body: "The current website is newly built, while Irha Apparels has manufacturing experience in Sialkot. UK buyers may request a live factory video call and use the buyer-trust pages to understand the communication and approval process.",
        bullets: [
          "Factory view available by live video",
          "Product and sample approvals recorded before bulk",
          "Commercial claims avoided until requirements are verified",
          "Destination and documentation needs reviewed with the inquiry",
        ],
      },
    ],
    faqs: [
      { question: "Can you manufacture for UK streetwear and activewear brands?", answer: "Yes. The team can review private-label streetwear, activewear and leisure programs based on a tech pack, artwork, sketch or clear reference brief." },
      { question: "Can you produce custom kits for UK sports clubs?", answer: "Yes. The sport, fabric, artwork, size breakdown, decoration and quantity are reviewed before a sample and quotation are confirmed." },
      { question: "Are UK import duties included automatically?", answer: "No automatic duty or delivered-price claim is made. Shipping terms and destination responsibilities are reviewed for the specific order." },
      { question: "Can we speak to the factory team before sampling?", answer: "Yes. A live factory video call can be scheduled before the buyer commits to development." },
    ],
  },
  {
    slug: "canada",
    country: "Canada",
    locale: "en-CA",
    title: "Custom Clothing Manufacturer for Canadian Brands | Irha Apparels",
    description: "Private-label sportswear, streetwear, leather and leisure apparel manufacturing for Canadian B2B buyers.",
    h1: "Custom Clothing Manufacturing for Buyers in Canada",
    eyebrow: "Canada · Private Label & Teamwear",
    intro: "Canadian brands, distributors, importers, clubs and retailers can work with Irha Apparels on custom apparel programs that are developed around a defined product brief. Materials, sizing, decoration, packaging and shipping requirements are reviewed before commitments are made.",
    summary: "Canada-focused page for custom sportswear, streetwear, leather and leisure apparel sourcing.",
    priorityPrograms: [
      { ...commonPrograms.sports, note: "Team uniforms, training apparel, tracksuits and performance products." },
      { ...commonPrograms.street, note: "Private-label streetwear and activewear with coordinated brand presentation." },
      { ...commonPrograms.leisure, note: "Leisurewear and nightwear programs with custom labels and packaging." },
    ],
    sections: [
      {
        heading: "Preparing a Canadian buyer inquiry",
        body: "The inquiry should separate product requirements from commercial preferences. This makes it possible to review feasibility first and then build a quotation around the correct construction and order structure.",
        bullets: [
          "Reference product, tech pack or clear visual direction",
          "Size range and intended fit",
          "Fabric, trim, print and embroidery expectations",
          "Quantity range, packaging and Canadian destination details",
        ],
      },
      {
        heading: "Multi-category private-label programs",
        body: "A Canadian buyer can source one category or coordinate several product families. Each style is still reviewed independently so that materials and approvals do not become ambiguous.",
        bullets: [
          "Sports and teamwear for clubs, distributors and events",
          "Streetwear and activewear for brand collections",
          "Leather jackets, vests and accessories",
          "Leisure and nightwear for private-label retail programs",
        ],
      },
      {
        heading: "Remote factory verification",
        body: "Distance does not need to prevent initial due diligence. Irha Apparels can arrange a live factory video call and explain the sample, approval and production-review process. The company is experienced; the public website is newly built.",
        bullets: [
          "Live video factory view",
          "Direct discussion with the responsible team",
          "Requirement-led commercial confirmation",
          "Shipping and documentation reviewed for the actual order",
        ],
      },
    ],
    faqs: [
      { question: "Can you make custom sports uniforms for Canadian teams?", answer: "Yes. Send the sport, artwork, garment list, size breakdown and expected quantity so the appropriate construction and decoration route can be reviewed." },
      { question: "Can Canadian brands order custom labels and hangtags?", answer: "Private-label components can be reviewed as part of the product program. Specifications and cost are confirmed with the order." },
      { question: "Is shipping to every Canadian address quoted the same way?", answer: "No. Shipping depends on the order, service, weight, destination and agreed trade terms, so it is reviewed case by case." },
      { question: "Do you have a live factory verification option?", answer: "Yes. Buyers can request a scheduled live factory video call before progressing." },
    ],
  },
  {
    slug: "australia",
    country: "Australia",
    locale: "en-AU",
    title: "Custom Apparel Manufacturer for Australian Buyers | Irha Apparels",
    description: "Private-label sportswear, activewear, streetwear, leather and leisure apparel for Australian B2B buyers.",
    h1: "Custom Apparel Manufacturing for Buyers in Australia",
    eyebrow: "Australia · Brand, Club & Distributor Programs",
    intro: "Australian brands, sports clubs, distributors and retailers can use Irha Apparels for custom apparel development from Sialkot. The product and destination brief is reviewed before the team confirms sampling, quantity, pricing, production timing or shipping options.",
    summary: "Australia-focused sourcing page for sportswear, activewear, streetwear and custom apparel programs.",
    priorityPrograms: [
      { ...commonPrograms.sports, note: "Club kits, training apparel, tracksuits and performance uniforms." },
      { ...commonPrograms.street, note: "Custom activewear, streetwear and branded merchandise ranges." },
      { ...commonPrograms.leather, note: "Leather jackets, vests and accessories for private-label programs." },
    ],
    sections: [
      {
        heading: "Sports and activewear development",
        body: "Australian team and brand inquiries should define the sport or use case, artwork, size range and expected order structure. That information determines whether the program is best handled through sublimation, cut-and-sew, print, embroidery or another reviewed method.",
        bullets: [
          "Football, rugby, cricket, basketball and training garments",
          "Tracksuits, warm-up layers, shorts and training tops",
          "Activewear and gym apparel developed to the brand brief",
          "Team, sponsor and player graphics reviewed before sampling",
        ],
      },
      {
        heading: "Private-label collection support",
        body: "For fashion and lifestyle brands, product development can include fabric direction, garment measurements, decoration, labels and packaging. A clear approval path helps manage the longer-distance sourcing relationship.",
        bullets: [
          "Tech-pack, sketch or reference-sample review",
          "Brand labels, care information and hangtag requirements",
          "Packing and carton-marking details reviewed with the order",
          "Repeat-order references supported through the inquiry workflow",
        ],
      },
      {
        heading: "Verification and commercial clarity",
        body: "Irha Apparels is an experienced manufacturer and the current website is newly built. Australian buyers can request a live factory video call and receive commercial confirmation only after the full program is understood.",
        bullets: [
          "Live factory view and team discussion",
          "Sample route confirmed before bulk",
          "No universal MOQ, fixed price or guaranteed lead time published",
          "Shipping service and documentation reviewed per order",
        ],
      },
    ],
    faqs: [
      { question: "Can you manufacture rugby or cricket apparel for Australia?", answer: "Yes. Rugby, cricket and other teamwear concepts can be reviewed from artwork, references or tech packs. Fabric, construction, quantity and decoration are confirmed per program." },
      { question: "Can an Australian brand combine sportswear and streetwear in one inquiry?", answer: "Yes. Multiple categories can be discussed together, while each style is assessed separately for feasibility and commercial terms." },
      { question: "Do you guarantee an Australian delivery date before sampling?", answer: "No. Production and shipping timing are confirmed after the sample path, materials, quantity and destination are reviewed." },
      { question: "How do we verify the factory from Australia?", answer: "A scheduled live factory video call is available for remote verification and program discussion." },
    ],
  },
  {
    slug: "new-zealand",
    country: "New Zealand",
    locale: "en-NZ",
    title: "Private-Label Apparel Manufacturer for New Zealand | Irha Apparels",
    description: "Custom sportswear, streetwear, leather and leisure apparel programs for New Zealand brands, clubs and importers.",
    h1: "Private-Label Apparel Programs for Buyers in New Zealand",
    eyebrow: "New Zealand · Custom B2B Manufacturing",
    intro: "Irha Apparels supports New Zealand brands, clubs, importers and specialist retailers with focused custom apparel programs. A detailed brief helps the team review product feasibility, sampling, branding, packing and destination requirements before any commercial promise is made.",
    summary: "New Zealand-focused sourcing page for teamwear, streetwear, leather and private-label apparel.",
    priorityPrograms: [
      { ...commonPrograms.sports, note: "Rugby, football, training and club apparel developed from buyer artwork." },
      { ...commonPrograms.street, note: "Private-label hoodies, tees, activewear and coordinated lifestyle ranges." },
      { ...commonPrograms.leisure, note: "Leisure and nightwear programs with buyer-defined labels and packing." },
    ],
    sections: [
      {
        heading: "Focused programs for clubs and brands",
        body: "A New Zealand buyer may need a compact teamwear range, branded merchandise or a private-label collection. We recommend defining the first program clearly so sampling and approvals remain efficient across distance and time zones.",
        bullets: [
          "Rugby, football and training apparel",
          "Streetwear and branded merchandise capsules",
          "Leather and lifestyle products where construction is fully reviewed",
          "Leisurewear and nightwear with private-label presentation",
        ],
      },
      {
        heading: "Information that reduces sourcing risk",
        body: "Clear product data reduces assumptions and gives both sides a useful record for sampling and production review. Where information is incomplete, the team identifies the missing decisions before proceeding.",
        bullets: [
          "Reference images, tech packs or physical sample details",
          "Size range, fit direction and measurement expectations",
          "Material, decoration, labels and packaging requirements",
          "Quantity breakdown and New Zealand delivery destination",
        ],
      },
      {
        heading: "Direct factory communication",
        body: "The Irha Apparels website is new, while the manufacturing business is experienced. Buyers can request a live factory video call and discuss the people, facility and approval process before moving forward.",
        bullets: [
          "Live factory-view call available",
          "Direct manufacturing-team communication",
          "Terms confirmed after requirement review",
          "Destination shipping and documentation discussed per order",
        ],
      },
    ],
    faqs: [
      { question: "Can you produce custom rugby apparel for New Zealand clubs?", answer: "Yes. The team can review rugby jerseys, shorts, training apparel and related garments using the club's artwork, size breakdown and product requirements." },
      { question: "Can a New Zealand buyer start with one product category?", answer: "Yes. A focused first category can be reviewed before expanding the relationship. Feasibility and quantities still depend on the product." },
      { question: "Are freight and import costs fixed on the website?", answer: "No. Shipping options and responsibilities are reviewed for the actual order, destination and agreed terms." },
      { question: "Can we arrange a video meeting with the factory?", answer: "Yes. A live factory video call can be scheduled for verification and discussion." },
    ],
  },
];

export const MARKET_PAGE_BY_SLUG = Object.fromEntries(
  MARKET_PAGES.map((market) => [market.slug, market]),
) as Record<string, MarketPage>;

export const MARKET_ALTERNATES = MARKET_PAGES.map((market) => ({
  locale: market.locale,
  href: `/markets/${market.slug}`,
}));
