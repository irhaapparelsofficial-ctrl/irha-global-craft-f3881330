import { Link } from "react-router-dom";
import { useState } from "react";
import { ArrowUpRight, Download, Eye, MessageCircle, ShieldCheck, Globe2, Factory, Award } from "lucide-react";
import CatalogFlipbook from "@/components/CatalogFlipbook";
import CatalogThumbnailStrip from "@/components/CatalogThumbnailStrip";
import manufacturingImg from "@/assets/manufacturing.jpg";
import leatherJacket from "@/assets/banners/leather-jacket.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherJacketFallback from "@/assets/banners/leather-jacket.jpg?w=1600&format=webp&quality=74";
import leatherFlatlay from "@/assets/banners/leather-flatlay.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherFlatlayFallback from "@/assets/banners/leather-flatlay.jpg?w=1600&format=webp&quality=74";
import leatherStitch from "@/assets/banners/leather-stitch.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherStitchFallback from "@/assets/banners/leather-stitch.jpg?w=1600&format=webp&quality=74";
import leatherShowroom from "@/assets/banners/leather-showroom.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherShowroomFallback from "@/assets/banners/leather-showroom.jpg?w=1600&format=webp&quality=74";
import leatherStack from "@/assets/banners/leather-stack.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherStackFallback from "@/assets/banners/leather-stack.jpg?w=1600&format=webp&quality=74";
import HeroSlideshow from "@/components/HeroSlideshow";
import { CATEGORIES } from "@/lib/categories";
import { whatsappLink, BRAND } from "@/lib/constants";
import { forceDownload } from "@/lib/download";
import { toast } from "sonner";
import SEO from "@/components/SEO";
import ClientsMarquee from "@/components/sections/ClientsMarquee";
import Certifications from "@/components/sections/Certifications";
import KpiCounters from "@/components/sections/KpiCounters";
import Testimonials from "@/components/sections/Testimonials";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import TrustBar from "@/components/sections/TrustBar";
import BuyerPromise from "@/components/sections/BuyerPromise";
import FounderNote from "@/components/sections/FounderNote";
import FacebookFeed from "@/components/sections/FacebookFeed";

