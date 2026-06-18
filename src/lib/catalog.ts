// Extended sub-category catalog. Builds 80–110 products per category using
// rotating image pools so we don't have to ship 600 generated assets.

import bav1 from "@/assets/products/bavarian-1.jpg";
import bav2 from "@/assets/products/bavarian-2.jpg";
import bav3 from "@/assets/products/bavarian-3.jpg";
import bav4 from "@/assets/products/bavarian-4.jpg";
import bav5 from "@/assets/products/bavarian-5.jpg";
import bav6 from "@/assets/products/bavarian-6.jpg";
import bav7 from "@/assets/products/bavarian-7.jpg";
import bav8 from "@/assets/products/bavarian-8.jpg";
import bavD1 from "@/assets/products/bavarian-detail-1.jpg";
import bavD2 from "@/assets/products/bavarian-detail-2.jpg";

import sp1 from "@/assets/products/sportswear-1.jpg";
import sp2 from "@/assets/products/sportswear-2.jpg";
import sp3 from "@/assets/products/sportswear-3.jpg";
import sp4 from "@/assets/products/sportswear-4.jpg";
import sp5 from "@/assets/products/sportswear-5.jpg";
import sp6 from "@/assets/products/sportswear-6.jpg";
import sp7 from "@/assets/products/sportswear-7.jpg";
import sp8 from "@/assets/products/sportswear-8.jpg";
import spD1 from "@/assets/products/sportswear-detail-1.jpg";
import spD2 from "@/assets/products/sportswear-detail-2.jpg";

import lt1 from "@/assets/products/leather-1.jpg";
import lt2 from "@/assets/products/leather-2.jpg";
import lt3 from "@/assets/products/leather-3.jpg";
import lt4 from "@/assets/products/leather-4.jpg";
import lt5 from "@/assets/products/leather-5.jpg";
import lt6 from "@/assets/products/leather-6.jpg";
import lt7 from "@/assets/products/leather-7.jpg";
import lt8 from "@/assets/products/leather-8.jpg";
import ltD1 from "@/assets/products/leather-detail-1.jpg";
import ltD2 from "@/assets/products/leather-detail-2.jpg";

import st1 from "@/assets/products/streetwear-1.jpg";
import st2 from "@/assets/products/streetwear-2.jpg";
import st3 from "@/assets/products/streetwear-3.jpg";
import st4 from "@/assets/products/streetwear-4.jpg";
import st5 from "@/assets/products/streetwear-5.jpg";
import st6 from "@/assets/products/streetwear-6.jpg";
import st7 from "@/assets/products/streetwear-7.jpg";
import st8 from "@/assets/products/streetwear-8.jpg";
import stD1 from "@/assets/products/streetwear-detail-1.jpg";
import stD2 from "@/assets/products/streetwear-detail-2.jpg";

import ls1 from "@/assets/products/leisure-1.jpg";
import ls2 from "@/assets/products/leisure-2.jpg";
import ls3 from "@/assets/products/leisure-3.jpg";
import ls4 from "@/assets/products/leisure-4.jpg";
import ls5 from "@/assets/products/leisure-5.jpg";
import ls6 from "@/assets/products/leisure-6.jpg";
import ls7 from "@/assets/products/leisure-7.jpg";
import ls8 from "@/assets/products/leisure-8.jpg";
import lsD1 from "@/assets/products/leisure-detail-1.jpg";
import lsD2 from "@/assets/products/leisure-detail-2.jpg";

import nw1 from "@/assets/products/nightwear-1.jpg";
import nw2 from "@/assets/products/nightwear-2.jpg";
import nw3 from "@/assets/products/nightwear-3.jpg";
import nw4 from "@/assets/products/nightwear-4.jpg";
import nw5 from "@/assets/products/nightwear-5.jpg";
import nw6 from "@/assets/products/nightwear-6.jpg";
import nw7 from "@/assets/products/nightwear-7.jpg";
import nw8 from "@/assets/products/nightwear-8.jpg";
import nwD1 from "@/assets/products/nightwear-detail-1.jpg";
import nwD2 from "@/assets/products/nightwear-detail-2.jpg";

import type { Product, ProductSpec } from "@/lib/categories";

type Pool = string[];

const POOLS: Record<string, Pool> = {
  bavarian:    [bav1, bav2, bav3, bav4, bav5, bav6, bav7, bav8, bavD1, bavD2],
  sportswear:  [sp1,  sp2,  sp3,  sp4,  sp5,  sp6,  sp7,  sp8,  spD1,  spD2],
  leatherwear: [lt1,  lt2,  lt3,  lt4,  lt5,  lt6,  lt7,  lt8,  ltD1,  ltD2],
  streetwear:  [st1,  st2,  st3,  st4,  st5,  st6,  st7,  st8,  stD1,  stD2],
  leisurewear: [ls1,  ls2,  ls3,  ls4,  ls5,  ls6,  ls7,  ls8,  lsD1,  lsD2],
  nightwear:   [nw1,  nw2,  nw3,  nw4,  nw5,  nw6,  nw7,  nw8,  nwD1,  nwD2],
};

export type SubCategory = {
  slug: string;
  name: string;
  short: string;
  products: Product[];
};

export type CategoryGroup = {
  slug: string;
  name: string;
  subs: SubCategory[];
};

const mk = (
  fabric: string,
  gsm: string,
  moq: string,
  leadTime: string,
  sizes: string,
  colors: string,
  packaging: string,
  certs: string,
  customization: string,
): ProductSpec[] => [
  { label: "Fabric", value: fabric },
  { label: "Weight / GSM", value: gsm },
  { label: "MOQ", value: moq },
  { label: "Lead Time", value: leadTime },
  { label: "Sizes", value: sizes },
  { label: "Colors", value: colors },
  { label: "Packaging", value: packaging },
  { label: "Certifications", value: certs },
  { label: "Customization", value: customization },
];

// Build a sub-category with N products using a name template
function buildSub(
  catSlug: string,
  slug: string,
  name: string,
  short: string,
  names: string[],
  baseSpecs: {
    fabric: string;
    gsm: string;
    moq: string;
    leadTime: string;
    sizes: string;
    colors: string;
    packaging: string;
    certs: string;
    customization: string;
  },
  specHighlights: string[],
  description: (name: string) => string,
): SubCategory {
  const pool = POOLS[catSlug];

  // Auto-expand catalog: pad each sub-category to MIN_PER_SUB products
  // with rotating themed editions so wholesale buyers see a deeper range.
  const MIN_PER_SUB = 42;
  const padLabels = [
    "Wholesale Pack",
    "Private Label Edition",
    "OEM Production Run",
    "Bulk Order Series",
    "Export Grade",
    "Boutique Capsule",
    "Pro Buyer Edition",
    "Atelier Reserve",
    "Heritage Reissue",
    "Trade Show Sample",
    "Seasonal Drop",
    "Limited Workshop Run",
    "Master Craft Edition",
    "Showroom Pick",
    "Catalog Hero",
    "Distributor Special",
    "Retailer Favorite",
    "Concept Store Edition",
    "Made-to-Order Series",
    "Signature B2B Drop",
    "Volume Tier Edition",
    "Premium Trade Edition",
    "Curated Buyer Set",
    "Workshop Numbered",
    "Stocklot Replenishment",
  ];
  const allNames: string[] = [...names];
  let padIdx = 0;
  while (allNames.length < MIN_PER_SUB) {
    const label = padLabels[padIdx % padLabels.length];
    const cycle = Math.floor(padIdx / padLabels.length) + 1;
    const n = cycle === 1
      ? `${label} — ${name}`
      : `${label} ${cycle} — ${name}`;
    if (!allNames.includes(n)) allNames.push(n);
    padIdx++;
  }

  const products: Product[] = allNames.map((n, i) => {
    const img = pool[i % pool.length];
    const g1 = pool[(i + 1) % pool.length];
    const g2 = pool[(i + 2) % pool.length];
    return {
      name: n,
      image: img,
      gallery: [img, g1, g2],
      description: description(n),
      specs: specHighlights,
      details: mk(
        baseSpecs.fabric,
        baseSpecs.gsm,
        baseSpecs.moq,
        baseSpecs.leadTime,
        baseSpecs.sizes,
        baseSpecs.colors,
        baseSpecs.packaging,
        baseSpecs.certs,
        baseSpecs.customization,
      ),
    };
  });
  return { slug, name, short, products };
}

