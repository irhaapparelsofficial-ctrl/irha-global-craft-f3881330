import { Package, Layers, Tag, Ship } from "lucide-react";

const ITEMS = [
  { Icon: Package, k: "Flexible MOQ", v: "By product" },
  { Icon: Layers, k: "Custom Manufacturing", v: "OEM · ODM" },
  { Icon: Tag, k: "Private Label", v: "Your brand system" },
  { Icon: Ship, k: "Worldwide Export", v: "FOB Sialkot" },
];

export default function CapabilityStrip() {
  return (
    <section aria-label="Capabilities" className="border-y border-border/60 bg-card/40">
      <div className="container-luxe py-6 md:py-7">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-5 gap-y-5">
          {ITEMS.map(({ Icon, k, v }) => (
            <div key={k} className="flex items-center gap-3 md:justify-center">
              <Icon className="text-gold shrink-0" size={18} strokeWidth={1.5} />
              <div className="leading-tight min-w-0">
                <p className="font-display text-sm md:text-base truncate">{k}</p>
                <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5 truncate">
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
