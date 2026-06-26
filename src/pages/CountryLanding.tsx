import { useParams, Navigate, Link } from "react-router-dom";
import { ArrowUpRight, Sparkles, Check } from "lucide-react";
import SEO from "@/components/SEO";
import { findCountryLanding } from "@/lib/countryLandings";
import { BRAND } from "@/lib/constants";

const SITE = "https://www.irhaapparels.com";

export default function CountryLanding() {
  const { slug = "" } = useParams<{ slug: string }>();
  const data = findCountryLanding(slug);
  if (!data) return <Navigate to="/" replace />;

  const url = `${SITE}/${data.slug}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      serviceType: "B2B Apparel Manufacturing",
      provider: {
        "@type": "Organization",
        name: BRAND.name,
        url: `${SITE}/`,
        address: { "@type": "PostalAddress", addressLocality: "Sialkot", addressCountry: "PK" },
      },
      areaServed: { "@type": "Country", name: data.country },
      url,
      description: data.description,
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: data.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: `${SITE}/` },
        { "@type": "ListItem", position: 2, name: data.country, item: url },
      ],
    },
  ];

  return (
    <>
      <SEO title={data.title} description={data.description} path={`/${data.slug}`} jsonLd={jsonLd} />

      {/* HERO */}
      <section className="pt-32 pb-16 md:pt-40 md:pb-20 border-b border-border/60 bg-gradient-to-b from-background via-card/30 to-background">
        <div className="container-luxe">
          <p className="eyebrow mb-5 text-gold">
            B2B Manufacturer · Sialkot, Pakistan → {data.country}
          </p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[1.04] max-w-4xl">
            {data.h1}
          </h1>
          <p className="mt-7 max-w-2xl text-base md:text-lg text-foreground/75 leading-relaxed">
            {data.intro}
          </p>

          <div className="mt-10 flex flex-wrap gap-3">
            <Link
              to="/inquiry"
              className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all"
            >
              Get a Quote <ArrowUpRight size={16} />
            </Link>
            <Link
              to="/studio"
              className="inline-flex items-center gap-3 border border-foreground/40 hover:border-gold hover:text-gold px-8 py-4 text-xs uppercase tracking-[0.3em] font-medium transition-colors"
            >
              <Sparkles size={14} /> AI Mockup Studio
            </Link>
          </div>
        </div>
      </section>

      {/* 3 USPs */}
      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <p className="eyebrow mb-10">Why {data.country} brands choose Irha</p>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {data.usps.map((u) => (
              <div key={u.title} className="border border-border/60 bg-card/30 p-8">
                <div className="h-px w-10 bg-gold mb-5" />
                <h2 className="font-display text-xl md:text-2xl leading-tight">{u.title}</h2>
                <p className="mt-4 text-sm text-foreground/75 leading-relaxed">{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Product highlights */}
      <section className="py-14 border-y border-border/60 bg-card/20">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Top categories for {data.country}</p>
          <div className="flex flex-wrap gap-3">
            {data.productHighlights.map((p) => (
              <Link
                key={p.href}
                to={p.href}
                className="inline-flex items-center gap-2 border border-foreground/30 hover:border-gold hover:text-gold px-5 py-3 text-xs uppercase tracking-[0.25em] transition-colors"
              >
                {p.label} <ArrowUpRight size={14} />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 md:py-24">
        <div className="container-luxe max-w-3xl">
          <p className="eyebrow mb-6">{data.country} Buyer FAQs</p>
          <h2 className="font-display text-3xl md:text-4xl mb-10 leading-[1.05]">
            Sourcing from Sialkot, answered.
          </h2>
          <div className="divide-y divide-border/60">
            {data.faqs.map((f) => (
              <details key={f.q} className="group py-5">
                <summary className="flex items-start justify-between gap-6 cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-display text-lg md:text-xl leading-snug">{f.q}</span>
                  <span className="shrink-0 mt-1 text-gold transition-transform group-open:rotate-45">+</span>
                </summary>
                <p className="mt-4 text-sm md:text-base text-foreground/75 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 border-t border-border/60 bg-card/30">
        <div className="container-luxe max-w-3xl text-center">
          <p className="eyebrow justify-center inline-flex mb-5">Ready to start?</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
            Get a quote for <span className="text-gold italic">{data.country}</span> in 24 hours.
          </h2>
          <ul className="mt-8 mb-10 inline-flex flex-col gap-2 text-sm text-foreground/75 text-left">
            <li className="flex items-center gap-2"><Check size={16} className="text-gold" /> MOQ 50 pieces · FOB Sialkot</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-gold" /> 45-day production · in-house embroidery & sublimation</li>
            <li className="flex items-center gap-2"><Check size={16} className="text-gold" /> Free tech-pack and counter-sample on confirmed POs</li>
          </ul>
          <div>
            <Link
              to="/inquiry"
              className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-10 py-5 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
            >
              Request Quote <ArrowUpRight size={16} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
