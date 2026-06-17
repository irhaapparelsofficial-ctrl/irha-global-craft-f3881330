import SEO from "@/components/SEO";
import manufacturingImg from "@/assets/manufacturing.jpg";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import { Link } from "react-router-dom";
import KpiCounters from "@/components/sections/KpiCounters";
import Certifications from "@/components/sections/Certifications";
import { Check } from "lucide-react";

const steps = [
  { n: "01", t: "Pattern & Sampling", d: "Tech packs translated into approved pre-production samples within 7–14 days." },
  { n: "02", t: "Cutting", d: "Automated and manual cutting floors calibrated for knit, woven and leather." },
  { n: "03", t: "Stitching", d: "Specialized lines per category — overlock, flat-lock, bartack, and leather-grade machines." },
  { n: "04", t: "Embellishment", d: "In-house embroidery, screen, sublimation, puff and DTG printing." },
  { n: "05", t: "Washing & Finishing", d: "Enzyme, stone, garment dye and acid wash treatments with consistent shade control." },
  { n: "06", t: "Quality Control", d: "7-point inspection with AQL 2.5 standard before every shipment." },
  { n: "07", t: "Packaging & Export", d: "Custom poly bags, hangtags, retail-ready cartons and door-to-door logistics." },
];

const CAPACITY = [
  { cat: "Knits (tees, polos, hoodies)", monthly: "120,000 pcs", lead: "25–35 days", moq: "50 pcs" },
  { cat: "Wovens (shirts, chinos)", monthly: "60,000 pcs", lead: "35–45 days", moq: "50 pcs" },
  { cat: "Sportswear (sublimated)", monthly: "80,000 pcs", lead: "25–35 days", moq: "50 sets" },
  { cat: "Leather garments", monthly: "12,000 pcs", lead: "55–70 days", moq: "50 pcs" },
  { cat: "Trachten / Lederhosen", monthly: "8,000 sets", lead: "45–60 days", moq: "50 sets" },
  { cat: "Silk & nightwear", monthly: "20,000 pcs", lead: "35–55 days", moq: "50 sets" },
];

const QC = [
  "Fabric inspection at intake — 4-point system",
  "Cutting accuracy & marker efficiency check",
  "In-line stitching audit every 2 hours",
  "Mid-line measurement & seam strength",
  "Final inspection — workmanship, trims, wash",
  "Pre-shipment AQL 2.5 audit (3rd party welcome)",
];

const MACHINES = [
  "Single & double-needle lockstitch",
  "Overlock & flat-lock for knits",
  "Bartack & buttonhole",
  "Leather-grade walking-foot machines",
  "Computerized embroidery (15 heads)",
  "Sublimation press (1.8m wide)",
  "Screen, DTG & puff print stations",
  "Industrial wash & garment dye line",
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
        <img src={factoryCinematic} loading="eager" width={1920} height={1080} alt="Factory floor" className="absolute inset-0 w-full h-full object-cover opacity-30"/>
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

      {/* 7-STAGE PROCESS */}
      <section className="py-24 md:py-32 border-t border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-4">The Production Floor</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl mb-14">
            A <span className="text-gold italic">seven-stage</span> journey, end to end.
          </h2>
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

      {/* CAPACITY MATRIX */}
      <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Production Capacity</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl mb-14">
            Monthly capacity, <span className="text-gold italic">by category</span>.
          </h2>
          <div className="border border-border/60 bg-background overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left">
                  <th className="px-6 py-5 text-[11px] uppercase tracking-[0.25em] text-foreground/60 font-normal">Category</th>
                  <th className="px-6 py-5 text-[11px] uppercase tracking-[0.25em] text-foreground/60 font-normal">Monthly Capacity</th>
                  <th className="px-6 py-5 text-[11px] uppercase tracking-[0.25em] text-foreground/60 font-normal">Lead Time</th>
                  <th className="px-6 py-5 text-[11px] uppercase tracking-[0.25em] text-foreground/60 font-normal">MOQ</th>
                </tr>
              </thead>
              <tbody>
                {CAPACITY.map((r) => (
                  <tr key={r.cat} className="border-b border-border/60 last:border-0 hover:bg-card/50 transition-colors">
                    <td className="px-6 py-5 font-display text-base md:text-lg">{r.cat}</td>
                    <td className="px-6 py-5 text-foreground/85">{r.monthly}</td>
                    <td className="px-6 py-5 text-foreground/70">{r.lead}</td>
                    <td className="px-6 py-5 text-foreground/70">{r.moq}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <KpiCounters />

      {/* MACHINERY + QC */}
      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-6">
            <p className="eyebrow mb-4">Machinery & Capability</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.05] mb-10">
              500+ machines across <span className="text-gold italic">every discipline</span>.
            </h2>
            <ul className="space-y-3">
              {MACHINES.map((m) => (
                <li key={m} className="flex items-start gap-3 text-foreground/80">
                  <Check size={18} className="text-primary shrink-0 mt-0.5" />
                  <span>{m}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-6">
            <p className="eyebrow mb-4">6-Stage Quality Control</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.05] mb-10">
              <span className="text-gold italic">98%</span> first-pass yield, every shipment.
            </h2>
            <ol className="space-y-4">
              {QC.map((q, i) => (
                <li key={q} className="flex items-start gap-4 text-foreground/80 border-l-2 border-primary/40 pl-5">
                  <span className="font-display text-2xl text-gold w-8 shrink-0">{(i + 1).toString().padStart(2, "0")}</span>
                  <span className="pt-1">{q}</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      <Certifications />

      <section className="py-24 md:py-32">
        <div className="container-luxe relative aspect-[16/7] overflow-hidden">
          <img src={manufacturingImg} alt="Factory" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-background/70 flex items-center justify-center text-center px-6">
            <div className="max-w-2xl">
              <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
                Production capacity, ready when <span className="text-gold italic">your brand</span> is.
              </h2>
              <Link to="/inquiry" className="mt-10 inline-flex bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
                Start an Inquiry
              </Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
