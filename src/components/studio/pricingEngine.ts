// Dynamic FOB pricing engine — BOM approach.
// Sums base + per-zone material upgrades + add-ons + branding,
// then applies volume-tier discount.

import type { ProductBase, ZoneMaterial, AddOn, Fabric } from "./catalogSchema";

export type LineItem = { label: string; amount: number; kind: "base" | "material" | "branding" | "hardware" | "finish" | "discount" };

export type Breakdown = {
  lineItems: LineItem[];
  subtotalUnit: number;
  discountPct: number;
  discountUnit: number;
  finalUnit: number;
  qty: number;
  total: number;
  tierLabel: string;
};

export type PricingInput = {
  base: ProductBase | null;
  // Map zoneId -> chosen material (full object) selected on canvas.
  zoneMaterials: Record<string, ZoneMaterial | undefined>;
  // Selected add-on full objects.
  addOns: AddOn[];
  // Logo/text artwork count from canvas.
  artworkLayers: number;
  // Fallback whole-product fabric selection (when no zone overrides).
  fallbackFabric?: Fabric | null;
  qty: number;
};

// Volume-tier discount matrix.
export function tierFor(qty: number): { pct: number; label: string } {
  if (qty >= 501) return { pct: 0.10, label: "500+ Pcs · 10% off" };
  if (qty >= 201) return { pct: 0.05, label: "201–500 Pcs · 5% off" };
  if (qty >= 100) return { pct: 0, label: "100–200 Pcs · Standard" };
  return { pct: 0, label: `${qty} Pcs · Below MOQ (100)` };
}

// Pretty label for grouping zone materials.
const zoneGroupLabel = (zoneId: string) => {
  const z = zoneId.replace(/-/g, " ");
  return z.charAt(0).toUpperCase() + z.slice(1);
};

export function computeQuote(input: PricingInput): Breakdown {
  const { base, zoneMaterials, addOns, artworkLayers, fallbackFabric, qty } = input;
  const items: LineItem[] = [];

  const basePrice = base?.basePrice || 0;
  items.push({ label: `Base ${base?.label || "Product"} FOB`, amount: basePrice, kind: "base" });

  // Per-zone material upgrades — only counts non-zero surcharges.
  let materialTotal = 0;
  const chosenZones = Object.entries(zoneMaterials).filter(([, m]) => !!m);
  for (const [zoneId, mat] of chosenZones) {
    if (!mat || mat.price <= 0) continue;
    materialTotal += mat.price;
    items.push({
      label: `${zoneGroupLabel(zoneId)} · ${mat.label}`,
      amount: mat.price,
      kind: "material",
    });
  }
  // If user didn't pick per-zone materials but selected a fallback fabric, add its cost once.
  if (chosenZones.length === 0 && fallbackFabric && fallbackFabric.price > 0) {
    items.push({
      label: `Fabric · ${fallbackFabric.label}`,
      amount: fallbackFabric.price,
      kind: "material",
    });
    materialTotal += fallbackFabric.price;
  }

  // Add-ons grouped by purpose.
  let brandingTotal = 0;
  let hardwareTotal = 0;
  let finishTotal = 0;
  for (const a of addOns) {
    items.push({ label: a.label, amount: a.cost, kind: a.group });
    if (a.group === "branding") brandingTotal += a.cost;
    else if (a.group === "hardware") hardwareTotal += a.cost;
    else finishTotal += a.cost;
  }

  // Artwork layers (logos + text) — flat per-piece print/embroidery handling fee.
  const artworkCost = artworkLayers * 0.6;
  if (artworkCost > 0) {
    items.push({
      label: `${artworkLayers} artwork layer(s) · placement & registration`,
      amount: artworkCost,
      kind: "branding",
    });
    brandingTotal += artworkCost;
  }

  const subtotalUnit = basePrice + materialTotal + brandingTotal + hardwareTotal + finishTotal;
  const { pct, label } = tierFor(qty);
  const discountUnit = subtotalUnit * pct;
  if (pct > 0) {
    items.push({ label: `Volume discount (${Math.round(pct * 100)}%)`, amount: -discountUnit, kind: "discount" });
  }
  const finalUnit = subtotalUnit - discountUnit;
  const total = finalUnit * qty;

  return {
    lineItems: items,
    subtotalUnit,
    discountPct: pct,
    discountUnit,
    finalUnit,
    qty,
    total,
    tierLabel: label,
  };
}