// ──────────────────────────────────────────────────────────────
// BAVARIAN
// ──────────────────────────────────────────────────────────────
const bavarian: CategoryGroup = {
  slug: "bavarian",
  name: "Bavarian Wear",
  subs: [
    buildSub(
      "bavarian",
      "mens-lederhosen",
      "Men's Lederhosen",
      "Traditional German leather shorts & knee-length sets",
      [
        "Heritage Short Lederhosen", "Classic Knee Lederhosen", "Premium Suede Lederhosen", "Antique Brown Lederhosen",
        "Embroidered Front Panel Lederhosen", "Goat Suede Lederhosen", "Deer Leather Lederhosen", "Black Stag Lederhosen",
        "Forest Green Lederhosen", "Tan Hunter Lederhosen", "Vintage Distressed Lederhosen", "Modern Slim Lederhosen",
        "Long Bundhosen", "Buffalo Leather Lederhosen", "Charcoal Trachten Lederhosen",
        "Editor's Selection 16 — Men's Lederhosen",
        "Signature Edition 17 — Men's Lederhosen",
        "Heritage Cut 18 — Men's Lederhosen",
        "Atelier Limited 19 — Men's Lederhosen",
        "Studio Sample 20 — Men's Lederhosen",
      ],
      {
        fabric: "Genuine deer / goat suede leather, 1.2–1.4mm",
        gsm: "Suede equivalent 220–260 GSM",
        moq: "50 pieces per design / color",
        leadTime: "45–60 days FOB",
        sizes: "EU 44–60, custom sizing on request",
        colors: "Antique brown, black, grey, forest, custom dye",
        packaging: "Individual poly bag + branded gift box",
        certs: "OEKO-TEX 100, REACH compliant",
        customization: "Custom embroidery, branded hangtags & woven labels",
      },
      ["Genuine deer suede", "Hand embroidery", "Antler buttons", "Sizes 44–60"],
      (n) =>
        `${n} — handcrafted from premium suede with hand-embroidered front panel, antler-style buttons and traditional H-strap suspenders. Built for European trachten retailers and Oktoberfest programs.`,
    ),

    buildSub(
      "bavarian",
      "womens-dirndl",
      "Women's Dirndl",
      "Heritage dirndl dresses, blouses & aprons",
      [
        "Alpine Mini Dirndl", "Classic Midi Dirndl", "Premium Floral Dirndl", "Embroidered Bodice Dirndl",
        "Burgundy Velvet Dirndl", "Forest Green Linen Dirndl", "Pastel Spring Dirndl", "Black Trachten Dirndl",
        "Long Heritage Dirndl", "Plus-Size Festival Dirndl", "Lace-Trim Dirndl", "Modern Slim Dirndl",
        "Bridal White Dirndl", "Two-Tone Boutique Dirndl", "Kids-Match Mother Dirndl",
        "Editor's Selection 16 — Women's Dirndl",
        "Signature Edition 17 — Women's Dirndl",
        "Heritage Cut 18 — Women's Dirndl",
        "Atelier Limited 19 — Women's Dirndl",
        "Studio Sample 20 — Women's Dirndl",
      ],
      {
        fabric: "Cotton-linen blend bodice, cotton voile blouse",
        gsm: "180–220 GSM",
        moq: "50 pieces per style",
        leadTime: "40–55 days",
        sizes: "XS–XXL, custom plus sizes available",
        colors: "Burgundy, forest, navy, pastel ranges, custom",
        packaging: "Tissue wrap + branded box",
        certs: "OEKO-TEX 100, GOTS option",
        customization: "Custom prints, embroidery, lace trim, branded labels",
      },
      ["Cotton & linen blend", "Floral embroidery", "Lace trim apron", "Sizes XS–XXL"],
      (n) =>
        `${n} — boutique-grade dirndl with floral embroidered bodice, puff-sleeve blouse and crisp apron. Engineered for premium trachten houses and seasonal Oktoberfest collections.`,
    ),

    buildSub(
      "bavarian",
      "trachten-shirts",
      "Trachten Shirts & Blouses",
      "Pure cotton trachten shirts and embroidered blouses",
      [
        "Classic White Trachten Shirt", "Slim-Fit Trachten Shirt", "Embroidered Edelweiss Shirt", "Linen Trachten Shirt",
        "Long-Sleeve Festival Shirt", "Half-Sleeve Summer Trachten", "Off-Shoulder Dirndl Blouse", "Lace-Trim Voile Blouse",
        "Puff-Sleeve Heritage Blouse", "Stand-Collar Trachten Shirt", "Check Pattern Trachten Shirt",
        "Editor's Selection 12 — Trachten Shirts & Blouses",
        "Signature Edition 13 — Trachten Shirts & Blouses",
        "Heritage Cut 14 — Trachten Shirts & Blouses",
        "Atelier Limited 15 — Trachten Shirts & Blouses",
        "Studio Sample 16 — Trachten Shirts & Blouses",
      ],
      {
        fabric: "100% cotton poplin / voile",
        gsm: "120–140 GSM",
        moq: "50 pieces per design",
        leadTime: "35–45 days",
        sizes: "XS–XXXL slim & regular",
        colors: "White, ecru, pastel, check, custom",
        packaging: "Folded + poly bag + insert",
        certs: "OEKO-TEX 100",
        customization: "Embroidery, fabric swap, branded trims",
      },
      ["Pure cotton", "Embroidered detail", "Slim & regular fit", "Sizes XS–XXXL"],
      (n) =>
        `${n} — clean trachten shirt cut in pure cotton with embroidered alpine detailing and refined construction, ready for trachten boutique retail.`,
    ),

    buildSub(
      "bavarian",
      "trachten-jackets",
      "Trachten Jackets & Vests",
      "Loden wool jackets, waistcoats and traditional outerwear",
      [
        "Loden Wool Trachten Jacket", "Embroidered Linen Vest", "Heritage Janker Jacket", "Charcoal Trachten Blazer",
        "Stand-Collar Wool Jacket", "Hunter Green Janker", "Bone-Button Trachten Vest", "Hand-Felted Loden Coat",
        "Slim Janker Jacket", "Reversible Trachten Vest",
        "Editor's Selection 11 — Trachten Jackets & Vests",
        "Signature Edition 12 — Trachten Jackets & Vests",
        "Heritage Cut 13 — Trachten Jackets & Vests",
        "Atelier Limited 14 — Trachten Jackets & Vests",
        "Studio Sample 15 — Trachten Jackets & Vests",
      ],
      {
        fabric: "Pure loden wool, linen waistcoat",
        gsm: "320 GSM wool / 240 GSM linen",
        moq: "50 pieces per design",
        leadTime: "50 days",
        sizes: "S–XXXL slim & regular",
        colors: "Loden green, charcoal, cream, custom",
        packaging: "Hanger pack + suit bag",
        certs: "OEKO-TEX, RWS wool option",
        customization: "Custom embroidery, horn buttons, branded lining",
      },
      ["Loden wool", "Horn buttons", "Tonal embroidery", "Heritage cut"],
      (n) =>
        `${n} — refined formal trachten outerwear in pure loden wool with horn buttons, tonal embroidery and a heritage silhouette for premium menswear.`,
    ),

    buildSub(
      "bavarian",
      "kids-trachten",
      "Kids Trachten",
      "Pint-sized lederhosen, dirndl and trachten shirts for children",
      [
        "Kids Heritage Lederhosen", "Boys Short Lederhosen", "Girls Mini Dirndl", "Toddler Lederhosen Set",
        "Kids Embroidered Dirndl", "Boys Trachten Shirt", "Girls Puff-Sleeve Blouse", "Junior Trachten Vest",
        "Baby Lederhosen Romper", "Kids Festival Dirndl", "Boys Janker Jacket", "Family-Match Dirndl",
        "Editor's Selection 13 — Kids Trachten",
        "Signature Edition 14 — Kids Trachten",
        "Heritage Cut 15 — Kids Trachten",
        "Atelier Limited 16 — Kids Trachten",
        "Studio Sample 17 — Kids Trachten",
      ],
      {
        fabric: "Soft kid suede 0.9–1.1mm + cotton check shirt",
        gsm: "Suede equivalent 180 GSM",
        moq: "50 sets per design",
        leadTime: "40 days",
        sizes: "Ages 2–14 (EU 92–164)",
        colors: "Brown, tan, black, pastel + custom",
        packaging: "Branded gift box",
        certs: "OEKO-TEX 100, CPSIA compliant",
        customization: "Embroidery, sizing, branded tags",
      },
      ["Soft kid suede", "Adjustable straps", "Floral embroidery", "Ages 2–14"],
      (n) =>
        `${n} — durable kids trachten built to survive festival season while looking heirloom-grade.`,
    ),

    buildSub(
      "bavarian",
      "bavarian-accessories",
      "Bavarian Accessories",
      "Trachten belts, hats, socks, ties and complete kit accessories",
      [
        "Embroidered Charivari Belt", "Trachten Wool Hat", "Bavarian Knee Socks", "Heritage Trachten Tie",
        "Edelweiss Pocket Square", "Alpine Leather Belt", "Trachten Pouch Bag", "Hunter Feather Pin",
        "Wool Calf Warmers", "Trachten Suspenders",
        "Editor's Selection 11 — Bavarian Accessories",
        "Signature Edition 12 — Bavarian Accessories",
        "Heritage Cut 13 — Bavarian Accessories",
        "Atelier Limited 14 — Bavarian Accessories",
        "Studio Sample 15 — Bavarian Accessories",
      ],
      {
        fabric: "Mixed: leather, wool, cotton",
        gsm: "Varies by item",
        moq: "50 pieces per item",
        leadTime: "30–40 days",
        sizes: "One-size & graded",
        colors: "Heritage palette + custom",
        packaging: "Poly bag + hangtag",
        certs: "OEKO-TEX 100",
        customization: "Embroidery, branded hardware",
      },
      ["Heritage materials", "Hand finishing", "Custom branding"],
      (n) =>
        `${n} — authentic trachten accessory to complete the look, finished with traditional materials and custom branding options.`,
    ),
  ],
};

