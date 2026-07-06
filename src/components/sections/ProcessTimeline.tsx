import { ClipboardList, Scissors, Layers, Sparkles, ShieldCheck, Truck } from "lucide-react";

const STEPS = [
  { Icon: ClipboardList, n: "01", t: "Requirement & Brief", d: "Review the tech pack, sketch, reference sample or product brief before confirming scope." },
  { Icon: Scissors, n: "02", t: "Development & Sampling", d: "Confirm the sample path and expected schedule according to the actual product." },
  { Icon: Layers, n: "03", t: "Material & Trim Review", d: "Review fabric, leather, trims, labels and packaging requirements before bulk." },
  { Icon: Sparkles, n: "04", t: "Production Planning", d: "Confirm construction, decoration and finishing methods before production timing is agreed." },
  { Icon: ShieldCheck, n: "05", t: "Quality Review", d: "Scope measurements, workmanship, finishing and reporting needs to the buyer requirement." },
  { Icon: Truck, n: "06", t: "Packing & Shipping Review", d: "Confirm packing, labelling, documentation and shipping requirements for the approved order." },
];

export default function ProcessTimeline() {
  return (
    <section className="py-20 md:py-28 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="max-w-2xl mb-12">
          <p className="eyebrow mb-4">Production Journey</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
            From brief to <span className="text-gold italic">shipping review</span>.
          </h2>
          <p className="mt-4 text-foreground/70 text-sm md:text-base leading-relaxed">
            Every program is reviewed on its own requirements. Timelines and commercial terms are confirmed before commitment.
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
