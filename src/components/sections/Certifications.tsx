import { ShieldCheck, Leaf, Award, BadgeCheck, Factory, Globe2 } from "lucide-react";

const CERTS = [
  { Icon: ShieldCheck, name: "In-House Quality Control", desc: "Inline and final AQL inspection on every production run before dispatch." },
  { Icon: Leaf, name: "Responsible Sourcing", desc: "Traceable fabric and leather sourcing from vetted mill and tannery partners." },
  { Icon: Award, name: "Ethical Manufacturing", desc: "Fair, safe working conditions across our Sialkot atelier — documented SOPs." },
  { Icon: BadgeCheck, name: "Export Documentation", desc: "Form-E, COO, packing lists and commercial invoices prepared in-house." },
  { Icon: Factory, name: "OEM · ODM · Private Label", desc: "Full-package production from tech pack to labelled, retail-ready cartons." },
  { Icon: Globe2, name: "EU & US Market Ready", desc: "Labelling, packaging and documentation aligned to buyer requirements." },
];

export default function Certifications() {
  return (
    <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
          <div>
            <p className="eyebrow mb-4">Production Discipline</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
              Disciplined, documented and <span className="text-gold italic">retail-ready</span>.
            </h2>
          </div>
          <p className="text-sm text-foreground/65 max-w-md leading-relaxed">
            Every fabric and finishing process is built around the QC and documentation discipline EU, USA and Gulf retailers demand.
          </p>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
          {CERTS.map(({ Icon, name, desc }) => (
            <div key={name} className="bg-background p-8 group hover:bg-card transition-colors">
              <Icon size={28} className="text-primary mb-5" strokeWidth={1.4} />
              <p className="font-display text-xl">{name}</p>
              <p className="text-sm text-foreground/65 mt-2 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