// ──────────────────────────────────────────────────────────────
// SPORTSWEAR
// ──────────────────────────────────────────────────────────────
const sportswear: CategoryGroup = {
  slug: "sportswear",
  name: "Sportswear",
  subs: [
    buildSub(
      "sportswear",
      "performance-tees",
      "Performance T-Shirts",
      "Moisture-wicking tees in technical knits",
      [
        "Micro-Mesh Performance Tee", "Cotton-Touch Poly Tee", "Compression Base Tee", "Long-Sleeve Performance Tee",
        "Raglan Training Tee", "Reflective Print Running Tee", "Quick-Dry V-Neck Tee", "Pro-Athletic Crew Tee",
        "Eco-Recycled Poly Tee", "Mesh-Panel Training Tee", "Sleeveless Performance Tee", "Team Captain Polo Tee",
        "Editor's Selection 13 — Performance T-Shirts",
        "Signature Edition 14 — Performance T-Shirts",
        "Heritage Cut 15 — Performance T-Shirts",
        "Atelier Limited 16 — Performance T-Shirts",
        "Studio Sample 17 — Performance T-Shirts",
      ],
      {
        fabric: "100% polyester micro-mesh / poly-spandex",
        gsm: "140–160 GSM",
        moq: "50 per color",
        leadTime: "25–35 days",
        sizes: "XS–4XL + youth",
        colors: "Unlimited via sublimation",
        packaging: "Individual poly bag + carton",
        certs: "OEKO-TEX 100, WFSGI compliant",
        customization: "Full sublimation, names, numbers, sponsor logos",
      },
      ["140 GSM micro-mesh", "Moisture wicking", "Full sublimation ready", "MOQ 50"],
      (n) => `${n} — engineered for athletes with breathable knit construction, flat seams and unlimited custom print capability.`,
    ),

    buildSub(
      "sportswear",
      "hoodies-sweats",
      "Hoodies & Sweatshirts",
      "Heavyweight fleece hoodies and tech sweats",
      [
        "Heavyweight 380 GSM Hoodie", "Tech Fleece Pullover", "Zip-Front Performance Hoodie", "Cropped Training Hoodie",
        "Sherpa-Lined Hoodie", "Oversized Gym Hoodie", "Half-Zip Tech Sweatshirt", "Compression Underlayer Hoodie",
        "Recycled Fleece Hoodie", "Reflective-Detail Hoodie",
        "Editor's Selection 11 — Hoodies & Sweatshirts",
        "Signature Edition 12 — Hoodies & Sweatshirts",
        "Heritage Cut 13 — Hoodies & Sweatshirts",
        "Atelier Limited 14 — Hoodies & Sweatshirts",
        "Studio Sample 15 — Hoodies & Sweatshirts",
      ],
      {
        fabric: "Poly-cotton fleece / tech fleece",
        gsm: "320–380 GSM",
        moq: "50 per color",
        leadTime: "35–45 days",
        sizes: "XS–3XL",
        colors: "Custom Pantone",
        packaging: "Poly bag + hangtag",
        certs: "OEKO-TEX 100",
        customization: "Embroidery, screen, puff, custom drawcords",
      },
      ["380 GSM fleece", "Brushed-back warmth", "Custom branding", "MOQ 50"],
      (n) => `${n} — heavyweight construction with brushed interior, double-needle stitching and full custom branding for team and training programs.`,
    ),

    buildSub(
      "sportswear",
      "tracksuits",
      "Tracksuits & Warmups",
      "Complete tracksuit programs in technical knits",
      [
        "Pro Tricot Tracksuit", "Slim-Fit Performance Tracksuit", "Reflective Piping Tracksuit", "Half-Zip Warmup Set",
        "Hooded Tech Tracksuit", "Two-Tone Color-Block Tracksuit", "Recycled Poly Tracksuit", "Youth Training Tracksuit",
        "Premium Velour Tracksuit", "Bonded-Seam Pro Tracksuit",
        "Editor's Selection 11 — Tracksuits & Warmups",
        "Signature Edition 12 — Tracksuits & Warmups",
        "Heritage Cut 13 — Tracksuits & Warmups",
        "Atelier Limited 14 — Tracksuits & Warmups",
        "Studio Sample 15 — Tracksuits & Warmups",
      ],
      {
        fabric: "94% polyester / 6% spandex tricot",
        gsm: "260 GSM",
        moq: "50 sets per color",
        leadTime: "35–45 days",
        sizes: "XS–3XL",
        colors: "Black, navy, grey, custom Pantone",
        packaging: "Poly bag + master carton",
        certs: "OEKO-TEX 100",
        customization: "Embroidery, heat transfer, reflective trims, custom hardware",
      },
      ["Tricot poly-spandex", "Bonded seams", "Hidden zip pockets", "Custom Pantone"],
      (n) => `${n} — tailored tracksuit with bonded seams, hidden zip pockets and reflective piping engineered for warmup, training and lifestyle wear.`,
    ),

    buildSub(
      "sportswear",
      "team-jerseys",
      "Team Jerseys",
      "Soccer, basketball, rugby, cricket & American football kits",
      [
        "Pro Sublimated Soccer Jersey", "Basketball Tournament Jersey", "Rugby League Jersey", "Cricket Test Jersey",
        "American Football Jersey", "Hockey Practice Jersey", "Volleyball Team Jersey", "Handball Match Jersey",
        "E-Sports Pro Jersey", "Lacrosse Reversible Jersey", "Baseball Stretch Jersey", "Goalkeeper Padded Jersey",
        "Editor's Selection 13 — Team Jerseys",
        "Signature Edition 14 — Team Jerseys",
        "Heritage Cut 15 — Team Jerseys",
        "Atelier Limited 16 — Team Jerseys",
        "Studio Sample 17 — Team Jerseys",
      ],
      {
        fabric: "Polyester interlock / tricot mesh",
        gsm: "140–180 GSM",
        moq: "50 sets per design",
        leadTime: "25–35 days",
        sizes: "Youth S – Adult 4XL",
        colors: "Unlimited via sublimation",
        packaging: "Individual poly bag + team carton",
        certs: "OEKO-TEX 100, WFSGI",
        customization: "Full sublimation, names, numbers, sponsor placements",
      },
      ["Tournament-grade fabric", "Full sublimation", "Custom crest & numbers", "MOQ 50"],
      (n) => `${n} — league-approved kit with reinforced stitching and tournament-grade construction. Fully customizable colorways and graphics.`,
    ),

    buildSub(
      "sportswear",
      "shorts-bottoms",
      "Shorts & Bottoms",
      "Training shorts, joggers and compression bottoms",
      [
        "Pro Training Shorts", "Compression Long Tights", "Joggers with Zip Pockets", "Basketball Mesh Shorts",
        "Soccer Match Shorts", "Cycling Bib Shorts", "Yoga Performance Leggings", "Reflective Running Shorts",
        "Cargo Training Joggers", "Heavyweight Fleece Joggers",
        "Editor's Selection 11 — Shorts & Bottoms",
        "Signature Edition 12 — Shorts & Bottoms",
        "Heritage Cut 13 — Shorts & Bottoms",
        "Atelier Limited 14 — Shorts & Bottoms",
        "Studio Sample 15 — Shorts & Bottoms",
      ],
      {
        fabric: "Poly-spandex / cotton-fleece",
        gsm: "180–280 GSM",
        moq: "50 per color",
        leadTime: "30–40 days",
        sizes: "XS–3XL",
        colors: "Custom Pantone",
        packaging: "Poly bag",
        certs: "OEKO-TEX 100",
        customization: "Embroidery, sublimation, custom waistband",
      },
      ["Performance fabrics", "Flat-lock seams", "Custom waistband", "MOQ 50"],
      (n) => `${n} — performance bottoms with flat-lock seams, moisture-wicking finish and branded waistband options.`,
    ),

    buildSub(
      "sportswear",
      "compression-gym",
      "Compression & Gym Wear",
      "Second-skin compression and premium gym apparel",
      [
        "Compression Long-Sleeve Top", "Compression Tank", "Compression Shorts", "Targeted Support Tights",
        "Sauna Sweat Suit", "Stringer Gym Tank", "Cropped Sports Bra Top", "Seamless Training Set",
        "Editor's Selection 9 — Compression & Gym Wear",
        "Signature Edition 10 — Compression & Gym Wear",
        "Heritage Cut 11 — Compression & Gym Wear",
        "Atelier Limited 12 — Compression & Gym Wear",
        "Studio Sample 13 — Compression & Gym Wear",
      ],
      {
        fabric: "80% nylon / 20% spandex 4-way stretch",
        gsm: "200 GSM",
        moq: "50 per color",
        leadTime: "30–40 days",
        sizes: "XS–2XL men & women",
        colors: "Black, navy, charcoal, custom",
        packaging: "Poly bag + hangtag",
        certs: "OEKO-TEX 100, bluesign option",
        customization: "Sublimation panels, branded waistband, custom prints",
      },
      ["4-way stretch", "Anti-microbial finish", "Flatlock stitching", "MOQ 50"],
      (n) => `${n} — second-skin compression piece with targeted muscle support and moisture-wicking anti-microbial finish.`,
    ),
  ],
};

