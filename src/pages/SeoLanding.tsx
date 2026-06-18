import { useParams, Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, Check, MessageCircle, MapPin, Shield, Factory } from "lucide-react";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import QuoteForm from "@/components/QuoteForm";
import { getSeoPage } from "@/lib/seoPages";
import { whatsappLink, BRAND } from "@/lib/constants";

const SITE_URL = "https://www.irhaapparels.com";

export default function SeoLanding() {
  const { slug } = useParams<{ slug: string }>();
  const page = slug ? getSeoPage(slug) : undefined;
  if (!page) return <Navigate to="/" replace />;

  const url = `${SITE_URL}/${page.slug}`;

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faqs.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.h1,
    serviceType: page.primaryKeyword,
    provider: {
      "@type": "Organization",
      name: BRAND.name,
      url: SITE_URL,
    },
    areaServed: page.exportMarkets,
    description: page.metaDescription,
  };

  const wa = whatsappLink(`Hello Irha Apparels — I'd like a quote for ${page.primaryKeyword}.`);

  return (
    <>
      <SEO
        title={page.title}
        description={page.metaDescription}
        path={`/${page.slug}`}
        image={page.heroImage}
        jsonLd={[faqJsonLd, productJsonLd]}
      />
      <Helmet>
        <meta name="keywords" content={page.keywords} />
        <link rel="alternate" hrefLang="en" href={url} />
      </Helmet>

      <Breadcrumbs items={[{ label: page.breadcrumbLabel }]} />

      {/* HERO */}
      <section className="border-b border-border/60 pb-16 md:pb-24">
        <div className="container-luxe grid lg:grid-cols-[1.1fr_1fr] gap-12 items-end">
          <div>
            <p className="eyebrow mb-6">{page.eyebrow}</p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.02] tracking-tight">
              {page.h1}
            </h1>
            <p className="mt-8 text-foreground/75 text-lg max-w-2xl">
              {page.intro[0]}
            </p>
            <div className="mt-10 flex flex-wrap gap-3">
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
              >
                Get Quote on WhatsApp <MessageCircle size={14} />
              </a>
              <Link
                to="/inquiry"
                className="inline-flex items-center gap-3 border border-border hover:border-primary px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
              >
                Full Inquiry Form <ArrowRight size={14} />
              </Link>
            </div>
            <div className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-2"><MapPin size={12}/> Sialkot, Pakistan</span>
              <span className="inline-flex items-center gap-2"><Factory size={12}/> 320+ machines · in-house</span>
              <span className="inline-flex items-center gap-2"><Shield size={12}/> WRAP · Sedex · OEKO-TEX</span>
            </div>
          </div>
          <div className="aspect-[4/5] overflow-hidden border border-border">
            <img
              src={page.heroImage}
              alt={page.heroAlt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* INTRO (remaining paragraphs) */}
      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-[1.5fr_1fr] gap-12">
          <div className="space-y-6 text-foreground/80 leading-relaxed">
            {page.intro.slice(1).map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <div>
            <QuoteForm defaultCategory={page.breadcrumbLabel} pageContext={page.h1} />
          </div>
        </div>
      </section>

      {/* WHY CHOOSE */}
      <section className="py-20 border-y border-border/60 bg-card/30">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Why Choose Irha Apparels</p>
          <h2 className="font-display text-3xl md:text-5xl max-w-3xl">
            Verified factory infrastructure, audited compliance, factory-direct pricing.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-px bg-border mt-12">
            {page.whyChoose.map((w, i) => (
              <div key={i} className="bg-background p-8">
                <div className="w-8 h-8 mb-5 bg-primary/10 text-primary flex items-center justify-center text-xs">
                  {String(i + 1).padStart(2, "0")}
                </div>
                <h3 className="font-display text-xl mb-3">{w.title}</h3>
                <p className="text-sm text-foreground/70 leading-relaxed">{w.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CAPABILITIES */}
      <section className="py-20">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Factory Capabilities</p>
          <h2 className="font-display text-3xl md:text-5xl max-w-3xl">
            What we manufacture in-house.
          </h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mt-12">
            {page.capabilities.map((c, i) => (
              <div key={i} className="border border-border p-6 hover:border-primary/60 transition-colors">
                <h3 className="font-display text-lg text-primary">{c.title}</h3>
                <p className="text-sm text-foreground/70 mt-3 leading-relaxed">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="py-20 border-y border-border/60 bg-card/30">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Manufacturing Process</p>
          <h2 className="font-display text-3xl md:text-5xl max-w-3xl">
            From tech pack to FOB Karachi — six audited stages.
          </h2>
          <div className="mt-12 grid gap-px bg-border md:grid-cols-2 lg:grid-cols-3">
            {page.process.map((s) => (
              <div key={s.step} className="bg-background p-8">
                <span className="text-primary font-display text-3xl">{s.step}</span>
                <h3 className="font-display text-xl mt-3">{s.title}</h3>
                <p className="text-sm text-foreground/70 mt-3 leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* QC */}
      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-2 gap-12 items-start">
          <div>
            <p className="eyebrow mb-4">Quality Control</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight">
              AQL 2.5 discipline across every shipment.
            </h2>
            <p className="text-foreground/70 mt-6 leading-relaxed">
              Quality control begins with fabric inspection on every roll and ends with photo evidence
              of every carton. Third-party pre-shipment inspection welcomed at any time.
            </p>
          </div>
          <ul className="space-y-4">
            {page.qualityControl.map((q, i) => (
              <li key={i} className="flex gap-4 text-sm text-foreground/80 border-l-2 border-primary/40 pl-4">
                <Check size={16} className="text-primary mt-0.5 shrink-0" />
                <span className="leading-relaxed">{q}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* OEM / ODM */}
      <section className="py-20 border-y border-border/60 bg-card/30">
        <div className="container-luxe">
          <p className="eyebrow mb-4">OEM · ODM · Private Label</p>
          <h2 className="font-display text-3xl md:text-5xl max-w-3xl">
            Three production models, one factory.
          </h2>
          <div className="grid md:grid-cols-3 gap-6 mt-12">
            {([
              { tag: "OEM", body: page.oemOdm.oem },
              { tag: "ODM", body: page.oemOdm.odm },
              { tag: "Private Label", body: page.oemOdm.privateLabel },
            ]).map((b) => (
              <div key={b.tag} className="border border-border bg-background p-8">
                <p className="eyebrow text-primary">{b.tag}</p>
                <p className="text-sm text-foreground/75 mt-4 leading-relaxed">{b.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* MARKETS */}
      <section className="py-20">
        <div className="container-luxe grid lg:grid-cols-[1fr_1.2fr] gap-12 items-start">
          <div>
            <p className="eyebrow mb-4">Export Markets</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight">
              Shipping weekly across <span className="text-gold italic">{page.exportMarkets.length}+</span> markets.
            </h2>
            <div className="flex flex-wrap gap-2 mt-8">
              {page.exportMarkets.map((m) => (
                <span key={m} className="border border-border px-4 py-2 text-xs uppercase tracking-[0.15em]">
                  {m}
                </span>
              ))}
            </div>
          </div>
          <p className="text-foreground/75 leading-relaxed">{page.marketsCopy}</p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20 border-y border-border/60 bg-card/30">
        <div className="container-luxe max-w-4xl">
          <p className="eyebrow mb-4">Frequently Asked Questions</p>
          <h2 className="font-display text-3xl md:text-5xl">{page.primaryKeyword} — FAQ</h2>
          <div className="mt-12 divide-y divide-border border-y border-border">
            {page.faqs.map((f, i) => (
              <details key={i} className="group py-6">
                <summary className="cursor-pointer list-none flex items-start justify-between gap-4">
                  <h3 className="font-display text-lg md:text-xl pr-6">{f.q}</h3>
                  <span className="text-primary text-2xl leading-none group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="mt-4 text-foreground/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* INTERNAL LINKS */}
      <section className="py-16">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Related Manufacturing Programs</p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {page.internalLinks.map((l) => (
              <Link
                key={l.href}
                to={l.href}
                className="border border-border p-5 flex items-center justify-between hover:border-primary hover:bg-card/40 transition-all group"
              >
                <span className="text-sm uppercase tracking-[0.2em]">{l.label}</span>
                <ArrowRight size={14} className="text-primary group-hover:translate-x-1 transition-transform" />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* CTA + WHATSAPP */}
      <section className="py-20 border-t border-border/60 bg-gradient-to-b from-card/40 to-background">
        <div className="container-luxe grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="eyebrow mb-4">Ready to Start</p>
            <h2 className="font-display text-3xl md:text-5xl leading-tight">{page.ctaTitle}</h2>
            <p className="mt-6 text-foreground/75 max-w-xl">{page.ctaBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <a
                href={wa}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-3 bg-[#25D366] text-white px-7 py-4 text-xs uppercase tracking-[0.3em] hover:opacity-90 transition-opacity"
              >
                WhatsApp Inquiry <MessageCircle size={14} />
              </a>
              <a
                href={`mailto:${BRAND.email}?subject=${encodeURIComponent(`Quote — ${page.primaryKeyword}`)}`}
                className="inline-flex items-center gap-3 border border-border hover:border-primary px-7 py-4 text-xs uppercase tracking-[0.3em] transition-colors"
              >
                Email Us <ArrowRight size={14} />
              </a>
            </div>
          </div>
          <QuoteForm defaultCategory={page.breadcrumbLabel} pageContext={page.h1} />
        </div>
      </section>
    </>
  );
}
