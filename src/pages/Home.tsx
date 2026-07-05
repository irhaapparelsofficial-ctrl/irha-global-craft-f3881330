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

type HubKey = "heritage" | "textile";

type HubDef = {
  key: HubKey;
  image: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  childSlugs: readonly string[];
};

const HUB_DEFS: HubDef[] = [
  {
    key: "heritage",
    image: "/src/assets/og/og-bavarian.jpg",
    eyebrow: "Hub 01 · Heritage",
    title: "Bavarian Heritage & Leather",
    subtitle: "Authentic Trachten craft & full-grain leather construction.",
    href: "/products/bavarian-trachten-wear",
    childSlugs: ["bavarian-trachten-wear", "premium-leather-apparel"] as const,
  },
  {
    key: "textile",
    image: "/src/assets/og/og-sportswear.jpg",
    eyebrow: "Hub 02 · Performance",
    title: "Textile, Streetwear & Active",
    subtitle: "Sublimated sportswear, heavyweight streetwear & leisure comfort.",
    href: "/products/sportswear",
    childSlugs: ["sportswear", "streetwear-activewear", "leisure-nightwear"] as const,
  },
];

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

      {/* STICKY TRUST BAR — 4 promises above the hubs */}
      <section
        aria-label="Order promises"
        className="sticky top-[72px] md:top-[80px] z-30 border-y border-gold/30 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="container-luxe py-4 md:py-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
            {[
              { Icon: Package,  k: "Flexible MOQ",       v: "By product & program" },
              { Icon: Truck,    k: "FOB Sialkot",        v: "Worldwide export" },
              { Icon: Calendar, k: "45-Day Production",  v: "Bulk lead time" },
              { Icon: Shirt,    k: "In-House Embroidery", v: "12-head Tajima" },
            ].map(({ Icon, k, v }) => (

              <div key={k} className="flex items-center gap-3 md:justify-center">
                <span className="inline-flex items-center justify-center w-9 h-9 md:w-10 md:h-10 border border-gold/50 text-gold shrink-0">
                  <Icon size={16} strokeWidth={1.5} />
                </span>
                <div className="leading-tight min-w-0">
                  <p className="font-display text-sm md:text-base truncate">{k}</p>
                  <p className="text-[9px] md:text-[10px] uppercase tracking-[0.22em] text-muted-foreground mt-0.5 truncate">{v}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 2 HUBS — large 50/50 cards */}
      <section className="py-20 md:py-28">
        <div className="container-luxe">
          <div className="text-center max-w-2xl mx-auto mb-12 md:mb-14">
            <p className="eyebrow mb-4 justify-center inline-flex">Two Production Hubs</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
              One atelier. <span className="text-gold italic">Two macro worlds.</span>
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 lg:gap-8">
            {HUB_DEFS.map((hub) => {
              const children = hub.childSlugs
                .map((s) => categories.find((c) => c.slug === s && c.is_published))
                .filter((c): c is NonNullable<typeof c> => !!c);
              const cover = children[0]?.image_url;
              const src = cover ? resolveAsset(cover) : resolveAsset(hub.image);
              return (
                <div
                  key={hub.key}
                  className="group relative block overflow-hidden border-2 border-border/60 hover:border-gold transition-all duration-500 min-h-[440px]"
                >
                  <img
                    src={src}
                    alt={hub.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/25" />
                  <div className="relative h-full flex flex-col justify-end p-8 md:p-10">
                    <div className="h-px w-12 bg-gold mb-5" />
                    <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold mb-3">
                      {hub.eyebrow}
                    </p>
                    <h3 className="font-display text-white text-3xl md:text-4xl lg:text-5xl leading-[1.02] tracking-tight">
                      {hub.title}
                    </h3>
                    <p className="mt-3 text-sm md:text-base text-white/80 max-w-md leading-relaxed">
                      {hub.subtitle}
                    </p>

                    {/* Real child categories — clickable, with real product counts */}
                    <ul className="mt-6 space-y-1.5">
                      {children.length === 0 && (
                        <li className="text-white/50 text-sm">Loading categories…</li>
                      )}
                      {children.map((c) => (
                        <li key={c.slug}>
                          <Link
                            to={`/products/${c.slug}`}
                            className="group/link inline-flex items-baseline gap-3 text-white/95 hover:text-gold transition-colors"
                          >
                            <span className="font-display text-lg md:text-xl leading-tight">{c.name}</span>
                            <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 group-hover/link:text-gold/80">
                              View →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={hub.href}
                      className="mt-7 inline-flex items-center gap-3 self-start bg-gradient-gold text-primary-foreground px-7 py-3.5 text-xs uppercase tracking-[0.3em] font-medium group-hover:shadow-gold transition-all"
                    >
                      Explore Hub
                      <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
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

      {/* PRE-CTA TRUST BAR — 4 promises */}
      <section aria-label="Order promises" className="border-t border-border/60 bg-card/30">
        <div className="container-luxe py-10 md:py-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
            {[
              { Icon: Package,   k: "Flexible MOQ",      v: "By product & program" },
              { Icon: Truck,     k: "FOB Sialkot",       v: "Worldwide export" },
              { Icon: Calendar,  k: "45-Day Production", v: "Bulk lead time" },
              { Icon: Shirt,     k: "In-House Embroidery", v: "12-head Tajima" },
            ].map(({ Icon, k, v }) => (

              <div key={k} className="flex items-center gap-4 md:justify-center">
                <span className="inline-flex items-center justify-center w-11 h-11 border border-gold/40 text-gold shrink-0">
                  <Icon size={20} strokeWidth={1.5} />
                </span>
                <div className="leading-tight">
                  <p className="font-display text-base md:text-lg">{k}</p>
                  <p className="text-[10px] md:text-[11px] uppercase tracking-[0.22em] text-muted-foreground mt-1">{v}</p>
                </div>
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
