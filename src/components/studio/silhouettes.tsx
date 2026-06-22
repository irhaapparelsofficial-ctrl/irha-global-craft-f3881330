import type { SilhouetteKey } from "./catalogSchema";

type Props = {
  variant: SilhouetteKey;
  fill: string;
  stroke?: string;
};

// Generalized 2D vector templates — color fills dynamically.
export function Silhouette({ variant, fill, stroke = "rgba(0,0,0,0.25)" }: Props) {
  const sw = 0.8;
  const common = { fill, stroke, strokeWidth: sw } as const;

  switch (variant) {
    case "tee":
      return (
        <path
          {...common}
          d="M50 40 L80 20 Q100 35 120 20 L150 40 L175 65 L160 85 L145 75 L145 200 Q145 210 135 210 L65 210 Q55 210 55 200 L55 75 L40 85 L25 65 Z"
        />
      );
    case "hoodie":
      return (
        <>
          <path
            {...common}
            d="M50 50 L75 25 Q100 10 125 25 L150 50 L180 75 L165 95 L150 85 L150 205 Q150 215 140 215 L60 215 Q50 215 50 205 L50 85 L35 95 L20 75 Z"
          />
          <path d="M80 25 Q100 45 120 25 Q115 55 100 60 Q85 55 80 25 Z" fill="rgba(0,0,0,0.25)" />
          <rect x="80" y="130" width="40" height="35" rx="4" fill="none" stroke="rgba(0,0,0,0.3)" strokeWidth="1" />
        </>
      );
    case "polo":
      return (
        <>
          <path
            {...common}
            d="M50 40 L80 22 L92 35 L108 35 L120 22 L150 40 L172 65 L158 85 L145 76 L145 200 Q145 210 135 210 L65 210 Q55 210 55 200 L55 76 L42 85 L28 65 Z"
          />
          <path d="M92 35 L100 70 L108 35" fill="none" stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
          <circle cx="100" cy="50" r="1.2" fill="rgba(0,0,0,0.5)" />
          <circle cx="100" cy="62" r="1.2" fill="rgba(0,0,0,0.5)" />
        </>
      );
    case "jersey":
      return (
        <>
          <path
            {...common}
            d="M48 40 L78 22 Q100 38 122 22 L152 40 L178 65 L162 88 L148 78 L148 198 Q148 210 138 210 L62 210 Q52 210 52 198 L52 78 L38 88 L22 65 Z"
          />
          <path d="M85 22 Q100 50 115 22" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" />
          <rect x="62" y="170" width="76" height="3" fill="rgba(255,255,255,0.4)" />
          <rect x="62" y="178" width="40" height="2" fill="rgba(255,255,255,0.3)" />
        </>
      );
    case "lederhosen":
      return (
        <>
          {/* bib */}
          <path {...common} d="M75 25 L125 25 L130 75 L70 75 Z" />
          {/* straps */}
          <path {...common} d="M75 25 L60 10 L55 8 L58 22 Z" />
          <path {...common} d="M125 25 L140 10 L145 8 L142 22 Z" />
          {/* cross strap */}
          <path d="M75 50 L125 60" stroke={stroke} strokeWidth="2" fill="none" />
          {/* shorts body */}
          <path
            {...common}
            d="M55 75 L145 75 L150 145 Q150 160 140 160 L115 160 L108 90 L92 90 L85 160 L60 160 Q50 160 50 145 Z"
          />
          {/* embroidery suggestion */}
          <path d="M85 35 Q100 50 115 35" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="1" />
          <path d="M82 42 Q100 58 118 42" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="1" />
          {/* horn buttons */}
          <circle cx="85" cy="55" r="2.5" fill="rgba(60,40,20,0.9)" />
          <circle cx="115" cy="55" r="2.5" fill="rgba(60,40,20,0.9)" />
        </>
      );
    case "dirndl":
      return (
        <>
          {/* bodice */}
          <path {...common} d="M70 30 L100 20 L130 30 L135 90 L65 90 Z" />
          {/* skirt */}
          <path {...common} d="M65 90 L135 90 L160 210 L40 210 Z" />
          {/* apron */}
          <path d="M80 90 L120 90 L130 200 L70 200 Z" fill="rgba(255,255,255,0.35)" stroke={stroke} strokeWidth={sw} />
          {/* lacing */}
          <path d="M90 40 L110 50 M110 40 L90 50 M90 55 L110 65 M110 55 L90 65" stroke="rgba(255,255,255,0.7)" strokeWidth="1" fill="none" />
        </>
      );
    case "leatherJacket":
      return (
        <>
          <path
            {...common}
            d="M48 42 L78 22 L92 40 L108 40 L122 22 L152 42 L178 70 L162 92 L148 82 L148 200 Q148 212 138 212 L62 212 Q52 212 52 200 L52 82 L38 92 L22 70 Z"
          />
          {/* asymmetric zip */}
          <path d="M108 40 L95 210" stroke="rgba(180,180,180,0.95)" strokeWidth="1.8" fill="none" strokeDasharray="3 2" />
          {/* lapel */}
          <path d="M92 40 L80 90 L108 40 Z" fill="rgba(0,0,0,0.25)" />
          {/* zip pulls */}
          <circle cx="70" cy="130" r="3" fill="rgba(200,200,200,0.9)" />
          <circle cx="135" cy="130" r="3" fill="rgba(200,200,200,0.9)" />
        </>
      );
    case "trackPant":
      return (
        <>
          <path
            {...common}
            d="M65 20 L135 20 L140 80 L130 215 Q130 222 122 222 L108 222 Q102 222 100 215 L100 110 L98 215 Q96 222 90 222 L78 222 Q70 222 70 215 L60 80 Z"
          />
          {/* side stripes */}
          <path d="M68 30 L82 215" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" fill="none" />
          <path d="M132 30 L118 215" stroke="rgba(255,255,255,0.5)" strokeWidth="1.2" fill="none" />
          {/* waist */}
          <rect x="60" y="20" width="80" height="6" fill="rgba(0,0,0,0.35)" />
        </>
      );
    case "robe":
      return (
        <>
          <path
            {...common}
            d="M50 35 L85 20 L100 38 L115 20 L150 35 L175 75 L160 95 L150 88 L155 215 Q155 220 148 220 L52 220 Q45 220 45 215 L50 88 L40 95 L25 75 Z"
          />
          <path d="M85 20 L100 215" stroke={stroke} strokeWidth="1" fill="none" />
          <path d="M115 20 L100 215" stroke={stroke} strokeWidth="1" fill="none" />
          {/* belt */}
          <rect x="45" y="130" width="110" height="6" fill="rgba(0,0,0,0.45)" />
        </>
      );
    default:
      return null;
  }
}

