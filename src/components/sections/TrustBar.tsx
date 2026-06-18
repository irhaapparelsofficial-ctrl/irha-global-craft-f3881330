import { Globe2, Calendar, Package, Truck, ShieldCheck, BadgeCheck } from "lucide-react";

const ITEMS = [
  { Icon: Globe2,      k: "50+",        v: "Countries Served" },
  { Icon: Calendar,    k: "12 yrs",     v: "Export Heritage" },
  { Icon: Package,     k: "MOQ 50",     v: "Per Design / Color" },
  { Icon: Truck,       k: "45-Day",     v: "FOB Karachi" },
  { Icon: ShieldCheck, k: "OEKO-TEX",   v: "Std 100 Fabrics" },
  { Icon: BadgeCheck,  k: "BSCI · SEDEX", v: "Audited Atelier" },
];

export default function TrustBar() {
  return (
    <section
      aria-label="Trust signals"
      className="border-y border-border/60 bg-card/40 backdrop-blur"
    >
      <div className="container-luxe py-7 md:py-9">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-x-6 gap-y-7">
          {ITEMS.map(({ Icon, k, v }) => (
            <div
              key={k}
              className="flex items-center gap-3 md:gap-4 md:justify-center"
            >
              <Icon className="text-primary shrink-0" size={20} strokeWidth={1.5} />
              <div className="leading-tight">
                <p className="font-display text-lg md:text-xl">{k}</p>
                <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5">
                  {v}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
