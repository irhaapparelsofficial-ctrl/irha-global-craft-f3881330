// B2B Custom Lab configuration: hubs, palettes, presets, placements.

export type HubId = "bavarian" | "textile";

export const HUBS: Record<HubId, { label: string; tagline: string; categorySlugPrefixes: string[] }> = {
  bavarian: {
    label: "Bavarian Heritage & Leather",
    tagline: "Lederhosen, Trachten, full-grain leather",
    categorySlugPrefixes: ["bavarian", "leatherwear"],
  },
  textile: {
    label: "Textile, Streetwear & Active",
    tagline: "Sportswear, streetwear, leisure & sleep",
    categorySlugPrefixes: ["sportswear", "streetwear", "leisurewear", "nightwear"],
  },
};

export type ColorSwatch = { id: string; label: string; hex: string };

export const COLORS_BY_HUB: Record<HubId, ColorSwatch[]> = {
  bavarian: [
    { id: "black",    label: "Black",    hex: "#0a0a0a" },
    { id: "charcoal", label: "Charcoal", hex: "#2b2b2b" },
    { id: "cognac",   label: "Cognac",   hex: "#7a4a23" },
    { id: "forest",   label: "Forest",   hex: "#1f3a26" },
    { id: "burgundy", label: "Burgundy", hex: "#5e1a1a" },
    { id: "natural",  label: "Natural",  hex: "#d9c9a8" },
  ],
  textile: [
    { id: "black",    label: "Black",    hex: "#0a0a0a" },
    { id: "charcoal", label: "Charcoal", hex: "#2b2b2b" },
    { id: "navy",     label: "Navy",     hex: "#1b2a4a" },
    { id: "olive",    label: "Olive",    hex: "#4b5320" },
    { id: "burgundy", label: "Burgundy", hex: "#5e1a1a" },
    { id: "white",    label: "Off-White",hex: "#ece7da" },
  ],
};

export type Placement = { id: "left-chest" | "center-back" | "right-sleeve"; label: string };

export const PLACEMENTS: Placement[] = [
  { id: "left-chest",   label: "Left Chest" },
  { id: "center-back",  label: "Center Back" },
  { id: "right-sleeve", label: "Right Sleeve" },
];

export type Preset = { id: string; label: string; description: string };

export const PRESETS_BY_HUB: Record<HubId, Preset[]> = {
  bavarian: [
    { id: "edelweiss",  label: "Edelweiss Bloom", description: "Classic alpine floral embroidery" },
    { id: "oak-leaf",   label: "Oak Leaf",        description: "Traditional Bavarian oak motif" },
    { id: "crest",      label: "Alpine Crest",    description: "Heraldic shield outline" },
    { id: "monogram",   label: "Monogram Block",  description: "Bold serif initial mark" },
    { id: "script",     label: "Heritage Script", description: "Flowing cursive lettering" },
  ],
  textile: [
    { id: "sport-block", label: "Sport Block",    description: "Bold athletic blocky letters" },
    { id: "athletic",    label: "Athletic Script",description: "Varsity-style script" },
    { id: "minimal",     label: "Minimal Mark",   description: "Clean small-scale logo placement" },
    { id: "crest",       label: "Circle Crest",   description: "Centered circular badge" },
    { id: "outline",     label: "Bold Outline",   description: "Thick outline embroidery" },
  ],
};

export const WHATSAPP_NUMBER = "923204110066";

export function buildWhatsAppLink(opts: {
  productName: string;
  color: string;
  placement: string;
  preset: string;
}) {
  const msg = `Custom Design: ${opts.productName} | Color: ${opts.color} | Logo: ${opts.placement} | Pattern: ${opts.preset} | Qty: 50+ | Please send FOB Sialkot quote.`;
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(msg)}`;
}
