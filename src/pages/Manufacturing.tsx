import SEO from "@/components/SEO";
import manufacturingImg from "@/assets/manufacturing.jpg";
import { Link } from "react-router-dom";

const steps = [
  { n: "01", t: "Pattern & Sampling", d: "Tech packs translated into approved pre-production samples within 7–14 days." },
  { n: "02", t: "Cutting", d: "Automated and manual cutting floors calibrated for knit, woven and leather." },
  { n: "03", t: "Stitching", d: "Specialized lines per category — overlock, flat-lock, bartack, and leather-grade machines." },
  { n: "04", t: "Embellishment", d: "In-house embroidery, screen, sublimation, puff and DTG printing." },
  { n: "05", t: "Washing & Finishing", d: "Enzyme, stone, garment dye and acid wash treatments with consistent shade control." },
  { n: "06", t: "Quality Control", d: "7-point inspection with AQL 2.5 standard before every shipment." },
  { n: "07", t: "Packaging & Export", d: "Custom poly bags, hangtags, retail-ready cartons and door-to-door logistics." },
];

export default function Manufacturing() {
  return (
    <>
      <SEO
        title="Manufacturing — OEM, ODM, Private Label | Irha Apparels Sialkot"
        description="Inside Irha Apparels' Sialkot factory — cutting, stitching, washing, QC and export logistics. OEM, ODM and private label apparel manufacturing under one roof."
        path="/manufacturing"
      />

      <section className="relative pt-40 pb-24 md:pb-32 overflow-hidden">
        <img src={manufacturingImg} loading="eager" width={1920} height={1080} alt="Factory floor" className="absolute inset-0 w-full h-full object-cover opacity-25"/>
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background"/>
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">The Atelier</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Inside the <span className="text-gold italic">Sialkot floor</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">
            Seven coordinated stages. One uncompromising standard. This is how every Irha garment moves
            from concept to container.
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-border/60">
        <div className="container-luxe">
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-2">
            {steps.map((s) => (
              <div key={s.n} className="grid grid-cols-[auto_1fr] gap-8 py-10 border-b border-border/60">
                <p className="font-display text-5xl text-gold">{s.n}</p>
                <div>
                  <h3 className="font-display text-2xl">{s.t}</h3>
                  <p className="text-foreground/70 mt-3 leading-relaxed text-sm">{s.d}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
        <div className="container-luxe grid md:grid-cols-4 gap-10 text-center">
          {[
            { n: "500K+", l: "Units / Year" },
            { n: "250+", l: "Skilled Artisans" },
            { n: "7-Pt", l: "QC Inspection" },
            { n: "30+", l: "Export Countries" },
          ].map((s)=>(
            <div key={s.l}>
              <p className="font-display text-5xl md:text-6xl text-gold">{s.n}</p>
              <p className="mt-3 text-xs uppercase tracking-[0.3em] text-muted-foreground">{s.l}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe text-center max-w-3xl mx-auto">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Production capacity, ready when <span className="text-gold italic">your brand</span> is.
          </h2>
          <Link to="/inquiry" className="mt-10 inline-flex bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
            Start an Inquiry
          </Link>
        </div>
      </section>
    </>
  );
}
