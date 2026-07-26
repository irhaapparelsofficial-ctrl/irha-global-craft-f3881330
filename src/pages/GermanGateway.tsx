import { ArrowRight, CheckCircle2, Factory, Globe2 } from "lucide-react";
import SEO from "@/components/SEO";
import { GERMAN_GATEWAY_CONTENT } from "@/lib/germanGatewayContent";
import { breadcrumbSchema, ORGANIZATION_ID } from "@/lib/seoSchema";

export default function GermanGateway() {
  const page = GERMAN_GATEWAY_CONTENT;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      name: page.title,
      description: page.description,
      url: "https://irhaapparels.com/de/",
      inLanguage: "de",
      about: { "@id": ORGANIZATION_ID },
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: page.h1,
      description: page.description,
      provider: { "@id": ORGANIZATION_ID },
      serviceType: "B2B Bekleidungsfertigung und Private Label",
      areaServed: ["Deutschland", "Österreich", "Schweiz"],
      availableLanguage: ["de", "en"],
      url: "https://irhaapparels.com/de/",
    },
    breadcrumbSchema([
      { name: "Startseite", path: "/" },
      { name: "Deutsch", path: "/de/" },
    ]),
  ];

  return (
    <div lang="de">
      <SEO
        title={page.title}
        description={page.description}
        path={page.path}
        locale="de"
        direction="ltr"
        jsonLd={jsonLd}
      />

      <section className="border-b border-border/60 bg-gradient-to-br from-card/80 via-background to-primary/10 pt-32 pb-16 md:pt-40 md:pb-24">
        <div className="container-luxe">
          <p className="eyebrow">{page.eyebrow}</p>
          <h1 className="mt-4 max-w-5xl font-display text-4xl leading-[1.02] md:text-7xl">{page.h1}</h1>
          <p className="mt-6 max-w-3xl text-base leading-8 text-foreground/72 md:text-lg">{page.intro}</p>
          <p className="mt-4 max-w-3xl border-l-2 border-primary pl-4 text-sm leading-7 text-foreground/62">{page.scopeNote}</p>

          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/inquiry?intent=rfq&source=%2Fde%2F" className="inline-flex min-h-12 items-center gap-2 rounded-md bg-gradient-gold px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
              {page.primaryCta} <ArrowRight size={14} />
            </a>
            <a href="/products" hrefLang="en" lang="en" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border/70 px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/78 hover:border-primary hover:text-primary">
              {page.secondaryCta}
            </a>
            <a href="/factory-video-call" className="inline-flex min-h-12 items-center gap-2 rounded-md border border-border/70 px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/78 hover:border-primary hover:text-primary">
              {page.factoryCta}
            </a>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20" aria-labelledby="german-published-pages">
        <div className="container-luxe">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div><p className="eyebrow">Deutsch</p><h2 id="german-published-pages" className="mt-3 font-display text-4xl">{page.sectionTitle}</h2></div>
            <p className="max-w-xl text-sm leading-7 text-foreground/58">Nur diese geprüften Seiten werden als veröffentlichte deutsche Inhalte in Sitemap und Sprachsignalen geführt.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {page.links.map((item) => (
              <a key={item.href} href={item.href} hrefLang="de" className="group border border-border/60 bg-card/35 p-7 outline-none transition-colors hover:border-primary focus-visible:ring-2 focus-visible:ring-primary md:p-8">
                <h3 className="font-display text-2xl">{item.title}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/62">{item.description}</p>
                <span className="mt-5 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary">Seite öffnen <ArrowRight size={13} className="transition-transform group-hover:translate-x-1" /></span>
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-14 md:py-20">
        <div className="container-luxe grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div><p className="eyebrow">B2B-Fertigungsmodell</p><h2 className="mt-3 font-display text-4xl">{page.trustTitle}</h2><p className="mt-5 text-sm leading-7 text-foreground/65">{page.trustBody}</p></div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {["Direkter Herstellerkontakt in Sialkot, Pakistan", "Muster- und Käuferfreigabe vor Serienproduktion", "Private Label, Etiketten und Verpackung nach Briefing", "MOQ, Preis und Zeitplan erst nach Anforderungsprüfung", "Kein automatischer Sprach- oder Länder-Redirect", "Englischer Gesamtkatalog bleibt unverändert verfügbar"].map((item) => (
              <li key={item} className="flex items-start gap-3 border border-border/50 p-4 text-sm leading-6 text-foreground/72"><CheckCircle2 size={16} className="mt-1 shrink-0 text-primary" />{item}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-luxe grid gap-5 md:grid-cols-2">
          <div className="border border-border/60 p-7"><Factory className="text-primary" size={24} /><h2 className="mt-4 font-display text-3xl">Fabrikprüfung per Video</h2><p className="mt-3 text-sm leading-7 text-foreground/62">Qualifizierte Einkäufer können vor einer Bestellung einen Live-Videoanruf zur Fabrikprüfung vereinbaren.</p></div>
          <div className="border border-border/60 p-7"><Globe2 className="text-primary" size={24} /><h2 className="mt-4 font-display text-3xl">Englischer Katalog als globale Basis</h2><p className="mt-3 text-sm leading-7 text-foreground/62">Wo keine veröffentlichte deutsche Entsprechung vorhanden ist, führt die Sprachauswahl zu dieser deutschen Übersicht oder klar gekennzeichneten englischen Inhalten.</p></div>
        </div>
      </section>
    </div>
  );
}
