import SEO from "@/components/SEO";
import manufacturingImg from "@/assets/manufacturing.jpg";
import { Globe2, ShieldCheck, Sparkles, Users } from "lucide-react";

const markets = ["United States", "Germany", "United Kingdom", "France", "Italy", "United Arab Emirates", "Saudi Arabia", "Canada", "Australia", "Netherlands"];

export default function About() {
  return (
    <>
      <SEO
        title="About Irha Apparels — Sialkot's Premium Garment Manufacturer"
        description="Discover Irha Apparels — a Sialkot-based premium apparel manufacturer exporting to USA, Europe and UAE. Heritage craftsmanship, modern production capacity."
        path="/about"
      />

      {/* HERO */}
      <section className="pt-40 pb-24 md:pb-32 border-b border-border/60">
        <div className="container-luxe grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-2 hidden lg:block">
            <p className="eyebrow rotate-90 origin-top-left translate-y-20">About · 2026</p>
          </div>
          <div className="lg:col-span-10">
            <p className="eyebrow mb-6 lg:hidden">About Irha</p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95]">
              A heritage of <span className="text-gold italic">craft</span>. <br />
              A future built for <span className="text-gold italic">scale</span>.
            </h1>
            <p className="mt-10 max-w-2xl text-lg text-foreground/75 leading-relaxed">
              Irha Apparels was founded on a single belief: that the garments produced in Sialkot
              deserve to stand beside the finest labels in Milan, Munich and New York. Today, we
              manufacture for brands that share that conviction.
            </p>
          </div>
        </div>
      </section>

      {/* STORY */}
      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-2 gap-16">
          <div className="relative aspect-[4/5] overflow-hidden">
            <img src={manufacturingImg} alt="Sialkot manufacturing heritage" loading="lazy" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div className="space-y-8 self-center">
            <p className="eyebrow">Sialkot Heritage</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Where the world's <span className="text-gold italic">finest garments</span> are stitched.
            </h2>
            <p className="text-foreground/75 leading-relaxed">
              For over a century, Sialkot has been Pakistan's atelier — supplying the global sports,
              leather and fashion industries with goods that combine artisan skill with industrial precision.
              Irha Apparels stands in that lineage, building on generations of expertise while
              re-engineering the export experience for modern brands.
            </p>
            <p className="text-foreground/75 leading-relaxed">
              Our facility brings together cutting, sewing, embroidery, washing, finishing and
              packaging under one roof — eliminating the bottlenecks that slow most overseas production.
            </p>
            <div className="grid grid-cols-2 gap-6 pt-4">
              {[{Icon: Users, t:"250+ Artisans"},{Icon: ShieldCheck, t:"ISO QC Standards"},{Icon: Globe2, t:"30+ Export Countries"},{Icon: Sparkles, t:"OEM · ODM · Private Label"}].map(({Icon,t})=>(
                <div key={t} className="flex items-center gap-3">
                  <Icon className="text-primary shrink-0" size={20}/>
                  <span className="text-sm text-foreground/80">{t}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* MARKETS */}
      <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Export Markets</p>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.02] max-w-3xl">
            Trusted by brands in <span className="text-gold italic">30+ countries</span>.
          </h2>
          <div className="mt-14 grid grid-cols-2 md:grid-cols-5 gap-x-8 gap-y-4 border-t border-border/60 pt-10">
            {markets.map((m, i) => (
              <div key={m} className="flex items-center justify-between border-b border-border/60 py-4">
                <span className="font-display text-xl">{m}</span>
                <span className="text-xs text-muted-foreground">0{i+1}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-3 gap-10">
          {[
            { n: "01", t: "Quality Control", d: "Every garment passes a 7-point inspection — measurements, stitching, seams, trims, wash, packaging and final QA — before clearance for export." },
            { n: "02", t: "Production Capacity", d: "Up to 500,000 units annually across knits, wovens and leather, with flexible MOQs starting from 50 pieces per style for emerging brands." },
            { n: "03", t: "Compliance & Ethics", d: "OEKO-TEX certified fabrics, ethical labor practices, and full transparency on sourcing — built for brands that audit their supply chain." },
          ].map((c) => (
            <div key={c.n} className="border border-border/70 p-10 bg-card/40">
              <p className="font-display text-5xl text-gold">{c.n}</p>
              <h3 className="font-display text-2xl mt-6">{c.t}</h3>
              <p className="text-sm text-foreground/70 mt-4 leading-relaxed">{c.d}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
