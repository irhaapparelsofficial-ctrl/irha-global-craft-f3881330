import { ClipboardList, Scissors, Layers, Sparkles, ShieldCheck, Truck, Sparkle } from "lucide-react";

const STEPS = [
  { Icon: ClipboardList, n: "01", t: "Concept & Tech Pack", d: "Brief, sketches and measurements translated to a production-ready tech pack within 48 hours.", focus: "This week our design desk is turning around tech packs in under 36 hours for confirmed PO clients." },
  { Icon: Scissors, n: "02", t: "Sampling", d: "Pre-production samples shipped in 7–14 days for approval before bulk.", focus: "Sampling room is running an express 7-day lane this week for repeat distributors." },
  { Icon: Layers, n: "03", t: "Bulk Production", d: "Cut, stitch, embellish and finish — every stage in-house, fully transparent.", focus: "Two new stitching lines went live this week — bulk capacity expanded by 18%." },
  { Icon: Sparkles, n: "04", t: "Finishing", d: "Wash, press, label, tag and pack to your exact retail-floor spec.", focus: "Finishing floor is shipping retail-ready hang-tag & poly-bag programs this week." },
  { Icon: ShieldCheck, n: "05", t: "Quality Control", d: "7-point inspection at AQL 2.5 standard before clearance for export.", focus: "QC team locked a 99.2% pass rate this week across all export orders." },
  { Icon: Truck, n: "06", t: "Worldwide Export", d: "Door-to-door logistics to USA, EU, UAE, KSA, UK and beyond.", focus: "This week's containers cleared for USA, UK, KSA and UAE — DDP lanes open." },
];

// ISO week number — stable, advances exactly once per week
function getISOWeek(date = new Date()) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((+d - +yearStart) / 86400000 + 1) / 7);
}

export default function ProcessTimeline() {
  const week = getISOWeek();
  const focusIndex = week % STEPS.length;
  const focusStep = STEPS[focusIndex];

  return (
    <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div>
            <p className="eyebrow mb-4">From Concept to Container</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
              A <span className="text-gold italic">six-stage</span> production journey.
            </h2>
          </div>
          <div className="md:max-w-sm border-l-2 border-gold/60 pl-5">
            <p className="eyebrow text-gold mb-2 flex items-center gap-2">
              <Sparkle size={12} /> This Week · W{week}
            </p>
            <p className="text-sm text-foreground/80 leading-relaxed">
              <span className="font-medium text-foreground">{focusStep.t}:</span> {focusStep.focus}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
          {STEPS.map(({ Icon, n, t, d }, i) => {
            const isFocus = i === focusIndex;
            return (
              <div
                key={n}
                className={`p-8 group transition-colors relative ${
                  isFocus ? "bg-card ring-1 ring-inset ring-gold/50" : "bg-background hover:bg-card"
                }`}
              >
                {isFocus && (
                  <span className="absolute top-4 left-4 text-[10px] tracking-[0.18em] uppercase text-gold font-medium">
                    Focus · W{week}
                  </span>
                )}
                <p className="font-display text-5xl text-gold/20 absolute top-6 right-6">{n}</p>
                <Icon className={isFocus ? "text-gold" : "text-primary"} size={26} strokeWidth={1.4} />
                <h3 className="font-display text-2xl mt-6">{t}</h3>
                <p className="text-sm text-foreground/70 mt-3 leading-relaxed">{d}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
