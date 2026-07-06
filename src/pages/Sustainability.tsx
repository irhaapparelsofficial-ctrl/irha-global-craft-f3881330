import SEO from "@/components/SEO";
import sustainabilityImg from "@/assets/banners/sustainability.jpg";
import { Leaf, Users, Droplets, Recycle, ShieldCheck, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const PILLARS = [
  { Icon: Leaf, t: "Responsible Sourcing", d: "Organic and recycled fabric programs available on request per program — sourced from mills reviewed against your project requirements." },
  { Icon: Users, t: "Fair Working Conditions", d: "Documented working hours, safe workshops, first-aid and clean drinking water in our Sialkot atelier." },
  { Icon: Droplets, t: "Lower-Impact Wet Processing", d: "Low-impact dye options available and water-use tracked across wash and finishing." },
  { Icon: Recycle, t: "Recyclable Packaging", d: "Recycled poly bags and paper hangtags available as default packaging on request." },
  { Icon: ShieldCheck, t: "Chemical Management", d: "Dye and chemical selection aligned to buyer market requirements; documentation prepared per program." },
  { Icon: Heart, t: "Community Focus", d: "Long-term relationships with our team and their families in Sialkot, built around stable programs." },
];

const COMMITMENTS = [
  { y: "Now", t: "Recycled & organic fabric programs on request" },
  { y: "Ongoing", t: "Waste reduction across cutting and finishing" },
  { y: "Roadmap", t: "Reduce single-use plastic in packaging" },
  { y: "Roadmap", t: "Renewable energy on factory floor" },
];

export default function Sustainability() {
  return (
    <>
      <SEO
        title="Sustainability — Responsible Apparel Manufacturing | Irha Apparels"
        description="Irha Apparels' approach to responsible manufacturing — organic and recycled fabric programs on request, fair working conditions, and buyer-aligned material documentation."
        path="/sustainability"
      />

      <section className="relative pt-40 pb-24 md:pb-32 overflow-hidden">
        <img
          src={sustainabilityImg}
          alt="Responsible apparel manufacturing"
          loading="eager"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">Responsibility</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Made with <span className="text-gold italic">care</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">
            Premium apparel and responsible manufacturing are not opposites. We work with buyers on material,
            packaging and labelling choices that fit their program and destination market.
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-border/60">
        <div className="container-luxe">
          <div className="mb-14">
            <p className="eyebrow mb-4">How We Work</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
              Six focus areas behind <span className="text-gold italic">every order</span>.
            </h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
            {PILLARS.map(({ Icon, t, d }) => (
              <div key={t} className="bg-background p-8 hover:bg-card transition-colors">
                <Icon size={28} className="text-gold mb-5" strokeWidth={1.4} />
                <p className="font-display text-xl md:text-2xl">{t}</p>
                <p className="text-sm text-foreground/65 mt-3 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Focus Areas</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-3xl mb-14">
            Where we <span className="text-gold italic">focus</span>.
          </h2>
          <div className="grid md:grid-cols-4 gap-px bg-border/60 border border-border/60">
            {COMMITMENTS.map((c, i) => (
              <div key={`${c.y}-${i}`} className="bg-background p-8">
                <p className="font-display text-3xl md:text-4xl text-gold">{c.y}</p>
                <p className="text-sm text-foreground/80 mt-4 leading-relaxed">{c.t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-border/60 text-center">
        <div className="container-luxe max-w-3xl">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Source apparel you can <span className="text-gold italic">stand behind</span>.
          </h2>
          <Link
            to="/inquiry"
            className="mt-10 inline-flex bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
          >
            Start an Inquiry
          </Link>
        </div>
      </section>
    </>
  );
}
