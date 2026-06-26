import { useMemo, useState } from "react";
import { calculateFob, MATERIALS, type Currency, type MaterialKey } from "@/lib/fobCalculator";
import { Cpu, DollarSign, Lock } from "lucide-react";

const CURRENCIES: Currency[] = ["USD", "EUR", "GBP"];

export default function StudioPricingPanel() {
  const [material, setMaterial] = useState<MaterialKey>("premium-cowhide");
  const [quantity, setQuantity] = useState(500);
  const [currency, setCurrency] = useState<Currency>("EUR");
  const [trims, setTrims] = useState({
    embroidery: true,
    printing: true,
    leatherPatch: true,
    wovenLabel: true,
  });

  const fob = useMemo(
    () => calculateFob({ material, quantity, currency, trims }),
    [material, quantity, currency, trims],
  );

  const aiSuggestion =
    quantity < 300
      ? "Scale to 300+ pcs to unlock the +12% margin tier and 8% lower per-unit cost."
      : quantity < 1000
      ? "Push to 1000+ pcs to drop production cost by 15% (enterprise flat discount)."
      : "Enterprise tier active — volumetric ocean-freight scaling already applied.";

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Studio canvas */}
      <div className="lg:col-span-2 border border-border/60 bg-card/40 p-6 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Cpu size={14} className="text-industrial" />
            <span className="text-[10px] uppercase tracking-[0.25em] text-industrial">3D Mockup Studio</span>
          </div>
          <div className="inline-flex border border-border/60">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => setCurrency(c)}
                className={`text-[10px] uppercase tracking-[0.2em] px-3 py-1.5 transition-colors ${
                  currency === c
                    ? "bg-industrial text-industrial-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        <div className="aspect-[4/3] bg-background border border-border/60 flex flex-col items-center justify-center relative">
          <p className="text-xs text-muted-foreground uppercase tracking-[0.25em]">
            High-Fidelity Mesh Render Node
          </p>
          <p className="text-[10px] text-muted-foreground/70 mt-1">Voice-to-Asset preview coming via Gemini</p>

          <div className="absolute bottom-3 left-3 right-3 bg-card/90 border border-border/60 px-3 py-2 text-[11px] font-mono flex justify-between">
            <span>
              <span className="text-industrial">Material:</span>{" "}
              {MATERIALS.find((m) => m.key === material)?.label}
            </span>
            <span>
              <span className="text-industrial">Batch:</span> {quantity} pcs
            </span>
          </div>
        </div>

        <div className="border border-border/60 bg-background/60 p-3 text-xs text-foreground/75">
          <span className="text-industrial text-[10px] uppercase tracking-[0.25em] block mb-1">
            AI Sourcing Insight
          </span>
          {aiSuggestion}
        </div>
      </div>

      {/* Controls */}
      <div className="border border-border/60 bg-card/40 p-6 flex flex-col">
        <h3 className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground border-b border-border/60 pb-3 mb-5">
          Control Matrix
        </h3>

        <div className="space-y-5 flex-1">
          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
              Material
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value as MaterialKey)}
              className="w-full bg-background border border-border/60 p-2.5 text-xs focus:border-industrial outline-none"
            >
              {MATERIALS.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">
              Order Volume (MOQ 100)
            </label>
            <input
              type="range"
              min={100}
              max={5000}
              step={50}
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              className="w-full accent-industrial"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5">
              <span>100</span>
              <span className="text-industrial font-bold text-xs">{quantity} pcs</span>
              <span>5,000+</span>
            </div>
          </div>

          <div className="space-y-2">
            <label className="block text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              Trims & Branding
            </label>
            {([
              ["embroidery", "High-Definition Embroidery"],
              ["printing", "Industrial Screen Printing"],
              ["leatherPatch", "Embossed Leather Patch"],
              ["wovenLabel", "Custom Woven Neck Label"],
            ] as const).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 text-xs text-foreground/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={trims[key]}
                  onChange={(e) => setTrims((t) => ({ ...t, [key]: e.target.checked }))}
                  className="accent-industrial"
                />
                {label}
              </label>
            ))}
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-border/60 space-y-3">
          <div className="bg-background border border-border/60 p-4 flex justify-between items-center">
            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground inline-flex items-center gap-1">
              <DollarSign size={11} /> FOB
            </span>
            <span className="text-lg font-mono text-industrial font-black tracking-tight">
              On Quote
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Final FOB Sialkot rate confirmed directly via formal quote — share specs with our team to receive pricing.
          </p>
          <button
            className="w-full bg-industrial text-industrial-foreground text-[10px] uppercase tracking-[0.3em] font-bold py-3 hover:opacity-90 inline-flex items-center justify-center gap-2"
            onClick={() =>
              alert(
                `Spec locked · ${quantity} pcs · Pricing on quote — our team will reply within 12 hours.`,
              )
            }
          >
            <Lock size={12} /> Lock Spec & Request Quote
          </button>
        </div>

      </div>
    </div>
  );
}
