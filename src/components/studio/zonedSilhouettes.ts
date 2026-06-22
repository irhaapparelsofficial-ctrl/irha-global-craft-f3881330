// Multi-zone, interactive silhouettes. Each silhouette declares named zones,
// optional toggle components, and a printable area for artwork layers.

import type { SilhouetteKey } from "./catalogSchema";

export type ZonePath = {
  id: string;            // unique within silhouette: "body", "left-sleeve", "hood"...
  label: string;         // human-readable: "Body", "Left Sleeve"
  d: string;             // SVG path
  shadow?: number;       // 0..1 darkness overlay for visual depth
};

export type ToggleComponent = {
  id: string;            // "hood", "pocket"
  label: string;
  default: boolean;
  zones: ZonePath[];     // additional zones rendered when on
};

export type ZonedProduct = {
  viewBox: string;
  zones: ZonePath[];
  toggles?: ToggleComponent[];
  printArea: { x: number; y: number; w: number; h: number };
};

// ---------- HOODIE ----------
const HOODIE: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 80, y: 90, w: 80, h: 90 },
  zones: [
    {
      id: "left-sleeve",
      label: "Left Sleeve",
      d: "M55 60 L25 95 L18 180 Q18 190 28 190 L52 188 L62 110 Z",
    },
    {
      id: "right-sleeve",
      label: "Right Sleeve",
      d: "M185 60 L215 95 L222 180 Q222 190 212 190 L188 188 L178 110 Z",
    },
    {
      id: "body",
      label: "Body",
      d: "M62 60 L90 35 L150 35 L178 60 L182 110 L182 250 Q182 260 172 260 L68 260 Q58 260 58 250 L58 110 Z",
    },
    {
      id: "left-cuff",
      label: "Left Cuff",
      d: "M22 180 L52 188 L50 200 L20 192 Z",
      shadow: 0.15,
    },
    {
      id: "right-cuff",
      label: "Right Cuff",
      d: "M218 180 L188 188 L190 200 L220 192 Z",
      shadow: 0.15,
    },
    {
      id: "hem",
      label: "Hem",
      d: "M58 248 L182 248 L182 260 Q182 264 178 264 L62 264 Q58 264 58 260 Z",
      shadow: 0.18,
    },
  ],
  toggles: [
    {
      id: "hood",
      label: "Hood",
      default: true,
      zones: [
        {
          id: "hood",
          label: "Hood",
          d: "M90 35 Q120 5 150 35 Q145 70 120 78 Q95 70 90 35 Z",
        },
      ],
    },
    {
      id: "pocket",
      label: "Kangaroo Pocket",
      default: true,
      zones: [
        {
          id: "pocket",
          label: "Pocket",
          d: "M85 175 L155 175 L160 220 L80 220 Z",
          shadow: 0.1,
        },
      ],
    },
  ],
};

// ---------- TEE ----------
const TEE: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 85, y: 80, w: 70, h: 90 },
  zones: [
    { id: "left-sleeve", label: "Left Sleeve", d: "M58 60 L28 90 L42 115 L70 95 Z" },
    { id: "right-sleeve", label: "Right Sleeve", d: "M182 60 L212 90 L198 115 L170 95 Z" },
    {
      id: "body",
      label: "Body",
      d: "M70 50 L95 30 Q120 48 145 30 L170 50 L172 250 Q172 260 162 260 L78 260 Q68 260 68 250 Z",
    },
    {
      id: "collar",
      label: "Collar",
      d: "M95 30 Q120 48 145 30 Q138 55 120 56 Q102 55 95 30 Z",
      shadow: 0.25,
    },
  ],
};

