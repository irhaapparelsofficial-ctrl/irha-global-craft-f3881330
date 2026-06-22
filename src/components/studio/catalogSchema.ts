// Central catalog schema — drives the entire Product Configurator dynamically.
// Add a new category here and the Studio renders it automatically.

import {
  Shirt,
  Layers,
  Scissors,
  Mountain,
  Activity,
  Sparkles,
  Sofa,
  Moon,
  type LucideIcon,
} from "lucide-react";

export type StyleOption = { id: string; label: string };
export type StyleGroup = { id: string; label: string; multi?: boolean; options: StyleOption[] };

export type Fabric = {
  id: string;
  label: string;
  spec: string; // GSM, oz, weave, leather grade etc.
  feel: string;
  price: number; // surcharge per unit (USD)
};

// ZoneMaterial shares Fabric's shape and is used per-component.
export type ZoneMaterial = Fabric;

export type AddOn = {
  id: string;
  label: string;
  cost: number; // USD surcharge per unit
  group: "branding" | "hardware" | "finish";
};

export type ColorSwatch = { id: string; label: string; hex: string };

export type SizingScheme = {
  type: "letter" | "waist" | "numeric";
  label: string;
  sizes: string[];
  chart?: { headers: string[]; rows: string[][] };
};

export type LogoPlacement = string;

export type ProductBase = {
  id: string;
  label: string;
  desc: string;
  basePrice: number;
  silhouette: SilhouetteKey; // visual template key
  styles?: StyleGroup[]; // override category styles
  fabrics?: Fabric[]; // override category fabrics
  sizing?: SizingScheme; // override category sizing
  placements?: LogoPlacement[];
  zoneMaterials?: Record<string, ZoneMaterial[]>; // per-zone material overrides
  addOns?: AddOn[]; // override category add-ons
};

export type Category = {
  id: string;
  label: string;
  tagline: string;
  icon: LucideIcon;
  bases: ProductBase[];
  styles: StyleGroup[]; // default for category
  fabrics: Fabric[]; // primary body materials
  trims?: ZoneMaterial[]; // accent materials for collar/cuff/pocket/etc.
  colors: ColorSwatch[];
  sizing: SizingScheme;
  placements: LogoPlacement[];
  addOns?: AddOn[];
};



export type SilhouetteKey =
  | "tee"
  | "hoodie"
  | "polo"
  | "lederhosen"
  | "dirndl"
  | "jersey"
  | "leatherJacket"
  | "trackPant"
  | "robe";

// ---------- Shared palettes ----------
const STD_COLORS: ColorSwatch[] = [
  { id: "black", label: "Jet Black", hex: "#111111" },
  { id: "white", label: "Pure White", hex: "#F8F8F8" },
  { id: "navy", label: "Navy", hex: "#0F1E3D" },
  { id: "grey", label: "Heather Grey", hex: "#8A8F96" },
  { id: "royal", label: "Royal Blue", hex: "#1E40AF" },
  { id: "burgundy", label: "Burgundy", hex: "#5C1A1B" },
  { id: "forest", label: "Forest", hex: "#1F3A2E" },
  { id: "sand", label: "Sand", hex: "#C8B68A" },
];

const SPORT_COLORS: ColorSwatch[] = [
  { id: "neon", label: "Neon Yellow", hex: "#D7FF1E" },
  { id: "red", label: "Racing Red", hex: "#D62828" },
  { id: "royal", label: "Royal Blue", hex: "#1E40AF" },
  { id: "black", label: "Jet Black", hex: "#111111" },
  { id: "white", label: "Arctic White", hex: "#F8F8F8" },
  { id: "teal", label: "Teal", hex: "#0E7C7B" },
  { id: "orange", label: "Hi-Vis Orange", hex: "#F26419" },
  { id: "navy", label: "Navy", hex: "#0F1E3D" },
];

