import { ClipboardList, Scissors, Layers, Sparkles, ShieldCheck, Truck } from "lucide-react";

const STEPS = [
  { Icon: ClipboardList, n: "01", t: "Concept & Tech Pack", d: "Brief, sketches and measurements translated to a production-ready tech pack within 48 hours." },
  { Icon: Scissors, n: "02", t: "Sampling", d: "Pre-production samples shipped in 7–14 days for approval before bulk." },
  { Icon: Layers, n: "03", t: "Bulk Production", d: "Cut, stitch, embellish and finish — every stage in-house, fully transparent." },
  { Icon: Sparkles, n: "04", t: "Finishing", d: "Wash, press, label, tag and pack to your exact retail-floor spec." },
  { Icon: ShieldCheck, n: "05", t: "Quality Control", d: "7-point inspection at AQL 2.5 standard before clearance for export." },
  { Icon: Truck, n: "06", t: "Worldwide Export", d: "Door-to-door logistics to USA, EU, UAE, KSA, UK and beyond." },
];

export default function ProcessTimeline() {
  return (
    <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
          <div>
            <p className="eyebrow mb-4">From Concept to Container</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
              A <span className="text-gold italic">six-stage</span> production journey.
            </h2>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
          {STEPS.map(({ Icon, n, t, d }) => (
            <div key={n} className="bg-background p-8 group hover:bg-card transition-colors relative">
              <p className="font-display text-5xl text-gold/20 absolute top-6 right-6">{n}</p>
              <Icon className="text-primary" size={26} strokeWidth={1.4} />
              <h3 className="font-display text-2xl mt-6">{t}</h3>
              <p className="text-sm text-foreground/70 mt-3 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
