import ogBavarian from "@/assets/og/og-bavarian.jpg";
import ogSportswear from "@/assets/og/og-sportswear.jpg";
import ogLeather from "@/assets/og/og-leather.jpg";
import ogStreetwear from "@/assets/og/og-streetwear.jpg";
import ogLeisure from "@/assets/og/og-leisure.jpg";

export type CategoryFAQ = { q: string; a: string };
export type CategoryContentSection = {
  heading: string;
  body: string;
  bullets: string[];
};
export type CategoryGuideLink = { label: string; href: string };
export type CategorySEO = {
  title: string;
  description: string;
  keywords: string;
  h1: string;
  intro: string;
  exportMarkets: string[];
  ogImage: string;
  sections: CategoryContentSection[];
  buyerGuides: CategoryGuideLink[];
  faqs: CategoryFAQ[];
};

type SafeCategoryInput = Omit<CategorySEO, "ogImage"> & { ogImage: string };

const safe = (input: SafeCategoryInput): CategorySEO => input;

export const CATEGORY_SEO: Record<string, CategorySEO> = {
  "bavarian-trachten-wear": safe({
    title: "Bavarian & Trachten Manufacturer | Wholesale B2B",
    description: "Custom Lederhosen, Dirndl and Trachten manufacturing for wholesalers, specialist retailers and private-label buyers with samples and buyer approval.",
    keywords: "Trachten manufacturer, Lederhosen manufacturer, Dirndl manufacturer, Bavarian clothing wholesale, private label Trachten",
    h1: "Custom Bavarian & Trachten Wear Manufacturer",
    intro: "Develop coordinated Bavarian and Trachten programs for wholesale, specialist retail, event supply and private-label collections. Leather, fabric, embroidery, sizing, labels and packaging are reviewed against the buyer brief before quotation or production commitments.",
    exportMarkets: ["Germany", "Austria", "Switzerland"],
    ogImage: ogBavarian,
    sections: [
      {
        heading: "Build a complete Trachten assortment",
        body: "Buyers can source one style or coordinate a broader collection around an approved quality direction instead of combining unrelated stock items.",
        bullets: ["Lederhosen in short, knee-length and long constructions", "Dirndl dresses, blouses and aprons developed as coordinated sets", "Trachten shirts, waistcoats, Janker concepts and leather accessories", "Belts, suspenders, hats, socks and other supporting products"],
      },
      {
        heading: "Specify the details that control quality",
        body: "Traditional appearance alone does not define an export-ready product. The material, fit, decoration and component specification must be clear enough for sampling and repeat production.",
        bullets: ["Leather or fabric type, weight, colour and approved hand-feel", "Embroidery artwork, density, placement and thread direction", "Measurements, size grading, lining, buttons, buckles and trims", "Private-label care content, hangtags, folding and carton requirements"],
      },
      {
        heading: "Approve the program before bulk production",
        body: "The quotation and sample route are prepared from the actual product scope. Bulk production is confirmed only after the agreed approval points are understood.",
        bullets: ["Reference, sketch, tech pack or buyer-owned sample review", "Material and component confirmation before sample completion", "Written sample comments and pre-production approval where required", "MOQ, price, timing and shipping responsibility confirmed per program"],
      },
    ],
    buyerGuides: [
      { label: "Lederhosen Hersteller — Deutsch", href: "/de/lederhosen-hersteller" },
      { label: "Trachten Private Label — Deutsch", href: "/de/trachten-private-label" },
      { label: "Germany apparel sourcing guide", href: "/markets/germany" },
      { label: "Germany manufacturer page", href: "/germany-apparel-manufacturer" },
    ],
    faqs: [
      { q: "Can one supplier develop a coordinated Lederhosen and Dirndl collection?", a: "Yes. The collection can be scoped across Lederhosen, Dirndl, shirts, waistcoats and accessories, provided each style has an approved material, construction, size and branding brief." },
      { q: "Can buyers approve a sample before bulk Trachten production?", a: "Yes. Sampling and revisions can be planned before bulk production. The approval route depends on the product complexity, materials, embroidery and required size range." },
      { q: "Can custom labels and retail packaging be included?", a: "Woven labels, care labels, size labels, hangtags and buyer-specific packing can be reviewed with the garment specification and order requirements." },
      { q: "Is one minimum order quantity published for all Trachten products?", a: "No. A workable quantity is confirmed after reviewing the style, materials, colours, decoration, size ratio and packaging rather than applying one misleading MOQ to every product." },
    ],
  }),
  "premium-leather-apparel": safe({
    title: "Custom Leather Apparel Manufacturer | Private Label B2B",
    description: "Custom leather jackets, vests, trousers and accessories for brands and wholesalers with material, hardware, fit, sample and private-label approval.",
    keywords: "leather apparel manufacturer, leather jacket manufacturer, private label leatherwear, wholesale leather garments",
    h1: "Custom Premium Leather Apparel Manufacturer",
    intro: "Develop leather apparel from a defined buyer specification covering leather type, thickness, finish, construction, lining, hardware, fit, branding and packaging. Commercial terms are confirmed only after the proposed product is technically reviewed.",
    exportMarkets: ["Germany", "USA", "Canada"],
    ogImage: ogLeather,
    sections: [
      {
        heading: "Leather programs for brands and wholesalers",
        body: "The range can support focused outerwear styles or a coordinated private-label program, with feasibility confirmed product by product.",
        bullets: ["Biker, fashion, bomber and varsity-inspired jackets", "Leather vests, waistcoats, trousers and coordinated outerwear", "Belts, gloves, bags and selected leather accessories", "Custom embroidery, patches, linings, labels and packaging"],
      },
      {
        heading: "Define leather, hardware and construction",
        body: "Leather varies by source, tanning and finish, so the approved reference must establish what the buyer will use to judge production consistency.",
        bullets: ["Leather type, thickness, shade, grain and hand-feel", "Zippers, snaps, buckles, buttons and other hardware", "Lining, insulation, seam construction and reinforcement", "Measurement chart, fit block, grading and tolerance review"],
      },
      {
        heading: "Control sampling and production approvals",
        body: "Samples, swatches and component references can be used to align expectations before bulk production and shipment responsibility are confirmed.",
        bullets: ["Reference style and buyer-owned artwork review", "Leather swatch or approved sample comparison", "Fit, workmanship, branding and packing comments recorded", "MOQ, price, timing and shipping terms agreed in writing"],
      },
    ],
    buyerGuides: [
      { label: "Lederbekleidung Hersteller — Deutsch", href: "/de/lederbekleidung-hersteller" },
      { label: "Leather manufacturer for Germany", href: "/leather-apparel-manufacturer-germany" },
      { label: "Canada leather jacket sourcing", href: "/custom-leather-jacket-manufacturer-canada" },
      { label: "Buyer verification", href: "/buyer-trust" },
    ],
    faqs: [
      { q: "Which leather types can be reviewed for a custom program?", a: "The proposed leather depends on the style, target finish, construction and commercial brief. The quotation should identify the intended specification and any approved substitute rules." },
      { q: "Can hardware and lining be customized?", a: "Yes. Zippers, snaps, buckles, lining, insulation and internal branding can be reviewed against the style and approved component references." },
      { q: "Can a leather jacket sample be approved before bulk production?", a: "Yes. A sample can be used to review leather appearance, fit, construction, hardware, labels and finishing before bulk production is confirmed." },
      { q: "Do leather products have one universal MOQ and price?", a: "No. Quantity and pricing depend on leather availability, construction, colours, hardware, decoration, size ratio and packaging, so they are confirmed after review." },
    ],
  }),
  sportswear: safe({
    title: "Custom Sportswear & Teamwear Manufacturer | B2B",
    description: "Custom teamwear, training apparel and private-label sportswear for clubs, brands and distributors with artwork, sizing, samples and repeat-order planning.",
    keywords: "custom sportswear manufacturer, teamwear manufacturer, private label sportswear, sports uniform supplier",
    h1: "Custom Sportswear & Teamwear Manufacturer",
    intro: "Build sportswear programs around the intended sport, artwork, size range, material direction, decoration, packaging and repeat-order needs. Product performance and commercial terms are confirmed against the buyer specification rather than assumed from a generic catalogue item.",
    exportMarkets: ["Germany", "UK", "Australia"],
    ogImage: ogSportswear,
    sections: [
      {
        heading: "Team, training and private-label programs",
        body: "Sports buyers can coordinate match apparel, training wear and supporting garments within one approved visual and size system.",
        bullets: ["Football, basketball, rugby, cricket and hockey kits", "Tracksuits, training tops, shorts, pants and warm-up apparel", "Club, school, distributor and private-label brand programs", "Staff apparel, training bibs and selected supporting products"],
      },
      {
        heading: "Approve artwork and product construction",
        body: "The decoration route is selected from the actual design and fabric requirement, with buyer approval before production files are treated as final.",
        bullets: ["Club colours, crests, sponsor marks, names and numbers", "Sublimation, embroidery, DTF or other suitable decoration", "Fabric composition, weight, stretch and construction review", "Measurements, size ratios and grading confirmation"],
      },
      {
        heading: "Prepare for samples and repeat orders",
        body: "A controlled reference system helps buyers manage first orders and later top-ups without assuming that materials remain unchanged indefinitely.",
        bullets: ["Sample and artwork proof approval before bulk commitment", "Approved colour, measurement and decoration references", "Packing lists and size breakdown prepared against the order", "Material continuity checked again before repeat production"],
      },
    ],
    buyerGuides: [
      { label: "Sportbekleidung Hersteller — Deutsch", href: "/de/sportbekleidung-hersteller" },
      { label: "Sportswear manufacturer for Germany", href: "/custom-sportswear-manufacturer-germany" },
      { label: "UK club sportswear sourcing", href: "/custom-sportswear-manufacturer-uk" },
      { label: "Repeat-order workflow", href: "/repeat-order" },
    ],
    faqs: [
      { q: "Can club crests, sponsors, player names and numbers be added?", a: "Yes, when final artwork and roster information are supplied in the agreed format. Decoration method, placement and approval responsibility are confirmed before production." },
      { q: "Can match kits and training wear be developed together?", a: "Yes. Shirts, shorts, tracksuits and training garments can be coordinated around the same colours, artwork, size system and packing plan." },
      { q: "Can a sportswear sample be reviewed before bulk production?", a: "Yes. Sampling can cover fit, fabric, artwork, decoration and construction. The required approval route is confirmed from the actual program." },
      { q: "How are repeat sportswear orders controlled?", a: "Approved artwork, colours, measurements and order references can be retained, while material availability and any necessary substitutions are checked before each repeat order." },
    ],
  }),
  "streetwear-activewear": safe({
    title: "Private-Label Streetwear & Activewear Manufacturer",
    description: "Custom streetwear and activewear for private-label brands and wholesalers with fabric, fit, print, embroidery, labels, samples and packaging review.",
    keywords: "streetwear manufacturer, activewear manufacturer, private label clothing, custom cut and sew manufacturer",
    h1: "Custom Streetwear & Activewear Manufacturer",
    intro: "Translate a brand concept into an approved product specification covering fabric, fit, construction, wash direction, artwork, labels and packaging. Each style is reviewed before sample, quantity, pricing or delivery terms are confirmed.",
    exportMarkets: ["USA", "Netherlands", "Germany"],
    ogImage: ogStreetwear,
    sections: [
      {
        heading: "Develop a focused brand collection",
        body: "Streetwear and activewear can be planned as individual styles or a coordinated capsule with shared fabric, colour and presentation decisions.",
        bullets: ["Heavyweight and standard-weight T-shirts", "Hoodies, sweatshirts, fleece sets and bottoms", "Tracksuits, training apparel and activewear concepts", "Custom cut-and-sew silhouettes and approved trims"],
      },
      {
        heading: "Control fit, fabric and decoration",
        body: "GSM is only one part of product quality. The full brief should define the construction and appearance expected after decoration and normal use.",
        bullets: ["Composition, knit, weight, finish and shrinkage expectations", "Fit block, measurements, rib, stitching and grading", "Embroidery, screen print, DTF, patches and artwork placement", "Wash effects or special finishes subject to feasibility review"],
      },
      {
        heading: "Prepare private-label presentation",
        body: "Branding and packing are reviewed as part of the product rather than added after the garment specification has already been fixed.",
        bullets: ["Woven neck labels, size labels and care labels", "Hangtags, barcode preparation and buyer-supplied content", "Folding, polybag or alternative approved packing", "Sample comments and production approvals recorded per style"],
      },
    ],
    buyerGuides: [
      { label: "USA private-label streetwear", href: "/private-label-streetwear-manufacturer-usa" },
      { label: "Netherlands apparel sourcing", href: "/netherlands-apparel-manufacturer" },
      { label: "Germany apparel sourcing", href: "/germany-apparel-manufacturer" },
      { label: "Upload a reference design", href: "/studio" },
    ],
    faqs: [
      { q: "Can heavyweight T-shirts and oversized fits be manufactured?", a: "Yes, subject to fabric and construction approval. Composition, knit, weight, measurements, shrinkage and decoration must be reviewed together rather than relying on GSM alone." },
      { q: "Can embroidery, print and private labels be combined?", a: "Yes. Artwork, decoration method, label placement and packing can be coordinated, provided each element is approved for the selected fabric and style." },
      { q: "Can buyers start from a sketch or reference garment?", a: "A tech pack, sketch, measurement chart, artwork file or buyer-owned reference can be reviewed. Missing assumptions are clarified before sampling." },
      { q: "Is a universal streetwear MOQ published?", a: "No. The workable quantity depends on fabric, colour, fit, decoration, labels, packaging and production setup, so it is confirmed after the brief is reviewed." },
    ],
  }),
  "leisure-nightwear": safe({
    title: "Custom Leisurewear & Nightwear Manufacturer | B2B",
    description: "Private-label leisurewear, sleepwear and nightwear manufacturing for brands and wholesalers with fabric, fit, labels, samples and packaging review.",
    keywords: "leisurewear manufacturer, nightwear manufacturer, private label sleepwear, custom loungewear supplier",
    h1: "Custom Leisurewear & Nightwear Manufacturer",
    intro: "Develop leisurewear, loungewear and nightwear programs from a buyer-defined brief covering fabric, comfort, fit, construction, labels and retail or wholesale packing. Feasibility and commercial terms are reviewed per product.",
    exportMarkets: ["Germany", "UK", "Netherlands"],
    ogImage: ogLeisure,
    sections: [
      {
        heading: "Leisure and sleep programs to review",
        body: "The collection can be planned around one focused style or coordinated garments that share an approved fabric and brand presentation.",
        bullets: ["Pyjama sets, sleep shirts and selected nightwear", "Robes, bathrobes, loungewear and comfort-led garments", "Private-label basics and coordinated leisure sets", "Buyer-defined colours, trims, labels and packaging"],
      },
      {
        heading: "Specify comfort, fit and fabric",
        body: "The intended season, wearer, sales channel and care expectations help determine the material and construction decisions that must be approved.",
        bullets: ["Composition, weight, hand-feel and colour direction", "Fit, measurements, ease, closures and finishing", "Stitching, seams, trims and decoration suitability", "Care-label content and buyer-approved testing needs"],
      },
      {
        heading: "Approve the private-label order plan",
        body: "Sampling and packing details are reviewed before bulk production so the delivered product follows one documented reference.",
        bullets: ["Reference images, samples, sketches or tech packs accepted", "Sample comments and size approval recorded", "Labels, hangtags, folding and packing confirmed", "MOQ, pricing, timing and shipping agreed after review"],
      },
    ],
    buyerGuides: [
      { label: "Germany apparel manufacturer", href: "/germany-apparel-manufacturer" },
      { label: "Netherlands private-label manufacturer", href: "/netherlands-apparel-manufacturer" },
      { label: "Review the digital catalogue", href: "/catalogue" },
      { label: "Submit a product brief", href: "/inquiry" },
    ],
    faqs: [
      { q: "Can custom pyjama, robe and loungewear programs be developed?", a: "Yes. Feasibility is reviewed from the intended fabric, fit, construction, size range, branding, packing and quantity requirements." },
      { q: "Can fabric and colour references be approved before production?", a: "Material and colour direction can be reviewed through available references or samples. The approval method depends on the product and buyer requirements." },
      { q: "Can private-label care labels and packaging be included?", a: "Yes. Care labels, size labels, woven branding, hangtags, folding and packaging can be scoped with the order, using buyer-approved content." },
      { q: "How are MOQ and production timing confirmed?", a: "They are confirmed after the product, fabric, colours, size ratio, labels, packaging and approval route are understood, rather than published as one fixed promise." },
    ],
  }),
};