const LEATHER_COLORS: ColorSwatch[] = [
  { id: "black", label: "Jet Black", hex: "#0E0E0E" },
  { id: "chestnut", label: "Chestnut", hex: "#6B3A1F" },
  { id: "cognac", label: "Cognac", hex: "#9A5A2B" },
  { id: "oxblood", label: "Oxblood", hex: "#4A1213" },
  { id: "tan", label: "Tan", hex: "#B07A4B" },
  { id: "olive", label: "Olive", hex: "#4F5230" },
];

const BAVARIAN_COLORS: ColorSwatch[] = [
  { id: "graphite", label: "Graphite", hex: "#2B2B2B" },
  { id: "antiquebrown", label: "Antique Brown", hex: "#5C3A21" },
  { id: "loden", label: "Loden Green", hex: "#3E5641" },
  { id: "stone", label: "Stone", hex: "#9E927A" },
  { id: "tan", label: "Hazel Tan", hex: "#A87651" },
];

// ---------- Sizing ----------
const LETTER_SIZING: SizingScheme = {
  type: "letter",
  label: "Standard Letter Sizing (cm)",
  sizes: ["S", "M", "L", "XL", "XXL"],
  chart: {
    headers: ["Size", "Chest", "Length", "Sleeve"],
    rows: [
      ["S", "96", "68", "21"],
      ["M", "102", "70", "22"],
      ["L", "108", "72", "23"],
      ["XL", "114", "74", "24"],
      ["XXL", "120", "76", "25"],
    ],
  },
};

const WAIST_SIZING: SizingScheme = {
  type: "waist",
  label: "Waist Sizing (inches)",
  sizes: ["W30", "W32", "W34", "W36", "W38", "W40", "W42"],
  chart: {
    headers: ["Size", "Waist (in)", "Inseam (in)", "Hip (in)"],
    rows: [
      ["W30", "30", "30", "38"],
      ["W32", "32", "30", "40"],
      ["W34", "34", "31", "42"],
      ["W36", "36", "31", "44"],
      ["W38", "38", "32", "46"],
      ["W40", "40", "32", "48"],
      ["W42", "42", "33", "50"],
    ],
  },
};

const NUMERIC_SIZING: SizingScheme = {
  type: "numeric",
  label: "EU Numeric Sizing",
  sizes: ["44", "46", "48", "50", "52", "54", "56"],
  chart: {
    headers: ["EU Size", "Chest (cm)", "Waist (cm)"],
    rows: [
      ["44", "88", "76"],
      ["46", "92", "80"],
      ["48", "96", "84"],
      ["50", "100", "88"],
      ["52", "104", "92"],
      ["54", "110", "98"],
      ["56", "116", "104"],
    ],
  },
};

