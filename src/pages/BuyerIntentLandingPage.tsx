import { Link, useLocation } from "react-router-dom";
import { ArrowRight, CheckCircle2, Factory, Globe2, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import { SEO_BUYER_INTENT_LANDING_PAGES, getSeoBuyerIntentLandingPage } from "@/lib/buyerIntentSeoPages";
import { getBuyerJourneyCopy, getBuyerJourneyLocale } from "@/lib/buyerJourneyLocaleCopy";
import { getXDefaultPath } from "@/lib/i18nFoundation";
import { ORGANIZATION_ID, SITE_URL, breadcrumbSchema } from "@/lib/seoSchema";

function readableLinkLabel(path: string, locale: ReturnType<typeof getBuyerJourneyLocale>) {
  const landingPage = SEO_BUYER_INTENT_LANDING_PAGES.find((page) => page.path === path);
  const label = landingPage?.h1 ?? path.split("/").filter(Boolean).at(-1)?.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ") ?? "Products";
  const copy = getBuyerJourneyCopy(locale);
  return locale !== "en" && !path.startsWith(`/${locale}/`) ? `${copy.englishPagePrefix}${label}` : label;
}

export default function BuyerIntentLandingPage() {
  const { pathname } = useLocation();
  const page = getSeoBuyerIntentLandingPage(pathname);

  if (!page) {
    return (
      <div className="container mx-auto px-6 py-28 text-center">
        <SEO title="Buyer sourcing page not found | Irha Apparels" description="This buyer sourcing page is not available." path={pathname} noindex />
        <Globe2 size={34} className="mx-auto text-gold mb-4" />
        <h1 className="font-display text-3xl">Sourcing page not found</h1>
        <Link to="/products" className="inline-flex items-center gap-2 mt-7 border border-gold/60 text-gold px-5 py-3 text-xs uppercase tracking-[0.2em]">Explore products <ArrowRight size={13} /></Link>
      </div>
    );
  }

  const locale = getBuyerJourneyLocale(page.locale);
  const copy = getBuyerJourneyCopy(locale);
  const absolutePageUrl = `${SITE_URL}${page.path}`;
  const xDefaultPath = getXDefaultPath(page.path);
  const homePath = locale === "en" ? "/" : `/${locale}/`;
  const productsPath = locale === "en" ? "/products" : homePath;

  const schemas = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${absolutePageUrl}#service`,
      name: page.h1,
      description: page.description,
      url: absolutePageUrl,
      serviceType: page.productFocus,
      provider: { "@id": ORGANIZATION_ID },
      areaServed: { "@type": "AdministrativeArea", name: page.market },
      audience: { "@type": "BusinessAudience", audienceType: copy.audience },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faqs.map((faq) => ({ "@type": "Question", name: faq.question, acceptedAnswer: { "@type": "Answer", text: faq.answer } })),
    },
    breadcrumbSchema(locale === "en"
      ? [
          { name: copy.home, path: homePath },
          { name: copy.products, path: productsPath },
          { name: page.h1, path: page.path },
        ]
      : [
          { name: copy.home, path: homePath },
          { name: page.h1, path: page.path },
        ]),
  ];

  return (
    <div lang={locale}>
      <SEO
        title={page.title}
        description={page.description}
        path={page.path}
        locale={locale}
        direction={page.direction}
        alternates={page.alternates}
        xDefaultPath={xDefaultPath}
        jsonLd={schemas}
      />

      <section className="border-b border-border/60 bg-gradient-to-br from-card/80 via-background to-gold/10">
        <div className="container mx-auto px-6 py-20 md:py-28 max-w-6xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">{page.eyebrow}</p>
          <h1 className="font-display text-4xl md:text-6xl leading-tight max-w-5xl">{page.h1}</h1>
          <p className="text-base md:text-lg text-foreground/70 leading-relaxed mt-6 max-w-3xl">{page.intro}</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to={`/inquiry?intent=rfq&source=${encodeURIComponent(page.path)}`} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.18em]">{page.primaryLabel} <ArrowRight size={13} /></Link>
            <Link to="/factory-video-call" className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">{page.secondaryLabel}</Link>
          </div>
          <div className="grid sm:grid-cols-3 gap-3 mt-10 max-w-4xl">
            <div className="border border-border/60 bg-background/40 p-4 flex gap-3"><Factory className="text-gold shrink-0" size={18} /><p className="text-xs text-foreground/65 leading-relaxed">{copy.madeIn}</p></div>
            <div className="border border-border/60 bg-background/40 p-4 flex gap-3"><ShieldCheck className="text-gold shrink-0" size={18} /><p className="text-xs text-foreground/65 leading-relaxed">{copy.approval}</p></div>
            <div className="border border-border/60 bg-background/40 p-4 flex gap-3"><Globe2 className="text-gold shrink-0" size={18} /><p className="text-xs text-foreground/65 leading-relaxed">{copy.direct}</p></div>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-16 md:py-24 max-w-6xl space-y-16">
        {page.sections.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="grid md:grid-cols-12 gap-6 md:gap-10 border-b border-border/40 pb-14 last:border-0">
            <div className="md:col-span-4"><h2 className="font-display text-2xl md:text-3xl text-gold">{section.heading}</h2></div>
            <div className="md:col-span-8"><p className="text-sm md:text-base text-foreground/75 leading-relaxed">{section.body}</p><ul className="grid sm:grid-cols-2 gap-3 mt-6">{section.bullets.map((bullet) => <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/70"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{bullet}</li>)}</ul></div>
          </section>
        ))}

        <section aria-labelledby="buyer-intent-faq">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">{copy.faqEyebrow}</p>
          <h2 id="buyer-intent-faq" className="font-display text-3xl md:text-4xl">{copy.faqTitle}</h2>
          <div className="grid md:grid-cols-2 gap-4 mt-7">{page.faqs.map((faq) => <article key={faq.question} className="border border-border/60 bg-card/30 p-5"><h3 className="font-display text-xl">{faq.question}</h3><p className="text-sm text-foreground/70 leading-relaxed mt-3">{faq.answer}</p></article>)}</div>
        </section>

        <section className="border border-gold/40 bg-gold/5 p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl">{copy.ctaTitle}</h2>
          <p className="text-sm text-foreground/70 max-w-2xl mx-auto mt-4">{copy.ctaBody}</p>
          <div className="flex flex-wrap justify-center gap-3 mt-7">
            <Link to={`/inquiry?intent=rfq&source=${encodeURIComponent(page.path)}`} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.18em]">{page.primaryLabel} <ArrowRight size={13} /></Link>
            <Link to={page.categoryPath} hrefLang={locale === "en" ? undefined : "en"} lang={locale === "en" ? undefined : "en"} className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.18em] hover:border-gold hover:text-gold">{copy.explore}</Link>
          </div>
        </section>

        <nav aria-label={copy.relatedAria} className="border-t border-border/40 pt-8">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4 text-center">{copy.related}</p>
          <div className="flex flex-wrap justify-center gap-3">{page.relatedPaths.map((path) => {
            const linkLocale = path.startsWith(`/${locale}/`) ? locale : "en";
            return <Link key={path} to={path} hrefLang={linkLocale} lang={linkLocale} className="border border-border/60 px-4 py-2 text-xs text-foreground/70 hover:border-gold hover:text-gold">{readableLinkLabel(path, locale)}</Link>;
          })}</div>
        </nav>
      </div>
    </div>
  );
}
