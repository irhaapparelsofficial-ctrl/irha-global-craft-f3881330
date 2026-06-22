import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, MessageCircle, ShieldCheck, Globe2, Factory, Award, Zap, Scissors, Activity } from "lucide-react";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
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

import leatherJacket from "@/assets/banners/leather-jacket.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherJacketFallback from "@/assets/banners/leather-jacket.jpg?w=1600&format=webp&quality=74";
import leatherFlatlay from "@/assets/banners/leather-flatlay.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherFlatlayFallback from "@/assets/banners/leather-flatlay.jpg?w=1600&format=webp&quality=74";
import leatherStitch from "@/assets/banners/leather-stitch.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherStitchFallback from "@/assets/banners/leather-stitch.jpg?w=1600&format=webp&quality=74";
import leatherShowroom from "@/assets/banners/leather-showroom.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherShowroomFallback from "@/assets/banners/leather-showroom.jpg?w=1600&format=webp&quality=74";
import manufacturingImg from "@/assets/manufacturing.jpg";


type FeaturedProduct = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image_url: string | null;
  category_id: string;
};

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
  const [activeMacro, setActiveMacro] = useState<MacroKey | null>(null);

  const { data: featured = [] } = useQuery({
    queryKey: ["home-featured-products"],
    queryFn: async (): Promise<FeaturedProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,description,image_url,category_id")
        .eq("is_published", true)
        .order("sort_order")
        .limit(24);
      if (error) throw error;
      return (data ?? []) as FeaturedProduct[];
    },
  });

  const categoryById = new Map(categories.map((c) => [c.id, c]));

  const filteredFeatured = useMemo(() => {
    if (!activeMacro) return featured.slice(0, 8);
    const hub = MACRO_HUBS.find((h) => h.key === activeMacro)!;
    const allowedSlugs = new Set(hub.childSlugs as readonly string[]);
    return featured
      .filter((p) => {
        const cat = categoryById.get(p.category_id);
        return cat && allowedSlugs.has(cat.slug);
      })
      .slice(0, 8);
  }, [featured, activeMacro, categoryById]);


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


      <TrustBar />
      <ClientsMarquee />

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
              const isActive = activeMacro === hub.key;
              const firstChild = children[0];
              const Icon = hub.Icon;
              return (
                <article
                  key={hub.key}
                  className={`group relative border-2 ${
                    isActive ? "border-industrial shadow-2xl" : "border-border/60"
                  } ${hub.ringClass} ${hub.surfaceClass} transition-all duration-500 flex flex-col min-h-[560px] overflow-hidden`}
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
                      <button
                        type="button"
                        onClick={() => {
                          setActiveMacro(isActive ? null : hub.key);
                          requestAnimationFrame(() => {
                            document
                              .getElementById("live-catalogue")
                              ?.scrollIntoView({ behavior: "smooth", block: "start" });
                          });
                        }}
                        className={`inline-flex items-center gap-3 px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-all ${hub.ctaClass}`}
                      >
                        {isActive ? "Filter Active" : "Explore Catalog"}
                        <ArrowUpRight size={16} />
                      </button>
                      {firstChild && (
                        <Link
                          to={`/products/${firstChild.slug}`}
                          className={`inline-flex items-center gap-2 px-5 py-4 text-xs uppercase tracking-[0.3em] border ${hub.chipClass} hover:bg-foreground/5 transition-colors`}
                        >
                          Browse Hub
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

      {/* LIVE FEATURED PRODUCTS (Supabase) */}
      {featured.length > 0 && (
        <section id="live-catalogue" className="py-20 bg-secondary/40 scroll-mt-24">
          <div className="container-luxe">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div>
                <p className="eyebrow mb-3">Live Catalogue</p>
                <h2 className="font-display text-3xl md:text-4xl">
                  {activeMacro
                    ? MACRO_HUBS.find((h) => h.key === activeMacro)!.title
                    : "Current Production Runs"}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                {activeMacro && (
                  <button
                    type="button"
                    onClick={() => setActiveMacro(null)}
                    className="text-xs uppercase tracking-[0.3em] text-foreground/60 hover:text-foreground transition-colors"
                  >
                    Clear Filter ×
                  </button>
                )}
                <Link to="/products" className="text-xs uppercase tracking-[0.3em] hover-gold-underline">
                  Browse All →
                </Link>
              </div>
            </div>

            {filteredFeatured.length === 0 ? (
              <div className="border border-border/60 bg-card/40 p-10 text-center text-sm text-muted-foreground">
                No live products in this hub yet — check back soon or browse the full catalogue.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                {filteredFeatured.map((p) => {
                  const cat = categoryById.get(p.category_id);
                  if (!cat) return null;
                  const img = p.image_url ? resolveAsset(p.image_url) : null;
                  return (
                    <Link
                      key={p.id}
                      to={`/products/${cat.slug}/${p.slug}`}
                      className="group bg-card border border-border/60 hover:border-industrial transition-colors flex flex-col"
                    >
                      <div className="aspect-square bg-background overflow-hidden">
                        {img ? (
                          <img
                            src={img}
                            alt={p.name}
                            loading="lazy"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-[1200ms]"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground font-mono uppercase tracking-widest">
                            No image
                          </div>
                        )}
                      </div>
                      <div className="p-4 flex-1 flex flex-col">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-industrial">
                          {cat.name}
                        </span>
                        <h3 className="font-display text-lg mt-1">{p.name}</h3>
                        {p.description && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 leading-relaxed">
                            {p.description}
                          </p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </section>
      )}


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