// ---------- Catalog ----------
export const CATALOG: Category[] = [
  // ============== STREETWEAR ==============
  {
    id: "streetwear",
    label: "Streetwear",
    tagline: "T-shirts, hoodies & everyday essentials",
    icon: Shirt,
    colors: STD_COLORS,
    sizing: LETTER_SIZING,
    placements: ["Left Chest", "Center Chest", "Full Back", "Sleeve"],
    bases: [
      { id: "crew", label: "Crewneck Tee", desc: "Classic round neck", basePrice: 6.5, silhouette: "tee" },
      { id: "vneck", label: "V-Neck Tee", desc: "Tailored V-cut collar", basePrice: 6.9, silhouette: "tee" },
      { id: "oversized", label: "Oversized Tee", desc: "Drop shoulder boxy fit", basePrice: 7.8, silhouette: "tee" },
      { id: "hoodie", label: "Pullover Hoodie", desc: "Heavyweight kangaroo pocket", basePrice: 14.5, silhouette: "hoodie" },
      { id: "zip-hoodie", label: "Full-Zip Hoodie", desc: "YKK zipper, dual pockets", basePrice: 16.2, silhouette: "hoodie" },
    ],
    styles: [
      {
        id: "sleeve",
        label: "Sleeve",
        options: [
          { id: "short", label: "Short Sleeve" },
          { id: "long", label: "Long Sleeve" },
          { id: "raglan", label: "Raglan" },
        ],
      },
      {
        id: "hem",
        label: "Hem",
        options: [
          { id: "straight", label: "Straight" },
          { id: "curved", label: "Curved" },
        ],
      },
      {
        id: "fit",
        label: "Fit",
        options: [
          { id: "reg", label: "Regular" },
          { id: "slim", label: "Slim" },
          { id: "box", label: "Boxy" },
        ],
      },
    ],
    fabrics: [
      { id: "cot-180", label: "100% Cotton", spec: "180 GSM", feel: "Soft everyday weight", price: 0 },
      { id: "cot-240", label: "Heavyweight Cotton", spec: "240 GSM", feel: "Premium structured hand", price: 1.2 },
      { id: "pc-blend", label: "Poly/Cotton Blend", spec: "200 GSM", feel: "Wrinkle-resistant", price: 0.6 },
      { id: "fleece", label: "Brushed Fleece", spec: "320 GSM", feel: "Warm winter weight", price: 2.4 },
    ],
  },

  // ============== BAVARIAN ==============
  {
    id: "bavarian",
    label: "Bavarian Garments",
    tagline: "Authentic Lederhosen, Dirndls & Trachten",
    icon: Mountain,
    colors: BAVARIAN_COLORS,
    sizing: NUMERIC_SIZING,
    placements: ["Front Bib", "Side Pocket", "Back Yoke"],
    bases: [
      {
        id: "leder-knee",
        label: "Knee-Length Lederhosen",
        desc: "Traditional Bundhosen with full embroidery panels",
        basePrice: 52,
        silhouette: "lederhosen",
        sizing: WAIST_SIZING,
      },
      {
        id: "leder-short",
        label: "Short Lederhosen",
        desc: "Above-the-knee Kurze Lederhose",
        basePrice: 44,
        silhouette: "lederhosen",
        sizing: WAIST_SIZING,
      },
      {
        id: "dirndl",
        label: "Dirndl Dress",
        desc: "3-piece bodice, blouse & apron set",
        basePrice: 68,
        silhouette: "dirndl",
      },
    ],
    styles: [
      {
        id: "style",
        label: "Style Tradition",
        options: [
          { id: "classic", label: "Classic Plain" },
          { id: "embroidered", label: "Hand Embroidered" },
          { id: "deluxe", label: "Deluxe Trachten" },
        ],
      },
      {
        id: "embroidery",
        label: "Embroidery Thread",
        options: [
          { id: "natural", label: "Natural Tone" },
          { id: "green", label: "Loden Green" },
          { id: "edelweiss", label: "Edelweiss White" },
        ],
      },
      {
        id: "hardware",
        label: "Hardware",
        options: [
          { id: "horn", label: "Stag Horn Buttons" },
          { id: "brass", label: "Antique Brass" },
          { id: "bone", label: "Bone Buttons" },
        ],
      },
    ],
    fabrics: [
      { id: "goat", label: "Goat Leather (Nappa)", spec: "0.9–1.1 mm", feel: "Soft, supple, smooth grain", price: 0 },
      { id: "cow", label: "Cowhide", spec: "1.2–1.4 mm", feel: "Heavy-duty, ages beautifully", price: 4 },
      { id: "deer", label: "Deer Suede", spec: "1.0 mm", feel: "Traditional Bavarian feel", price: 8 },
      { id: "suede", label: "Goat Suede", spec: "0.9 mm", feel: "Velvety matte finish", price: 2.5 },
    ],
  },

  // ============== SPORTSWEAR ==============
  {
    id: "sportswear",
    label: "Sportswear",
    tagline: "Jerseys, training kits & performance gear",
    icon: Activity,
    colors: SPORT_COLORS,
    sizing: LETTER_SIZING,
    placements: ["Left Chest", "Center Chest", "Full Back", "Sleeve", "Shorts Leg"],
    bases: [
      { id: "jersey", label: "Match Jersey", desc: "Sublimation-ready performance jersey", basePrice: 11, silhouette: "jersey" },
      { id: "training-tee", label: "Training Tee", desc: "Lightweight mesh insert tee", basePrice: 8.5, silhouette: "tee" },
      { id: "track-pant", label: "Track Pant", desc: "Tapered fit, zip pockets", basePrice: 13, silhouette: "trackPant" },
      { id: "polo-perf", label: "Performance Polo", desc: "Moisture-wicking polo", basePrice: 10.5, silhouette: "polo" },
    ],
    styles: [
      {
        id: "neck",
        label: "Neck Type",
        options: [
          { id: "vneck", label: "V-Neck" },
          { id: "round", label: "Round Neck" },
          { id: "henley", label: "Henley" },
        ],
      },
      {
        id: "sleeve",
        label: "Sleeve",
        options: [
          { id: "set-in", label: "Set-In" },
          { id: "raglan", label: "Raglan" },
          { id: "sleeveless", label: "Sleeveless" },
        ],
      },
      {
        id: "print",
        label: "Print Method",
        options: [
          { id: "sublim", label: "Full Sublimation" },
          { id: "heat", label: "Heat Transfer" },
          { id: "screen", label: "Screen Print" },
        ],
      },
    ],
    fabrics: [
      { id: "poly", label: "100% Polyester", spec: "140 GSM", feel: "Lightweight quick-dry", price: 0 },
      { id: "interlock", label: "Interlock Knit", spec: "180 GSM", feel: "Smooth double-knit", price: 0.8 },
      { id: "drymesh", label: "Dry-Fit Mesh", spec: "160 GSM", feel: "Breathable engineered mesh", price: 1.2 },
      { id: "spandex", label: "Poly/Spandex", spec: "220 GSM", feel: "4-way stretch compression", price: 1.6 },
    ],
  },

  // ============== LEATHER WEAR ==============
  {
    id: "leather",
    label: "Leather Wear",
    tagline: "Motorcycle, fashion & utility leather",
    icon: Scissors,
    colors: LEATHER_COLORS,
    sizing: LETTER_SIZING,
    placements: ["Left Chest", "Back Panel", "Sleeve", "Collar Tab"],
    bases: [
      { id: "moto", label: "Motorcycle Jacket", desc: "Asymmetric zip, armor pockets", basePrice: 95, silhouette: "leatherJacket" },
      { id: "biker-slim", label: "Slim Biker", desc: "Tailored fashion biker", basePrice: 82, silhouette: "leatherJacket" },
      { id: "bomber", label: "Leather Bomber", desc: "Ribbed cuffs & hem", basePrice: 88, silhouette: "leatherJacket" },
    ],
    styles: [
      {
        id: "lining",
        label: "Lining",
        options: [
          { id: "polyester", label: "Polyester" },
          { id: "satin", label: "Satin" },
          { id: "quilted", label: "Quilted Thermal" },
        ],
      },
      {
        id: "hardware",
        label: "Hardware",
        options: [
          { id: "ykk-silver", label: "YKK Silver" },
          { id: "ykk-black", label: "YKK Matte Black" },
          { id: "antique", label: "Antique Brass" },
        ],
      },
      {
        id: "protection",
        label: "Protection",
        options: [
          { id: "ce1", label: "CE Level 1 Armor" },
          { id: "ce2", label: "CE Level 2 Armor" },
          { id: "none", label: "Fashion (no armor)" },
        ],
      },
    ],
    fabrics: [
      { id: "cow-full", label: "Cowhide — Full Grain", spec: "1.2–1.4 mm", feel: "Top-tier durability", price: 0 },
      { id: "goat-nappa", label: "Goat Nappa", spec: "0.8–1.0 mm", feel: "Soft, lightweight fashion", price: 4 },
      { id: "buff", label: "Buffalo Leather", spec: "1.4–1.6 mm", feel: "Rugged textured grain", price: 6 },
      { id: "suede-cow", label: "Cow Suede", spec: "1.1 mm", feel: "Matte velvety hand", price: 3 },
    ],
  },

  // ============== LEISURE WEAR ==============
  {
    id: "leisure",
    label: "Leisure Wear",
    tagline: "Loungewear, joggers & lifestyle sets",
    icon: Sofa,
    colors: STD_COLORS,
    sizing: LETTER_SIZING,
    placements: ["Left Chest", "Thigh", "Back Yoke"],
    bases: [
      { id: "jogger", label: "Tapered Jogger", desc: "Cuffed leisure jogger", basePrice: 12, silhouette: "trackPant" },
      { id: "lounge-hoodie", label: "Lounge Hoodie", desc: "Brushed-back fleece", basePrice: 15, silhouette: "hoodie" },
      { id: "lounge-tee", label: "Lounge Tee", desc: "Modal-blend everyday tee", basePrice: 7.5, silhouette: "tee" },
    ],
    styles: [
      {
        id: "fit",
        label: "Fit",
        options: [
          { id: "relax", label: "Relaxed" },
          { id: "tapered", label: "Tapered" },
          { id: "wide", label: "Wide Leg" },
        ],
      },
      {
        id: "waist",
        label: "Waistband",
        options: [
          { id: "elastic", label: "Elastic Drawcord" },
          { id: "ribbed", label: "Ribbed" },
        ],
      },
    ],
    fabrics: [
      { id: "french", label: "French Terry", spec: "260 GSM", feel: "Soft loop-back", price: 0 },
      { id: "modal", label: "Modal Cotton Blend", spec: "200 GSM", feel: "Silky drape", price: 1.5 },
      { id: "fleece-soft", label: "Brushed Fleece", spec: "320 GSM", feel: "Plush winter weight", price: 2.2 },
    ],
  },

  // ============== NIGHTWEAR ==============
  {
    id: "nightwear",
    label: "Nightwear",
    tagline: "Pajama sets, robes & sleepwear",
    icon: Moon,
    colors: STD_COLORS,
    sizing: LETTER_SIZING,
    placements: ["Left Chest", "Back Yoke", "Pocket"],
    bases: [
      { id: "pj-set", label: "Pajama Set", desc: "Button shirt + pants", basePrice: 14, silhouette: "tee" },
      { id: "robe", label: "Satin Robe", desc: "Wrap-front with belt", basePrice: 18, silhouette: "robe" },
      { id: "nightshirt", label: "Nightshirt", desc: "Long-line sleep shirt", basePrice: 11, silhouette: "robe" },
    ],
    styles: [
      {
        id: "collar",
        label: "Collar",
        options: [
          { id: "notch", label: "Notch Lapel" },
          { id: "shawl", label: "Shawl Collar" },
          { id: "round", label: "Round Neck" },
        ],
      },
      {
        id: "trim",
        label: "Trim",
        options: [
          { id: "piping", label: "Contrast Piping" },
          { id: "lace", label: "Lace Detail" },
          { id: "none", label: "Clean Edge" },
        ],
      },
    ],
    fabrics: [
      { id: "satin", label: "Charmeuse Satin", spec: "19 mm", feel: "Lustrous, cool drape", price: 0 },
      { id: "cot-poplin", label: "Cotton Poplin", spec: "120 GSM", feel: "Crisp, breathable", price: 0.4 },
      { id: "modal-silk", label: "Modal/Silk Blend", spec: "140 GSM", feel: "Liquid-soft luxury", price: 2.8 },
      { id: "flannel", label: "Brushed Flannel", spec: "180 GSM", feel: "Warm cozy winter", price: 1.2 },
    ],
  },
];