export default function Home() {
  const [flipOpen, setFlipOpen] = useState(false);
  return (
    <>
      <SEO
        title="Irha Apparels — Premium Apparel Manufacturer, Sialkot"
        description="OEM, ODM & private-label apparel manufacturer in Sialkot, Pakistan. Bavarian, sportswear, leather, streetwear, leisure & nightwear — exported worldwide."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.name,
          url: "https://www.irhaapparels.com/",
          logo: "https://www.irhaapparels.com/favicon.ico",
          description:
            "OEM, ODM and private-label apparel manufacturer in Sialkot, Pakistan. Bavarian, sportswear, leather, streetwear, leisure and nightwear exported worldwide.",
          telephone: BRAND.phone,
          address: { "@type": "PostalAddress", addressLocality: "Sialkot", addressCountry: "PK" },
          sameAs: [
            "https://www.instagram.com/irhaapparels",
            "https://www.facebook.com/irhaapparels",
            "https://www.linkedin.com/company/irha-apparels",
          ],
        }}
      />


      {/* HERO — cinematic with subtle Ken Burns */}
      <section className="relative min-h-screen flex items-end overflow-hidden">
        <HeroSlideshow
          slides={[
            { src: leatherJacketFallback, srcSet: leatherJacket, alt: "Premium leather jacket — Irha Apparels luxury leatherwear" },
            { src: leatherShowroomFallback, srcSet: leatherShowroom, alt: "Irha Apparels leather jacket showroom — premium manufacturing" },
            { src: leatherFlatlayFallback, srcSet: leatherFlatlay, alt: "Luxury leather goods flatlay — wallets, belts and gloves" },
            { src: leatherStitchFallback, srcSet: leatherStitch, alt: "Hand-stitched premium full-grain leather detail" },
            { src: leatherStackFallback, srcSet: leatherStack, alt: "Folded premium leather garments — Irha Apparels collection" },
          ]}
          sizes="100vw"
          interval={5000}
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-background/30" />
        {/* gold accent line */}
        <div className="absolute top-1/3 left-0 w-24 md:w-40 h-px bg-gradient-gold opacity-70" />
        <div className="absolute top-1/3 right-0 w-24 md:w-40 h-px bg-gradient-gold opacity-70" />

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
            <p className="mt-5 text-xs md:text-sm uppercase tracking-[0.28em] text-primary/90 max-w-xl">
              Trusted by 200+ brands · Shipped to 50+ countries
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
            <button
              type="button"
              onClick={() => setFlipOpen(true)}
              className="group inline-flex items-center justify-between border border-foreground/15 hover:border-foreground/40 px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors text-foreground/70"
            >
              <span className="flex items-center gap-3"><Eye size={16}/> Preview Catalogue</span>
              <ArrowUpRight size={18} />
            </button>
            <a
              href="/Irha-Apparels-Catalog-2026.pdf"
              download="Irha-Apparels-Catalog-2026.pdf"
              onClick={(e) => {
                e.preventDefault();
                forceDownload("/Irha-Apparels-Catalog-2026.pdf", "Irha-Apparels-Catalog-2026.pdf");
                toast.success("Catalogue downloaded", { description: "Irha-Apparels-Catalog-2026.pdf" });
              }}
              className="group inline-flex items-center justify-between border border-foreground/15 hover:border-foreground/40 px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors text-foreground/70"
            >
              <span className="flex items-center gap-3"><Download size={16}/> Download Catalogue</span>
              <ArrowUpRight size={18} />
            </a>
          </div>

          {/* Catalog preview strip — peek inside before downloading */}
          <div className="lg:col-span-12 mt-10 pt-8 border-t border-foreground/10">
            <div className="flex flex-wrap items-end justify-between gap-4 mb-4">
              <div>
                <p className="eyebrow mb-1">Inside the 2026 catalogue</p>
                <p className="text-sm text-foreground/65">22-page B2B line sheet · 6 divisions · MOQ 50</p>
              </div>
              <button
                type="button"
                onClick={() => setFlipOpen(true)}
                className="text-[10px] uppercase tracking-[0.3em] text-gold hover:text-primary inline-flex items-center gap-2"
              >
                <Eye size={13}/> Open flipbook
              </button>
            </div>
            <CatalogThumbnailStrip
              slug="master-catalogue-2026"
              count={7}
              skip={1}
              onClick={() => setFlipOpen(true)}
            />
          </div>
        </div>
      </section>

      <CatalogFlipbook
        slug="master-catalogue-2026"
        title="Irha Apparels — Wholesale B2B Catalogue 2026"
        open={flipOpen}
        onClose={() => setFlipOpen(false)}
      />

      {/* TRUST BAR — 6 buyer-reassurance signals */}
      <TrustBar />

      {/* TRUSTED BY MARQUEE */}
      <ClientsMarquee />

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
          </div>
        </div>
      </section>

      {/* KPI COUNTERS */}
      <KpiCounters />

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
                to={`/products#${c.slug}`}
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

      {/* PROCESS TIMELINE */}
      <ProcessTimeline />

      {/* WHOLESALE PROMISE — 6 written commitments */}
      <BuyerPromise />

      {/* CERTIFICATIONS */}
      <Certifications />

      {/* MD's PERSONAL NOTE */}
      <FounderNote />

      {/* TESTIMONIALS */}
      <Testimonials />

      <FacebookFeed />

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
      <section className="relative py-28 md:py-36 border-t border-border/60 overflow-hidden">
        <img src={leatherFlatlayFallback} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-background/80" />
        <div className="container-luxe relative text-center max-w-4xl mx-auto">
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