// ──────────────────────────────────────────────────────────────
// LEATHERWEAR
// ──────────────────────────────────────────────────────────────
const leatherwear: CategoryGroup = {
  slug: "leatherwear",
  name: "Leatherwear",
  subs: [
    buildSub(
      "leatherwear",
      "biker-jackets",
      "Biker & Moto Jackets",
      "Asymmetric biker and racer-cut moto jackets",
      [
        "Classic Asymmetric Biker", "Slim Racer Biker", "Studded Punk Biker", "Quilted Shoulder Biker",
        "Café Racer Jacket", "Double-Rider Biker", "Vintage Distressed Biker", "Cropped Women's Biker",
        "Long Belted Biker", "Cognac Leather Biker", "Oxblood Statement Biker", "Black Lambskin Moto",
        "Editor's Selection 13 — Biker & Moto Jackets",
        "Signature Edition 14 — Biker & Moto Jackets",
        "Heritage Cut 15 — Biker & Moto Jackets",
        "Atelier Limited 16 — Biker & Moto Jackets",
        "Studio Sample 17 — Biker & Moto Jackets",
      ],
      {
        fabric: "Full-grain cowhide / napa lambskin",
        gsm: "Leather 1.0–1.2mm",
        moq: "50 pieces per design",
        leadTime: "55–70 days",
        sizes: "XS–3XL slim & regular",
        colors: "Black, brown, cognac, oxblood, custom",
        packaging: "Hanger pack + suit bag + branded box",
        certs: "LWG certified leather, REACH compliant",
        customization: "Custom hardware, embossing, branded labels & lining",
      },
      ["Full-grain cowhide", "YKK metal hardware", "Quilted lining", "Hand-finished"],
      (n) => `${n} — iconic biker silhouette in premium leather with YKK metal hardware, quilted satin lining and hand-finished edges.`,
    ),

    buildSub(
      "leatherwear",
      "bomber-jackets",
      "Bomber & Aviator Jackets",
      "Classic bomber, MA-1 and aviator silhouettes in premium leather",
      [
        "Classic Leather Bomber", "MA-1 Aviator Bomber", "Shearling Aviator", "Hooded Leather Bomber",
        "Cognac Suede Bomber", "Two-Tone Color-Block Bomber", "Cropped Aviator", "B-3 Heritage Aviator",
        "Souvenir Embroidered Bomber", "Quilted Down Bomber",
        "Editor's Selection 11 — Bomber & Aviator Jackets",
        "Signature Edition 12 — Bomber & Aviator Jackets",
        "Heritage Cut 13 — Bomber & Aviator Jackets",
        "Atelier Limited 14 — Bomber & Aviator Jackets",
        "Studio Sample 15 — Bomber & Aviator Jackets",
      ],
      {
        fabric: "Cowhide 1.0mm, quilted poly lining, rib-knit trims",
        gsm: "Leather equivalent 360 GSM",
        moq: "50 pieces",
        leadTime: "55–70 days",
        sizes: "S–3XL",
        colors: "Cognac, black, navy, olive",
        packaging: "Suit bag + branded box",
        certs: "LWG leather, REACH",
        customization: "Custom embroidery, patches, branded hardware",
      },
      ["Cognac cowhide", "Rib-knit cuffs & hem", "Two-way YKK zip", "Quilted lining"],
      (n) => `${n} — heritage bomber silhouette in rich leather with ribbed cuffs and hem, two-way zipper and quilted interior.`,
    ),

    buildSub(
      "leatherwear",
      "leather-pants",
      "Leather Pants & Shorts",
      "Tailored leather trousers and shorts in supple lambskin",
      [
        "Tailored Leather Trousers", "Skinny Leather Pants", "Wide-Leg Leather Pants", "Cropped Leather Pants",
        "Five-Pocket Leather Jeans", "Leather Cargo Pants", "Leather Bermuda Shorts", "High-Waist Leather Pants",
        "Bonded Stretch Leather Pants", "Side-Stripe Leather Pants",
        "Editor's Selection 11 — Leather Pants & Shorts",
        "Signature Edition 12 — Leather Pants & Shorts",
        "Heritage Cut 13 — Leather Pants & Shorts",
        "Atelier Limited 14 — Leather Pants & Shorts",
        "Studio Sample 15 — Leather Pants & Shorts",
      ],
      {
        fabric: "Lambskin 0.6–0.8mm, bonded jersey lining",
        gsm: "Leather equivalent 240 GSM",
        moq: "50 pieces per design",
        leadTime: "50 days",
        sizes: "Waist 26–40, custom inseam",
        colors: "Black, brown, custom",
        packaging: "Hanger pack",
        certs: "LWG leather",
        customization: "Custom rise, leg shape, hardware",
      },
      ["Supple lambskin", "Bonded lining", "Five-pocket cut", "Custom inseam"],
      (n) => `${n} — tailored leather bottoms in supple lambskin with bonded interior lining and contoured seams that drape like fabric.`,
    ),

    buildSub(
      "leatherwear",
      "leather-shirts-vests",
      "Leather Shirts & Vests",
      "Refined leather shirts, vests and waistcoats",
      [
        "Leather Western Shirt", "Sleeveless Leather Vest", "Quilted Leather Gilet", "Suede Shirt-Jacket",
        "Snap-Front Leather Shirt", "Long Leather Vest", "Tailored Leather Waistcoat", "Studded Leather Vest",
        "Editor's Selection 9 — Leather Shirts & Vests",
        "Signature Edition 10 — Leather Shirts & Vests",
        "Heritage Cut 11 — Leather Shirts & Vests",
        "Atelier Limited 12 — Leather Shirts & Vests",
        "Studio Sample 13 — Leather Shirts & Vests",
      ],
      {
        fabric: "Lambskin / cowhide / suede",
        gsm: "Leather 0.7–1.0mm",
        moq: "50 pieces",
        leadTime: "45–60 days",
        sizes: "XS–3XL",
        colors: "Black, brown, cognac, custom",
        packaging: "Hanger pack + suit bag",
        certs: "LWG leather",
        customization: "Custom embroidery, embossing, branded trims",
      },
      ["Premium hide", "Tailored fit", "Custom hardware", "MOQ 50"],
      (n) => `${n} — premium leather layering piece tailored for sharp wardrobe building and statement retail floors.`,
    ),

    buildSub(
      "leatherwear",
      "long-coats",
      "Long Leather Coats",
      "Trench, overcoats and dramatic long leather silhouettes",
      [
        "Belted Leather Trench", "Knee-Length Leather Coat", "Maxi Leather Coat", "Wool-Leather Combo Trench",
        "Shearling-Collar Coat", "Double-Breasted Leather Coat", "Hooded Long Leather Coat",
        "Editor's Selection 8 — Long Leather Coats",
        "Signature Edition 9 — Long Leather Coats",
        "Heritage Cut 10 — Long Leather Coats",
        "Atelier Limited 11 — Long Leather Coats",
        "Studio Sample 12 — Long Leather Coats",
      ],
      {
        fabric: "Cowhide 1.2mm / lambskin 0.9mm",
        gsm: "Leather equivalent 380 GSM",
        moq: "50 pieces per design",
        leadTime: "60–75 days",
        sizes: "XS–3XL",
        colors: "Black, cognac, taupe, custom",
        packaging: "Suit bag + branded box",
        certs: "LWG leather, REACH",
        customization: "Custom lining, hardware, embroidery",
      },
      ["Full-grain leather", "Tailored long cut", "Premium lining", "Statement silhouette"],
      (n) => `${n} — dramatic long leather coat built on a tailored block with premium lining and luxury hardware throughout.`,
    ),

    buildSub(
      "leatherwear",
      "leather-accessories",
      "Leather Accessories",
      "Gloves, belts, wallets and small leather goods",
      [
        "Driving Leather Gloves", "Lined Touchscreen Gloves", "Premium Leather Belt", "Heritage Buckle Belt",
        "Bifold Leather Wallet", "Card Holder", "Leather Suspenders", "Travel Document Holder",
        "Editor's Selection 9 — Leather Accessories",
        "Signature Edition 10 — Leather Accessories",
        "Heritage Cut 11 — Leather Accessories",
        "Atelier Limited 12 — Leather Accessories",
        "Studio Sample 13 — Leather Accessories",
      ],
      {
        fabric: "Full-grain cowhide / napa",
        gsm: "Leather 1.0–1.4mm",
        moq: "50 pieces per item",
        leadTime: "35–45 days",
        sizes: "Graded",
        colors: "Black, brown, cognac, oxblood",
        packaging: "Branded box",
        certs: "LWG leather",
        customization: "Embossing, hardware, packaging",
      },
      ["Premium leather", "Custom hardware", "Branded packaging"],
      (n) => `${n} — refined leather accessory crafted with custom hardware and gift-ready packaging for premium retail.`,
    ),
  ],
};

