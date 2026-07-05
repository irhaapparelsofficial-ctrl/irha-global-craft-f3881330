import { Scissors, Sparkles, Printer, Tag, PenTool, Package, FlaskConical, Ruler } from "lucide-react";

const CAPS = [
  { Icon: Scissors, t: "Cut & Sew" },
  { Icon: Sparkles, t: "Embroidery" },
  { Icon: Printer, t: "Printing & Decoration" },
  { Icon: Tag, t: "Private Label" },
  { Icon: PenTool, t: "Custom Branding" },
  { Icon: Package, t: "Packaging Options" },
  { Icon: FlaskConical, t: "Product Development" },
  { Icon: Ruler, t: "Sampling" },
];

export default function ManufacturingCapabilities() {
  return (
    <section className="py-20 md:py-28 bg-secondary/30 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Manufacturing Capabilities</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
              Everything a program <span className="text-gold italic">needs, in-house</span>.
            </h2>
          </div>
          <p className="text-sm text-foreground/65 max-w-sm leading-relaxed">
            Services scoped to your order — quantity, material, branding and packaging confirmed on quote.
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-px bg-border/60 border border-border/60">
          {CAPS.map(({ Icon, t }) => (
            <div key={t} className="bg-background p-6 md:p-7 flex items-center gap-4">
              <span className="inline-flex items-center justify-center w-10 h-10 border border-gold/40 text-gold shrink-0">
                <Icon size={18} strokeWidth={1.5} />
              </span>
              <p className="font-display text-sm md:text-base leading-tight">{t}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
