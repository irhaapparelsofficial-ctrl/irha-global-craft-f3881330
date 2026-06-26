import { Link } from "react-router-dom";
import { ArrowUpRight, ShieldCheck, Globe2, Factory, Award, Scissors, Activity, Sparkles, Download, Package, Truck, Calendar, Shirt } from "lucide-react";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import CategoryGrid from "@/components/sections/CategoryGrid";
import AtmosphericGrid from "@/components/sections/AtmosphericGrid";
import TrustBar from "@/components/sections/TrustBar";
import ClientsMarquee from "@/components/sections/ClientsMarquee";
import KpiCounters from "@/components/sections/KpiCounters";
import Certifications from "@/components/sections/Certifications";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import BuyerPromise from "@/components/sections/BuyerPromise";
import Testimonials from "@/components/sections/Testimonials";
import FounderNote from "@/components/sections/FounderNote";
import FacebookFeed from "@/components/sections/FacebookFeed";
import { useCategories } from "@/hooks/useCatalog";

import { whatsappLink, BRAND } from "@/lib/constants";
import { resolveAsset } from "@/lib/assetResolver";

import leatherFlatlayFallback from "@/assets/banners/leather-flatlay.jpg?w=1600&format=webp&quality=74";
import manufacturingImg from "@/assets/manufacturing.jpg";

type MacroKey = "leather-bavarian" | "textile-active-leisure";


const MACRO_HUBS = [
  {
    key: "leather-bavarian" as MacroKey,
    eyebrow: "Hub 01 · Heritage Atelier",
    title: "Bavarian & Leather Garments",
    tagline: "Authentic Trachten craft & full-grain leather construction.",
    items: [
      "Authentic Lederhosen",
      "Trachten Wear",
      "Dirndls",
      "Premium Leather Apparel",
    ],
    childSlugs: ["bavarian", "leatherwear"] as const,
    Icon: Scissors,
    // deep industrial dark accent
    accentClass: "text-foreground",
    ringClass: "hover:border-foreground/70",
    chipClass: "border-foreground/30 text-foreground/85",
    ctaClass:
      "bg-foreground text-background hover:bg-foreground/90",
    surfaceClass:
      "bg-[hsl(var(--background))] [background-image:radial-gradient(circle_at_top_right,hsl(var(--foreground)/0.10),transparent_55%)]",
    badgeClass: "bg-foreground/10 text-foreground border-foreground/20",
  },
  {
    key: "textile-active-leisure" as MacroKey,
    eyebrow: "Hub 02 · Performance Atelier",
    title: "Modern Textile & Performance Wear",
    tagline: "Engineered knits, heavyweight cotton & technical comfort.",
    items: [
      "Premium Sportswear",
      "Heavyweight Streetwear",
      "Comfortable Nightwear",
      "Leisure Wear",
    ],
    childSlugs: ["sportswear", "streetwear", "nightwear", "leisurewear"] as const,
    Icon: Activity,
    // industrial emerald token accent
    accentClass: "text-industrial",
    ringClass: "hover:border-industrial",
    chipClass: "border-industrial/40 text-industrial",
    ctaClass:
      "bg-industrial text-industrial-foreground hover:bg-industrial/90",
    surfaceClass:
      "bg-[hsl(var(--background))] [background-image:radial-gradient(circle_at_top_left,hsl(var(--industrial)/0.12),transparent_55%)]",
    badgeClass: "bg-industrial/10 text-industrial border-industrial/30",
  },
] as const;