// ---------- POLO ----------
const POLO: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 85, y: 85, w: 70, h: 90 },
  zones: [
    { id: "left-sleeve", label: "Left Sleeve", d: "M58 60 L28 92 L44 120 L72 100 Z" },
    { id: "right-sleeve", label: "Right Sleeve", d: "M182 60 L212 92 L196 120 L168 100 Z" },
    {
      id: "body",
      label: "Body",
      d: "M70 50 L95 32 L108 42 L132 42 L145 32 L170 50 L172 250 Q172 260 162 260 L78 260 Q68 260 68 250 Z",
    },
    {
      id: "collar",
      label: "Collar",
      d: "M95 32 L108 42 L132 42 L145 32 Q138 22 120 22 Q102 22 95 32 Z",
      shadow: 0.22,
    },
    {
      id: "placket",
      label: "Placket",
      d: "M115 42 L125 42 L125 90 L115 90 Z",
      shadow: 0.3,
    },
  ],
};

// ---------- JERSEY ----------
const JERSEY: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 85, y: 80, w: 70, h: 100 },
  zones: [
    { id: "left-sleeve", label: "Left Sleeve", d: "M58 58 L28 90 L40 118 L70 98 Z" },
    { id: "right-sleeve", label: "Right Sleeve", d: "M182 58 L212 90 L200 118 L170 98 Z" },
    {
      id: "body",
      label: "Body",
      d: "M70 48 L95 28 Q120 50 145 28 L170 48 L172 250 Q172 260 162 260 L78 260 Q68 260 68 250 Z",
    },
    {
      id: "collar",
      label: "V-Collar",
      d: "M95 28 Q120 50 145 28 L132 30 L120 56 L108 30 Z",
      shadow: 0.25,
    },
    {
      id: "side-panels",
      label: "Side Panels",
      d: "M68 80 L78 80 L78 250 L68 250 Z M162 80 L172 80 L172 250 L162 250 Z",
      shadow: 0.15,
    },
  ],
};

// ---------- LEATHER JACKET ----------
const LEATHER_JACKET: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 145, y: 105, w: 28, h: 28 },
  zones: [
    { id: "left-sleeve", label: "Left Sleeve", d: "M55 55 L22 95 L18 200 Q18 215 32 215 L55 212 L65 110 Z" },
    { id: "right-sleeve", label: "Right Sleeve", d: "M185 55 L218 95 L222 200 Q222 215 208 215 L185 212 L175 110 Z" },
    {
      id: "body-left",
      label: "Left Body Panel",
      d: "M65 55 L92 30 L118 50 L118 260 L72 260 Q62 260 62 250 L58 110 Z",
    },
    {
      id: "body-right",
      label: "Right Body Panel",
      d: "M175 55 L148 30 L122 50 L122 260 L168 260 Q178 260 178 250 L182 110 Z",
    },
    {
      id: "collar",
      label: "Lapel Collar",
      d: "M92 30 L118 50 L108 90 L88 75 Z M148 30 L122 50 L132 90 L152 75 Z",
      shadow: 0.3,
    },
    {
      id: "left-cuff",
      label: "Left Cuff",
      d: "M20 200 L58 215 L55 230 L18 218 Z",
      shadow: 0.2,
    },
    {
      id: "right-cuff",
      label: "Right Cuff",
      d: "M220 200 L182 215 L185 230 L222 218 Z",
      shadow: 0.2,
    },
  ],
  toggles: [
    {
      id: "chest-pocket",
      label: "Chest Pocket",
      default: false,
      zones: [{ id: "chest-pocket", label: "Chest Pocket", d: "M72 110 L100 110 L100 130 L72 130 Z", shadow: 0.18 }],
    },
  ],
};

// ---------- LEDERHOSEN ----------
const LEDERHOSEN: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 95, y: 60, w: 50, h: 35 },
  zones: [
    {
      id: "bib",
      label: "Front Bib",
      d: "M85 50 L155 50 L162 105 L78 105 Z",
    },
    {
      id: "left-strap",
      label: "Left Strap",
      d: "M85 50 L62 22 L55 18 L60 48 Z",
    },
    {
      id: "right-strap",
      label: "Right Strap",
      d: "M155 50 L178 22 L185 18 L180 48 Z",
    },
    {
      id: "body",
      label: "Shorts Body",
      d: "M58 105 L182 105 L188 195 Q188 215 175 215 L140 215 L128 120 L112 120 L100 215 L65 215 Q52 215 52 195 Z",
    },
    {
      id: "left-pocket",
      label: "Left Pocket",
      d: "M62 130 L92 130 L94 175 L60 175 Z",
      shadow: 0.18,
    },
    {
      id: "right-pocket",
      label: "Right Pocket",
      d: "M148 130 L178 130 L180 175 L146 175 Z",
      shadow: 0.18,
    },
  ],
  toggles: [
    {
      id: "cross-strap",
      label: "Cross Strap",
      default: true,
      zones: [
        {
          id: "cross-strap",
          label: "Cross Strap",
          d: "M85 70 L155 85 L155 92 L85 78 Z",
          shadow: 0.1,
        },
      ],
    },
  ],
};

