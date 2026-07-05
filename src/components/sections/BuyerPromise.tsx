import { ClipboardCheck, Layers, Package, Truck, Ship, MessageCircle } from "lucide-react";

const POINTS = [
  { Icon: ClipboardCheck, t: "Scope confirmed before production", d: "We review your tech pack, sketch or sample and align on materials, branding and quantity in writing." },
  { Icon: Layers, t: "Materials & branding per order", d: "Fabrics, trims, labels and packaging are agreed and signed off before we cut bulk." },
  { Icon: Package, t: "Sampling where required", d: "Pre-production samples for approval when the program calls for it — no assumptions in bulk." },
  { Icon: Truck, t: "Timeline agreed on the PO", d: "Sample and bulk timelines are quoted and confirmed on the PO, not promised in a brochure." },
  { Icon: Ship, t: "Quality checks before dispatch", d: "Inline and final quality checks; photo or video reporting available on request." },
  { Icon: MessageCircle, t: "Communication throughout", d: "One point of contact across development, production and export — status kept current." },
];

export default function BuyerPromise() {
  return (
    <section className="py-20 md:py-28 border-t border-border/60">
      <div className="container-luxe">
        <div className="max-w-3xl mb-12">
          <p className="eyebrow mb-4">How We Manage B2B Programs</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            Programs run <span className="text-gold italic">predictably</span>.
          </h2>
          <p className="mt-5 text-foreground/70 text-base leading-relaxed max-w-2xl">
            How we handle a wholesale account — the working process behind every PO we accept.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60">
          {POINTS.map(({ Icon, t, d }) => (
            <div key={t} className="bg-background p-7 md:p-8 hover:bg-card/50 transition-colors">
              <Icon className="text-gold" size={22} strokeWidth={1.5} />
              <h3 className="font-display text-lg md:text-xl mt-5 leading-snug">{t}</h3>
              <p className="text-sm text-foreground/70 mt-2 leading-relaxed">{d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
