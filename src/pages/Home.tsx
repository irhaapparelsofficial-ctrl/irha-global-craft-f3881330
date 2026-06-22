import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowUpRight, MessageCircle, ShieldCheck, Globe2, Factory, Award, Zap, Scissors, Activity } from "lucide-react";
import SEO from "@/components/SEO";
import HeroSlideshow from "@/components/HeroSlideshow";
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
import { MACRO_CATEGORIES } from "@/lib/fobCalculator";
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

export default function Home() {
  const { data: categories = [] } = useCategories();

  const { data: featured = [] } = useQuery({
    queryKey: ["home-featured-products"],
    queryFn: async (): Promise<FeaturedProduct[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("id,name,slug,description,image_url,category_id")
        .eq("is_published", true)
        .order("sort_order")
        .limit(8);
      if (error) throw error;
      return (data ?? []) as FeaturedProduct[];
    },
  });

  const categoryById = new Map(categories.map((c) => [c.id, c]));

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
      <section className="relative min-h-[92vh] flex items-end overflow-hidden">
        <HeroSlideshow
          slides={[
            { src: leatherJacketFallback, srcSet: leatherJacket, alt: "Premium leather jacket — Irha Apparels" },
            { src: leatherShowroomFallback, srcSet: leatherShowroom, alt: "Leather showroom — premium manufacturing" },
            { src: leatherFlatlayFallback, srcSet: leatherFlatlay, alt: "Luxury leather goods flatlay" },
            { src: leatherStitchFallback, srcSet: leatherStitch, alt: "Hand-stitched leather detail" },
          ]}
          sizes="100vw"
          interval={5500}
        />
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-background/40" />

        <div className="container-luxe relative pb-24 pt-40 grid lg:grid-cols-12 gap-10 items-end">
          <div className="lg:col-span-8 animate-fade-in">
            <p className="eyebrow mb-6">Sialkot · Worldwide Export</p>
            <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] tracking-tight max-w-4xl">
              Global Premium <br />
              <span className="text-gold italic font-normal">Apparel Manufacturer</span> <br />
              from Sialkot.
            </h1>
            <p className="mt-8 text-base md:text-lg text-foreground/80 max-w-xl leading-relaxed">
              OEM · ODM · Private Label. Two macro production hubs — Leather/Bavarian and
              Textile/Active/Leisure — engineered for DACH, UK, USA, Canada & Australia.
            </p>
            <p className="mt-5 text-xs uppercase tracking-[0.28em] text-industrial/90">
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
              className="group inline-flex items-center justify-between border border-foreground/30 hover:border-industrial hover:text-industrial px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors"
            >
              <span className="flex items-center gap-3"><MessageCircle size={16} /> WhatsApp the Atelier</span>
              <ArrowUpRight size={18} />
            </a>
            <Link
              to="/admin"
              className="group inline-flex items-center justify-between border border-foreground/15 hover:border-foreground/40 px-6 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors text-foreground/70"
            >
              <span className="flex items-center gap-3"><Zap size={16} /> AI Studio & FOB Calculator</span>
              <ArrowUpRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <TrustBar />
      <ClientsMarquee />

      {/* 2-MACRO GATEWAYS */}
      <section className="py-24 md:py-32">
        <div className="container-luxe">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
            <div>
              <p className="eyebrow mb-4">Production Hubs</p>
              <h2 className="font-display text-4xl md:text-6xl leading-[1.02]">
                Two macro segments. <br />
                <span className="text-gold italic">Six core categories.</span>
              </h2>
            </div>
            <Link to="/products" className="text-xs uppercase tracking-[0.3em] hover-gold-underline">
              View All Collections →
            </Link>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {MACRO_CATEGORIES.map((macro) => {
              const children = categories.filter((c) =>
                (macro.childSlugs as readonly string[]).includes(c.slug),
              );
              const cover = children.find((c) => c.image_url)?.image_url;
              return (
                <Link
                  key={macro.id}
                  to={children[0] ? `/products/${children[0].slug}` : "/products"}
                  className="group relative bg-card border-2 border-border/60 hover:border-industrial p-8 transition-all flex flex-col justify-between min-h-[420px] overflow-hidden"
                >
                  {cover && (
                    <img
                      src={resolveAsset(cover)}
                      alt={macro.title}
                      loading="lazy"
                      className="absolute inset-0 w-full h-full object-cover opacity-25 group-hover:opacity-35 group-hover:scale-105 transition-all duration-[1200ms]"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />

                  <div className="relative">
                    <span className="text-[10px] text-industrial font-mono tracking-[0.3em] uppercase block mb-3">
                      Macro Gateway
                    </span>
                    <h3 className="font-display text-3xl md:text-4xl">{macro.title}</h3>
                    <p className="text-sm text-foreground/75 mt-3 max-w-md leading-relaxed">
                      {macro.description}
                    </p>
                  </div>

                  <div className="relative mt-8 pt-5 border-t border-border/40">
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {children.map((c) => (
                        <span
                          key={c.id}
                          className="text-[10px] uppercase tracking-[0.2em] border border-border/60 px-2 py-0.5 text-foreground/70"
                        >
                          {c.name}
                        </span>
                      ))}
                    </div>
                    <span className="text-xs uppercase tracking-[0.3em] text-industrial inline-flex items-center gap-2 group-hover:gap-3 transition-all">
                      Initialize Sourcing <ArrowUpRight size={14} />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* LIVE FEATURED PRODUCTS (Supabase) */}
      {featured.length > 0 && (
        <section className="py-20 bg-secondary/40">
          <div className="container-luxe">
            <div className="flex items-end justify-between flex-wrap gap-4 mb-10">
              <div>
                <p className="eyebrow mb-3">Live Catalogue</p>
                <h2 className="font-display text-3xl md:text-4xl">Current Production Runs</h2>
              </div>
              <Link to="/products" className="text-xs uppercase tracking-[0.3em] hover-gold-underline">
                Browse All →
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {featured.map((p) => {
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
