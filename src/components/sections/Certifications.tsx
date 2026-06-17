import { ShieldCheck, Leaf, Award, BadgeCheck, Factory, Globe2 } from "lucide-react";

const CERTS = [
  { Icon: ShieldCheck, name: "OEKO-TEX® 100", desc: "Tested for harmful substances across every textile component." },
  { Icon: Leaf, name: "GOTS Organic", desc: "Certified organic cotton with full chain-of-custody traceability." },
  { Icon: Award, name: "BSCI Audited", desc: "Business Social Compliance Initiative — ethical labor practices verified." },
  { Icon: BadgeCheck, name: "SEDEX SMETA", desc: "Four-pillar audit on labor, health, environment & business ethics." },
  { Icon: Factory, name: "WRAP Certified", desc: "Worldwide Responsible Accredited Production for ethical manufacturing." },
  { Icon: Globe2, name: "REACH Compliant", desc: "EU regulation compliance on chemicals, dyes and finishes." },
];

export default function Certifications() {
  return (
    <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
          <div>
            <p className="eyebrow mb-4">Compliance & Certifications</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
              Audited, certified and <span className="text-gold italic">retail-ready</span>.
            </h2>
          </div>
          <p className="text-sm text-foreground/65 max-w-md leading-relaxed">
            Every fabric and finishing process meets international compliance standards demanded by EU, USA and Gulf retailers.
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