// Placement coordinates per silhouette (where to anchor a logo).
type Coord = { x: number; y: number; w: number; h: number };
type PlacementMap = Record<string, Record<string, Coord>>;

const DEFAULT: Record<string, Coord> = {
  "Left Chest": { x: 75, y: 65, w: 20, h: 20 },
  "Center Chest": { x: 88, y: 65, w: 24, h: 24 },
  "Full Back": { x: 75, y: 90, w: 50, h: 50 },
  "Sleeve": { x: 30, y: 60, w: 18, h: 18 },
  "Back Yoke": { x: 80, y: 50, w: 40, h: 18 },
  "Pocket": { x: 78, y: 130, w: 22, h: 22 },
  "Thigh": { x: 75, y: 130, w: 22, h: 22 },
  "Shorts Leg": { x: 70, y: 130, w: 22, h: 22 },
  "Front Bib": { x: 85, y: 35, w: 30, h: 30 },
  "Side Pocket": { x: 60, y: 110, w: 20, h: 20 },
  "Back Panel": { x: 75, y: 80, w: 50, h: 50 },
  "Collar Tab": { x: 95, y: 38, w: 12, h: 12 },
};

const MAP: PlacementMap = {
  lederhosen: {
    "Front Bib": { x: 86, y: 38, w: 28, h: 28 },
    "Side Pocket": { x: 58, y: 100, w: 20, h: 20 },
    "Back Yoke": { x: 80, y: 30, w: 40, h: 20 },
  },
  dirndl: {
    "Front Bib": { x: 85, y: 45, w: 30, h: 30 },
    "Back Yoke": { x: 78, y: 35, w: 44, h: 20 },
    "Pocket": { x: 78, y: 130, w: 22, h: 22 },
  },
  trackPant: {
    "Thigh": { x: 105, y: 90, w: 22, h: 22 },
    "Shorts Leg": { x: 75, y: 140, w: 22, h: 22 },
    "Back Yoke": { x: 80, y: 30, w: 40, h: 16 },
  },
};

export function getPlacementCoord(variant: SilhouetteKey, placement: string): Coord {
  return MAP[variant]?.[placement] || DEFAULT[placement] || DEFAULT["Left Chest"];
}
