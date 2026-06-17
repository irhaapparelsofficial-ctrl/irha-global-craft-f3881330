import SEO from "@/components/SEO";
import sustainabilityImg from "@/assets/banners/sustainability.jpg";
import { Leaf, Users, Droplets, Recycle, ShieldCheck, Heart } from "lucide-react";
import { Link } from "react-router-dom";
import Certifications from "@/components/sections/Certifications";

const PILLARS = [
  { Icon: Leaf, t: "Sustainable Sourcing", d: "BCI cotton, GOTS organic options, LWG-certified leather and recycled polyester programs across every category." },
  { Icon: Users, t: "Ethical Labor", d: "BSCI and SEDEX audited factory — living wages, safe conditions, zero child labor, fully documented." },
  { Icon: Droplets, t: "Water Reduction", d: "Closed-loop water systems and low-impact dyes reduce our wash-floor water use by 40% vs. industry average." },
  { Icon: Recycle, t: "Recycled Packaging", d: "FSC-certified cartons, recycled poly bags and biodegradable hangtags as a default packaging option." },
  { Icon: ShieldCheck, t: "Chemical Compliance", d: "Full REACH compliance, OEKO-TEX 100 fabrics, ZDHC chemical management across the wet-process floor." },
  { Icon: Heart, t: "Community Investment", d: "Education stipends, healthcare access and skills training for our 350+ artisans and their families in Sialkot." },
];

const COMMITMENTS = [
  { y: "2025", t: "100% OEKO-TEX 100 fabric program" },
  { y: "2026", t: "50% renewable energy on factory floor" },
  { y: "2027", t: "Zero single-use plastic in packaging" },
  { y: "2030", t: "Carbon-neutral production targeted" },
];

export default function Sustainability() {
  return (
    <>
      <SEO
        title="Sustainability — Ethical & Eco Apparel Manufacturing | Irha Apparels"
        description="Irha Apparels' sustainability commitments — BSCI audited, OEKO-TEX 100 fabrics, organic & recycled programs, ethical labor and carbon-reduction roadmap."
        path="/sustainability"
      />

      {/* HERO */}
      <section className="relative pt-40 pb-24 md:pb-32 overflow-hidden">
        <img
          src={sustainabilityImg}
          alt="Sustainable apparel manufacturing"
          loading="eager"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">Responsibility</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Crafted with <span className="text-gold italic">conscience</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">
            Premium apparel and ethical manufacturing are not opposites. Every Irha garment is built on
            certified materials, audited labor practices and a measurable environmental roadmap.
          </p>
        </div>
      </section>

      {/* PILLARS */}
      <section className="py-24 md:py-32 border-t border-border/60">
        <div className="container-luxe">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-14">
            <div>
              <p className="eyebrow mb-4">Our Pillars</p>
              <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl">
                Six commitments behind <span className="text-gold italic">every order</span>.
              </h2>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px bg-border/60 border border-border/60">
            {PILLARS.map(({ Icon, t, d }) => (
              <div key={t} className="bg-background p-8 hover:bg-card transition-colors">
                <Icon size={28} className="text-primary mb-5" strokeWidth={1.4} />
                <p className="font-display text-2xl">{t}</p>
                <p className="text-sm text-foreground/65 mt-3 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Certifications />

      {/* ROADMAP */}
      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Roadmap</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-3xl mb-14">
            Where we are heading <span className="text-gold italic">— and when</span>.
          </h2>
          <div className="grid md:grid-cols-4 gap-px bg-border/60 border border-border/60">
            {COMMITMENTS.map((c) => (
              <div key={c.y} className="bg-background p-8">
                <p className="font-display text-5xl text-gold">{c.y}</p>
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
