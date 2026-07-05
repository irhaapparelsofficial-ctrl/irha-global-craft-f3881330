import { ShieldCheck, Layers, ClipboardList, BadgeCheck, Factory, Globe2 } from "lucide-react";

const ITEMS = [
  { Icon: ShieldCheck, name: "Quality Checks", desc: "Inline and final quality review before dispatch — reported per project as required." },
  { Icon: Layers, name: "Material Sourcing", desc: "Fabric, leather and trims sourced against the requirements of each program." },
  { Icon: ClipboardList, name: "Documented Processes", desc: "Production steps documented per order so cut, assembly and finishing stay consistent." },
  { Icon: BadgeCheck, name: "Export Documentation", desc: "Form-E, COO, packing lists and commercial invoices prepared in-house per shipment." },
  { Icon: Factory, name: "OEM · ODM · Private Label", desc: "Full-package production from tech pack to labelled, retail-ready cartons." },
  { Icon: Globe2, name: "Buyer-Aligned Packaging", desc: "Labelling and packaging tailored to your destination market and retail requirements." },
];

export default function Certifications() {
  return (
    <section className="py-20 md:py-28 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-12">
          <div>
            <p className="eyebrow mb-4">Production Discipline</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.04] max-w-2xl">
              Documented, <span className="text-gold italic">retail-ready</span>.
            </h2>
          </div>
          <p className="text-sm text-foreground/65 max-w-md leading-relaxed">
            Verified certifications will be published here once uploaded and approved.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
          {ITEMS.map(({ Icon, name, desc }) => (
            <div key={name} className="bg-background p-7 md:p-8 hover:bg-card transition-colors">
              <Icon size={26} className="text-gold mb-4" strokeWidth={1.4} />
              <p className="font-display text-lg md:text-xl">{name}</p>
              <p className="text-sm text-foreground/65 mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
