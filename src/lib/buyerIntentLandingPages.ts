export type BuyerIntentSection = {
  heading: string;
  body: string;
  bullets: string[];
};

export type BuyerIntentFaq = {
  question: string;
  answer: string;
};

export type BuyerIntentLandingPage = {
  path: string;
  locale: string;
  direction: "ltr" | "rtl";
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  intro: string;
  market: string;
  productFocus: string;
  categoryPath: string;
  sections: BuyerIntentSection[];
  faqs: BuyerIntentFaq[];
  relatedPaths: string[];
  alternates?: Array<{ locale: string; href: string }>;
  primaryLabel: string;
  secondaryLabel: string;
};

type EnglishConfig = {
  path: string;
  title: string;
  description: string;
  h1: string;
  eyebrow: string;
  market: string;
  productFocus: string;
  intro: string;
  categoryPath: string;
  capabilities: string[];
  marketNote: string;
  marketBullets: string[];
  buyerTypes: string[];
  specificQuestion: string;
  specificAnswer: string;
  relatedPaths: string[];
  alternates?: Array<{ locale: string; href: string }>;
};

const buyerApprovalProcess = [
  "Requirement review covering product, quantity, materials, branding, packaging and target delivery window",
  "Sample or pre-production approval before bulk production is confirmed",
  "Quality checkpoints for measurements, construction, decoration and packing",
  "Export and shipping terms agreed in writing for the buyer's destination",
];

const privateLabelCapabilities = [
  "Custom woven labels, care labels, size labels and hang tags",
  "Embroidery, screen print, DTF and other decoration reviewed by artwork and fabric",
  "Buyer-specific packaging, folding and carton-marking requirements",
  "Factory view available on a live video call for qualified buyers",
];

function makeEnglishPage(config: EnglishConfig): BuyerIntentLandingPage {
  return {
    path: config.path,
    locale: "en-US",
    direction: "ltr",
    title: config.title,
    description: config.description,
    h1: config.h1,
    eyebrow: config.eyebrow,
    intro: config.intro,
    market: config.market,
    productFocus: config.productFocus,
    categoryPath: config.categoryPath,
    alternates: config.alternates,
    primaryLabel: "Request a wholesale quote",
    secondaryLabel: "Book a factory video call",
    sections: [
      {
        heading: `What ${config.market} buyers can source`,
        body: `Irha Apparels manufactures ${config.productFocus} in Sialkot, Pakistan for importers, wholesalers, retailers, teams and private-label brands. Each program is reviewed against the buyer's specification rather than sold as a fixed retail product.`,
        bullets: config.capabilities,
      },
      {
        heading: "A buyer-approved production workflow",
        body: "Bulk production is not treated as an automatic next step. Materials, measurements, decoration, labeling, packaging, quantity and commercial terms are documented and approved before production commitments are made.",
        bullets: buyerApprovalProcess,
      },
      {
        heading: `Supplying ${config.market} from Sialkot`,
        body: config.marketNote,
        bullets: config.marketBullets,
      },
      {
        heading: "Private-label presentation and buyer trust",
        body: `The company is an experienced manufacturer and the website is newly built. Qualified buyers may request a live factory video call and discuss evidence needed for their own sourcing, compliance and approval process. Typical buyer profiles include ${config.buyerTypes.join(", ")}.`,
        bullets: privateLabelCapabilities,
      },
    ],
    faqs: [
      {
        question: "What is the minimum order quantity?",
        answer: "MOQ is confirmed after reviewing the product, fabric, decoration, size ratio and packaging. The inquiry form accepts both trial-order and repeat-order requirements so the factory can quote an achievable quantity instead of publishing a misleading universal MOQ.",
      },
      {
        question: "Can a sample be approved before bulk production?",
        answer: "Yes. Sampling, revisions and pre-production approval can be included in the order plan. Timing and sample charges are confirmed after the technical requirement is reviewed.",
      },
      {
        question: `Do you have an office in ${config.market}?`,
        answer: `Irha Apparels manufactures in Sialkot, Pakistan and does not claim a local factory or office in ${config.market}. Communication, approvals and factory visibility are handled directly with the manufacturing team, including live video calls where useful.`,
      },
      {
        question: config.specificQuestion,
        answer: config.specificAnswer,
      },
    ],
    relatedPaths: config.relatedPaths,
  };
}