// ---------- Add-On defaults ----------
const DEFAULT_ADDONS: AddOn[] = [
  { id: "embroid-chest", label: "Chest Embroidery", cost: 2.5, group: "branding" },
  { id: "embroid-back", label: "Full-Back Embroidery", cost: 6.0, group: "branding" },
  { id: "heavy-print", label: "Heavy Plastisol Print", cost: 1.8, group: "branding" },
  { id: "woven-label", label: "Custom Woven Label", cost: 0.4, group: "branding" },
  { id: "extra-zip", label: "Extra Zipper Pocket", cost: 1.2, group: "hardware" },
  { id: "metal-buckle", label: "Metal Buckle Hardware", cost: 0.9, group: "hardware" },
  { id: "enzyme-wash", label: "Enzyme Wash Finish", cost: 1.0, group: "finish" },
  { id: "garment-dye", label: "Garment Dye Finish", cost: 1.4, group: "finish" },
];

const LEATHER_ADDONS: AddOn[] = [
  { id: "embroid-chest", label: "Chest Embroidery", cost: 4.5, group: "branding" },
  { id: "laser-etch", label: "Laser-Etched Logo", cost: 3.0, group: "branding" },
  { id: "metal-buckle", label: "Solid Brass Buckles", cost: 3.5, group: "hardware" },
  { id: "ykk-zips", label: "Premium YKK Zips ×3", cost: 4.0, group: "hardware" },
  { id: "armor-pockets", label: "CE Armor Pockets", cost: 6.0, group: "hardware" },
  { id: "wax-finish", label: "Hand-Waxed Finish", cost: 3.5, group: "finish" },
];

