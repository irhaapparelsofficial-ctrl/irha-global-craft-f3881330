/**
 * FOB price calculator — Sialkot port export rates.
 * All baseline costs USD per unit; output rounded to 2dp.
 */

export type MaterialKey =
  | "premium-cowhide"
  | "organic-cotton-320"
  | "polyester-spandex"
  | "wool-blend"
  | "linen";

export type Currency = "USD" | "EUR" | "GBP";

export const MATERIALS: { key: MaterialKey; label: string; baseCost: number }[] = [
  { key: "premium-cowhide", label: "Premium Cowhide Leather (1.2mm)", baseCost: 22.0 },
  { key: "organic-cotton-320", label: "100% Organic Cotton Fleece (320 GSM)", baseCost: 6.5 },
  { key: "polyester-spandex", label: "Polyester/Spandex Performance Blend", baseCost: 4.5 },
  { key: "wool-blend", label: "Bavarian Wool Blend (Trachten grade)", baseCost: 11.0 },
  { key: "linen", label: "Pure Linen (180 GSM)", baseCost: 5.8 },
];

export const CURRENCY_RATES: Record<Currency, number> = {
  USD: 1.0,
  EUR: 0.92,
  GBP: 0.78,
};

export const CURRENCY_SYMBOL: Record<Currency, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export interface FobInput {
  material: MaterialKey;
  quantity: number;
  trims?: { embroidery?: boolean; printing?: boolean; leatherPatch?: boolean; wovenLabel?: boolean };
  currency?: Currency;
}

export interface FobBreakdown {
  materialCost: number;
  hardwareOverhead: number;
  laborAndPackaging: number;
  trimsCost: number;
  bulkDiscount: number;       // ratio (0.85 => 15% off), 1 means none
  marginMultiplier: number;   // 1.0, 1.12, 1.25
  exportFactor: number;       // 1.10 sialkot port handling
  unitCostUSD: number;
  fob: number;                // in requested currency
  currency: Currency;
  symbol: string;
}

export function calculateFob(input: FobInput): FobBreakdown {
  const currency = input.currency ?? "USD";
  const material = MATERIALS.find((m) => m.key === input.material) ?? MATERIALS[0];

  const materialCost = material.baseCost;
  const hardwareOverhead = 1.5;
  const laborAndPackaging = 2.2;

  const trims = input.trims ?? {};
  const trimsCost =
    (trims.embroidery ? 0.45 : 0) +
    (trims.printing ? 0.3 : 0) +
    (trims.leatherPatch ? 0.6 : 0) +
    (trims.wovenLabel ? 0.15 : 0);

  let baseProductionCost = materialCost + hardwareOverhead + laborAndPackaging + trimsCost;

  const qty = Math.max(1, input.quantity);
  let bulkDiscount = 1;
  let marginMultiplier = 1.25;
  if (qty >= 1000) {
    bulkDiscount = 0.85;
    marginMultiplier = 1.0;
  } else if (qty >= 300) {
    marginMultiplier = 1.12;
  }
  baseProductionCost = baseProductionCost * bulkDiscount;

  const exportFactor = 1.1;
  const unitCostUSD = baseProductionCost * marginMultiplier * exportFactor;
  const fob = Number((unitCostUSD * CURRENCY_RATES[currency]).toFixed(2));

  return {
    materialCost,
    hardwareOverhead,
    laborAndPackaging,
    trimsCost,
    bulkDiscount,
    marginMultiplier,
    exportFactor,
    unitCostUSD: Number(unitCostUSD.toFixed(2)),
    fob,
    currency,
    symbol: CURRENCY_SYMBOL[currency],
  };
}

/** Static macro grouping for the public 2-hub homepage layout. */
export const MACRO_CATEGORIES = [
  {
    id: "leather-bavarian",
    title: "Leather & Bavarian Hub",
    description:
      "Premium cowhide lederhosen, authentic Trachten apparel & custom technical leatherwear.",
    childSlugs: ["bavarian", "leatherwear"],
  },
  {
    id: "textile-active-leisure",
    title: "Textile, Active & Leisure Hub",
    description:
      "High-performance sportswear, heavyweight streetwear, premium nightwear & luxury leisurewear.",
    childSlugs: ["sportswear", "streetwear", "nightwear", "leisurewear"],
  },
] as const;
