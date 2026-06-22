import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Upload,
  Type as TypeIcon,
  Trash2,
  RotateCw,
  Layers as LayersIcon,
  Eye,
  EyeOff,
  Image as ImageIcon,
  Move,
  X,
  ToggleLeft,
  Sparkles,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { ZONED, type ZonedProduct } from "./zonedSilhouettes";
import type { ColorSwatch, SilhouetteKey, ZoneMaterial, AddOn } from "./catalogSchema";

// ---------- Types ----------
export type TextureKey = "none" | "leather" | "mesh" | "fleece" | "denim";

export type ZoneState = { colorHex: string; texture: TextureKey; materialId?: string };

type LayerBase = {
  id: string;
  type: "logo" | "text";
  x: number; // center in svg coords
  y: number;
  w: number;
  h: number;
  rotation: number; // degrees
  visible: boolean;
};
export type LogoLayer = LayerBase & { type: "logo"; src: string; name: string };
export type TextLayer = LayerBase & {
  type: "text";
  text: string;
  font: string;
  color: string;
  size: number;
  weight: number;
};
export type Layer = LogoLayer | TextLayer;

export type DesignState = {
  silhouette: SilhouetteKey;
  zones: Record<string, ZoneState>;
  toggles: Record<string, boolean>;
  layers: Layer[];
  addOnIds: string[];
};


// ---------- Textures ----------
const TEXTURES: { id: TextureKey; label: string }[] = [
  { id: "none", label: "Flat" },
  { id: "leather", label: "Leather" },
  { id: "mesh", label: "Mesh" },
  { id: "fleece", label: "Fleece" },
  { id: "denim", label: "Denim" },
];

const FONTS = [
  "Inter, sans-serif",
  "Georgia, serif",
  "'Courier New', monospace",
  "Impact, sans-serif",
  "'Brush Script MT', cursive",
];

function TexturePatterns() {
  return (
    <defs>
      <pattern id="tex-leather" patternUnits="userSpaceOnUse" width="6" height="6">
        <rect width="6" height="6" fill="currentColor" />
        <circle cx="1" cy="1" r="0.4" fill="rgba(0,0,0,0.18)" />
        <circle cx="4" cy="3" r="0.5" fill="rgba(0,0,0,0.22)" />
        <circle cx="2" cy="5" r="0.3" fill="rgba(0,0,0,0.15)" />
        <circle cx="5" cy="5.5" r="0.35" fill="rgba(255,255,255,0.08)" />
      </pattern>
      <pattern id="tex-mesh" patternUnits="userSpaceOnUse" width="4" height="4">
        <rect width="4" height="4" fill="currentColor" />
        <circle cx="2" cy="2" r="0.6" fill="rgba(0,0,0,0.35)" />
      </pattern>
      <pattern id="tex-fleece" patternUnits="userSpaceOnUse" width="5" height="5">
        <rect width="5" height="5" fill="currentColor" />
        <path d="M0 2 Q2.5 0 5 2 M0 4 Q2.5 2 5 4" stroke="rgba(255,255,255,0.12)" strokeWidth="0.5" fill="none" />
      </pattern>
      <pattern id="tex-denim" patternUnits="userSpaceOnUse" width="3" height="3">
        <rect width="3" height="3" fill="currentColor" />
        <path d="M0 0 L3 3 M-1 2 L1 4 M2 -1 L4 1" stroke="rgba(0,0,0,0.22)" strokeWidth="0.4" />
      </pattern>
    </defs>
  );
}

function zoneFill(state: ZoneState) {
  if (!state.texture || state.texture === "none") return state.colorHex;
  return `url(#tex-${state.texture})`;
}

// ---------- Component ----------
type Props = {
  silhouette: SilhouetteKey;
  palette: ColorSwatch[];
  initialColor: string;
  /** Resolver returning the material options available for a given zone. */
  getZoneMaterials?: (zoneId: string) => ZoneMaterial[];
  /** Add-ons available for this product. */
  addOns?: AddOn[];
  /** Live unit price (parent-computed) — rendered as floating badge. */
  livePriceUnit?: number;
  tierLabel?: string;
  onChange?: (state: DesignState) => void;
};

