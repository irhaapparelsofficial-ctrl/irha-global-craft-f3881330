import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import CapabilityStrip from "@/components/sections/CapabilityStrip";
import FiveCategories from "@/components/sections/FiveCategories";
import ManufacturingCapabilities from "@/components/sections/ManufacturingCapabilities";
import WhyB2B from "@/components/sections/WhyB2B";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import BuyerPromise from "@/components/sections/BuyerPromise";
import Certifications from "@/components/sections/Certifications";
import StartProgramCTA from "@/components/sections/StartProgramCTA";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";
import { BRAND } from "@/lib/constants";

type HubDef = {
  key: "heritage" | "performance";
  fallbackImg: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  childSlugs: readonly string[];
};

const HUBS: HubDef[] = [
  {
    key: "heritage",
    fallbackImg: "/src/assets/og/og-bavarian.jpg",
    eyebrow: "Hub 01 · Heritage",
    title: "Bavarian & Leather",
    subtitle: "Trachten craft and full-grain leather construction for heritage programs.",
    href: "/products/bavarian-trachten-wear",
    childSlugs: ["bavarian-trachten-wear", "premium-leather-apparel"] as const,
  },
  {
    key: "performance",
    fallbackImg: "/src/assets/og/og-sportswear.jpg",
    eyebrow: "Hub 02 · Performance",
    title: "Sportswear, Streetwear & Leisure",
    subtitle: "Sublimated performance, heavyweight streetwear and leisure & nightwear programs.",
    href: "/products/sportswear",
    childSlugs: ["sportswear", "streetwear-activewear", "leisure-nightwear"] as const,
  },
];

export default function Home() {
  const { data: tree = [] } = usePublicCatalogTree();
  const allCats = tree.flatMap((t) => [t, ...t.subs]);

  return (
    <>
      <SEO
        title="Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers"
        description="OEM, ODM and private-label apparel manufacturer in Sialkot, Pakistan. Custom cut & sew, embroidery, printing, private label and export support for brands and importers worldwide."
        path="/"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Organization",
          name: BRAND.name,
          url: "https://www.irhaapparels.com/",
          logo: "https://www.irhaapparels.com/favicon.ico",
          description:
            "Custom B2B apparel manufacturing for brands, wholesalers, importers and private-label programs. Two production hubs: Heritage (Bavarian & Leather) and Performance (Sportswear, Streetwear & Leisure).",
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

      {/* CAPABILITY STRIP — non-sticky, elegant */}
      <CapabilityStrip />

      {/* TWO PRODUCTION HUBS */}
      <section className="py-20 md:py-28">
        <div className="container-luxe">
          <div className="max-w-2xl mb-12 md:mb-14">
            <p className="eyebrow mb-4">Two Production Hubs</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
              One atelier. <span className="text-gold italic">Two production hubs.</span>
            </h2>
            <p className="mt-5 text-foreground/70 text-sm md:text-base leading-relaxed">
              Programs organized into two macro hubs so buyers find the right team fast.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 lg:gap-7">
            {HUBS.map((hub) => {
              const children = hub.childSlugs
                .map((s) => allCats.find((c) => c.slug === s && c.is_published))
                .filter((c): c is NonNullable<typeof c> => !!c);
              const cover = children[0]?.image_url;
              const src = cover ? resolveAsset(cover) : resolveAsset(hub.fallbackImg);
              return (
                <div
                  key={hub.key}
                  className="group relative overflow-hidden border border-border/60 hover:border-gold/70 transition-all duration-500 min-h-[420px] md:min-h-[480px]"
                >
                  <img
                    src={src}
                    alt={hub.title}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-[1.04]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/25" />
                  <div className="relative h-full flex flex-col justify-end p-7 md:p-10">
                    <div className="h-px w-10 bg-gold mb-5" />
                    <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold mb-3">
                      {hub.eyebrow}
                    </p>
                    <h3 className="font-display text-white text-2xl md:text-4xl leading-[1.05]">
                      {hub.title}
                    </h3>
                    <p className="mt-3 text-sm md:text-base text-white/80 max-w-md leading-relaxed">
                      {hub.subtitle}
                    </p>

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
                            <span className="font-display text-base md:text-lg leading-tight">
                              {c.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 group-hover/link:text-gold/80">
                              View Collection →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={hub.href}
                      className="mt-7 inline-flex items-center gap-3 self-start bg-gradient-gold text-primary-foreground px-6 py-3.5 text-[11px] uppercase tracking-[0.3em] font-medium group-hover:shadow-gold transition-all"
                    >
                      Explore Hub
                      <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 5 CATEGORIES — live DB */}
      <FiveCategories />

      {/* MANUFACTURING CAPABILITIES — preserve; final premium polish later */}
      <ManufacturingCapabilities />

      {/* WHY B2B — replaces fake testimonials */}
      <WhyB2B />

      {/* PRODUCTION JOURNEY */}
      <ProcessTimeline />

      {/* BUYER PROMISE */}
      <BuyerPromise />

      {/* PRODUCTION DISCIPLINE (capability-based, no fake certs) */}
      <Certifications />

      {/* FINAL CTA */}
      <StartProgramCTA />
    </>
  );
}
