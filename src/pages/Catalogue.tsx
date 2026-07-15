import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, Send, Share2 } from "lucide-react";
import { useState } from "react";
import SEO from "@/components/SEO";
import CatalogueLeadForm from "@/components/CatalogueLeadForm";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import ThumbnailImage from "@/components/ThumbnailImage";
import { CATALOGUE_GROUPS } from "@/lib/catalogueGroups";
import { whatsappLink } from "@/lib/constants";
import bavarianHero from "@/assets/og/og-bavarian-hero.jpg?w=960&format=webp&quality=68";
import leatherHero from "@/assets/og/og-leather.jpg?w=960&format=webp&quality=68";
import sportswearHero from "@/assets/og/og-sportswear.jpg?w=960&format=webp&quality=68";
import streetwearHero from "@/assets/og/og-streetwear.jpg?w=960&format=webp&quality=68";
import nightwearHero from "@/assets/og/og-nightwear.jpg?w=960&format=webp&quality=68";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const STATIC_GROUP_IMAGES: Record<string, string> = {
  "bavarian-garments": bavarianHero,
  lederhosen: bavarianHero,
  "dirndl-dresses": bavarianHero,
  "trachten-accessories": bavarianHero,
  "kids-trachten": bavarianHero,
  "leather-garments": leatherHero,
  sportswear: sportswearHero,
  activewear: sportswearHero,
  streetwear: streetwearHero,
  leisurewear: streetwearHero,
  nightwear: nightwearHero,
};


export default function Catalogue() {
  const [shareOpen, setShareOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);


  const shareUrl = `${SITE_URL}/catalogue`;
  const shareText = "Irha Apparels — B2B product catalogue for custom apparel programs in Sialkot, Pakistan.";
  const description = "Explore custom B2B apparel programs from Irha Apparels in Sialkot, Pakistan. Product specifications and commercial terms are confirmed after requirement review.";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${shareUrl}#collection`,
      name: "Irha Apparels Product Catalogue",
      description,
      url: shareUrl,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORGANIZATION_ID },
      hasPart: CATALOGUE_GROUPS.map((group) => ({
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/catalogue/${group.slug}#collection`,
        name: group.name,
        url: `${SITE_URL}/catalogue/${group.slug}`,
        description: group.description,
      })),
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Catalogue", path: "/catalogue" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Irha Apparels Product Catalogue | Custom Apparel Manufacturer"
        description={description}
        path="/catalogue"
        image={bavarianHero}
        jsonLd={jsonLd}
      />

      <section className="relative pt-32 md:pt-40 pb-14 md:pb-20 border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--gold)/0.12),transparent_38%)]" />
        <div className="container-luxe relative grid lg:grid-cols-12 gap-10 lg:gap-14 items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-4">Catalogue</p>
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl">
              B2B Product <span className="text-gold italic">Catalogue</span>
            </h1>
            <p className="text-foreground/70 mt-6 max-w-2xl text-sm md:text-base leading-relaxed">
              Browse our online product programs or request the full catalogue. Materials, construction, branding, MOQ, sampling, pricing, production timing and shipping are confirmed after requirement review.
            </p>
            <div className="flex flex-wrap gap-3 mt-8">
              <button
                onClick={() => setLeadOpen(true)}
                className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
              >
                <Send size={14} /> Get Full Catalogue
              </button>
              <a
                href={whatsappLink("Hi, I would like to discuss the Irha Apparels product catalogue.")}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-3 border border-gold/60 text-gold px-7 py-4 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-all"
              >
                <MessageCircle size={14} /> WhatsApp
              </a>
              <button
                onClick={() => setShareOpen((value) => !value)}
                className="inline-flex items-center gap-3 border border-border text-foreground/80 px-7 py-4 text-xs uppercase tracking-[0.3em] hover:border-gold hover:text-gold transition-all"
              >
                <Share2 size={14} /> Share Catalogue
              </button>
            </div>

            {shareOpen && (
              <div className="mt-4 flex flex-wrap gap-2 text-xs">
                <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}>WhatsApp</a>
                <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}>Facebook</a>
                <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}>LinkedIn</a>
                <button className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy link</button>
              </div>
            )}
          </div>

          <div className="lg:col-span-5 relative min-h-[390px] md:min-h-[500px] overflow-hidden border border-border/60 bg-card shadow-2xl" aria-label="Catalogue category preview">
            <HeroMediaSlideshow
              slides={HERO_SLIDES}
              label="Catalogue category slideshow"
              controlsClassName="bottom-4 right-4"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-black/10" />
            <div className="pointer-events-none absolute left-5 right-5 bottom-5 border border-white/20 bg-black/50 p-4 backdrop-blur-sm">
              <p className="text-[9px] uppercase tracking-[0.32em] text-gold">B2B programme catalogue</p>
              <p className="mt-1 font-display text-xl text-white">Bavarian · Sportswear · Leather · More</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {CATALOGUE_GROUPS.map((group) => {
              const image = STATIC_GROUP_IMAGES[group.slug] ?? bavarianHero;
              return (
                <Link key={group.slug} to={`/catalogue/${group.slug}`} className="group relative block overflow-hidden border border-border/60 bg-card/30 hover:border-gold transition-colors">
                  <div className="relative aspect-[16/9] overflow-hidden bg-card">
                    <ThumbnailImage
                      src={image}
                      alt={`${group.name} catalogue`}
                      className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-transparent to-transparent" />
                    <p className="absolute left-5 bottom-4 text-[10px] uppercase tracking-[0.3em] text-gold">{group.nameDe}</p>
                  </div>
                  <div className="p-6 md:p-8">
                    <h2 className="font-display text-2xl md:text-3xl leading-tight">{group.name}</h2>
                    <p className="text-foreground/60 text-sm mt-3">{group.tagline}</p>
                    <p className="text-foreground/45 text-xs mt-4 leading-relaxed line-clamp-3">{group.description}</p>
                    <div className="mt-4 flex flex-wrap gap-1.5">
                      {["Custom manufacturing", "Private-label ready", "Quote after review"].map((chip) => (
                        <span key={chip} className="border border-border/60 px-2.5 py-1 text-[9px] uppercase tracking-[0.16em] text-foreground/55">
                          {chip}
                        </span>
                      ))}
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                      <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/55 group-hover:text-gold transition-colors">View collection</span>
                      <ArrowUpRight size={16} className="text-foreground/55 group-hover:text-gold transition-colors" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {leadOpen && (
        <CatalogueLeadForm
          onClose={() => setLeadOpen(false)}
          catalogueUrl={shareUrl}
          source="catalogue-index"
          title="Get Full Catalogue"
          submitLabel="Request catalogue"
        />
      )}
    </>
  );
}
