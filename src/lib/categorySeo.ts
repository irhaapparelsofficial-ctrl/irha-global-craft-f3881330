// Per-category SEO metadata + FAQ blocks targeting export-buyer keywords
// (USA, EU, UK, UAE, Germany, Australia). Used by /products/:slug pages.

import ogBavarian from "@/assets/og/og-bavarian.jpg";
import ogSportswear from "@/assets/og/og-sportswear.jpg";
import ogLeather from "@/assets/og/og-leather.jpg";
import ogStreetwear from "@/assets/og/og-streetwear.jpg";
import ogLeisure from "@/assets/og/og-leisure.jpg";
import ogNightwear from "@/assets/og/og-nightwear.jpg";

export type CategoryFAQ = { q: string; a: string };

export type CategorySEO = {
  title: string;          // <60 chars when possible
  description: string;    // <160 chars
  keywords: string;
  h1: string;
  intro: string;          // long-form intro paragraph for the page
  exportMarkets: string[];
  ogImage: string;        // 1200x630 share card for OG/Twitter
  faqs: CategoryFAQ[];
};

export const CATEGORY_SEO: Record<string, CategorySEO> = {
  bavarian: {
    title: "Lederhosen & Dirndl Manufacturer Pakistan | Oktoberfest Supplier Flexible MOQ | FOB Sialkot",
    description:
      "Custom lederhosen, dirndl, bundhosen manufacturer. Flexible MOQ, in-house embroidery, lead time confirmed per program. Wholesale trachten for Germany, Austria, USA.",
    keywords:
      "lederhosen manufacturer, trachten supplier, dirndl wholesale, Bavarian wear exporter Pakistan, Oktoberfest wholesale, suede lederhosen, alpine clothing manufacturer",
    h1: "Bavarian Wear Manufacturer — Lederhosen, Dirndl & Trachten",
    intro:
      "Authentic European trachten produced at our Sialkot atelier for Oktoberfest retailers, alpine boutiques and trachten chains across Germany, Austria, Switzerland and the United States. Genuine deer suede, hand-embroidered florals, antique alpine hardware and made-to-measure sizing — at wholesale MOQs starting from 50 sets.",
    exportMarkets: ["Germany", "Austria", "Switzerland", "USA", "Italy"],
    ogImage: ogBavarian,
    faqs: [
      { q: "Do you export lederhosen and trachten to Germany and Austria?", a: "Yes. Bavarian wear is our largest export program — we ship full container loads and air-freight orders weekly to importers and Oktoberfest retailers in Germany, Austria, Switzerland and South Tyrol. We handle EU customs paperwork, regulatory documentation as required and material documentation as required with every shipment." },
      { q: "What is the MOQ for wholesale lederhosen?", a: "Our MOQ is flexible per program and colorway. Inside the MOQ you may split sizes EU 44–60 (men) and equivalent women's and kids' sizing freely, so you can stock a full size run for a single shop or test launch." },
      { q: "Do you produce private-label dirndl dresses for boutiques?", a: "Yes. We offer full private-label and white-label dirndl programs — custom prints on the apron and bodice, custom lace trims, woven labels, branded hangtags and gift packaging. Tech-pack and CAD support is free for confirmed orders." },
      { q: "What leather grade do you use for genuine lederhosen?", a: "Heritage sets are cut from 1.2–1.4 mm genuine deer suede; entry programs use top-grain cowhide split suede. Both are vegetable-tanned at vetted tanneries and tested to regulatory-documentation-as-required-aligned dye limits." },
      { q: "What is your lead time from sample approval to FOB Sialkot?", a: "Standard lead time is 45–60 days for lederhosen sets and 40–55 days for dirndl dresses. Pre-Oktoberfest peak (Jan–May) we recommend confirming POs at least 90 days before shipping." },
    ],
  },

  sportswear: {
    title: "Custom Sportswear Manufacturer Pakistan | Sublimated Jerseys Flexible MOQ | FOB Sialkot",
    description:
      "Private label sportswear, basketball jerseys, tracksuits, gym wear. All-over sublimation, Flexible MOQ, FOB Sialkot. Export USA, UK, EU, UAE, Australia.",
    keywords:
      "sportswear manufacturer Pakistan, sublimated jersey supplier, custom tracksuit wholesale, gym wear manufacturer, activewear exporter Sialkot, teamwear manufacturer, soccer jersey wholesale",
    h1: "Sportswear Manufacturer — Sublimated Jerseys, Tracksuits & Gym Wear",
    intro:
      "Sialkot's sportswear heritage applied to modern teamwear, performance training kits and gym apparel. In-house dye-sublimation, recycled polyester knits, four-way stretch and bonded seams — engineered for sports brands, e-commerce activewear labels and clubs across the USA, UK, UAE, Australia and the EU.",
    exportMarkets: ["USA", "UK", "Australia", "UAE", "Germany", "France"],
    ogImage: ogSportswear,
    faqs: [
      { q: "Do you manufacture fully sublimated custom team jerseys?", a: "Yes. We run full dye-sublimation in-house on 140–180 GSM micro-mesh and interlock polyester — unlimited print colors, custom crests, numbers, names and sponsor logos at no extra setup beyond the digitizing fee." },
      { q: "What is the MOQ for custom sportswear and tracksuits?", a: "Our MOQ is flexible sets per design. Within the 50-set MOQ you can split sizes XS–3XL freely; multi-color splits within one print are accepted from 25 sets per colorway." },
      { q: "Which countries do you export activewear to?", a: "Active programs ship to gym wear brands and sports retailers in the USA, UK, Australia, UAE, Saudi Arabia, Germany, France and the Nordics. We offer DDP shipping to most major markets on request." },
      { q: "Do you offer eco-friendly recycled polyester fabric?", a: "Yes. We stock GRS-certified recycled polyester micro-mesh and interlock in 140–220 GSM, plus recycled nylon for compression wear. Certificates and traceability documents are provided with each shipment." },
      { q: "How long does sportswear production take?", a: "Lead time is 25–35 days from approved strike-off and PO confirmation. Express 18-day production is available for repeat customers on existing tech packs." },
    ],
  },

  leather: {
    title: "Custom Leather Jackets Manufacturer Pakistan | Small Batch OEM Flexible MOQ | FOB Sialkot",
    description:
      "Biker jackets, leather pants, custom leather wear. Small batch production, private label, FOB Sialkot. Export USA, UK, Germany, Canada, Australia.",
    keywords:
      "leather jacket manufacturer Sialkot, leather garments exporter Pakistan, lambskin jacket wholesale, biker jacket manufacturer, custom leather jackets, premium leather supplier, OEM leatherwear",
    h1: "Leather Garment Manufacturer — Jackets, Vests & Outerwear",
    intro:
      "Three generations of Sialkot leatherworking, applied to premium fashion outerwear, biker jackets, bomber jackets, vests and skirts. We work with lambskin, cowhide nappa, sheep nappa and genuine suede from vetted tanneries — built for fashion houses, motorcycle apparel brands and private-label boutiques across the USA, EU, UK and the Gulf.",
    exportMarkets: ["USA", "UK", "Germany", "Italy", "UAE", "Canada"],
    ogImage: ogLeather,
    faqs: [
      { q: "What leather types do you stock for jacket production?", a: "We work with 0.7–1.2 mm lambskin nappa, cowhide aniline, sheep suede, goatskin and waxed buffalo. All hides come from vetted tanneries with documentation as required per market." },
      { q: "What is the MOQ for custom leather jackets?", a: "MOQ is flexible pieces per design and colorway. Pattern, sample and tech-pack support is included for confirmed POs. Bespoke single-design runs under MOQ are quoted separately as a sampling program." },
      { q: "Do you export leather jackets to the USA and EU?", a: "Yes. Leather is our second-largest export program. We ship to fashion brands, motorcycle apparel companies and private-label retailers across the USA, UK, Germany, Italy, France, the Netherlands and the UAE — DDP and FOB Sialkot both available." },
      { q: "Can you replicate a sample jacket I already own?", a: "Yes. Send us your reference sample by courier and we will pattern, grade and tech-pack it from scratch, then produce a counter-sample for approval before bulk production. Sampling lead time is 18–25 days." },
      { q: "What is the lead time for leather production?", a: "55–70 days FOB Sialkot from approved counter-sample and 30 percent advance. Air-freight upgrades are available; sea freight to USA East Coast averages 28–32 additional days." },
    ],
  },

  streetwear: {
    title: "Streetwear Manufacturer Pakistan | Custom Hoodies Flexible MOQ | Private Label FOB Sialkot",
    description:
      "Oversized hoodies, t-shirts, varsity jackets. Flexible MOQ pieces, custom embroidery & printing, FOB Sialkot. OEM ODM for USA, UK, Germany, Canada, Australia.",
    keywords:
      "streetwear manufacturer Pakistan, hoodies manufacturer wholesale, heavyweight hoodie supplier, oversized t-shirt manufacturer, puff print hoodies, custom streetwear OEM, private label streetwear",
    h1: "Streetwear Manufacturer — Heavyweight Hoodies & Oversized Tees",
    intro:
      "A dedicated streetwear program for emerging fashion labels and established drops — 320–500 GSM heavyweight fleece, garment dye, acid wash, puff print, 3D embroidery and applique. Built for streetwear brands, influencer drops and private-label retailers across the USA, UK, Canada, Germany and Australia, with low-MOQ start-up support.",
    exportMarkets: ["USA", "UK", "Canada", "Germany", "Australia"],
    ogImage: ogStreetwear,
    faqs: [
      { q: "What GSM weights do you produce for hoodies?", a: "Standard weights are 320, 380, 420 and 500 GSM brushed-back fleece in cotton and cotton-poly blends. Above 500 GSM (winter sherpa-lined hoodies) is available on request." },
      { q: "Is there a low-MOQ program for emerging streetwear brands?", a: "Yes. Our Start-Up Program allows Flexible MOQ pieces per color across hoodies, tees and sweatpants — with the same heavyweight fabric, finishing and trims used for larger brands. Tech-pack support is free for confirmed POs." },
      { q: "Which print and embellishment techniques do you offer?", a: "Puff print, plastisol, water-based discharge, flock, foil, screen print, DTG accents, 3D and flat embroidery, twill applique, chenille patches, garment dye, acid wash, pigment dye and stone wash — all in-house." },
      { q: "Do you ship streetwear orders to the USA and UK?", a: "Yes. We ship streetwear regularly to brands in Los Angeles, New York, London, Manchester, Toronto, Berlin, Sydney and Melbourne. DDP delivered-duty-paid quotes are available on request." },
      { q: "Can you replicate Champion, Carhartt or Essentials-style fits?", a: "Yes — we tech-pack reference garments from scratch (we don't copy logos or trademarks). Send a sample of any reference fit and we'll grade your own labelled version." },
    ],
  },

  leisure: {
    title: "Leisurewear & Loungewear Manufacturer Pakistan | Irha Apparels",
    description:
      "Premium loungewear, athleisure & resort wear manufacturer in Sialkot. French terry, modal, bamboo. Flexible MOQ. Export USA, EU, UK, UAE, Australia.",
    keywords:
      "leisurewear manufacturer Pakistan, loungewear supplier wholesale, athleisure manufacturer, resort wear exporter, modal loungewear, bamboo loungewear, private label loungewear",
    h1: "Leisurewear Manufacturer — Loungewear, Athleisure & Resort Sets",
    intro:
      "Soft-hand loungewear, athleisure sets and resort co-ords for DTC lounge brands, hotel boutiques and lifestyle retailers. French terry, modal jersey, bamboo viscose and recycled cotton — built for the USA, UK, EU, UAE, Australia and GCC resort markets with full private-label and packaging support.",
    exportMarkets: ["USA", "UK", "UAE", "Saudi Arabia", "Australia", "France"],
    ogImage: ogLeisure,
    faqs: [
      { q: "What fabrics do you use for loungewear sets?", a: "180–280 GSM French terry, modal-cotton jersey, bamboo viscose, slub jersey, waffle knit and recycled-cotton fleece. All fabrics are material spec confirmed per program and organic options available on request." },
      { q: "What is the MOQ for wholesale loungewear sets?", a: "MOQ is flexible sets per design and colorway, with free size splits XS–3XL inside the MOQ. Co-ord sets (top + bottom) count as one set." },
      { q: "Do you offer custom packaging for DTC loungewear brands?", a: "Yes. Branded poly mailers, kraft boxes, ribbon tie-ups, thank-you cards, tissue wrap with custom prints and woven name labels — all sourced in-house to keep packaging within your unit cost target." },
      { q: "Which markets do you export leisurewear to?", a: "Active programs ship to DTC loungewear and athleisure brands in the USA, UK, Germany, France, UAE, Saudi Arabia, Australia and New Zealand. We support FOB Sialkot and DDP shipping." },
      { q: "What is your loungewear production lead time?", a: "Standard lead time is 35–45 days from approved sample and PO. Repeat orders on existing tech packs ship in 25–30 days." },
    ],
  },

  nightwear: {
    title: "Pajama & Sleepwear Manufacturer Pakistan | Flexible MOQ Wholesale | FOB Sialkot",
    description:
      "Custom sleepwear, loungewear, pajama sets. Private label, small MOQ, FOB Sialkot. Export USA, UK, Germany, Canada, Australia.",
    keywords:
      "nightwear manufacturer Pakistan, pyjama manufacturer wholesale, silk nightwear supplier, satin pyjama set, sleepwear manufacturer, robe manufacturer, private label nightwear",
    h1: "Nightwear Manufacturer — Silk, Satin & Cotton Pyjamas",
    intro:
      "Luxury sleepwear and intimate loungewear produced for boutique lingerie brands, bridal stores and hotel retail across the USA, UK, EU, UAE and Australia. Mulberry silk, French satin, brushed cotton and bamboo — finished with French seams, custom lace trims and signature packaging.",
    exportMarkets: ["USA", "UK", "France", "UAE", "Australia", "Italy"],
    ogImage: ogNightwear,
    faqs: [
      { q: "Do you produce mulberry silk pyjama sets?", a: "Yes. We stock 19 and 22 momme grade-6A mulberry silk in piece-dyed and printed forms. All silk is material spec confirmed per program with mill-issued grade certificates." },
      { q: "What is the MOQ for custom nightwear?", a: "MOQ is flexible sets per design and colorway across silk, satin and cotton programs. Size splits XS–3XL inside the MOQ are free; printed satin requires 25 yards minimum per custom print colorway." },
      { q: "Do you offer bridal and bridesmaid pyjama sets?", a: "Yes — bridal robe + pyjama gift sets, monogrammed satin slips and bridesmaid co-ords are one of our fastest-growing programs. Custom embroidery, names and dates are included from 25 pieces per colorway." },
      { q: "Which countries do you ship nightwear to?", a: "We ship regularly to lingerie boutiques and DTC sleepwear brands in the USA, UK, France, Italy, UAE, Saudi Arabia and Australia. Both FOB Sialkot and DDP shipping are supported." },
      { q: "What is the production lead time for pyjama sets?", a: "Cotton and brushed-cotton pyjamas ship in 30–40 days; silk and satin programs ship in 40–55 days from approved counter-sample and PO." },
    ],
  },
};

// Aliases for canonical Phase 3 slugs — reuse existing rich SEO copy where it fits.
CATEGORY_SEO["bavarian-trachten-wear"] = CATEGORY_SEO.bavarian;
CATEGORY_SEO["premium-leather-apparel"] = CATEGORY_SEO.leatherwear;
CATEGORY_SEO["streetwear-activewear"] = CATEGORY_SEO.streetwear;
CATEGORY_SEO["leisure-nightwear"] = CATEGORY_SEO.leisure;