export default function Home() {
  const { data: categories = [] } = useCategories();




  return (
    <>
      <SEO
        title="Irha Apparels — Premium Apparel Manufacturer, Sialkot"
        description="OEM, ODM & private-label apparel manufacturer in Sialkot, Pakistan. Bavarian, leather, sportswear, streetwear, leisure & nightwear — exported worldwide."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.name,
          url: "https://www.irhaapparels.com/",
          logo: "https://www.irhaapparels.com/favicon.ico",
          description:
            "OEM, ODM and private-label apparel manufacturer in Sialkot. Two macro production hubs: Leather & Bavarian, and Textile, Active & Leisure.",
          telephone: BRAND.phone,
          address: { "@type": "PostalAddress", addressLocality: "Sialkot", addressCountry: "PK" },
          sameAs: [
            "https://www.instagram.com/irhaapparels",
            "https://www.facebook.com/irhaapparels",
            "https://www.linkedin.com/company/irha-apparels",
          ],
        }}
      />

      {/* HERO */}
      <HeroCarousel />

      {/* AI MOCKUP STUDIO HERO PROMO — above fold CTA */}
      <section className="relative border-y border-gold/30 bg-gradient-to-r from-background via-card/40 to-background overflow-hidden">
        <div className="absolute inset-0 opacity-[0.08] [background-image:radial-gradient(circle_at_20%_50%,hsl(var(--gold))_0%,transparent_45%),radial-gradient(circle_at_85%_50%,hsl(var(--industrial))_0%,transparent_45%)]" />
        <div className="container-luxe relative py-14 md:py-20">
          <div className="grid md:grid-cols-[1fr,auto] gap-10 md:gap-14 items-center">
            <div>
              <p className="eyebrow mb-4 inline-flex items-center gap-2">
                <Sparkles size={14} className="text-gold" /> AI Mockup Studio
              </p>
              <h2 className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl leading-[1.04]">
                Design your collection in <span className="text-gold italic">60 seconds</span>.
              </h2>
              <p className="mt-4 text-sm md:text-base text-foreground/75 max-w-xl leading-relaxed">
                AI mockups with your logo, instant FOB Sialkot pricing — preview front &amp; back, change colors, request a quote in one click.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row md:flex-col gap-3 md:min-w-[260px]">
              <Link
                to="/studio"
                className="group inline-flex items-center justify-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.28em] font-medium shadow-gold hover:shadow-[0_0_40px_hsl(var(--gold)/0.6)] transition-all"
                data-track="home-launch-ai-studio"
              >
                <Sparkles size={16} />
                Launch AI Mockup Studio
                <ArrowUpRight size={16} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
              <a
                href="/catalogue.pdf"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-3 border border-foreground/40 text-foreground hover:bg-foreground hover:text-background px-7 py-4 text-xs uppercase tracking-[0.28em] font-medium transition-colors"
                data-track="home-download-catalog"
              >
                <Download size={14} /> Download Catalog
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 2-MACRO GATEWAYS */}
      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-14">
            <div className="max-w-2xl">
              <p className="eyebrow mb-4">Two Production Hubs</p>
              <h2 className="font-display text-4xl md:text-6xl leading-[1.02]">
                One atelier. <br />
                <span className="text-gold italic">Two macro worlds.</span>
              </h2>
              <p className="mt-5 text-sm md:text-base text-foreground/70 max-w-lg leading-relaxed">
                Choose a hub to filter the live production catalogue below — every SKU is built inside one of these two pipelines.
              </p>
            </div>
            <Link to="/products" className="text-xs uppercase tracking-[0.3em] hover-gold-underline">
              View Full Catalogue →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {MACRO_HUBS.map((hub) => {
              const children = categories.filter((c) =>
                (hub.childSlugs as readonly string[]).includes(c.slug),
              );
              const cover = children.find((c) => c.image_url)?.image_url;
              const firstChild = children[0];
              const Icon = hub.Icon;
              return (
                <article
                  key={hub.key}
                  className={`group relative border-2 border-border/60 ${hub.ringClass} ${hub.surfaceClass} transition-all duration-500 flex flex-col min-h-[560px] overflow-hidden`}
                >
                  {cover && (
                    <img
                      src={resolveAsset(cover)}
                      alt={hub.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:opacity-30 group-hover:scale-[1.04] transition-all duration-[1400ms]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/30" />

                  <div className="relative p-8 md:p-10 pt-12 md:pt-16 flex flex-col flex-1">
                    <div className="flex items-start justify-end mb-8">
                      <span className={`inline-flex items-center justify-center w-12 h-12 border ${hub.badgeClass}`}>
                        <Icon size={20} />
                      </span>
                    </div>

                    <h3 className="font-display text-3xl md:text-4xl lg:text-5xl leading-[1.05] max-w-md">
                      {hub.title}
                    </h3>
                    <p className="mt-4 text-sm md:text-base text-foreground/75 max-w-md leading-relaxed">
                      {hub.tagline}
                    </p>

                    <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-2.5 max-w-md">
                      {hub.items.map((item) => (
                        <li
                          key={item}
                          className="flex items-center gap-2 text-sm text-foreground/85"
                        >
                          <span className={`h-px w-4 ${hub.accentClass} bg-current opacity-60`} />
                          {item}
                        </li>
                      ))}
                    </ul>

                    <div className="mt-auto pt-10 flex flex-wrap items-center gap-3">
                      {firstChild && (
                        <Link
                          to={`/products/${firstChild.slug}`}
                          className={`inline-flex items-center gap-3 px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-all ${hub.ctaClass}`}
                        >
                          {hub.key === "leather-bavarian" ? "Explore Bavarian" : "Explore Textile"}
                          <ArrowUpRight size={16} />
                        </Link>
                      )}
                    </div>

                  </div>
                </article>
              );
            })}
          </div>

        </div>
      </section>


      <CategoryGrid />
      <AtmosphericGrid />

      <TrustBar />
      <ClientsMarquee />







      <KpiCounters />
      <ProcessTimeline />
      <BuyerPromise />
      <Certifications />
      <FounderNote />
      <Testimonials />
      <FacebookFeed />

      {/* MANUFACTURING TEASER */}
      <section className="relative py-28 overflow-hidden">
        <img
          src={manufacturingImg}
          alt="Irha Apparels Sialkot manufacturing floor"
          loading="lazy"
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
              Vertically integrated: cutting, stitching, washing, finishing, and 7-point QC under one roof.
            </p>
            <Link
              to="/manufacturing"
              className="mt-10 inline-flex items-center gap-3 border border-industrial text-industrial hover:bg-industrial hover:text-industrial-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] transition-all"
            >
              Inside the Factory <ArrowUpRight size={16} />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-6">
            {[
              { Icon: Factory, t: "Vertical Production", d: "Cut, sew & finish in-house" },
              { Icon: ShieldCheck, t: "7-Point QC", d: "Pre-shipment inspection" },
              { Icon: Globe2, t: "Worldwide Export", d: "DACH · UK · USA · CA · AU" },
              { Icon: Award, t: "OEKO-TEX Fabrics", d: "Certified sourcing" },
            ].map(({ Icon, t, d }) => (
              <div key={t} className="border border-border/70 bg-card/40 backdrop-blur p-6">
                <Icon className="text-industrial" size={22} />
                <p className="font-display text-xl mt-4">{t}</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FINAL CTA */}
      <section className="relative py-28 border-t border-border/60 overflow-hidden">
        <img src={leatherFlatlayFallback} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        <div className="absolute inset-0 bg-background/80" />
        <div className="container-luxe relative text-center max-w-4xl mx-auto">
          <p className="eyebrow justify-center inline-flex mb-6">Begin Your Order</p>
          <h2 className="font-display text-4xl md:text-6xl leading-[1.02]">
            Ready to build your <br />
            <span className="text-gold italic">next collection?</span>
          </h2>
          <div className="mt-12 flex flex-wrap gap-4 justify-center">
            <Link to="/inquiry" className="bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
              Start an Inquiry
            </Link>
            <a href={whatsappLink()} target="_blank" rel="noreferrer" className="border border-industrial text-industrial hover:bg-industrial hover:text-industrial-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] transition-colors">
              WhatsApp the Atelier
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
