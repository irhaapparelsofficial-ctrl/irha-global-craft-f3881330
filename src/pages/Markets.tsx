import { ArrowRight, Globe2, ShieldCheck, Video } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { MARKET_PAGES } from "@/lib/marketPages";
import { SITE_URL } from "@/lib/seoSchema";

export default function Markets() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${SITE_URL}/markets#page`,
    url: `${SITE_URL}/markets`,
    name: "International Markets Served by Irha Apparels",
    description: "Country-specific sourcing guidance for B2B apparel buyers working with Irha Apparels.",
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: { "@id": `${SITE_URL}/#organization` },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: MARKET_PAGES.map((market, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: market.country,
        url: `${SITE_URL}/markets/${market.slug}`,
      })),
    },
  };

  return (
    <>
      <SEO
        title="International B2B Apparel Markets | Irha Apparels"
        description="Country-specific sourcing pages for apparel importers, wholesalers, private-label brands, retailers and sports buyers in nine priority markets."
        path="/markets"
        locale="en"
        xDefaultPath="/markets"
        jsonLd={jsonLd}
      />

      <section className="border-b border-border/60 bg-gradient-to-br from-card/80 via-background to-gold/5">
        <div className="container-luxe py-20 md:py-28 max-w-6xl">
          <p className="eyebrow mb-4">International buyer coverage</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.02] max-w-4xl">
            Market guidance for <span className="text-gold italic">B2B apparel buyers</span>.
          </h1>
          <p className="mt-6 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
            These pages explain how Irha Apparels reviews custom manufacturing programs for buyers in each priority market. They are not duplicate price pages: every market page contains its own product focus, inquiry guidance, verification steps and buyer questions.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/inquiry?intent=rfq" className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
              Start an inquiry <ArrowRight size={14} />
            </Link>
            <Link to="/factory-video-call" className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
              Live factory view <Video size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="container-luxe py-16 md:py-24 max-w-6xl">
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <article className="border border-border/60 bg-card/30 p-5">
            <Globe2 className="text-gold" size={22} />
            <h2 className="font-display text-xl mt-4">Country-specific briefs</h2>
            <p className="text-sm text-foreground/65 leading-relaxed mt-2">Product priorities and sourcing questions are written for the named market rather than copied from a generic location template.</p>
          </article>
          <article className="border border-border/60 bg-card/30 p-5">
            <ShieldCheck className="text-gold" size={22} />
            <h2 className="font-display text-xl mt-4">Commercial accuracy</h2>
            <p className="text-sm text-foreground/65 leading-relaxed mt-2">MOQ, price, timing, shipping and documentation are confirmed after the actual buyer requirement is reviewed.</p>
          </article>
          <article className="border border-border/60 bg-card/30 p-5">
            <Video className="text-gold" size={22} />
            <h2 className="font-display text-xl mt-4">Factory verification</h2>
            <p className="text-sm text-foreground/65 leading-relaxed mt-2">Irha Apparels uses a requirement-led buyer process. Buyers may request an appointment-based live factory call.</p>
          </article>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {MARKET_PAGES.map((market) => (
            <article key={market.slug} className="group border border-border/60 bg-card/20 hover:border-gold/70 transition-colors p-6 flex flex-col">
              <p className="text-[10px] uppercase tracking-[0.28em] text-gold">{market.locale}</p>
              <h2 className="font-display text-2xl mt-3">{market.country}</h2>
              <p className="text-sm text-foreground/65 leading-relaxed mt-3 flex-1">{market.summary}</p>
              <Link to={`/markets/${market.slug}`} className="inline-flex items-center gap-2 mt-6 text-xs uppercase tracking-[0.2em] text-gold">
                View market page <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" />
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/20">
        <div className="container-luxe py-16 text-center max-w-3xl">
          <p className="eyebrow mb-3">Your market is not listed?</p>
          <h2 className="font-display text-3xl md:text-4xl">We can still review the destination.</h2>
          <p className="text-sm text-foreground/65 leading-relaxed mt-4">Share the product, quantity, destination and documentation requirements. The team will review feasibility without making unsupported commitments.</p>
          <Link to="/inquiry?intent=rfq" className="inline-flex items-center gap-2 mt-7 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
            Request a scoped quote <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </>
  );
}
