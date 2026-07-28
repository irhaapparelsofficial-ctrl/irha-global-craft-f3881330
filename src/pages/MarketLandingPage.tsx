import { ArrowRight, CheckCircle2, FileText, ShieldCheck, Video } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import NotFound from "@/pages/NotFound";
import { MARKET_PAGE_BY_SLUG, MARKET_PAGES } from "@/lib/marketPages";
import { getMarketSearchIntent } from "@/lib/marketSearchIntent";
import { SITE_URL } from "@/lib/seoSchema";

export default function MarketLandingPage() {
  const { countrySlug = "" } = useParams();
  const market = MARKET_PAGE_BY_SLUG[countrySlug];

  if (!market) return <NotFound />;

  const searchIntent = getMarketSearchIntent(market.slug);
  const path = `/markets/${market.slug}`;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: market.faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: { "@type": "Answer", text: faq.answer },
    })),
  };
  const pageSchema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "@id": `${SITE_URL}${path}#page`,
    url: `${SITE_URL}${path}`,
    name: searchIntent.title,
    description: searchIntent.description,
    inLanguage: market.locale,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    about: {
      "@type": "Thing",
      name: `Apparel sourcing guidance for ${market.country}`,
    },
    primaryImageOfPage: `${SITE_URL}/icon-512x512.png`,
  };
  const relatedMarkets = MARKET_PAGES.filter((item) => item.slug !== market.slug).slice(0, 4);

  return (
    <>
      <SEO
        title={searchIntent.title}
        description={searchIntent.description}
        path={path}
        locale={market.locale}
        jsonLd={[pageSchema, faqSchema]}
      />

      <section className="border-b border-border/60 bg-gradient-to-br from-card/80 via-background to-gold/5">
        <div className="container-luxe py-20 md:py-28 max-w-6xl">
          <p className="eyebrow mb-4">{searchIntent.eyebrow}</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.02] max-w-4xl">{searchIntent.h1}</h1>
          <p className="mt-6 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">{searchIntent.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={searchIntent.manufacturerPath} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
              {searchIntent.manufacturerLabel} <ArrowRight size={14} />
            </Link>
            <Link to={`/inquiry?intent=rfq&market=${encodeURIComponent(market.country)}`} className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
              Submit requirements
            </Link>
            <Link to="/factory-video-call" className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
              Live factory view <Video size={14} />
            </Link>
            <Link to="/catalogue" className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
              Review catalogue <FileText size={14} />
            </Link>
          </div>
        </div>
      </section>

      <main className="container-luxe py-16 md:py-24 max-w-6xl">
        <section aria-labelledby="priority-programs-heading">
          <div className="flex items-end justify-between gap-6 flex-wrap mb-7">
            <div>
              <p className="eyebrow mb-3">Priority program fit</p>
              <h2 id="priority-programs-heading" className="font-display text-3xl md:text-4xl">Product programs to review</h2>
            </div>
            <Link to="/products" className="text-xs uppercase tracking-[0.2em] text-gold inline-flex items-center gap-2">All collections <ArrowRight size={13} /></Link>
          </div>
          <div className="grid md:grid-cols-3 gap-4">
            {market.priorityPrograms.map((program) => (
              <article key={program.href} className="border border-border/60 bg-card/25 p-6 flex flex-col">
                <h3 className="font-display text-2xl">{program.label}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed mt-3 flex-1">{program.note}</p>
                <Link to={program.href} className="inline-flex items-center gap-2 mt-6 text-xs uppercase tracking-[0.2em] text-gold">Explore program <ArrowRight size={13} /></Link>
              </article>
            ))}
          </div>
        </section>

        <div className="mt-20 space-y-16">
          {market.sections.map((section, index) => (
            <section key={section.heading} className="grid md:grid-cols-12 gap-7 md:gap-12 border-b border-border/50 pb-14 last:border-b-0">
              <div className="md:col-span-4">
                <p className="text-[10px] uppercase tracking-[0.28em] text-gold">0{index + 1}</p>
                <h2 className="font-display text-2xl md:text-3xl mt-3">{section.heading}</h2>
              </div>
              <div className="md:col-span-8">
                <p className="text-sm md:text-base text-foreground/70 leading-relaxed">{section.body}</p>
                <ul className="grid sm:grid-cols-2 gap-3 mt-6">
                  {section.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/70">
                      <CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>
          ))}
        </div>

        <section className="mt-16 border border-gold/35 bg-gold/5 p-7 md:p-10 grid md:grid-cols-[auto_1fr] gap-5 items-start">
          <ShieldCheck size={28} className="text-gold" />
          <div>
            <h2 className="font-display text-2xl md:text-3xl">Manufacturing verification before commitment.</h2>
            <p className="text-sm text-foreground/70 leading-relaxed mt-3">Buyers in {market.country} can request a live factory video call, review the buyer-trust information and confirm product requirements before making an order decision.</p>
            <div className="flex flex-wrap gap-4 mt-5 text-xs uppercase tracking-[0.18em]">
              <Link to="/buyer-trust" className="text-gold">Buyer trust</Link>
              <Link to="/factory-video-call" className="text-gold">Factory video call</Link>
              <Link to="/manufacturing" className="text-gold">Manufacturing process</Link>
              <Link to={searchIntent.manufacturerPath} className="text-gold">Manufacturer page</Link>
            </div>
          </div>
        </section>

        <section className="mt-20" aria-labelledby="market-faq-heading">
          <p className="eyebrow mb-3">Buyer questions</p>
          <h2 id="market-faq-heading" className="font-display text-3xl md:text-4xl">Questions from {market.country} sourcing briefs</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-7">
            {market.faqs.map((faq) => (
              <article key={faq.question} className="border border-border/60 bg-card/20 p-6">
                <h3 className="font-display text-xl">{faq.question}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed mt-3">{faq.answer}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="mt-20 border border-border/60 bg-card/30 p-8 md:p-12 text-center">
          <p className="eyebrow mb-3">Move from research to a scoped inquiry</p>
          <h2 className="font-display text-3xl md:text-4xl">Review the dedicated {market.country} manufacturing page.</h2>
          <p className="text-sm text-foreground/70 leading-relaxed max-w-2xl mx-auto mt-4">Use the transactional manufacturer page for a product-led overview, then send the reference, quantity range, materials, branding, packaging and destination for feasibility review.</p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link to={searchIntent.manufacturerPath} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
              {searchIntent.manufacturerLabel} <ArrowRight size={13} />
            </Link>
            <Link to={`/inquiry?intent=rfq&market=${encodeURIComponent(market.country)}`} className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
              Submit requirements
            </Link>
          </div>
        </section>

        <nav aria-label="Other country market pages" className="mt-14 border-t border-border/50 pt-8">
          <div className="flex flex-wrap items-center gap-3">
            <Link to="/markets" className="border border-gold/50 text-gold px-4 py-2 text-xs uppercase tracking-[0.17em]">All markets</Link>
            {relatedMarkets.map((item) => (
              <Link key={item.slug} to={`/markets/${item.slug}`} className="border border-border/60 px-4 py-2 text-xs text-foreground/65 hover:border-gold hover:text-gold">{item.country}</Link>
            ))}
          </div>
        </nav>
      </main>
    </>
  );
}