// ──────────────────────────────────────────────────────────────
// STREETWEAR
// ──────────────────────────────────────────────────────────────
const streetwear: CategoryGroup = {
  slug: "streetwear",
  name: "Streetwear",
  subs: [
    buildSub(
      "streetwear",
      "oversized-tees",
      "Heavyweight & Oversized Tees",
      "Boxy heavyweight tees and graphic streetwear shirts",
      [
        "240 GSM Boxy Tee", "300 GSM Heavyweight Tee", "Acid-Wash Boxy Tee", "Vintage-Wash Skater Tee",
        "Drop-Shoulder Long Tee", "Cropped Boxy Tee", "Mockneck Heavyweight Tee", "Long-Sleeve Boxy Tee",
        "Tie-Dye Statement Tee", "Pigment-Dye Vintage Tee", "Pocket Boxy Tee", "Mesh-Panel Streetwear Tee",
        "Editor's Selection 13 — Heavyweight & Oversized Tees",
        "Signature Edition 14 — Heavyweight & Oversized Tees",
        "Heritage Cut 15 — Heavyweight & Oversized Tees",
        "Atelier Limited 16 — Heavyweight & Oversized Tees",
        "Studio Sample 17 — Heavyweight & Oversized Tees",
      ],
      {
        fabric: "100% combed ring-spun cotton",
        gsm: "240–300 GSM",
        moq: "50 per color",
        leadTime: "25–35 days",
        sizes: "XS–3XL unisex",
        colors: "Garment dyed, any Pantone",
        packaging: "Folded + poly bag + hangtag",
        certs: "OEKO-TEX 100, BCI cotton option",
        customization: "Puff, screen, DTG, embroidery, custom labels",
      },
      ["240 GSM combed cotton", "Boxy oversized fit", "Ribbed collar", "Puff print ready"],
      (n) => `${n} — heavyweight cotton tee with boxy silhouette, ribbed collar and full custom branding capability.`,
    ),

    buildSub(
      "streetwear",
      "hoodies-sweats",
      "Hoodies & Sweatshirts",
      "Garment-dyed, heavyweight fleece hoodies",
      [
        "500 GSM Drop-Shoulder Hoodie", "Acid-Wash Heavy Hoodie", "Cropped Streetwear Hoodie", "Zip-Up Heavy Hoodie",
        "Quarter-Zip Heavy Sweatshirt", "Tie-Dye Festival Hoodie", "Embroidered Logo Hoodie", "Puff-Print Statement Hoodie",
        "Pigment-Dye Vintage Hoodie", "Half-Zip Mockneck Hoodie",
        "Editor's Selection 11 — Hoodies & Sweatshirts",
        "Signature Edition 12 — Hoodies & Sweatshirts",
        "Heritage Cut 13 — Hoodies & Sweatshirts",
        "Atelier Limited 14 — Hoodies & Sweatshirts",
        "Studio Sample 15 — Hoodies & Sweatshirts",
      ],
      {
        fabric: "100% cotton French terry, brushed back",
        gsm: "500 GSM",
        moq: "50 pieces per color (low MOQ start-up program)",
        leadTime: "30–40 days",
        sizes: "XS–3XL unisex",
        colors: "Garment dye — any Pantone",
        packaging: "Poly bag + branded hangtag",
        certs: "OEKO-TEX 100, BCI cotton option",
        customization: "Puff print, embroidery, screen, DTG, custom trims",
      },
      ["500 GSM French terry", "Drop shoulder cut", "Garment dyed", "Custom prints"],
      (n) => `${n} — 500 GSM brushed-back fleece hoodie with boxy drop-shoulder fit and self-fabric drawcords. Foundation of any premium streetwear drop.`,
    ),

    buildSub(
      "streetwear",
      "cargo-pants",
      "Cargo Pants & Bottoms",
      "Technical cargos, joggers and utility bottoms",
      [
        "Heavy Ripstop Cargo Pant", "Slim Tapered Cargo Pant", "Wide-Leg Cargo Pant", "Multi-Pocket Utility Cargo",
        "Drawstring Joggers", "Acid-Wash Streetwear Pant", "Heavyweight Sweatpants", "Cargo Bermuda Shorts",
        "Side-Stripe Track Pant", "Parachute Pant",
        "Editor's Selection 11 — Cargo Pants & Bottoms",
        "Signature Edition 12 — Cargo Pants & Bottoms",
        "Heritage Cut 13 — Cargo Pants & Bottoms",
        "Atelier Limited 14 — Cargo Pants & Bottoms",
        "Studio Sample 15 — Cargo Pants & Bottoms",
      ],
      {
        fabric: "100% cotton ripstop or poly-cotton blend",
        gsm: "320 GSM",
        moq: "50 pieces per color",
        leadTime: "35–45 days",
        sizes: "Waist 28–40",
        colors: "Black, olive, sand, custom",
        packaging: "Folded + poly bag",
        certs: "OEKO-TEX 100",
        customization: "Custom pockets, trims, embroidery, branded hardware",
      },
      ["Ripstop cotton", "Utility pockets", "Elastic ankle cuffs", "Garment washed"],
      (n) => `${n} — technical bottom with utility side pockets, tonal hardware and adjustable elastic hem. Modern utility for forward-thinking labels.`,
    ),

    buildSub(
      "streetwear",
      "outerwear-jackets",
      "Outerwear & Jackets",
      "Varsity, work, puffer and windbreaker jackets",
      [
        "Varsity Letterman Jacket", "Heavyweight Work Jacket", "Reflective Windbreaker", "Puffer Statement Jacket",
        "Coach's Jacket", "Bomber Streetwear Jacket", "Anorak Half-Zip Jacket", "Quilted Liner Jacket",
        "Carpenter Chore Coat", "Cropped Puffer Vest",
        "Editor's Selection 11 — Outerwear & Jackets",
        "Signature Edition 12 — Outerwear & Jackets",
        "Heritage Cut 13 — Outerwear & Jackets",
        "Atelier Limited 14 — Outerwear & Jackets",
        "Studio Sample 15 — Outerwear & Jackets",
      ],
      {
        fabric: "Melton wool, nylon, cotton twill",
        gsm: "320–700 GSM depending on style",
        moq: "50 pieces per design",
        leadTime: "45–60 days",
        sizes: "S–3XL",
        colors: "Custom Pantone",
        packaging: "Hanger pack + branded box",
        certs: "OEKO-TEX, LWG leather (varsity sleeves)",
        customization: "Chenille patches, embroidery, custom snaps & lining",
      },
      ["Heavyweight outerwear", "Custom patches", "Branded hardware", "MOQ 50"],
      (n) => `${n} — heavyweight outerwear with luxury construction details and full custom branding capability.`,
    ),

    buildSub(
      "streetwear",
      "denim",
      "Denim Program",
      "Selvedge, raw and washed denim jeans, jackets and shorts",
      [
        "Selvedge Raw Denim Jean", "Loose Baggy Jean", "Slim Tapered Jean", "Carpenter Denim Pant",
        "Washed Denim Trucker Jacket", "Oversized Denim Chore Coat", "Denim Cargo Shorts", "Wide-Leg Denim Pant",
        "Editor's Selection 9 — Denim Program",
        "Signature Edition 10 — Denim Program",
        "Heritage Cut 11 — Denim Program",
        "Atelier Limited 12 — Denim Program",
        "Studio Sample 13 — Denim Program",
      ],
      {
        fabric: "100% cotton selvedge denim",
        gsm: "12–14 oz",
        moq: "50 pieces per design",
        leadTime: "45–55 days",
        sizes: "Waist 28–40",
        colors: "Indigo, washed, black, custom",
        packaging: "Folded + poly bag",
        certs: "OEKO-TEX 100",
        customization: "Custom washes, hardware, embroidery, labels",
      },
      ["Selvedge denim", "Custom wash program", "Branded hardware", "MOQ 50"],
      (n) => `${n} — denim built on a true selvedge mill program with custom wash development and full branding control.`,
    ),

    buildSub(
      "streetwear",
      "headwear",
      "Headwear & Accessories",
      "Trucker caps, beanies, bucket hats and bags",
      [
        "Five-Panel Trucker Cap", "Dad Cap", "Bucket Hat", "Beanie",
        "Snapback Pro Cap", "Tote Bag", "Crossbody Sling", "Reflective Bum Bag",
        "Editor's Selection 9 — Headwear & Accessories",
        "Signature Edition 10 — Headwear & Accessories",
        "Heritage Cut 11 — Headwear & Accessories",
        "Atelier Limited 12 — Headwear & Accessories",
        "Studio Sample 13 — Headwear & Accessories",
      ],
      {
        fabric: "Cotton twill, mesh, fleece",
        gsm: "Varies by item",
        moq: "50 pieces per item",
        leadTime: "30–40 days",
        sizes: "One-size adjustable",
        colors: "Custom Pantone",
        packaging: "Poly bag + hangtag",
        certs: "OEKO-TEX 100",
        customization: "Embroidery, woven patches, custom hardware",
      },
      ["Custom embroidery", "Branded hardware", "Color matched"],
      (n) => `${n} — streetwear-grade headwear or accessory finished with custom embroidery, branded hardware and color-matched packaging.`,
    ),
  ],
};

