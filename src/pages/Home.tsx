import { Link } from "react-router-dom";
import { ArrowUpRight, Download, MessageCircle, ShieldCheck, Globe2, Factory, Award } from "lucide-react";
import heroImg from "@/assets/hero.jpg";
import manufacturingImg from "@/assets/manufacturing.jpg";
import { CATEGORIES } from "@/lib/categories";
import { whatsappLink, BRAND } from "@/lib/constants";
import SEO from "@/components/SEO";

export default function Home() {
  return (
    <>
      <SEO
        title="Irha Apparels — Premium Apparel Manufacturer in Sialkot, Pakistan"
        description="OEM, ODM & Private Label apparel manufacturer in Sialkot. Bavarian wear, sportswear, leatherwear, streetwear, leisurewear & nightwear. Worldwide export to USA, EU, UAE."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.name,
          url: "/",
          telephone: BRAND.phone,
          address: { "@type": "PostalAddress", addressLocality: "Sialkot", addressCountry: "PK" },
        }}
      />

      {/* HERO */}
      <section className="relative min-h-screen flex items-end overflow-hidden">
        <img
          src={heroImg}
          alt="Irha Apparels luxury manufacturing"
          className="absolute inset-0 w-full h-full object-cover"
          width={1920}
          height={1280}
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-background/30" />

        <div className="container-luxe relative pb-24 md:pb-32 pt-40 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 animate-fade-in">
            <p className="eyebrow mb-6">Est. Sialkot · Worldwide Export</p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight max-w-4xl">
              Global Premium <br />
              <span className="text-gold italic font-normal">Apparel Manufacturer</span> <br />
              from Sialkot.
            </h1>
            <p className="mt-8 text-base md:text-lg text-foreground/80 max-w-xl leading-relaxed">
              OEM · ODM · Private Label export manufacturing — engineered for the world's
              most ambitious fashion houses, retailers and emerging labels.
            </p>
          </div>

          <div className="lg:col-span-4 flex flex-col gap-3 animate-fade-in">
            <Link
              to="/inquiry"
              className="group inline-flex items-center justify-between bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all"
            >
              Get Instant Quote
              <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
            </Link>
            <a
              href={whatsappLink()}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-between border border-foreground/30 hover:border-primary hover:text-primary px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors"
            >
              <span className="flex items-center gap-3"><MessageCircle size={16}/> WhatsApp Now</span>
              <ArrowUpRight size={18} />
            </a>
            <a
              href={whatsappLink("Hi, please share the Irha Apparels catalog.")}
              target="_blank"
              rel="noreferrer"
              className="group inline-flex items-center justify-between border border-foreground/15 hover:border-foreground/40 px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors text-foreground/70"
            >
              <span className="flex items-center gap-3"><Download size={16}/> Download Catalog</span>
              <ArrowUpRight size={18} />
            </a>
          </div>
        </div>
      </section>

      {/* TRUST MARQUEE */}
      <section className="border-y border-border/60 bg-background overflow-hidden">
        <div className="flex whitespace-nowrap animate-marquee py-6">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex shrink-0 items-center gap-16 px-8 text-foreground/40">
              {["OEM Manufacturing", "ODM Development", "Private Label", "Worldwide Export", "Sialkot Heritage", "Premium Quality", "Low MOQ Friendly"].map((t) => (
                <span key={t} className="text-xs uppercase tracking-[0.4em] flex items-center gap-16">
                  {t}
                  <span className="text-primary">✦</span>
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* INTRO / VALUE */}
      <section className="py-28 md:py-40">
        <div className="container-luxe grid lg:grid-cols-12 gap-14">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-6">The House of Irha</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              A new standard for <span className="text-gold italic">export-grade</span> apparel manufacturing.
            </h2>
          </div>
          <div className="lg:col-span-6 lg:col-start-7 text-foreground/75 text-base md:text-lg leading-relaxed space-y-6">
            <p>
              From our Sialkot atelier — Pakistan's most storied garment district — Irha Apparels
              produces apparel for fashion houses, sports brands and luxury retailers across three continents.
            </p>
            <p>
              Every order is treated as a runway piece: cut, stitched and finished to specifications
              that survive the most demanding retail floors in Berlin, Dubai and New York.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 pt-6">
              {[
                { n: "12+", l: "Years" },
                { n: "30+", l: "Countries" },
                { n: "500K", l: "Units/Year" },
                { n: "98%", l: "QC Pass" },
              ].map((s) => (
                <div key={s.l}>
                  <p className="font-display text-4xl text-gold">{s.n}</p>
                  <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mt-2">{s.l}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COLLECTIONS */}
      <section className="py-20 md:py-32 bg-secondary/40">
        <div className="container-luxe">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8 mb-16">
            <div>
              <p className="eyebrow mb-5">The Collections</p>
              <h2 className="font-display text-4xl md:text-6xl leading-[1.02] max-w-2xl">
                Six categories. <br />
                <span className="text-gold italic">One obsession.</span>
              </h2>
            </div>
            <Link to="/products" className="text-xs uppercase tracking-[0.3em] hover-gold-underline">
              View All Collections →
            </Link>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {CATEGORIES.map((c, i) => (
              <Link
                key={c.slug}
                to="/products"
                className="group relative aspect-[3/4] overflow-hidden bg-muted"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <img
                  src={c.image}
                  alt={c.name}
                  loading="lazy"
                  width={1024}
                  height={1280}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-110"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <div className="absolute inset-0 p-7 flex flex-col justify-end">
                  <p className="text-[10px] uppercase tracking-[0.35em] text-primary mb-2">{c.short}</p>
                  <h3 className="font-display text-3xl mb-3">{c.name}</h3>
                  <p className="text-sm text-foreground/70 line-clamp-2 max-w-xs">{c.description}</p>
                  <div className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary">
                    Explore <ArrowUpRight size={14} />
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* MANUFACTURING TEASER */}
      <section className="relative py-28 md:py-40 overflow-hidden">
        <img
          src={manufacturingImg}
          alt="Irha Apparels Sialkot manufacturing floor"
          loading="lazy"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-background/70" />
        <div className="container-luxe relative grid lg:grid-cols-2 gap-14 items-center">
          <div>
            <p className="eyebrow mb-6">The Atelier</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Stitched in <span className="text-gold italic">Sialkot</span>. <br />
              Shipped to the world.
            </h2>
            <p className="text-foreground/75 mt-6 max-w-lg leading-relaxed">
              A vertically integrated production house — cutting, stitching, washing, finishing
              and quality control under one roof. Every garment passes our 7-point inspection
              before it leaves the floor.
            </p>
            <Link
              to="/manufacturing"
              className="mt-10 inline-flex items-center gap-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] transition-all"
            >
              Inside the Factory <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { Icon: Factory, t: "Vertical Production", d: "Cut, sew & finish in-house" },
              { Icon: ShieldCheck, t: "7-Point QC", d: "Pre-shipment inspection" },
              { Icon: Globe2, t: "Worldwide Export", d: "USA · EU · UAE · KSA · UK" },
              { Icon: Award, t: "OEKO-TEX Fabrics", d: "Certified sourcing" },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="border border-border/70 bg-card/40 backdrop-blur p-6">
                <Icon className="text-primary" size={22} />
                <p className="font-display text-xl mt-4">{t}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="py-28 md:py-36 border-t border-border/60">
        <div className="container-luxe text-center max-w-4xl mx-auto">
          <p className="eyebrow justify-center inline-flex mb-6">Begin Your Order</p>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.02]">
            Ready to build your <br />
            <span className="text-gold italic">next collection?</span>
          </h2>
          <p className="text-foreground/70 mt-6 text-lg max-w-xl mx-auto">
            From sample to shipment — we partner with brands that demand more than ordinary manufacturing.
          </p>
          <div className="mt-12 flex flex-wrap gap-4 justify-center">
            <Link to="/inquiry" className="bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
              Start an Inquiry
            </Link>
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="border border-foreground/30 hover:border-primary hover:text-primary px-8 py-4 text-xs uppercase tracking-[0.3em] transition-colors">
              WhatsApp the Atelier
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
