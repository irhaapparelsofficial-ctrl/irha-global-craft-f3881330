import { useMemo, useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Layers,
  Scissors,
  Palette,
  Wand2,
  Ruler,
  Brush,
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingCart,
  Shapes,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  CATALOG,
  getCategory,
  getBase,
  resolveStyles,
  resolveFabrics,
  resolveSizing,
  resolveAddOns,
  resolveZoneMaterials,
  type Category,
  type ProductBase,
  type ZoneMaterial,
} from "./catalogSchema";
import InteractiveMockupCanvas, { type DesignState } from "./InteractiveMockupCanvas";
import { computeQuote, tierFor } from "./pricingEngine";
import { Slider } from "@/components/ui/slider";


const STEP_META = [
  { id: 1, label: "Category", icon: Shapes },
  { id: 2, label: "Product", icon: Layers },
  { id: 3, label: "Styles", icon: Scissors },
  { id: 4, label: "Color", icon: Palette },
  { id: 5, label: "Fabric", icon: Wand2 },
  { id: 6, label: "Sizing", icon: Ruler },
  { id: 7, label: "Design Canvas", icon: Brush },
];


export default function ProductConfigurator() {
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [styleSelections, setStyleSelections] = useState<Record<string, string>>({});
  const [colorId, setColorId] = useState<string | null>(null);
  const [fabricId, setFabricId] = useState<string | null>(null);
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({});
  const [designState, setDesignState] = useState<DesignState | null>(null);

  // ----- Resolve active schema -----
  const category: Category | null = getCategory(categoryId);
  const base: ProductBase | null = getBase(category, baseId);
  const styleGroups = category && base ? resolveStyles(category, base) : [];
  const fabrics = category && base ? resolveFabrics(category, base) : [];
  const sizing = category && base ? resolveSizing(category, base) : null;
  const addOns = category && base ? resolveAddOns(category, base) : [];
  const colors = category?.colors || [];

  const color = colors.find((c) => c.id === colorId) || colors[0] || { id: "", label: "—", hex: "#888" };
  const fabric = fabrics.find((f) => f.id === fabricId) || null;
  const totalQty = Object.values(sizeQty).reduce((s, n) => s + (n || 0), 0);

  // ---------- BOM Pricing ----------
  const getZoneMaterials = useCallback(
    (zoneId: string): ZoneMaterial[] => {
      if (!category || !base) return [];
      return resolveZoneMaterials(category, base, zoneId);
    },
    [category, base]
  );

  // Materialise the zone material selections from DesignState into full objects.
  const chosenZoneMaterials = useMemo(() => {
    const out: Record<string, ZoneMaterial | undefined> = {};
    if (!designState || !category || !base) return out;
    for (const [zoneId, zone] of Object.entries(designState.zones)) {
      if (!zone.materialId) continue;
      const opts = resolveZoneMaterials(category, base, zoneId);
      out[zoneId] = opts.find((m) => m.id === zone.materialId);
    }
    return out;
  }, [designState, category, base]);

  const selectedAddOns = useMemo(
    () => addOns.filter((a) => designState?.addOnIds?.includes(a.id)),
    [addOns, designState]
  );

  const quote = useMemo(
    () =>
      computeQuote({
        base,
        zoneMaterials: chosenZoneMaterials,
        addOns: selectedAddOns,
        artworkLayers: designState?.layers?.length || 0,
        fallbackFabric: fabric,
        qty: totalQty,
      }),
    [base, chosenZoneMaterials, selectedAddOns, designState, fabric, totalQty]
  );

  // Tier hint for the canvas badge — works even before sizes are entered.
  const previewTier = tierFor(Math.max(totalQty, 100));

  // Reset downstream selections when category changes
  useEffect(() => {
    setBaseId(null);
    setStyleSelections({});
    setColorId(null);
    setFabricId(null);
    setSizeQty({});
    setDesignState(null);
  }, [categoryId]);


  useEffect(() => {
    setStyleSelections({});
    setFabricId(null);
    setSizeQty({});
    setDesignState(null);
    if (colors.length > 0 && !colorId) setColorId(colors[0].id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [baseId]);

  const handleDesignChange = useCallback((s: DesignState) => setDesignState(s), []);


  const next = () => setStep((s) => Math.min(7, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return !!categoryId;
      case 2: return !!baseId;
      case 3: return styleGroups.every((g) => !!styleSelections[g.id]);
      case 4: return !!colorId;
      case 5: return !!fabricId;
      case 6: return totalQty >= 1;
      default: return true;
    }
  }, [step, categoryId, baseId, styleGroups, styleSelections, colorId, fabricId, totalQty]);

  const updateSize = (size: string, delta: number) =>
    setSizeQty((prev) => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + delta) }));

  const handleAddToCart = () => {
    if (totalQty < 50) {
      toast.error("Minimum order quantity is 50 units (B2B factory direct).");
      return;
    }
    // Build full configuration payload — clean export of every design choice.
    const payload = {
      category: category && { id: category.id, label: category.label },
      product: base && { id: base.id, label: base.label, silhouette: base.silhouette },
      styles: Object.fromEntries(
        styleGroups.map((g) => {
          const opt = g.options.find((o) => o.id === styleSelections[g.id]);
          return [g.id, opt ? { id: opt.id, label: opt.label } : null];
        })
      ),
      baseColor: color,
      fabric: fabric && { id: fabric.id, label: fabric.label, spec: fabric.spec },
      quantities: sizeQty,
      totalQty,
      pricing: { unit: unitPrice, total: totalPrice, currency: "USD" },
      design: designState && {
        silhouette: designState.silhouette,
        zones: designState.zones,
        toggles: designState.toggles,
        artwork: designState.layers.map((l) => ({
          id: l.id,
          type: l.type,
          x: Math.round(l.x * 100) / 100,
          y: Math.round(l.y * 100) / 100,
          width: Math.round(l.w * 100) / 100,
          height: Math.round(l.h * 100) / 100,
          rotation: Math.round(l.rotation * 10) / 10,
          ...(l.type === "logo"
            ? { name: (l as { name: string }).name }
            : {
                text: (l as { text: string }).text,
                font: (l as { font: string }).font,
                color: (l as { color: string }).color,
                size: (l as { size: number }).size,
                weight: (l as { weight: number }).weight,
              }),
        })),
      },
    };
    // eslint-disable-next-line no-console
    console.log("[Configurator] Export payload:", payload);
    toast.success(`Submitted · ${totalQty} units · $${totalPrice.toFixed(2)} FOB`, {
      description: `${(designState?.layers.length || 0)} artwork layer(s) bundled.`,
    });
  };

  // ---------- Mockup ----------
  const MockupPreview = () => {
    if (!base) {
      return (
        <div className="flex aspect-square w-full items-center justify-center rounded-xl border border-border bg-gradient-to-br from-muted/40 to-muted/10">
          <div className="text-center text-muted-foreground">
            <Shapes className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p className="text-sm">Select a category & product to begin</p>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-3">
        <InteractiveMockupCanvas
          silhouette={base.silhouette}
          palette={colors}
          initialColor={color.hex}
          onChange={handleDesignChange}
        />
        <div className="flex items-center justify-between rounded-lg border border-border bg-card/50 px-3 py-2">
          <div>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Live Mockup</p>
            <p className="text-sm font-medium leading-tight">{base.label}</p>
            <p className="text-[11px] text-muted-foreground">
              {fabric?.spec || "Choose fabric"}{designState?.layers.length ? ` · ${designState.layers.length} layer(s)` : ""}
            </p>
          </div>
          {totalQty > 0 && <Badge variant="secondary" className="text-xs">{totalQty} units</Badge>}
        </div>
      </div>
    );
  };


  // ---------- Steps ----------
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {CATALOG.map((c) => {
              const Icon = c.icon;
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategoryId(c.id);
                    setTimeout(() => setStep(2), 220);
                  }}
                  className={cn(
                    "group flex flex-col items-start gap-3 rounded-xl border p-5 text-left transition-all hover-scale",
                    active ? "border-primary bg-primary/5 shadow-md" : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <Icon className={cn("h-7 w-7", active ? "text-primary" : "text-muted-foreground")} />
                  <div>
                    <p className="text-sm font-medium">{c.label}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">{c.tagline}</p>
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 2:
        return (
          <div className="space-y-3 animate-fade-in">
            {category?.bases.map((b) => {
              const active = baseId === b.id;
              return (
                <button
                  key={b.id}
                  onClick={() => setBaseId(b.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <div>
                    <p className="font-medium">{b.label}</p>
                    <p className="text-xs text-muted-foreground">{b.desc}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm">${b.basePrice.toFixed(2)}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 3:
        return (
          <div className="space-y-5 animate-fade-in">
            {styleGroups.length === 0 && (
              <p className="text-sm text-muted-foreground">No style options for this product — proceed to color.</p>
            )}
            {styleGroups.map((g) => (
              <div key={g.id}>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{g.label}</p>
                <div className="flex flex-wrap gap-2">
                  {g.options.map((opt) => {
                    const active = styleSelections[g.id] === opt.id;
                    return (
                      <button
                        key={opt.id}
                        onClick={() => setStyleSelections((p) => ({ ...p, [g.id]: opt.id }))}
                        className={cn(
                          "rounded-full border px-4 py-2 text-xs font-medium transition-all",
                          active
                            ? "border-primary bg-primary text-primary-foreground"
                            : "border-border bg-card hover:border-primary/50"
                        )}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        );

      case 4:
        return (
          <div className="animate-fade-in">
            <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
              {colors.map((c) => {
                const active = colorId === c.id;
                return (
                  <button key={c.id} onClick={() => setColorId(c.id)} title={c.label}
                    className="group flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5">
                    <div
                      className={cn(
                        "h-14 w-14 rounded-full border-2 transition-all",
                        active ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : "border-border"
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-2 animate-fade-in">
            {fabrics.map((f) => {
              const active = fabricId === f.id;
              return (
                <button key={f.id} onClick={() => setFabricId(f.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{f.label}</p>
                      <Badge variant="outline" className="text-[10px]">{f.spec}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">{f.feel}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs text-muted-foreground">
                      {f.price > 0 ? `+$${f.price.toFixed(2)}` : "Included"}
                    </span>
                    {active && <Check className="ml-auto mt-1 h-4 w-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        );

      case 6:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{sizing?.label}</p>
                <p className="text-xs text-muted-foreground">Set quantity per size</p>
              </div>
              {sizing?.chart && (
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">Size Chart</Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader><SheetTitle>{sizing.label}</SheetTitle></SheetHeader>
                    <table className="mt-6 w-full text-sm">
                      <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                        <tr>{sizing.chart.headers.map((h) => <th key={h} className="py-2 pr-3">{h}</th>)}</tr>
                      </thead>
                      <tbody>
                        {sizing.chart.rows.map((row, i) => (
                          <tr key={i} className="border-b">
                            {row.map((v, j) => <td key={j} className="py-2 pr-3 font-mono">{v}</td>)}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </SheetContent>
                </Sheet>
              )}
            </div>
            <div className="space-y-2">
              {sizing?.sizes.map((s) => (
                <div key={s} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <span className="w-16 font-mono text-sm font-semibold">{s}</span>
                  <div className="flex items-center gap-3">
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateSize(s, -1)}>−</Button>
                    <span className="w-10 text-center text-sm font-medium">{sizeQty[s] || 0}</span>
                    <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => updateSize(s, 1)}>+</Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-sm">
              <span className="text-muted-foreground">Total quantity</span>
              <span className="font-mono font-semibold">{totalQty} units</span>
            </div>
          </div>
        );

      case 7:
        return (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-xl border border-dashed border-primary/40 bg-primary/5 p-5 text-sm">
              <div className="flex items-start gap-3">
                <Brush className="mt-0.5 h-5 w-5 text-primary" />
                <div>
                  <p className="font-medium">Design directly on the mockup →</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Click any zone (body, sleeves, collar, cuffs) to recolor or apply a texture.
                    Use the <em>Artwork</em> tab to upload logos and add text — drag, scale and rotate
                    them anywhere on the printable area. Component toggles let you switch hood,
                    pockets and other elements on or off.
                  </p>
                  {designState && (
                    <p className="mt-3 text-[11px] text-muted-foreground">
                      <strong className="text-foreground">{designState.layers.length}</strong> artwork layer(s) ·{" "}
                      <strong className="text-foreground">
                        {Object.values(designState.zones).filter((z) => z.texture !== "none").length}
                      </strong>{" "}
                      textured zone(s)
                    </p>
                  )}
                </div>
              </div>
            </div>

            <Card className="mt-6 p-5">
              <p className="mb-3 text-xs uppercase tracking-widest text-primary">Order Summary</p>
              <div className="space-y-2 text-sm">
                <SummaryRow label="Category" value={category?.label || "—"} />
                <SummaryRow label="Product" value={base?.label || "—"} />
                {styleGroups.map((g) => {
                  const opt = g.options.find((o) => o.id === styleSelections[g.id]);
                  return <SummaryRow key={g.id} label={g.label} value={opt?.label || "—"} />;
                })}
                <SummaryRow label="Base Color" value={color.label} />
                <SummaryRow label="Fabric" value={fabric ? `${fabric.label} · ${fabric.spec}` : "—"} />
                <SummaryRow label="Quantity" value={`${totalQty} units`} />
                <SummaryRow
                  label="Artwork"
                  value={designState?.layers.length ? `${designState.layers.length} layer(s)` : "—"}
                />
              </div>
              <div className="mt-4 flex items-end justify-between border-t border-border pt-4">
                <div>
                  <p className="text-xs text-muted-foreground">Estimated FOB</p>
                  <p className="font-serif text-2xl">${totalPrice.toFixed(2)}</p>
                  <p className="text-[10px] text-muted-foreground">${unitPrice.toFixed(2)} per unit</p>
                </div>
                <Button size="lg" onClick={handleAddToCart} className="gap-2">
                  <ShoppingCart className="h-4 w-4" /> Add to Cart
                </Button>
              </div>
            </Card>
          </div>
        );
    }
  };


  const currentStep = STEP_META.find((s) => s.id === step)!;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 md:p-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">Step {step} of 7</p>
            <p className="font-serif text-xl">{currentStep.label}</p>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {STEP_META.map((s) => (
              <button key={s.id} onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  s.id === step ? "w-8 bg-primary" : s.id < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
                )} />
            ))}
          </div>
        </div>
        <Progress value={(step / 7) * 100} className="h-1" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
        <div className="md:sticky md:top-4 md:self-start">
          <MockupPreview />
        </div>

        <div className="flex flex-col">
          <div className="min-h-[340px] flex-1">{renderStep()}</div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <Button variant="ghost" onClick={back} disabled={step === 1} className="gap-1">
              <ChevronLeft className="h-4 w-4" /> Back
            </Button>
            {step < 7 ? (
              <Button onClick={next} disabled={!canNext} className="gap-1">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <span className="text-xs text-muted-foreground">Final step</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right font-medium">{value}</span>
    </div>
  );
}