const englishPages: BuyerIntentLandingPage[] = [
  makeEnglishPage({
    path: "/germany-apparel-manufacturer",
    title: "Apparel Manufacturer for Germany | OEM & Private Label",
    description: "Sialkot-based OEM and private-label apparel manufacturing for German importers, wholesalers and brands, with sampling, custom labels and export support.",
    h1: "Custom Apparel Manufacturer for German B2B Buyers",
    eyebrow: "Germany sourcing page",
    market: "German",
    productFocus: "Trachten wear, leather apparel, sportswear, streetwear, activewear and leisurewear",
    intro: "Source made-to-order apparel directly from an experienced Sialkot manufacturer. Requirements are reviewed in English or with translated written specifications before sampling, pricing and production are confirmed.",
    categoryPath: "/products",
    capabilities: ["Lederhosen, Dirndl and Trachten programs", "Leather jackets and waistcoats", "Teamwear, tracksuits and training apparel", "Private-label streetwear and heavyweight basics"],
    marketNote: "German buyers commonly require precise specifications, consistent repeatability and clear documentation. Quotes therefore separate product construction, decoration, labels, packaging and shipping assumptions instead of hiding them in a generic price.",
    marketBullets: ["Metric measurement and size-chart review", "Written sample comments and revision tracking", "Country-of-origin and packing details confirmed before shipment", "Incoterms and delivery responsibility agreed before order confirmation"],
    buyerTypes: ["Trachten wholesalers", "fashion importers", "private-label brands", "sports clubs and distributors"],
    specificQuestion: "Can you manufacture German-market Trachten products?",
    specificAnswer: "Yes. Lederhosen, Dirndl, shirts, vests, jackets and accessories can be reviewed as custom B2B programs. Leather, fabric, embroidery, trims and sizing must be approved against the buyer's target quality level.",
    relatedPaths: ["/lederhosen-manufacturer-germany", "/products/bavarian-trachten-wear", "/buyer-trust", "/de/lederhosen-hersteller"],
  }),
  makeEnglishPage({
    path: "/austria-apparel-manufacturer",
    title: "Apparel Manufacturer for Austria | Trachten & Private Label",
    description: "Custom apparel manufacturing for Austrian wholesalers and brands, including Trachten, leatherwear, sportswear, private labels and buyer-approved sampling.",
    h1: "Private-Label Apparel Manufacturing for Austrian Buyers",
    eyebrow: "Austria sourcing page",
    market: "Austrian",
    productFocus: "Trachten garments, leather apparel, sportswear and private-label clothing",
    intro: "Irha Apparels supports Austrian importers and specialist retailers with made-to-order programs built around buyer specifications, sampling and written approval.",
    categoryPath: "/products",
    capabilities: ["Dirndl dresses, blouses and aprons", "Lederhosen, Trachten shirts and vests", "Leather jackets and traditional waistcoats", "Custom teamwear and branded casualwear"],
    marketNote: "For Austrian Trachten and specialist retail programs, fabric hand-feel, embroidery density, trim selection and sizing are often decisive. These points are confirmed through references, samples and documented comments before bulk production.",
    marketBullets: ["Product-by-product material confirmation", "Embroidery and trim placement approval", "Private-label packaging for wholesale delivery", "Repeat-order references retained where agreed"],
    buyerTypes: ["Trachten retailers", "regional wholesalers", "event suppliers", "private-label brands"],
    specificQuestion: "Can you develop a custom Dirndl collection?",
    specificAnswer: "Yes. The buyer may specify silhouette, length, fabric, blouse style, apron, trims, embroidery, size range and labeling. A sample plan is agreed before any bulk commitment.",
    relatedPaths: ["/dirndl-manufacturer-austria", "/products/bavarian-trachten-wear", "/catalogue/dirndl-dresses", "/de/dirndl-grosshandel"],
  }),
  makeEnglishPage({
    path: "/switzerland-apparel-manufacturer",
    title: "Apparel Manufacturer for Switzerland | B2B Custom Production",
    description: "Custom apparel manufacturing for Swiss importers and brands with sampling, premium materials, private labels, packaging and transparent export terms.",
    h1: "Custom Apparel Manufacturing for Swiss B2B Buyers",
    eyebrow: "Switzerland sourcing page",
    market: "Swiss",
    productFocus: "premium leather apparel, Trachten products, sportswear and private-label collections",
    intro: "Manufacturing programs for Switzerland are quoted against defined materials, workmanship, branding, packaging and delivery requirements rather than a one-price-fits-all catalogue.",
    categoryPath: "/products",
    capabilities: ["Premium leather jackets and waistcoats", "Trachten and Alpine-inspired garments", "Technical sportswear and team uniforms", "Small-batch private-label development subject to review"],
    marketNote: "Swiss buyers often prioritize finish consistency, accurate communication and controlled order documentation. The factory confirms what is included, what requires buyer approval and which claims need third-party evidence before they are used commercially.",
    marketBullets: ["Material and color references recorded", "Measurement tolerance discussed before production", "Packaging and carton labels reviewed", "No unsupported certification claims"],
    buyerTypes: ["premium retailers", "specialist importers", "private-label brands", "clubs and hospitality buyers"],
    specificQuestion: "Can you supply premium-quality low-volume programs?",
    specificAnswer: "Potentially. Quantity depends on the product, material availability, decoration and packaging. Send the target specification and expected annual demand so an achievable trial quantity can be reviewed.",
    relatedPaths: ["/products/premium-leather-apparel", "/products/bavarian-trachten-wear", "/compliance", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/netherlands-apparel-manufacturer",
    title: "Apparel Manufacturer for the Netherlands | Private Label B2B",
    description: "OEM and private-label apparel manufacturing for Dutch brands, importers and wholesalers across streetwear, sportswear, leatherwear and custom clothing.",
    h1: "Private-Label Apparel Manufacturer for Dutch Buyers",
    eyebrow: "Netherlands sourcing page",
    market: "Dutch",
    productFocus: "streetwear, activewear, sportswear, leather apparel and custom cut-and-sew products",
    intro: "Dutch brands and importers can submit tech packs, references or product briefs for direct factory review, sample planning and a transparent manufacturing quotation.",
    categoryPath: "/products",
    capabilities: ["Heavyweight T-shirts, hoodies and sweatshirts", "Tracksuits, training tops and activewear", "Leather jackets and branded outerwear", "Labels, hang tags and custom packing"],
    marketNote: "The Netherlands is a distribution hub for wider European programs, so repeatability, carton identification and multi-market packaging can matter as much as the garment itself. These requirements are captured before pricing is finalized.",
    marketBullets: ["EU-oriented size and label review", "Multi-color and size-ratio planning", "Carton marks for warehouse receiving", "Shipping scope separated from manufacturing scope"],
    buyerTypes: ["streetwear labels", "sportswear distributors", "online brands", "European wholesalers"],
    specificQuestion: "Can you work from a tech pack or reference sample?",
    specificAnswer: "Yes. A tech pack, measurement chart, artwork file or physical reference can be used for review. Any assumptions or differences are documented before sampling.",
    relatedPaths: ["/products/streetwear-activewear", "/products/sportswear", "/studio", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/uk-custom-apparel-manufacturer",
    title: "Custom Apparel Manufacturer for the UK | OEM & Wholesale",
    description: "Custom clothing manufacturing for UK brands, wholesalers, clubs and importers with sampling, private labels, custom packaging and export support.",
    h1: "Custom Apparel Manufacturer for UK Brands and Wholesalers",
    eyebrow: "United Kingdom sourcing page",
    market: "UK",
    productFocus: "sportswear, streetwear, leather apparel, uniforms and private-label clothing",
    intro: "Send a product brief, quantity and delivery requirement for a direct manufacturing review from Sialkot. Quotes are built around the agreed specification and buyer approval process.",
    categoryPath: "/products",
    capabilities: ["Football, rugby and club teamwear", "Streetwear and branded basics", "Leather jackets and waistcoats", "Uniform and hospitality apparel programs"],
    marketNote: "UK buyers may sell online, through clubs or into wholesale accounts. Size ratios, decoration durability, labeling, packaging and delivery responsibility are therefore confirmed for the intended sales channel.",
    marketBullets: ["UK size-chart conversion reviewed", "Club crest and sponsor artwork approval", "Retail-ready or bulk packaging options", "Commercial invoice and shipping scope confirmed"],
    buyerTypes: ["sports clubs", "private-label brands", "workwear buyers", "wholesale distributors"],
    specificQuestion: "Can you manufacture custom sports kits for UK clubs?",
    specificAnswer: "Yes. Shirt, short, tracksuit and training-wear programs can be reviewed with club colors, crests, sponsor artwork, size ratios and repeat-order needs.",
    relatedPaths: ["/custom-sportswear-manufacturer-uk", "/products/sportswear", "/catalogue/sportswear", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/usa-private-label-clothing-manufacturer",
    title: "Private Label Clothing Manufacturer for USA Brands",
    description: "Private-label apparel manufacturing for US brands and wholesalers with custom cut and sew, labels, decoration, packaging, samples and export support.",
    h1: "Private-Label Clothing Manufacturer for US Brands",
    eyebrow: "United States sourcing page",
    market: "US",
    productFocus: "streetwear, sportswear, leather apparel and custom branded clothing",
    intro: "Develop custom apparel with direct factory review of fabric, construction, branding, packaging, quantity and target delivery. No retail pricing is published because each B2B program is specification-led.",
    categoryPath: "/products",
    capabilities: ["Heavyweight tees, hoodies and fleece programs", "Performance shirts, shorts and tracksuits", "Leather jackets, bombers and vests", "Woven labels, care labels, hang tags and custom mailer or carton packing"],
    marketNote: "US private-label programs often require clear ownership of artwork, approved color references, consistent size grading and retail presentation. Buyer responsibilities and factory deliverables are documented before production.",
    marketBullets: ["Imperial or metric tech-pack review", "Pantone or approved color-reference workflow", "Branding and packaging bill of materials", "Sample, production and shipping milestones"],
    buyerTypes: ["DTC brands", "wholesalers", "teamwear companies", "promotional and specialty retailers"],
    specificQuestion: "Can you support a new US clothing brand?",
    specificAnswer: "Yes, when the product direction and budget are realistic. Share the product type, target quality, quantity, artwork, packaging and launch date so development and MOQ can be assessed honestly.",
    relatedPaths: ["/private-label-streetwear-manufacturer-usa", "/products/streetwear-activewear", "/buyer-trust", "/studio"],
  }),
  makeEnglishPage({
    path: "/canada-apparel-manufacturer",
    title: "Apparel Manufacturer for Canada | Custom B2B Production",
    description: "Custom apparel manufacturing for Canadian brands, wholesalers and importers, including leatherwear, streetwear, sportswear and private-label programs.",
    h1: "Custom Apparel Manufacturing for Canadian Buyers",
    eyebrow: "Canada sourcing page",
    market: "Canadian",
    productFocus: "leather outerwear, sportswear, streetwear and private-label apparel",
    intro: "Canadian buyers can source made-to-order apparel through a documented process covering materials, samples, labels, packaging, production and shipping responsibility.",
    categoryPath: "/products",
    capabilities: ["Leather jackets, bombers and vests", "Hoodies, fleece and cold-weather layering pieces", "Team uniforms and training wear", "Custom labels and bilingual-ready packaging supplied to buyer artwork"],
    marketNote: "For Canadian programs, climate use, layering, size grading and long-distance logistics can influence the specification. These factors are reviewed before fabric weight, construction and delivery terms are finalized.",
    marketBullets: ["Layering and fit intent recorded", "Fabric weight and lining options reviewed", "English/French label artwork accepted from buyer", "Shipping method and responsibility confirmed"],
    buyerTypes: ["outerwear brands", "sports distributors", "retail wholesalers", "private-label startups"],
    specificQuestion: "Can you make custom leather jackets for Canada?",
    specificAnswer: "Yes. Leather type, thickness, lining, hardware, fit, branding and packaging are reviewed before sampling. No leather-quality claim is made without matching the approved material specification.",
    relatedPaths: ["/custom-leather-jacket-manufacturer-canada", "/products/premium-leather-apparel", "/catalogue/leather-garments", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/australia-apparel-manufacturer",
    title: "Apparel Manufacturer for Australia | Custom & Private Label",
    description: "Custom apparel manufacturing for Australian brands, teams, wholesalers and importers with samples, private labels, packaging and export planning.",
    h1: "Custom Apparel Manufacturer for Australian B2B Buyers",
    eyebrow: "Australia sourcing page",
    market: "Australian",
    productFocus: "sportswear, activewear, streetwear, leather apparel and private-label clothing",
    intro: "Source specification-led apparel from Sialkot with direct communication on samples, production checkpoints, packing and long-distance shipping requirements.",
    categoryPath: "/products",
    capabilities: ["Club and school sports uniforms", "Lightweight training and activewear", "Streetwear, hoodies and branded basics", "Leather jackets and custom outerwear"],
    marketNote: "Australia-bound orders require realistic production and freight planning. Target dates are reviewed backwards from sampling, approvals, production, packing and the selected shipping method.",
    marketBullets: ["Season and launch-date planning", "Breathable or heavyweight fabric options by product", "Club and team reorder references", "Air and sea freight scope discussed separately"],
    buyerTypes: ["sports clubs", "school suppliers", "fashion brands", "wholesale importers"],
    specificQuestion: "Can you handle repeat teamwear orders?",
    specificAnswer: "Yes, when colors, artwork, patterns and approved references are retained. Repeat availability still depends on material and trim continuity, which is checked before each order.",
    relatedPaths: ["/products/sportswear", "/products/streetwear-activewear", "/repeat-order", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/new-zealand-apparel-manufacturer",
    title: "Apparel Manufacturer for New Zealand | B2B Custom Clothing",
    description: "Custom clothing manufacturing for New Zealand brands, clubs and wholesalers across sportswear, streetwear, leatherwear and private-label programs.",
    h1: "Custom Clothing Manufacturer for New Zealand Buyers",
    eyebrow: "New Zealand sourcing page",
    market: "New Zealand",
    productFocus: "teamwear, activewear, streetwear, leather apparel and custom private-label products",
    intro: "Irha Apparels supports New Zealand buyers with direct factory review, sampling and order planning designed for clear approvals and long-distance delivery.",
    categoryPath: "/products",
    capabilities: ["Rugby, football and training apparel", "Tracksuits and performance layers", "Private-label hoodies and T-shirts", "Leather jackets and branded outerwear"],
    marketNote: "New Zealand programs benefit from early size-ratio, season and freight planning. The factory records the buyer's target date and confirms what can be achieved after sample and material review.",
    marketBullets: ["Team size-ratio planning", "Reorder-friendly artwork records", "Seasonal fabric selection", "Shipping timeline confirmed before deposit"],
    buyerTypes: ["rugby and sports clubs", "school suppliers", "private-label brands", "specialist importers"],
    specificQuestion: "Can you manufacture rugby and training kits?",
    specificAnswer: "Yes. Fabric, panel construction, sublimation or other decoration, crests, sponsor marks, shorts, socks and training items can be reviewed as one coordinated program.",
    relatedPaths: ["/products/sportswear", "/catalogue/sportswear", "/factory-video-call", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/lederhosen-manufacturer-germany",
    title: "Lederhosen Manufacturer for Germany | Wholesale & Private Label",
    description: "Custom Lederhosen manufacturing for German wholesalers and Trachten brands with leather, embroidery, suspenders, labels, sizing and sample approval.",
    h1: "Wholesale Lederhosen Manufacturer for Germany",
    eyebrow: "High-intent Lederhosen sourcing",
    market: "German",
    productFocus: "custom Lederhosen and coordinated Trachten components",
    intro: "Develop wholesale or private-label Lederhosen with buyer-approved leather, construction, embroidery, hardware, suspenders, sizing and packaging.",
    categoryPath: "/products/bavarian-trachten-wear",
    capabilities: ["Knee-length, short and long Lederhosen", "Custom embroidery and contrast stitching", "Matching or detachable suspenders", "Private labels, size labels, care labels and packaging"],
    marketNote: "A Lederhosen quotation is only meaningful when leather type, thickness, hand-feel, embroidery coverage, lining, hardware and size grading are clear. These variables are reviewed before sample and bulk pricing.",
    marketBullets: ["Leather and color reference approval", "Embroidery artwork and placement confirmation", "Button, buckle and hardware review", "Measurement chart and grading review"],
    buyerTypes: ["Trachten wholesalers", "Oktoberfest suppliers", "specialist retailers", "private-label brands"],
    specificQuestion: "Can you copy an existing Lederhosen style?",
    specificAnswer: "A buyer-owned reference may be used to develop a new specification, but trademarks, protected artwork and third-party designs must not be copied without authorization. Construction differences are documented during sampling.",
    relatedPaths: ["/products/bavarian-trachten-wear", "/catalogue/lederhosen", "/germany-apparel-manufacturer", "/de/lederhosen-hersteller"],
    alternates: [{ locale: "en", href: "/lederhosen-manufacturer-germany" }, { locale: "de", href: "/de/lederhosen-hersteller" }],
  }),
  makeEnglishPage({
    path: "/dirndl-manufacturer-austria",
    title: "Dirndl Manufacturer for Austria | Wholesale & Private Label",
    description: "Custom Dirndl manufacturing for Austrian wholesalers and brands with dress, blouse, apron, embroidery, labels, sizing and sample approval.",
    h1: "Wholesale Dirndl Manufacturer for Austrian Buyers",
    eyebrow: "High-intent Dirndl sourcing",
    market: "Austrian",
    productFocus: "custom Dirndl dresses, blouses and aprons",
    intro: "Create coordinated Dirndl programs with defined silhouette, fabric, blouse, apron, trims, embroidery, size range, branding and packaging.",
    categoryPath: "/products/bavarian-trachten-wear",
    capabilities: ["Mini, midi and long Dirndl silhouettes", "Cotton, linen-look, velvet and other approved fabrics", "Lace, puff-sleeve and custom blouse options", "Satin, cotton, lace or embroidered aprons"],
    marketNote: "Dirndl quality depends on the coordination of multiple components. Dress, bodice, blouse, apron, trims and sizing are reviewed as one approved set so bulk production follows the same reference.",
    marketBullets: ["Fabric and trim board approval", "Bodice and skirt measurement review", "Blouse and apron coordination", "Retail-set packing requirements"],
    buyerTypes: ["Trachten boutiques", "wholesalers", "event suppliers", "private-label fashion brands"],
    specificQuestion: "Can you supply complete Dirndl sets?",
    specificAnswer: "Yes. Dress, blouse and apron may be developed and packed as a coordinated set, subject to approved materials, size ratios, labeling and packaging instructions.",
    relatedPaths: ["/products/bavarian-trachten-wear", "/catalogue/dirndl-dresses", "/austria-apparel-manufacturer", "/de/dirndl-grosshandel"],
    alternates: [{ locale: "en", href: "/dirndl-manufacturer-austria" }, { locale: "de", href: "/de/dirndl-grosshandel" }],
  }),
  makeEnglishPage({
    path: "/custom-sportswear-manufacturer-uk",
    title: "Custom Sportswear Manufacturer for UK Clubs & Brands",
    description: "Custom sportswear manufacturing for UK clubs, schools, brands and distributors, including kits, tracksuits, training wear, labels and repeat orders.",
    h1: "Custom Sportswear Manufacturer for UK Buyers",
    eyebrow: "High-intent sportswear sourcing",
    market: "UK",
    productFocus: "custom team kits, tracksuits, training wear and branded sports apparel",
    intro: "Build coordinated sportswear programs around club colors, artwork, performance requirements, size ratios, repeat-order needs and target delivery dates.",
    categoryPath: "/products/sportswear",
    capabilities: ["Football, rugby, basketball, cricket and hockey kits", "Tracksuits, warm-up tops and training pants", "Training shirts, bibs and staff apparel", "Sublimation, embroidery, DTF and label options by product"],
    marketNote: "Club and school buyers often need top-up orders after the first delivery. Artwork, colors, size charts and approved references can be retained, while material continuity is checked before each repeat order.",
    marketBullets: ["Crest and sponsor placement approval", "Team size-ratio and player-name options", "Match kit and training range coordination", "Repeat-order reference process"],
    buyerTypes: ["sports clubs", "schools", "teamwear brands", "sports distributors"],
    specificQuestion: "Can you add individual player names and numbers?",
    specificAnswer: "Yes, when a final roster is supplied in the agreed format before production. Decoration method, placement and replacement policy are confirmed with the order.",
    relatedPaths: ["/products/sportswear", "/catalogue/sportswear", "/uk-custom-apparel-manufacturer", "/repeat-order"],
  }),
  makeEnglishPage({
    path: "/private-label-streetwear-manufacturer-usa",
    title: "Private Label Streetwear Manufacturer for USA Brands",
    description: "Private-label streetwear manufacturing for US brands with heavyweight tees, hoodies, fleece, custom labels, print, embroidery, packaging and samples.",
    h1: "Private-Label Streetwear Manufacturer for US Brands",
    eyebrow: "High-intent streetwear sourcing",
    market: "US",
    productFocus: "heavyweight T-shirts, hoodies, sweatshirts, fleece and custom cut-and-sew streetwear",
    intro: "Translate a streetwear concept into an approved production specification covering fabric weight, fit, construction, washes, decoration, labels and packaging.",
    categoryPath: "/products/streetwear-activewear",
    capabilities: ["Heavyweight and oversized T-shirt programs", "Pullover and zip hoodies", "Crewneck sweatshirts and fleece sets", "Embroidery, DTF, screen print and private labels"],
    marketNote: "Streetwear quality is defined by more than GSM. Yarn, knit, shrinkage, fit block, rib, stitching, wash treatment, decoration and packaging all affect the final product and are reviewed during development.",
    marketBullets: ["Target fit and measurement chart", "Fabric GSM and composition confirmation", "Artwork size and placement proof", "Neck label, care label, hang tag and packing review"],
    buyerTypes: ["DTC streetwear brands", "wholesale labels", "creator merchandise companies", "retail startups"],
    specificQuestion: "Can you make 240 GSM cotton T-shirts?",
    specificAnswer: "Yes, subject to fabric and construction approval. GSM alone does not define quality, so composition, knit, finish, shrinkage, measurements and decoration must also be confirmed.",
    relatedPaths: ["/products/streetwear-activewear", "/usa-private-label-clothing-manufacturer", "/studio", "/inquiry"],
  }),
  makeEnglishPage({
    path: "/custom-leather-jacket-manufacturer-canada",
    title: "Custom Leather Jacket Manufacturer for Canada",
    description: "Custom leather jacket manufacturing for Canadian brands and wholesalers with approved leather, lining, hardware, labels, packaging and samples.",
    h1: "Custom Leather Jacket Manufacturer for Canadian Buyers",
    eyebrow: "High-intent leather sourcing",
    market: "Canadian",
    productFocus: "biker jackets, bombers, fashion jackets, vests and custom leather outerwear",
    intro: "Develop leather outerwear against a clear specification for leather type, thickness, finish, lining, hardware, fit, branding and packaging.",
    categoryPath: "/products/premium-leather-apparel",
    capabilities: ["Biker and motorcycle-inspired jackets", "Bomber and varsity-style leather jackets", "Leather vests and waistcoats", "Custom lining, hardware, embroidery, patches and labels"],
    marketNote: "Leather varies naturally and by tanning and finishing method. The approved reference must define acceptable hand-feel, shade, grain, thickness and construction so production quality is judged against the same standard.",
    marketBullets: ["Leather swatch or sample approval", "Hardware and zipper specification", "Lining and insulation options", "Fit, grading and measurement tolerances"],
    buyerTypes: ["outerwear brands", "motorcycle apparel buyers", "wholesalers", "specialist retailers"],
    specificQuestion: "Which leather types can you use?",
    specificAnswer: "Available options depend on the style, target price and required finish. The quotation identifies the proposed leather specification and any approved substitute rules before production.",
    relatedPaths: ["/products/premium-leather-apparel", "/catalogue/leather-garments", "/canada-apparel-manufacturer", "/buyer-trust"],
  }),
];

function makeGermanPage(config: Omit<BuyerIntentLandingPage, "locale" | "direction" | "primaryLabel" | "secondaryLabel">): BuyerIntentLandingPage {
  return {
    ...config,
    locale: "de-DE",
    direction: "ltr",
    primaryLabel: "Großhandelsanfrage senden",
    secondaryLabel: "Live-Videoanruf aus der Fabrik buchen",
  };
}

const germanPages: BuyerIntentLandingPage[] = [
  makeGermanPage({
    path: "/de/lederhosen-hersteller",
    title: "Lederhosen Hersteller für Deutschland | B2B & Private Label",
    description: "Individuelle Lederhosen-Fertigung für deutsche Großhändler und Trachtenmarken mit Leder, Stickerei, Trägern, Etiketten und Musterfreigabe.",
    h1: "Lederhosen Hersteller für deutsche Großhandelskunden",
    eyebrow: "B2B Lederhosen-Fertigung",
    intro: "Irha Apparels fertigt individuelle Lederhosen in Sialkot, Pakistan. Leder, Schnitt, Stickerei, Beschläge, Träger, Größen und Verpackung werden vor der Serienproduktion abgestimmt.",
    market: "Deutschland",
    productFocus: "Lederhosen und passende Trachten-Komponenten",
    categoryPath: "/products/bavarian-trachten-wear",
    sections: [
      { heading: "Mögliche Produktvarianten", body: "Die Fertigung erfolgt nach Kundenspezifikation und nicht als unveränderte Lagerware.", bullets: ["Kurze, knielange und lange Lederhosen", "Individuelle Stickerei und Kontrastnähte", "Passende oder abnehmbare Hosenträger", "Private-Label-Etiketten und kundenspezifische Verpackung"] },
      { heading: "Freigabe vor der Produktion", body: "Material, Maße, Verarbeitung und Dekoration werden dokumentiert. Eine Muster- oder Vorproduktionsfreigabe kann vor der Serienproduktion vereinbart werden.", bullets: ["Leder- und Farbreferenz", "Stickmotiv und Position", "Knöpfe, Schnallen und Metallteile", "Größentabelle und Gradierung"] },
      { heading: "Direkte Lieferung aus Sialkot", body: "Irha Apparels behauptet keinen deutschen Produktionsstandort. Die Kommunikation erfolgt direkt mit dem Hersteller; für qualifizierte Einkäufer ist ein Live-Videoanruf aus der Fabrik möglich.", bullets: ["Klare Incoterms", "Verpackungs- und Kartonangaben", "Dokumentierte Käuferfreigaben", "Keine unbelegten Zertifizierungsversprechen"] },
      { heading: "Geeignet für", body: "Das Angebot richtet sich an gewerbliche Einkäufer.", bullets: ["Trachten-Großhändler", "Oktoberfest-Lieferanten", "Fachhändler", "Private-Label-Marken"] },
    ],
    faqs: [
      { question: "Wie hoch ist die Mindestbestellmenge?", answer: "Die Mindestmenge hängt von Leder, Modell, Stickerei, Größenverteilung und Verpackung ab und wird nach Prüfung der Anfrage bestätigt." },
      { question: "Ist ein Muster vor der Serienproduktion möglich?", answer: "Ja. Muster, Korrekturen und Vorproduktionsfreigabe können im Projektplan festgelegt werden." },
      { question: "Gibt es eine Fabrik in Deutschland?", answer: "Nein. Die Fertigung erfolgt in Sialkot, Pakistan. Irha Apparels kommuniziert dies transparent und bietet qualifizierten Käufern eine Live-Fabrikbesichtigung per Video an." },
      { question: "Können bestehende Modelle nachentwickelt werden?", answer: "Eine berechtigte Referenz des Käufers kann als Grundlage dienen. Marken, geschützte Motive oder fremde Designs werden nicht ohne Erlaubnis kopiert." },
    ],
    relatedPaths: ["/lederhosen-manufacturer-germany", "/products/bavarian-trachten-wear", "/catalogue/lederhosen", "/buyer-trust"],
    alternates: [{ locale: "en", href: "/lederhosen-manufacturer-germany" }, { locale: "de", href: "/de/lederhosen-hersteller" }],
  }),
  makeGermanPage({
    path: "/de/dirndl-grosshandel",
    title: "Dirndl Hersteller & Großhandel | Private Label für Österreich",
    description: "Individuelle Dirndl-Fertigung für österreichische Großhändler und Marken mit Kleid, Bluse, Schürze, Stickerei, Größen und Musterfreigabe.",
    h1: "Dirndl Hersteller für österreichische B2B-Einkäufer",
    eyebrow: "B2B Dirndl-Fertigung",
    intro: "Entwickeln Sie abgestimmte Dirndl-Programme mit Kleid, Bluse und Schürze. Stoffe, Schnitt, Besätze, Größen, Branding und Verpackung werden vor der Produktion freigegeben.",
    market: "Österreich",
    productFocus: "Dirndl-Kleider, Blusen und Schürzen",
    categoryPath: "/products/bavarian-trachten-wear",
    sections: [
      { heading: "Komplette Dirndl-Programme", body: "Ein Dirndl wird als abgestimmtes Set entwickelt, damit Kleid, Bluse, Schürze und Besätze dieselbe freigegebene Qualitätsrichtung erfüllen.", bullets: ["Mini-, Midi- und lange Dirndl", "Baumwolle, Leinenoptik, Samt und freigegebene Stoffe", "Spitzen-, Puffärmel- und individuelle Blusen", "Satin-, Baumwoll-, Spitzen- und bestickte Schürzen"] },
      { heading: "Muster und Freigabe", body: "Schnitt, Passform, Materialien und Details werden anhand von Käuferkommentaren überarbeitet, bevor eine Serienproduktion bestätigt wird.", bullets: ["Stoff- und Besatzkarte", "Maße von Mieder und Rock", "Abstimmung von Bluse und Schürze", "Set-Verpackung für den Handel"] },
      { heading: "Transparente internationale Beschaffung", body: "Die Fertigung erfolgt in Sialkot, Pakistan. Lieferumfang, Incoterms, Verpackung und Zieltermin werden schriftlich vereinbart.", bullets: ["Direkter Fabrikkontakt", "Live-Videoanruf möglich", "Klare Produktionsmeilensteine", "Keine pauschalen, irreführenden MOQ-Angaben"] },
      { heading: "Geeignet für", body: "Die Programme sind für gewerbliche Käufer gedacht.", bullets: ["Trachten-Boutiquen", "Großhändler", "Event-Lieferanten", "Private-Label-Marken"] },
    ],
    faqs: [
      { question: "Können komplette Dirndl-Sets geliefert werden?", answer: "Ja. Kleid, Bluse und Schürze können als abgestimmtes Set entwickelt und nach Kundenvorgabe verpackt werden." },
      { question: "Wie wird die Mindestmenge festgelegt?", answer: "Die Mindestmenge wird nach Modell, Stoff, Farben, Größen, Besätzen und Verpackung berechnet." },
      { question: "Ist eine Musterfreigabe möglich?", answer: "Ja. Muster und notwendige Korrekturen werden vor einer Serienfreigabe geplant." },
      { question: "Erfolgt die Produktion in Österreich?", answer: "Nein. Die Produktion erfolgt transparent in Sialkot, Pakistan; Irha Apparels behauptet keinen österreichischen Standort." },
    ],
    relatedPaths: ["/dirndl-manufacturer-austria", "/products/bavarian-trachten-wear", "/catalogue/dirndl-dresses", "/factory-video-call"],
    alternates: [{ locale: "en", href: "/dirndl-manufacturer-austria" }, { locale: "de", href: "/de/dirndl-grosshandel" }],
  }),
  makeGermanPage({
    path: "/de/trachten-private-label",
    title: "Trachten Private Label Hersteller | B2B Fertigung",
    description: "Private-Label-Trachtenfertigung für deutsche und österreichische Marken: Lederhosen, Dirndl, Hemden, Westen, Jacken, Accessoires und kundenspezifische Etiketten.",
    h1: "Private-Label-Trachten Hersteller für europäische Einkäufer",
    eyebrow: "Trachten Private Label",
    intro: "Bauen Sie eine abgestimmte Trachtenkollektion mit direkter Herstellerkommunikation, Musterfreigabe, eigenen Etiketten und klaren Verpackungsanforderungen auf.",
    market: "Deutschland und Österreich",
    productFocus: "Lederhosen, Dirndl, Trachtenhemden, Westen, Jacken und Accessoires",
    categoryPath: "/products/bavarian-trachten-wear",
    sections: [
      { heading: "Sortimentsentwicklung", body: "Produkte können einzeln oder als koordinierte Kollektion entwickelt werden.", bullets: ["Lederhosen und Hosenträger", "Dirndl, Blusen und Schürzen", "Trachtenhemden, Westen und Janker", "Gürtel, Hüte, Socken und weitere Accessoires"] },
      { heading: "Private-Label-Ausstattung", body: "Branding wird anhand freigegebener Dateien und einer definierten Stückliste umgesetzt.", bullets: ["Webetiketten und Größenetiketten", "Pflegeetiketten nach Käuferinhalt", "Hangtags und Barcode-Vorbereitung", "Kundenspezifische Faltung und Verpackung"] },
      { heading: "Qualität und Kommunikation", body: "Der erfahrene Hersteller verfügt über eine neu aufgebaute Website. Käufer können den Produktionsbetrieb bei Bedarf per Live-Videoanruf sehen.", bullets: ["Musterkommentare dokumentiert", "Mess- und Verarbeitungsprüfungen", "Freigabe von Stickerei und Besätzen", "Versandverantwortung schriftlich vereinbart"] },
      { heading: "B2B statt Einzelhandel", body: "Es werden keine pauschalen Einzelhandelspreise veröffentlicht. Jede Anfrage wird nach Spezifikation, Menge und Zielmarkt kalkuliert.", bullets: ["Großhandel", "Private Label", "Import und Distribution", "Event- und Oktoberfest-Sortimente"] },
    ],
    faqs: [
      { question: "Kann eine komplette Private-Label-Kollektion entwickelt werden?", answer: "Ja. Produktauswahl, Materialien, Farben, Größen, Branding, Verpackung und Lieferplan werden als zusammenhängendes Programm geprüft." },
      { question: "Sind kundeneigene Etiketten möglich?", answer: "Ja. Web-, Pflege-, Größen- und Hangtags können nach freigegebenen Käuferdaten umgesetzt werden." },
      { question: "Wo befindet sich die Produktion?", answer: "Die Produktion befindet sich in Sialkot, Pakistan. Es wird kein europäischer Produktionsstandort behauptet." },
      { question: "Wie beginnt ein Projekt?", answer: "Senden Sie Produktart, Zielqualität, Menge, Größen, Branding, Verpackung und gewünschten Liefertermin für eine erste Machbarkeitsprüfung." },
    ],
    relatedPaths: ["/products/bavarian-trachten-wear", "/germany-apparel-manufacturer", "/austria-apparel-manufacturer", "/inquiry"],
    alternates: [{ locale: "de", href: "/de/trachten-private-label" }],
  }),
];

export const BUYER_INTENT_LANDING_PAGES: BuyerIntentLandingPage[] = [...englishPages, ...germanPages];

export const BUYER_INTENT_PATHS = BUYER_INTENT_LANDING_PAGES.map((page) => page.path);

export const BUYER_INTENT_FOOTER_LINKS = [
  { label: "Germany", href: "/germany-apparel-manufacturer" },
  { label: "Austria", href: "/austria-apparel-manufacturer" },
  { label: "Switzerland", href: "/switzerland-apparel-manufacturer" },
  { label: "Netherlands", href: "/netherlands-apparel-manufacturer" },
  { label: "United Kingdom", href: "/uk-custom-apparel-manufacturer" },
  { label: "United States", href: "/usa-private-label-clothing-manufacturer" },
  { label: "Canada", href: "/canada-apparel-manufacturer" },
  { label: "Australia", href: "/australia-apparel-manufacturer" },
  { label: "New Zealand", href: "/new-zealand-apparel-manufacturer" },
] as const;

export function getBuyerIntentLandingPage(pathname: string) {
  const normalized = pathname !== "/" ? pathname.replace(/\/+$/, "") : pathname;
  return BUYER_INTENT_LANDING_PAGES.find((page) => page.path === normalized);
}