const BAVARIAN_ADDONS: AddOn[] = [
  { id: "hand-embroid", label: "Hand-Stitched Embroidery", cost: 18, group: "branding" },
  { id: "edelweiss", label: "Edelweiss Motif", cost: 8, group: "branding" },
  { id: "stag-horn", label: "Stag Horn Buttons", cost: 5, group: "hardware" },
  { id: "antler-charm", label: "Antler Charm", cost: 4, group: "hardware" },
];

// Set sensible add-on defaults per category
CATALOG.forEach((c) => {
  if (c.addOns) return;
  if (c.id === "leather") c.addOns = LEATHER_ADDONS;
  else if (c.id === "bavarian") c.addOns = BAVARIAN_ADDONS;
  else c.addOns = DEFAULT_ADDONS;
});

// ---------- Helpers ----------
export const getCategory = (id?: string | null) => CATALOG.find((c) => c.id === id) || null;
export const getBase = (cat: Category | null, id?: string | null) =>
  cat?.bases.find((b) => b.id === id) || null;
export const resolveStyles = (cat: Category, base: ProductBase) => base.styles || cat.styles;
export const resolveFabrics = (cat: Category, base: ProductBase) => base.fabrics || cat.fabrics;
export const resolveSizing = (cat: Category, base: ProductBase) => base.sizing || cat.sizing;
export const resolvePlacements = (cat: Category, base: ProductBase) =>
  base.placements || cat.placements;
export const resolveAddOns = (cat: Category, base: ProductBase) => base.addOns || cat.addOns || DEFAULT_ADDONS;

// Zones that are typically trim/accent — get the trim material list if available.
const TRIM_ZONES = new Set([
  "collar", "left-cuff", "right-cuff", "hood", "pocket", "left-pocket", "right-pocket",
  "placket", "belt", "side-panels", "cross-strap", "chest-pocket", "side-stripes",
  "hem", "blouse-sleeve-l", "blouse-sleeve-r", "waistband", "apron",
]);

export function resolveZoneMaterials(
  cat: Category,
  base: ProductBase,
  zoneId: string
): ZoneMaterial[] {
  const override = base.zoneMaterials?.[zoneId];
  if (override) return override;
  if (TRIM_ZONES.has(zoneId) && cat.trims && cat.trims.length > 0) return cat.trims;
  return resolveFabrics(cat, base);
}

