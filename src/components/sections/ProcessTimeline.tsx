import { ClipboardList, Scissors, Layers, Sparkles, ShieldCheck, Truck } from "lucide-react";

const STEPS = [
  { Icon: ClipboardList, n: "01", t: "Requirement & Brief", d: "We review your tech pack, sketch or reference sample and confirm scope, materials and branding." },
  { Icon: Scissors, n: "02", t: "Development & Sampling", d: "Pre-production samples developed for approval — sample schedule quoted per program." },
  { Icon: Layers, n: "03", t: "Material & Trim Approval", d: "Fabric, leather, trims, labels and packaging confirmed and signed off before bulk." },
  { Icon: Sparkles, n: "04", t: "Bulk Production", d: "Cut, stitch, decorate and finish in-house — timeline agreed on the PO before start." },
  { Icon: ShieldCheck, n: "05", t: "Quality Control", d: "Inline checks and pre-shipment AQL inspection with photo or video reporting on request." },
  { Icon: Truck, n: "06", t: "Packing & Export", d: "Retail-ready packing with Form-E, COO, packing list and commercial invoice for your destination." },
];

export default function ProcessTimeline() {
  return (
    <section className="py-20 md:py-28 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="max-w-2xl mb-12">
          <p className="eyebrow mb-4">Production Journey</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
            From brief to <span className="text-gold italic">export container</span>.
          </h2>
          <p className="mt-4 text-foreground/70 text-sm md:text-base leading-relaxed">
            Every program is planned and scheduled on the PO — timelines confirmed per project, not promised in a brochure.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
          {STEPS.map(({ Icon, n, t, d }) => (
            <div key={n} className="p-7 md:p-8 bg-background hover:bg-card transition-colors relative">
              <p className="font-display text-5xl text-gold/15 absolute top-5 right-6">{n}</p>
              <Icon className="text-gold" size={24} strokeWidth={1.4} />
              <h3 className="font-display text-xl mt-5">{t}</h3>
              <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