export default function InteractiveMockupCanvas({
  silhouette,
  palette,
  initialColor,
  getZoneMaterials,
  addOns = [],
  livePriceUnit,
  tierLabel,
  onChange,
}: Props) {
  const product: ZonedProduct = ZONED[silhouette];
  const svgRef = useRef<SVGSVGElement>(null);

  // ---------- State ----------
  const [zones, setZones] = useState<Record<string, ZoneState>>({});
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  const [layers, setLayers] = useState<Layer[]>([]);
  const [addOnIds, setAddOnIds] = useState<string[]>([]);
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  const [selectedLayer, setSelectedLayer] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Re-init when silhouette changes
  useEffect(() => {
    const z: Record<string, ZoneState> = {};
    product.zones.forEach((zone) => {
      z[zone.id] = { colorHex: initialColor, texture: "none" };
    });
    product.toggles?.forEach((t) =>
      t.zones.forEach((zone) => {
        z[zone.id] = { colorHex: initialColor, texture: "none" };
      })
    );
    setZones(z);
    const t: Record<string, boolean> = {};
    product.toggles?.forEach((tog) => (t[tog.id] = tog.default));
    setToggles(t);
    setAddOnIds([]);
    setSelectedZone(null);
    setSelectedLayer(null);
  }, [silhouette, initialColor, product]);

  // Expose state
  useEffect(() => {
    onChange?.({ silhouette, zones, toggles, layers, addOnIds });
  }, [silhouette, zones, toggles, layers, addOnIds, onChange]);


  // ---------- Helpers ----------
  const clientToSvg = (cx: number, cy: number) => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const pt = svg.createSVGPoint();
    pt.x = cx;
    pt.y = cy;
    const ctm = svg.getScreenCTM();
    if (!ctm) return { x: 0, y: 0 };
    const transformed = pt.matrixTransform(ctm.inverse());
    return { x: transformed.x, y: transformed.y };
  };

  const updateZone = (id: string, patch: Partial<ZoneState>) =>
    setZones((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const updateLayer = (id: string, patch: Partial<Layer>) =>
    setLayers((prev) => prev.map((l) => (l.id === id ? ({ ...l, ...patch } as Layer) : l)));

  const addLogo = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const src = e.target?.result as string;
      const pa = product.printArea;
      const newLayer: LogoLayer = {
        id: `logo-${Date.now()}`,
        type: "logo",
        src,
        name: file.name,
        x: pa.x + pa.w / 2,
        y: pa.y + pa.h / 2,
        w: Math.min(pa.w * 0.5, 40),
        h: Math.min(pa.h * 0.5, 40),
        rotation: 0,
        visible: true,
      };
      setLayers((p) => [...p, newLayer]);
      setSelectedLayer(newLayer.id);
    };
    reader.readAsDataURL(file);
  };

  const addText = () => {
    const pa = product.printArea;
    const newLayer: TextLayer = {
      id: `text-${Date.now()}`,
      type: "text",
      text: "YOUR TEXT",
      font: FONTS[0],
      color: "#ffffff",
      size: 10,
      weight: 700,
      x: pa.x + pa.w / 2,
      y: pa.y + pa.h / 2,
      w: 60,
      h: 14,
      rotation: 0,
      visible: true,
    };
    setLayers((p) => [...p, newLayer]);
    setSelectedLayer(newLayer.id);
  };

  // ---------- Layer interaction ----------
  type Drag =
    | { mode: "move"; id: string; startX: number; startY: number; lx: number; ly: number }
    | { mode: "scale"; id: string; cx: number; cy: number; startW: number; startH: number; startDist: number }
    | { mode: "rotate"; id: string; cx: number; cy: number; startAngle: number; startRot: number };

  const dragRef = useRef<Drag | null>(null);

  const onLayerPointerDown = (e: React.PointerEvent, id: string) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    setSelectedLayer(id);
    setSelectedZone(null);
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const p = clientToSvg(e.clientX, e.clientY);
    dragRef.current = { mode: "move", id, startX: p.x, startY: p.y, lx: layer.x, ly: layer.y };
  };

  const onHandlePointerDown = (
    e: React.PointerEvent,
    id: string,
    mode: "scale" | "rotate"
  ) => {
    e.stopPropagation();
    (e.target as Element).setPointerCapture(e.pointerId);
    const layer = layers.find((l) => l.id === id);
    if (!layer) return;
    const p = clientToSvg(e.clientX, e.clientY);
    if (mode === "scale") {
      const dist = Math.hypot(p.x - layer.x, p.y - layer.y);
      dragRef.current = {
        mode: "scale",
        id,
        cx: layer.x,
        cy: layer.y,
        startW: layer.w,
        startH: layer.h,
        startDist: dist || 1,
      };
    } else {
      const ang = Math.atan2(p.y - layer.y, p.x - layer.x) * (180 / Math.PI);
      dragRef.current = {
        mode: "rotate",
        id,
        cx: layer.x,
        cy: layer.y,
        startAngle: ang,
        startRot: layer.rotation,
      };
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const p = clientToSvg(e.clientX, e.clientY);
    if (d.mode === "move") {
      updateLayer(d.id, { x: d.lx + (p.x - d.startX), y: d.ly + (p.y - d.startY) });
    } else if (d.mode === "scale") {
      const dist = Math.hypot(p.x - d.cx, p.y - d.cy);
      const k = Math.max(0.2, dist / d.startDist);
      updateLayer(d.id, { w: d.startW * k, h: d.startH * k });
    } else if (d.mode === "rotate") {
      const ang = Math.atan2(p.y - d.cy, p.x - d.cx) * (180 / Math.PI);
      updateLayer(d.id, { rotation: d.startRot + (ang - d.startAngle) });
    }
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  // ---------- Render zones in order with toggle zones ----------
  const renderedZones = useMemo(() => {
    const list = [...product.zones];
    product.toggles?.forEach((t) => {
      if (toggles[t.id]) list.push(...t.zones);
    });
    return list;
  }, [product, toggles]);

  const selectedLayerObj = layers.find((l) => l.id === selectedLayer) || null;
  const selectedZoneObj = product.zones
    .concat(product.toggles?.flatMap((t) => t.zones) || [])
    .find((z) => z.id === selectedZone);

  // ---------- UI ----------
  return (
    <div className="space-y-4">
      {/* Canvas */}
      <div className="relative overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/40 to-muted/10">
        <svg
          ref={svgRef}
          viewBox={product.viewBox}
          className="block aspect-square w-full touch-none select-none"
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          onClick={() => {
            setSelectedZone(null);
            setSelectedLayer(null);
          }}
          style={{ filter: "drop-shadow(0 25px 50px rgba(0,0,0,0.25))" }}
        >
          <TexturePatterns />

          {/* Zones */}
          {renderedZones.map((zone) => {
            const state = zones[zone.id] || { colorHex: initialColor, texture: "none" as TextureKey };
            const isSelected = selectedZone === zone.id;
            return (
              <g key={zone.id}>
                <path
                  d={zone.d}
                  fill={zoneFill(state)}
                  color={state.colorHex}
                  stroke={isSelected ? "hsl(var(--primary))" : "rgba(0,0,0,0.35)"}
                  strokeWidth={isSelected ? 1.5 : 0.6}
                  className="cursor-pointer transition-all hover:opacity-95"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedZone(zone.id);
                    setSelectedLayer(null);
                  }}
                />
                {zone.shadow ? (
                  <path d={zone.d} fill={`rgba(0,0,0,${zone.shadow})`} pointerEvents="none" />
                ) : null}
              </g>
            );
          })}

          {/* Print area outline when a layer is selected or being added */}
          {selectedLayer && (
            <rect
              x={product.printArea.x}
              y={product.printArea.y}
              width={product.printArea.w}
              height={product.printArea.h}
              fill="none"
              stroke="hsl(var(--primary))"
              strokeWidth="0.6"
              strokeDasharray="3 2"
              opacity="0.5"
              pointerEvents="none"
            />
          )}

          {/* Layers */}
          {layers.map((layer) => {
            if (!layer.visible) return null;
            const isSel = layer.id === selectedLayer;
            const transform = `rotate(${layer.rotation} ${layer.x} ${layer.y})`;
            return (
              <g key={layer.id} transform={transform}>
                {layer.type === "logo" ? (
                  <image
                    href={(layer as LogoLayer).src}
                    x={layer.x - layer.w / 2}
                    y={layer.y - layer.h / 2}
                    width={layer.w}
                    height={layer.h}
                    preserveAspectRatio="xMidYMid meet"
                    className="cursor-move"
                    onPointerDown={(e) => onLayerPointerDown(e, layer.id)}
                  />
                ) : (
                  <text
                    x={layer.x}
                    y={layer.y}
                    fill={(layer as TextLayer).color}
                    fontFamily={(layer as TextLayer).font}
                    fontWeight={(layer as TextLayer).weight}
                    fontSize={(layer as TextLayer).size}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="cursor-move"
                    onPointerDown={(e) => onLayerPointerDown(e, layer.id)}
                  >
                    {(layer as TextLayer).text}
                  </text>
                )}
                {isSel && (
                  <g pointerEvents="all">
                    <rect
                      x={layer.x - layer.w / 2 - 2}
                      y={layer.y - layer.h / 2 - 2}
                      width={layer.w + 4}
                      height={layer.h + 4}
                      fill="none"
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.6"
                      strokeDasharray="2 1"
                      pointerEvents="none"
                    />
                    {/* Scale handle bottom-right */}
                    <circle
                      cx={layer.x + layer.w / 2 + 2}
                      cy={layer.y + layer.h / 2 + 2}
                      r="3"
                      fill="hsl(var(--primary))"
                      className="cursor-nwse-resize"
                      onPointerDown={(e) => onHandlePointerDown(e, layer.id, "scale")}
                    />
                    {/* Rotate handle top */}
                    <line
                      x1={layer.x}
                      y1={layer.y - layer.h / 2 - 2}
                      x2={layer.x}
                      y2={layer.y - layer.h / 2 - 10}
                      stroke="hsl(var(--primary))"
                      strokeWidth="0.6"
                      pointerEvents="none"
                    />
                    <circle
                      cx={layer.x}
                      cy={layer.y - layer.h / 2 - 12}
                      r="3"
                      fill="hsl(var(--background))"
                      stroke="hsl(var(--primary))"
                      strokeWidth="1"
                      className="cursor-grab"
                      onPointerDown={(e) => onHandlePointerDown(e, layer.id, "rotate")}
                    />
                  </g>
                )}
              </g>
            );
          })}
        </svg>

        {/* Floating hint */}
        <div className="pointer-events-none absolute left-3 top-3 flex items-center gap-1.5 rounded-full bg-background/80 px-3 py-1 text-[10px] uppercase tracking-widest text-muted-foreground backdrop-blur">
          <Move className="h-3 w-3" /> Click any part to recolor
        </div>

        {/* Live FOB Badge */}
        {typeof livePriceUnit === "number" && (
          <div className="pointer-events-none absolute bottom-3 left-3 rounded-lg bg-background/90 px-3 py-2 shadow-lg backdrop-blur">
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground">Estimated FOB</p>
            <p className="font-mono text-lg font-bold leading-none text-primary">
              ${livePriceUnit.toFixed(2)} <span className="text-[10px] font-normal text-muted-foreground">/ Pc</span>
            </p>
            {tierLabel && <p className="mt-0.5 text-[9px] text-muted-foreground">{tierLabel}</p>}
          </div>
        )}

        {selectedZoneObj && (() => {
          const zoneMats = getZoneMaterials?.(selectedZoneObj.id) || [];
          const currentMatId = zones[selectedZoneObj.id]?.materialId;
          return (
            <div className="absolute right-3 top-3">
              <Popover open onOpenChange={(o) => !o && setSelectedZone(null)}>
                <PopoverTrigger asChild>
                  <button className="rounded-full bg-primary px-3 py-1 text-[10px] uppercase tracking-widest text-primary-foreground shadow-lg">
                    Editing: {selectedZoneObj.label}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-80">
                  <p className="mb-2 text-xs font-semibold uppercase tracking-wider">{selectedZoneObj.label}</p>

                  {zoneMats.length > 0 && (
                    <>
                      <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Material / Fabric</Label>
                      <div className="mb-3 max-h-40 space-y-1 overflow-y-auto pr-1">
                        {zoneMats.map((m) => {
                          const active = currentMatId === m.id;
                          return (
                            <button
                              key={m.id}
                              onClick={() => updateZone(selectedZoneObj.id, { materialId: m.id })}
                              className={cn(
                                "flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs",
                                active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                              )}
                            >
                              <span className="flex flex-col">
                                <span className="font-medium">{m.label}</span>
                                <span className="text-[10px] text-muted-foreground">{m.spec}</span>
                              </span>
                              <span className="font-mono text-[11px] text-primary">
                                {m.price > 0 ? `+$${m.price.toFixed(2)}` : "Incl."}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}

                  <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Color</Label>
                  <div className="mb-3 grid grid-cols-6 gap-1.5">
                    {palette.map((c) => (
                      <button
                        key={c.id}
                        title={c.label}
                        onClick={() => updateZone(selectedZoneObj.id, { colorHex: c.hex })}
                        className={cn(
                          "h-7 w-7 rounded-full border-2",
                          zones[selectedZoneObj.id]?.colorHex === c.hex ? "border-primary" : "border-border"
                        )}
                        style={{ backgroundColor: c.hex }}
                      />
                    ))}
                  </div>
                  <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Custom Hex</Label>
                  <Input
                    type="color"
                    value={zones[selectedZoneObj.id]?.colorHex || "#000"}
                    onChange={(e) => updateZone(selectedZoneObj.id, { colorHex: e.target.value })}
                    className="mb-3 h-8 w-full cursor-pointer"
                  />
                  <Label className="mb-1 block text-[10px] uppercase text-muted-foreground">Surface Texture</Label>
                  <div className="grid grid-cols-5 gap-1">
                    {TEXTURES.map((t) => (
                      <button
                        key={t.id}
                        onClick={() => updateZone(selectedZoneObj.id, { texture: t.id })}
                        className={cn(
                          "rounded-md border px-1 py-1.5 text-[9px] uppercase",
                          zones[selectedZoneObj.id]?.texture === t.id
                            ? "border-primary bg-primary/10"
                            : "border-border hover:border-primary/40"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          );
        })()}
      </div>


      {/* Tools panel */}
      <Tabs defaultValue="layers" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="layers" className="gap-1.5">
            <LayersIcon className="h-3.5 w-3.5" /> Artwork
          </TabsTrigger>
          <TabsTrigger value="toggles" className="gap-1.5">
            <ToggleLeft className="h-3.5 w-3.5" /> Components
          </TabsTrigger>
          <TabsTrigger value="addons" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Add-Ons
          </TabsTrigger>
          <TabsTrigger value="text" className="gap-1.5" disabled={selectedLayerObj?.type !== "text"}>
            <TypeIcon className="h-3.5 w-3.5" /> Text Edit
          </TabsTrigger>
        </TabsList>


        <TabsContent value="layers" className="mt-3 space-y-3">
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} className="gap-1.5">
              <Upload className="h-3.5 w-3.5" /> Add Logo
            </Button>
            <Button size="sm" variant="outline" onClick={addText} className="gap-1.5">
              <TypeIcon className="h-3.5 w-3.5" /> Add Text
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/svg+xml,image/jpeg"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && addLogo(e.target.files[0])}
            />
          </div>
          {layers.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No artwork yet. Upload a logo or add text. Drag on canvas to position, use handles to scale & rotate.
            </p>
          ) : (
            <ul className="space-y-1.5">
              {layers.map((layer) => {
                const isSel = selectedLayer === layer.id;
                return (
                  <li
                    key={layer.id}
                    className={cn(
                      "flex items-center gap-2 rounded-lg border p-2 text-sm transition-colors",
                      isSel ? "border-primary bg-primary/5" : "border-border"
                    )}
                  >
                    <button onClick={() => setSelectedLayer(layer.id)} className="flex flex-1 items-center gap-2 text-left">
                      {layer.type === "logo" ? <ImageIcon className="h-4 w-4" /> : <TypeIcon className="h-4 w-4" />}
                      <span className="truncate text-xs">
                        {layer.type === "logo" ? (layer as LogoLayer).name : `"${(layer as TextLayer).text}"`}
                      </span>
                    </button>
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(layer.w)}×{Math.round(layer.h)} · {Math.round(layer.rotation)}°
                    </span>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateLayer(layer.id, { visible: !layer.visible })}>
                      {layer.visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    </Button>
                    <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => updateLayer(layer.id, { rotation: layer.rotation + 15 })}>
                      <RotateCw className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive"
                      onClick={() => {
                        setLayers((p) => p.filter((l) => l.id !== layer.id));
                        if (selectedLayer === layer.id) setSelectedLayer(null);
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          )}
        </TabsContent>

        <TabsContent value="toggles" className="mt-3 space-y-2">
          {product.toggles && product.toggles.length > 0 ? (
            product.toggles.map((t) => (
              <button
                key={t.id}
                onClick={() => setToggles((p) => ({ ...p, [t.id]: !p[t.id] }))}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg border p-3 text-sm transition-colors",
                  toggles[t.id] ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                )}
              >
                <span>{t.label}</span>
                <Badge variant={toggles[t.id] ? "default" : "outline"}>{toggles[t.id] ? "On" : "Off"}</Badge>
              </button>
            ))
          ) : (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No component toggles for this product.
            </p>
          )}
        </TabsContent>

        <TabsContent value="addons" className="mt-3 space-y-2">
          {addOns.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              No add-ons configured for this product.
            </p>
          ) : (
            ["branding", "hardware", "finish"].map((grp) => {
              const items = addOns.filter((a) => a.group === grp);
              if (items.length === 0) return null;
              return (
                <div key={grp}>
                  <p className="mb-1 text-[10px] uppercase tracking-widest text-muted-foreground">{grp}</p>
                  <div className="space-y-1.5">
                    {items.map((a) => {
                      const active = addOnIds.includes(a.id);
                      return (
                        <button
                          key={a.id}
                          onClick={() =>
                            setAddOnIds((prev) =>
                              active ? prev.filter((x) => x !== a.id) : [...prev, a.id]
                            )
                          }
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg border p-2.5 text-left text-sm transition-colors",
                            active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            <span
                              className={cn(
                                "flex h-4 w-4 items-center justify-center rounded border",
                                active ? "border-primary bg-primary text-primary-foreground" : "border-border"
                              )}
                            >
                              {active && <Check className="h-3 w-3" />}
                            </span>
                            <span className="text-xs">{a.label}</span>
                          </span>
                          <span className="font-mono text-[11px] text-primary">+${a.cost.toFixed(2)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        <TabsContent value="text" className="mt-3 space-y-2">
          {selectedLayerObj?.type === "text" && (
            <div className="space-y-3">

              <div>
                <Label className="text-[10px] uppercase text-muted-foreground">Text</Label>
                <Input
                  value={(selectedLayerObj as TextLayer).text}
                  onChange={(e) => updateLayer(selectedLayerObj.id, { text: e.target.value } as Partial<Layer>)}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Font</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={(selectedLayerObj as TextLayer).font}
                    onChange={(e) => updateLayer(selectedLayerObj.id, { font: e.target.value } as Partial<Layer>)}
                  >
                    {FONTS.map((f) => (
                      <option key={f} value={f}>{f.split(",")[0].replace(/'/g, "")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Color</Label>
                  <Input
                    type="color"
                    value={(selectedLayerObj as TextLayer).color}
                    onChange={(e) => updateLayer(selectedLayerObj.id, { color: e.target.value } as Partial<Layer>)}
                    className="h-9 w-full cursor-pointer"
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Size</Label>
                  <Input
                    type="number"
                    min={4}
                    max={40}
                    value={(selectedLayerObj as TextLayer).size}
                    onChange={(e) => updateLayer(selectedLayerObj.id, { size: Number(e.target.value) } as Partial<Layer>)}
                  />
                </div>
                <div>
                  <Label className="text-[10px] uppercase text-muted-foreground">Weight</Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
                    value={(selectedLayerObj as TextLayer).weight}
                    onChange={(e) => updateLayer(selectedLayerObj.id, { weight: Number(e.target.value) } as Partial<Layer>)}
                  >
                    {[300, 400, 600, 700, 900].map((w) => <option key={w} value={w}>{w}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
