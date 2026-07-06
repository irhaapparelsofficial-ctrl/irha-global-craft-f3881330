import { Layers, Palette, Tag, Boxes, ClipboardCheck, Ship } from "lucide-react";

const POINTS = [
  { Icon: Layers, t: "Custom Cut & Sew", d: "Develop programs from a tech pack, sketch, reference sample or clear product brief." },
  { Icon: Palette, t: "Branding Options", d: "Printing, embroidery, patches and heat-transfer requirements are reviewed by product." },
  { Icon: Tag, t: "Private Label Ready", d: "Woven labels, care labels, hangtags and packaging can be scoped to your brand system." },
  { Icon: Boxes, t: "Product Development", d: "Sampling, fit, material and construction requirements are reviewed before bulk production." },
  { Icon: ClipboardCheck, t: "Quality Requirements", d: "Measurements, workmanship, finishing and reporting needs can be scoped per program." },
  { Icon: Ship, t: "Order Documentation", d: "Share the documents and destination requirements you need so they can be reviewed before confirmation." },
];

export default function WhyB2B() {
  return (
    <section className="py-20 md:py-28 border-t border-border/60">
      <div className="container-luxe">
        <div className="max-w-3xl mb-12 md:mb-14">
          <p className="eyebrow mb-4">Built for B2B Programs</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
            A manufacturing partner <span className="text-gold italic">for brands and importers</span>.
          </h2>
          <p className="mt-5 text-foreground/70 text-base leading-relaxed max-w-2xl">
            We work with wholesalers, private-label brands and importers who need
            program-based apparel manufacturing — not off-the-shelf catalogue buying.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
          {POINTS.map(({ Icon, t, d }) => (
            <div key={t} className="bg-background p-7 md:p-8">
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