// ---------- DIRNDL ----------
const DIRNDL: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 95, y: 55, w: 50, h: 45 },
  zones: [
    {
      id: "bodice",
      label: "Bodice",
      d: "M80 45 L120 32 L160 45 L165 110 L75 110 Z",
    },
    {
      id: "skirt",
      label: "Skirt",
      d: "M75 110 L165 110 L195 260 L45 260 Z",
    },
    {
      id: "apron",
      label: "Apron",
      d: "M95 110 L145 110 L162 250 L78 250 Z",
      shadow: 0.05,
    },
    {
      id: "blouse-sleeve-l",
      label: "Left Blouse Sleeve",
      d: "M80 45 L55 70 L70 95 L92 80 Z",
      shadow: 0.05,
    },
    {
      id: "blouse-sleeve-r",
      label: "Right Blouse Sleeve",
      d: "M160 45 L185 70 L170 95 L148 80 Z",
      shadow: 0.05,
    },
  ],
};

// ---------- TRACK PANT ----------
const TRACK_PANT: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 130, y: 100, w: 28, h: 28 },
  zones: [
    {
      id: "waistband",
      label: "Waistband",
      d: "M65 25 L175 25 L178 40 L62 40 Z",
      shadow: 0.25,
    },
    {
      id: "left-leg",
      label: "Left Leg",
      d: "M62 40 L120 40 L120 130 L116 260 Q116 268 108 268 L82 268 Q74 268 72 260 Z",
    },
    {
      id: "right-leg",
      label: "Right Leg",
      d: "M120 40 L178 40 L168 260 Q166 268 158 268 L132 268 Q124 268 124 260 L120 130 Z",
    },
  ],
  toggles: [
    {
      id: "side-stripes",
      label: "Side Stripes",
      default: true,
      zones: [
        {
          id: "side-stripes",
          label: "Side Stripes",
          d: "M70 40 L78 260 L82 260 L74 40 Z M170 40 L162 260 L158 260 L166 40 Z",
          shadow: 0.0,
        },
      ],
    },
  ],
};

// ---------- ROBE ----------
const ROBE: ZonedProduct = {
  viewBox: "0 0 240 280",
  printArea: { x: 85, y: 90, w: 70, h: 80 },
  zones: [
    { id: "left-sleeve", label: "Left Sleeve", d: "M55 55 L20 95 L35 130 L65 105 Z" },
    { id: "right-sleeve", label: "Right Sleeve", d: "M185 55 L220 95 L205 130 L175 105 Z" },
    {
      id: "left-panel",
      label: "Left Panel",
      d: "M65 50 L100 32 L120 50 L120 260 L72 260 Q62 260 62 250 Z",
    },
    {
      id: "right-panel",
      label: "Right Panel",
      d: "M175 50 L140 32 L120 50 L120 260 L168 260 Q178 260 178 250 Z",
    },
    {
      id: "belt",
      label: "Belt",
      d: "M55 150 L185 150 L185 165 L55 165 Z",
      shadow: 0.4,
    },
  ],
};

// ---------- Registry ----------
export const ZONED: Record<SilhouetteKey, ZonedProduct> = {
  hoodie: HOODIE,
  tee: TEE,
  polo: POLO,
  jersey: JERSEY,
  leatherJacket: LEATHER_JACKET,
  lederhosen: LEDERHOSEN,
  dirndl: DIRNDL,
  trackPant: TRACK_PANT,
  robe: ROBE,
};