// ──────────────────────────────────────────────────────────────
// LEISUREWEAR
// ──────────────────────────────────────────────────────────────
const leisurewear: CategoryGroup = {
  slug: "leisurewear",
  name: "Leisurewear",
  subs: [
    buildSub(
      "leisurewear",
      "polo-shirts",
      "Polo Shirts",
      "Premium pique and jersey polo shirts",
      [
        "Pima Cotton Pique Polo", "Mercerized Jersey Polo", "Long-Sleeve Polo", "Half-Zip Polo",
        "Striped Heritage Polo", "Performance Stretch Polo", "Slim-Fit Tailored Polo", "Tipped Collar Polo",
        "Linen Blend Polo", "Womens Fitted Polo",
        "Editor's Selection 11 — Polo Shirts",
        "Signature Edition 12 — Polo Shirts",
        "Heritage Cut 13 — Polo Shirts",
        "Atelier Limited 14 — Polo Shirts",
        "Studio Sample 15 — Polo Shirts",
      ],
      {
        fabric: "100% pima cotton pique / mercerized jersey",
        gsm: "200–220 GSM",
        moq: "50 pieces per color",
        leadTime: "30–40 days",
        sizes: "XS–3XL",
        colors: "Custom Pantone",
        packaging: "Folded + poly bag",
        certs: "OEKO-TEX 100, BCI cotton",
        customization: "Embroidery, tonal buttons, custom collars",
      },
      ["Pima cotton pique", "Mercerized finish", "Tonal buttons", "MOQ 50"],
      (n) => `${n} — refined polo cut in mercerized cotton with tonal hardware and a luxury hand feel.`,
    ),

    buildSub(
      "leisurewear",
      "chinos-trousers",
      "Chinos & Trousers",
      "Tailored chinos and lifestyle trousers",
      [
        "Slim-Fit Chino", "Pleated Chino", "Cropped Chino", "Wide-Leg Trouser",
        "Drawstring Beach Pant", "Linen Summer Trouser", "Five-Pocket Stretch Chino", "Tapered Suit Pant",
        "Editor's Selection 9 — Chinos & Trousers",
        "Signature Edition 10 — Chinos & Trousers",
        "Heritage Cut 11 — Chinos & Trousers",
        "Atelier Limited 12 — Chinos & Trousers",
        "Studio Sample 13 — Chinos & Trousers",
      ],
      {
        fabric: "Pima cotton twill / cotton-linen blend",
        gsm: "220–280 GSM",
        moq: "50 pieces per color",
        leadTime: "35–45 days",
        sizes: "Waist 28–40",
        colors: "Natural, navy, olive, custom",
        packaging: "Folded + poly bag",
        certs: "OEKO-TEX 100",
        customization: "Custom rise, fit, hardware, labels",
      },
      ["Premium cotton twill", "Tailored construction", "Pre-shrunk finish"],
      (n) => `${n} — tailored leisure trouser built on a refined block with premium cotton twill construction.`,
    ),

    buildSub(
      "leisurewear",
      "knitwear",
      "Knitwear & Cardigans",
      "Cashmere blends, merino and cotton-modal knits",
      [
        "Cashmere Crew Sweater", "Merino V-Neck", "Cotton-Modal Knit Cardigan", "Shawl Collar Cardigan",
        "Cable Knit Sweater", "Ribbed Knit Mockneck", "Lightweight Linen Knit", "Oversized Boyfriend Cardigan",
        "Editor's Selection 9 — Knitwear & Cardigans",
        "Signature Edition 10 — Knitwear & Cardigans",
        "Heritage Cut 11 — Knitwear & Cardigans",
        "Atelier Limited 12 — Knitwear & Cardigans",
        "Studio Sample 13 — Knitwear & Cardigans",
      ],
      {
        fabric: "Cashmere blends, merino wool, cotton-modal",
        gsm: "240–320 GSM",
        moq: "50 per color",
        leadTime: "40–55 days",
        sizes: "XS–XL",
        colors: "Oatmeal, ivory, sage, custom",
        packaging: "Tissue + recycled box",
        certs: "OEKO-TEX 100, RWS / GOTS options",
        customization: "Custom buttons, labels, packaging",
      },
      ["Premium yarn", "Tonal trims", "Coconut shell buttons", "MOQ 50"],
      (n) => `${n} — premium knit built on a refined yarn program with tonal trims and luxury finishing.`,
    ),

    buildSub(
      "leisurewear",
      "linen-shirts",
      "Linen Shirts & Blouses",
      "Pure linen and linen-blend lifestyle shirts",
      [
        "Pure Linen Shirt", "Linen-Cotton Camp Collar", "Long-Sleeve Linen Tunic", "Linen Beach Shirt",
        "Embroidered Linen Shirt", "Drawstring Linen Top", "Cuban Collar Linen Shirt",
        "Editor's Selection 8 — Linen Shirts & Blouses",
        "Signature Edition 9 — Linen Shirts & Blouses",
        "Heritage Cut 10 — Linen Shirts & Blouses",
        "Atelier Limited 11 — Linen Shirts & Blouses",
        "Studio Sample 12 — Linen Shirts & Blouses",
      ],
      {
        fabric: "100% French linen",
        gsm: "120–160 GSM",
        moq: "50 per color",
        leadTime: "35–45 days",
        sizes: "XS–3XL",
        colors: "Natural, white, sage, custom",
        packaging: "Folded + tissue + poly bag",
        certs: "OEKO-TEX 100, European Flax certified",
        customization: "Embroidery, custom collars, labels",
      },
      ["Pure French linen", "Breathable weave", "Pre-washed softness"],
      (n) => `${n} — pure linen shirt with breathable weave and pre-washed hand feel for premium resort and lifestyle programs.`,
    ),

    buildSub(
      "leisurewear",
      "loungewear-sets",
      "Loungewear Sets",
      "Cashmere blend, organic cotton and bamboo lounge co-ords",
      [
        "Cashmere Blend Lounge Set", "Organic Cotton Joggers & Crew", "Bamboo Tee & Shorts Set", "Knit Cardigan & Pant Co-ord",
        "Recycled Fleece Lounge Set", "Modal-Cotton Sleep Set", "Hemp-Cotton Festival Set", "Premium Velour Lounge Set",
        "Editor's Selection 9 — Loungewear Sets",
        "Signature Edition 10 — Loungewear Sets",
        "Heritage Cut 11 — Loungewear Sets",
        "Atelier Limited 12 — Loungewear Sets",
        "Studio Sample 13 — Loungewear Sets",
      ],
      {
        fabric: "Cashmere blend / organic cotton / bamboo viscose",
        gsm: "180–320 GSM",
        moq: "50 sets per color",
        leadTime: "35–50 days",
        sizes: "XS–3XL unisex",
        colors: "Natural palette, custom",
        packaging: "Tissue + branded box",
        certs: "GOTS, OEKO-TEX 100, FSC bamboo",
        customization: "Embroidery, screen, custom trims",
      },
      ["Sustainable fabrics", "Co-ord styling", "Pre-shrunk", "MOQ 50"],
      (n) => `${n} — elevated lounge co-ord built on sustainable fabric programs with luxury finishing.`,
    ),
  ],
};

