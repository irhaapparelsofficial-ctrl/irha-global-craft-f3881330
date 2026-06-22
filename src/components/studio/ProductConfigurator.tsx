import { useMemo, useState, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Shirt,
  Layers,
  Scissors,
  Palette,
  Wand2,
  Ruler,
  Upload,
  ChevronLeft,
  ChevronRight,
  Check,
  ShoppingCart,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ---------- Data ----------
type StyleOption = { id: string; label: string; group: string };
type Fabric = { id: string; label: string; gsm: string; feel: string; price: number };
type ProductBase = { id: string; label: string; desc: string; basePrice: number };
type Category = {
  id: string;
  label: string;
  icon: typeof Shirt;
  bases: ProductBase[];
  styles: StyleOption[];
};

const CATEGORIES: Category[] = [
  {
    id: "tshirts",
    label: "T-Shirts",
    icon: Shirt,
    bases: [
      { id: "crew", label: "Crewneck", desc: "Classic round neck", basePrice: 6.5 },
      { id: "vneck", label: "V-Neck", desc: "Tailored V-cut collar", basePrice: 6.9 },
      { id: "over", label: "Oversized", desc: "Drop shoulder, boxy fit", basePrice: 7.8 },
    ],
    styles: [
      { id: "sl-short", label: "Short Sleeve", group: "Sleeve" },
      { id: "sl-long", label: "Long Sleeve", group: "Sleeve" },
      { id: "sl-raglan", label: "Raglan", group: "Sleeve" },
      { id: "hem-straight", label: "Straight Hem", group: "Hem" },
      { id: "hem-curved", label: "Curved Hem", group: "Hem" },
      { id: "fit-regular", label: "Regular Fit", group: "Fit" },
      { id: "fit-slim", label: "Slim Fit", group: "Fit" },
    ],
  },
  {
    id: "hoodies",
    label: "Hoodies",
    icon: Layers,
    bases: [
      { id: "pull", label: "Pullover", desc: "Classic kangaroo pocket", basePrice: 14.5 },
      { id: "zip", label: "Full-Zip", desc: "Metal zipper, dual pockets", basePrice: 16.2 },
      { id: "crop", label: "Cropped", desc: "Boxy modern silhouette", basePrice: 15.0 },
    ],
    styles: [
      { id: "h-draw", label: "Drawstring Hood", group: "Hood" },
      { id: "h-lined", label: "Lined Hood", group: "Hood" },
      { id: "p-kangaroo", label: "Kangaroo Pocket", group: "Pocket" },
      { id: "p-split", label: "Split Pocket", group: "Pocket" },
      { id: "cuff-rib", label: "Ribbed Cuffs", group: "Cuff" },
      { id: "cuff-raw", label: "Raw Cuffs", group: "Cuff" },
    ],
  },
  {
    id: "polos",
    label: "Polos",
    icon: Scissors,
    bases: [
      { id: "p-classic", label: "Classic Polo", desc: "2-button placket", basePrice: 8.5 },
      { id: "p-perf", label: "Performance Polo", desc: "Moisture-wicking", basePrice: 9.4 },
    ],
    styles: [
      { id: "plk-2", label: "2-Button Placket", group: "Placket" },
      { id: "plk-3", label: "3-Button Placket", group: "Placket" },
      { id: "col-rib", label: "Ribbed Collar", group: "Collar" },
      { id: "col-self", label: "Self Collar", group: "Collar" },
    ],
  },
  {
    id: "uniforms",
    label: "Uniforms",
    icon: Shirt,
    bases: [
      { id: "u-work", label: "Workwear Shirt", desc: "Heavy-duty twill", basePrice: 12.0 },
      { id: "u-chef", label: "Chef Coat", desc: "Double-breasted", basePrice: 18.0 },
    ],
    styles: [
      { id: "btn-snap", label: "Snap Buttons", group: "Closure" },
      { id: "btn-std", label: "Standard Buttons", group: "Closure" },
      { id: "rfx-on", label: "Reflective Tape", group: "Safety" },
    ],
  },
];

const COLORS = [
  { id: "black", label: "Jet Black", hex: "#111111" },
  { id: "white", label: "Pure White", hex: "#F8F8F8" },
  { id: "navy", label: "Navy", hex: "#0F1E3D" },
  { id: "grey", label: "Heather Grey", hex: "#8A8F96" },
  { id: "olive", label: "Olive", hex: "#5B6238" },
  { id: "burgundy", label: "Burgundy", hex: "#5C1A1B" },
  { id: "royal", label: "Royal Blue", hex: "#1E40AF" },
  { id: "sand", label: "Sand", hex: "#C8B68A" },
  { id: "forest", label: "Forest", hex: "#1F3A2E" },
  { id: "rust", label: "Rust", hex: "#A0421A" },
];

const FABRICS: Fabric[] = [
  { id: "cot-180", label: "100% Cotton", gsm: "180 GSM", feel: "Soft, breathable everyday weight", price: 0 },
  { id: "cot-240", label: "Heavyweight Cotton", gsm: "240 GSM", feel: "Premium, structured hand-feel", price: 1.2 },
  { id: "pc-blend", label: "Polyester/Cotton Blend", gsm: "200 GSM", feel: "Wrinkle-resistant, durable", price: 0.6 },
  { id: "fleece", label: "Brushed Fleece", gsm: "320 GSM", feel: "Warm winter weight", price: 2.4 },
  { id: "interlock", label: "Interlock Knit", gsm: "220 GSM", feel: "Smooth, dense, double-knit", price: 1.0 },
];

const SIZES = ["S", "M", "L", "XL", "XXL"] as const;
const LOGO_PLACEMENTS = ["Left Chest", "Center Chest", "Full Back", "Sleeve"] as const;

const STEPS = [
  { id: 1, label: "Category", icon: Shirt },
  { id: 2, label: "Product", icon: Layers },
  { id: 3, label: "Styles", icon: Scissors },
  { id: 4, label: "Color", icon: Palette },
  { id: 5, label: "Fabric", icon: Wand2 },
  { id: 6, label: "Sizing", icon: Ruler },
  { id: 7, label: "Branding", icon: Upload },
];

// ---------- Component ----------
export default function ProductConfigurator() {
  const [step, setStep] = useState(1);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [baseId, setBaseId] = useState<string | null>(null);
  const [styleIds, setStyleIds] = useState<string[]>([]);
  const [colorId, setColorId] = useState("black");
  const [fabricId, setFabricId] = useState<string | null>(null);
  const [sizeQty, setSizeQty] = useState<Record<string, number>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [placement, setPlacement] = useState<(typeof LOGO_PLACEMENTS)[number]>("Left Chest");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const category = CATEGORIES.find((c) => c.id === categoryId) || null;
  const base = category?.bases.find((b) => b.id === baseId) || null;
  const fabric = FABRICS.find((f) => f.id === fabricId) || null;
  const color = COLORS.find((c) => c.id === colorId) || COLORS[0];
  const totalQty = Object.values(sizeQty).reduce((s, n) => s + (n || 0), 0);
  const unitPrice = (base?.basePrice || 0) + (fabric?.price || 0) + (logoFile ? 0.8 : 0);
  const totalPrice = unitPrice * totalQty;

  const next = () => setStep((s) => Math.min(7, s + 1));
  const back = () => setStep((s) => Math.max(1, s - 1));

  const canNext = useMemo(() => {
    switch (step) {
      case 1: return !!categoryId;
      case 2: return !!baseId;
      case 3: return styleIds.length > 0;
      case 4: return !!colorId;
      case 5: return !!fabricId;
      case 6: return totalQty >= 1;
      default: return true;
    }
  }, [step, categoryId, baseId, styleIds, colorId, fabricId, totalQty]);

  const toggleStyle = (id: string) =>
    setStyleIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));

  const updateSize = (size: string, delta: number) =>
    setSizeQty((prev) => ({ ...prev, [size]: Math.max(0, (prev[size] || 0) + delta) }));

  const onFile = useCallback((file: File) => {
    setLogoFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setLogoUrl(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) onFile(file);
  };

  const handleAddToCart = () => {
    if (totalQty < 50) {
      toast.error("Minimum order quantity is 50 units (B2B factory direct).");
      return;
    }
    toast.success(`Configuration submitted! ${totalQty} units · $${totalPrice.toFixed(2)} FOB`);
  };

  // ---------- Mockup Preview ----------
  const MockupPreview = () => (
    <div className="relative aspect-square w-full overflow-hidden rounded-xl border border-border bg-gradient-to-br from-muted/50 to-muted/20">
      <div className="absolute inset-0 flex items-center justify-center p-8">
        <svg viewBox="0 0 200 220" className="h-full w-full" style={{ filter: "drop-shadow(0 20px 40px rgba(0,0,0,0.25))" }}>
          {/* T-shirt silhouette - adapts visually */}
          <path
            d="M50 40 L80 20 Q100 35 120 20 L150 40 L175 65 L160 85 L145 75 L145 200 Q145 210 135 210 L65 210 Q55 210 55 200 L55 75 L40 85 L25 65 Z"
            fill={color.hex}
            stroke="hsl(var(--border))"
            strokeWidth="0.8"
          />
          {/* neck shadow */}
          <path d="M80 20 Q100 35 120 20 Q110 40 100 40 Q90 40 80 20 Z" fill="rgba(0,0,0,0.18)" />
          {/* Logo placeholder */}
          {logoUrl ? (
            <image
              href={logoUrl}
              x={placement === "Left Chest" ? 75 : placement === "Center Chest" ? 85 : placement === "Sleeve" ? 30 : 75}
              y={placement === "Full Back" ? 90 : placement === "Sleeve" ? 60 : 65}
              width={placement === "Full Back" ? 50 : 20}
              height={placement === "Full Back" ? 50 : 20}
              preserveAspectRatio="xMidYMid meet"
            />
          ) : (
            <rect
              x={placement === "Left Chest" ? 75 : placement === "Center Chest" ? 85 : placement === "Sleeve" ? 30 : 75}
              y={placement === "Full Back" ? 90 : placement === "Sleeve" ? 60 : 65}
              width={placement === "Full Back" ? 50 : 20}
              height={placement === "Full Back" ? 50 : 20}
              fill="none"
              stroke={color.hex === "#F8F8F8" ? "#333" : "rgba(255,255,255,0.6)"}
              strokeDasharray="2 2"
              strokeWidth="0.8"
            />
          )}
        </svg>
      </div>
      <div className="absolute bottom-0 left-0 right-0 flex items-end justify-between bg-gradient-to-t from-background/95 to-transparent p-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Live Preview</p>
          <p className="font-serif text-lg leading-tight">
            {base?.label || category?.label || "Select a product"}
          </p>
          <p className="text-xs text-muted-foreground">
            {color.label}
            {fabric ? ` · ${fabric.gsm}` : ""}
          </p>
        </div>
        {totalQty > 0 && (
          <Badge variant="secondary" className="text-xs">
            {totalQty} units
          </Badge>
        )}
      </div>
    </div>
  );

  // ---------- Step Renderers ----------
  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="grid grid-cols-2 gap-3 animate-fade-in">
            {CATEGORIES.map((c) => {
              const Icon = c.icon;
              const active = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    setCategoryId(c.id);
                    setBaseId(null);
                    setStyleIds([]);
                    setTimeout(() => setStep(2), 220);
                  }}
                  className={cn(
                    "group flex flex-col items-center gap-3 rounded-xl border p-6 transition-all hover-scale",
                    active
                      ? "border-primary bg-primary/5 shadow-md"
                      : "border-border bg-card hover:border-primary/50"
                  )}
                >
                  <Icon className={cn("h-8 w-8", active ? "text-primary" : "text-muted-foreground")} />
                  <span className="text-sm font-medium">{c.label}</span>
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
                    <span className="text-sm font-mono">${b.basePrice.toFixed(2)}</span>
                    {active && <Check className="h-4 w-4 text-primary" />}
                  </div>
                </button>
              );
            })}
          </div>
        );
      case 3: {
        const groups = Array.from(new Set(category?.styles.map((s) => s.group) || []));
        return (
          <div className="space-y-5 animate-fade-in">
            {groups.map((g) => (
              <div key={g}>
                <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">{g}</p>
                <div className="flex flex-wrap gap-2">
                  {category?.styles
                    .filter((s) => s.group === g)
                    .map((s) => {
                      const active = styleIds.includes(s.id);
                      return (
                        <button
                          key={s.id}
                          onClick={() => toggleStyle(s.id)}
                          className={cn(
                            "rounded-full border px-4 py-2 text-xs font-medium transition-all",
                            active
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-border bg-card hover:border-primary/50"
                          )}
                        >
                          {s.label}
                        </button>
                      );
                    })}
                </div>
              </div>
            ))}
          </div>
        );
      }
      case 4:
        return (
          <div className="animate-fade-in">
            <div className="grid grid-cols-5 gap-3">
              {COLORS.map((c) => {
                const active = colorId === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setColorId(c.id)}
                    title={c.label}
                    className={cn(
                      "group flex flex-col items-center gap-1.5 transition-transform hover:-translate-y-0.5"
                    )}
                  >
                    <div
                      className={cn(
                        "h-14 w-14 rounded-full border-2 transition-all",
                        active ? "border-primary ring-2 ring-primary/30 ring-offset-2 ring-offset-background" : "border-border"
                      )}
                      style={{ backgroundColor: c.hex }}
                    />
                    <span className="text-[10px] text-muted-foreground">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      case 5:
        return (
          <div className="space-y-2 animate-fade-in">
            {FABRICS.map((f) => {
              const active = fabricId === f.id;
              return (
                <button
                  key={f.id}
                  onClick={() => setFabricId(f.id)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl border p-4 text-left transition-all",
                    active ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{f.label}</p>
                      <Badge variant="outline" className="text-[10px]">{f.gsm}</Badge>
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
              <p className="text-sm text-muted-foreground">Set quantity per size</p>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">Size Chart</Button>
                </SheetTrigger>
                <SheetContent>
                  <SheetHeader>
                    <SheetTitle>Size Chart (cm)</SheetTitle>
                  </SheetHeader>
                  <table className="mt-6 w-full text-sm">
                    <thead className="border-b text-left text-xs uppercase text-muted-foreground">
                      <tr><th className="py-2">Size</th><th>Chest</th><th>Length</th><th>Sleeve</th></tr>
                    </thead>
                    <tbody>
                      {[
                        ["S", "96", "68", "21"],
                        ["M", "102", "70", "22"],
                        ["L", "108", "72", "23"],
                        ["XL", "114", "74", "24"],
                        ["XXL", "120", "76", "25"],
                      ].map((row) => (
                        <tr key={row[0]} className="border-b">
                          {row.map((v, i) => <td key={i} className="py-2">{v}</td>)}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </SheetContent>
              </Sheet>
            </div>
            <div className="space-y-2">
              {SIZES.map((s) => (
                <div key={s} className="flex items-center justify-between rounded-lg border border-border bg-card p-3">
                  <span className="w-12 font-mono text-sm font-semibold">{s}</span>
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
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card p-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5"
            >
              <Upload className="h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">
                {logoFile ? logoFile.name : "Drop your logo here or click to upload"}
              </p>
              <p className="text-xs text-muted-foreground">PNG, SVG, JPG · max 5MB</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,image/jpeg"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
              {logoUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    setLogoFile(null);
                    setLogoUrl(null);
                  }}
                >
                  <X className="mr-1 h-3 w-3" /> Remove
                </Button>
              )}
            </div>
            <div>
              <Label className="text-xs uppercase tracking-wider text-muted-foreground">Placement</Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {LOGO_PLACEMENTS.map((p) => (
                  <button
                    key={p}
                    onClick={() => setPlacement(p)}
                    className={cn(
                      "rounded-lg border p-3 text-sm transition-all",
                      placement === p ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
                    )}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <Card className="mt-6 p-5">
              <p className="mb-3 text-xs uppercase tracking-widest text-primary">Order Summary</p>
              <div className="space-y-2 text-sm">
                <SummaryRow label="Category" value={category?.label || "—"} />
                <SummaryRow label="Product" value={base?.label || "—"} />
                <SummaryRow label="Styles" value={styleIds.length ? `${styleIds.length} selected` : "—"} />
                <SummaryRow label="Color" value={color.label} />
                <SummaryRow label="Fabric" value={fabric ? `${fabric.label} · ${fabric.gsm}` : "—"} />
                <SummaryRow label="Quantity" value={`${totalQty} units`} />
                <SummaryRow label="Branding" value={logoFile ? `${logoFile.name} · ${placement}` : "—"} />
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

  const currentStep = STEPS.find((s) => s.id === step)!;

  return (
    <div className="rounded-2xl border border-border bg-card/50 p-4 md:p-6">
      {/* Progress */}
      <div className="mb-6">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-primary">
              Step {step} of 7
            </p>
            <p className="font-serif text-xl">{currentStep.label}</p>
          </div>
          <div className="hidden md:flex items-center gap-1.5">
            {STEPS.map((s) => (
              <button
                key={s.id}
                onClick={() => s.id < step && setStep(s.id)}
                className={cn(
                  "h-2 rounded-full transition-all",
                  s.id === step ? "w-8 bg-primary" : s.id < step ? "w-2 bg-primary/60" : "w-2 bg-muted"
                )}
              />
            ))}
          </div>
        </div>
        <Progress value={(step / 7) * 100} className="h-1" />
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_1.1fr]">
        {/* Mockup - sticky on desktop, top on mobile */}
        <div className="md:sticky md:top-4 md:self-start">
          <MockupPreview />
        </div>

        {/* Form */}
        <div className="flex flex-col">
          <div className="min-h-[320px] flex-1">{renderStep()}</div>

          {/* Nav */}
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