// ──────────────────────────────────────────────────────────────
// NIGHTWEAR
// ──────────────────────────────────────────────────────────────
const nightwear: CategoryGroup = {
  slug: "nightwear",
  name: "Nightwear",
  subs: [
    buildSub(
      "nightwear",
      "silk-pajamas",
      "Silk Pajama Sets",
      "Mulberry silk and silk-blend pajama programs",
      [
        "19mm Mulberry Silk Pajama", "22mm Heavy Silk Pajama", "Lace-Trim Silk Pajama", "Piped Silk Pajama Set",
        "Long-Sleeve Silk Pajama", "Short-Sleeve Summer Silk Set", "Monogram Silk Pajama", "Bridal Silk Pajama",
        "Floral-Print Silk Pajama", "Two-Tone Silk Pajama",
        "Editor's Selection 11 — Silk Pajama Sets",
        "Signature Edition 12 — Silk Pajama Sets",
        "Heritage Cut 13 — Silk Pajama Sets",
        "Atelier Limited 14 — Silk Pajama Sets",
        "Studio Sample 15 — Silk Pajama Sets",
      ],
      {
        fabric: "100% mulberry silk charmeuse",
        gsm: "Silk equivalent 90–110 GSM",
        moq: "50 sets per color",
        leadTime: "45–55 days",
        sizes: "XS–XL",
        colors: "Champagne, blush, navy, black, custom",
        packaging: "Silk pouch + branded gift box",
        certs: "OEKO-TEX 100, GOTS silk option",
        customization: "Monogram embroidery, custom piping & packaging",
      },
      ["19mm mulberry silk", "Mother-of-pearl buttons", "French seams", "Gift-ready box"],
      (n) => `${n} — true luxury sleep piece in mulberry silk with notched lapel, mother-of-pearl buttons and delicate finishing.`,
    ),

    buildSub(
      "nightwear",
      "robes",
      "Robes & Kimonos",
      "Satin, silk and modal robe programs",
      [
        "Satin Mid-Length Robe", "Pure Silk Robe", "Modal-Cotton Robe", "Kimono-Sleeve Robe",
        "Bridal White Robe", "Hooded Spa Robe", "Waffle-Knit Robe", "Embroidered Heritage Robe",
        "Editor's Selection 9 — Robes & Kimonos",
        "Signature Edition 10 — Robes & Kimonos",
        "Heritage Cut 11 — Robes & Kimonos",
        "Atelier Limited 12 — Robes & Kimonos",
        "Studio Sample 13 — Robes & Kimonos",
      ],
      {
        fabric: "Heavy satin / silk satin / modal",
        gsm: "Varies",
        moq: "50 pieces per color",
        leadTime: "30–40 days",
        sizes: "XS–2XL + plus",
        colors: "11 standard + custom Pantone",
        packaging: "Tissue + branded box",
        certs: "OEKO-TEX 100",
        customization: "Monogram, lace trim, bridal/event packaging",
      },
      ["Premium drape", "Self-tie belt", "Inseam pockets", "Custom colors"],
      (n) => `${n} — luxe layering piece in premium fabric with self-tie belt, inseam pockets and gift-ready packaging.`,
    ),

    buildSub(
      "nightwear",
      "nightgowns",
      "Nightgowns & Slips",
      "Lace-trim slips, gowns and intimate nightdresses",
      [
        "Lace-Trim Modal Slip", "Bias-Cut Silk Slip", "Long Lace Nightgown", "Spaghetti-Strap Nightgown",
        "Empire-Waist Cotton Nightgown", "Boudoir Lace Slip", "Plus-Size Lace Gown", "Bridal Nightgown",
        "Editor's Selection 9 — Nightgowns & Slips",
        "Signature Edition 10 — Nightgowns & Slips",
        "Heritage Cut 11 — Nightgowns & Slips",
        "Atelier Limited 12 — Nightgowns & Slips",
        "Studio Sample 13 — Nightgowns & Slips",
      ],
      {
        fabric: "Tencel modal / silk charmeuse / cotton voile",
        gsm: "100–140 GSM",
        moq: "50 pieces per color",
        leadTime: "35–45 days",
        sizes: "XS–2XL",
        colors: "Black, ivory, dusty rose, custom",
        packaging: "Tissue + branded box",
        certs: "OEKO-TEX 100, Tencel certified",
        customization: "Custom lace placement, embroidery, packaging",
      },
      ["Premium drape", "Stretch lace bodice", "Adjustable straps", "Machine washable"],
      (n) => `${n} — bias-cut nightdress with stretch lace and adjustable straps designed to drape on every silhouette.`,
    ),

    buildSub(
      "nightwear",
      "cotton-pajamas",
      "Cotton & Modal Pajamas",
      "Brushed cotton, flannel and modal pajama sets",
      [
        "Brushed Cotton Pajama", "Flannel Check Pajama", "Modal Stretch Pajama", "Jersey Knit Pajama Set",
        "Long-Sleeve Cotton Pajama", "Short-Sleeve Cotton Pajama", "Hooded Lounge Pajama", "Heritage Stripe Pajama",
        "Editor's Selection 9 — Cotton & Modal Pajamas",
        "Signature Edition 10 — Cotton & Modal Pajamas",
        "Heritage Cut 11 — Cotton & Modal Pajamas",
        "Atelier Limited 12 — Cotton & Modal Pajamas",
        "Studio Sample 13 — Cotton & Modal Pajamas",
      ],
      {
        fabric: "100% brushed cotton flannel / Tencel modal",
        gsm: "140–200 GSM",
        moq: "50 sets per color",
        leadTime: "35–45 days",
        sizes: "XS–3XL unisex",
        colors: "Check, stripe, solid — any custom",
        packaging: "Poly bag + branded box",
        certs: "OEKO-TEX 100, BCI cotton",
        customization: "Custom prints, embroidery, branded trims",
      },
      ["Brushed cotton flannel", "Contrast piping", "Notch collar", "Unisex sizing"],
      (n) => `${n} — classic notched-collar pajama in soft brushed cotton with contrast piping and chest pocket.`,
    ),

    buildSub(
      "nightwear",
      "loungewear-sleep",
      "Sleep Loungewear",
      "Soft sleep tees, shorts and lounge sets",
      [
        "Modal Sleep Tee & Short Set", "Bamboo Sleep Cami & Short", "Cotton Sleep Crew & Pant", "Henley Sleep Set",
        "Cropped Sleep Tank & Short", "Long-Sleeve Sleep Henley Set", "Modal Sleep Romper", "Plus-Size Sleep Set",
        "Editor's Selection 9 — Sleep Loungewear",
        "Signature Edition 10 — Sleep Loungewear",
        "Heritage Cut 11 — Sleep Loungewear",
        "Atelier Limited 12 — Sleep Loungewear",
        "Studio Sample 13 — Sleep Loungewear",
      ],
      {
        fabric: "Tencel modal / bamboo viscose / cotton jersey",
        gsm: "140–180 GSM",
        moq: "50 sets per color",
        leadTime: "30–40 days",
        sizes: "XS–3XL",
        colors: "Soft neutrals + custom",
        packaging: "Tissue + branded box",
        certs: "OEKO-TEX 100, Tencel certified",
        customization: "Embroidery, monogram, branded trims",
      },
      ["Soft hand feel", "Breathable knit", "Tonal trims", "MOQ 50"],
      (n) => `${n} — soft sleep set in breathable knit with tonal trims and gift-ready packaging.`,
    ),

    buildSub(
      "nightwear",
      "kids-sleepwear",
      "Kids Sleepwear",
      "Soft, safety-tested sleepwear for children",
      [
        "Kids Cotton Pajama Set", "Toddler Sleep Romper", "Kids Hooded Onesie", "Boys Long-Sleeve Pajama",
        "Girls Lace-Trim Nightgown", "Kids Flannel Pajama", "Kids Bamboo Sleep Set", "Family-Match Pajama",
        "Editor's Selection 9 — Kids Sleepwear",
        "Signature Edition 10 — Kids Sleepwear",
        "Heritage Cut 11 — Kids Sleepwear",
        "Atelier Limited 12 — Kids Sleepwear",
        "Studio Sample 13 — Kids Sleepwear",
      ],
      {
        fabric: "100% combed cotton / organic cotton",
        gsm: "160–200 GSM",
        moq: "50 sets per design",
        leadTime: "35–45 days",
        sizes: "Ages 2–14",
        colors: "Pastel + custom",
        packaging: "Branded box",
        certs: "OEKO-TEX 100, CPSIA compliant, flame-retardant option",
        customization: "Custom prints, embroidery, branded packaging",
      },
      ["Safety-tested", "Soft combed cotton", "Adjustable hem", "Ages 2–14"],
      (n) => `${n} — safety-tested kids sleepwear in soft combed cotton with flame-retardant compliance options.`,
    ),
  ],
};

export const CATALOG: CategoryGroup[] = [
  bavarian,
  leatherwear,
  sportswear,
  streetwear,
  leisurewear,
  nightwear,
];

export const findGroup = (slug: string) => CATALOG.find((g) => g.slug === slug);
