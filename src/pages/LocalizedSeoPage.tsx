import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowRight, CheckCircle2, Globe2 } from "lucide-react";
import SEO from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";

type Section = { heading?: string; body?: string; bullets?: string[] };
type Faq = { question?: string; answer?: string };
type Cta = { title?: string; body?: string; primary_label?: string; primary_href?: string; secondary_label?: string; secondary_href?: string };
type InternalLink = { label?: string; href?: string };
type LocaleInfo = { direction?: "ltr" | "rtl"; language_name?: string; native_name?: string };
type Page = {
  id: string;
  locale: string;
  base_route: string;
  slug: string;
  path: string;
  page_type: string;
  seo_title: string;
  seo_description: string;
  h1: string;
  eyebrow: string | null;
  intro: string;
  sections: Section[];
  faqs: Faq[];
  cta: Cta;
  internal_links: InternalLink[];
  json_ld: object;
  noindex: boolean;
  status: string;
  seo_locales?: LocaleInfo | null;
};
type AlternatePage = { locale: string; path: string; base_route: string };

export default function LocalizedSeoPage() {
  const { locale = "", slug = "" } = useParams();
  const [page, setPage] = useState<Page | null>(null);
  const [alternates, setAlternates] = useState<AlternatePage[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setNotFound(false);
      const normalizedLocale = decodeURIComponent(locale);
      const normalizedSlug = decodeURIComponent(slug);
      const { data, error } = await (supabase as any)
        .from("seo_localized_pages")
        .select("*,seo_locales(direction,language_name,native_name)")
        .eq("locale", normalizedLocale)
        .eq("slug", normalizedSlug)
        .eq("status", "published")
        .eq("noindex", false)
        .maybeSingle();
      if (cancelled) return;
      if (error || !data) {
        setPage(null);
        setAlternates([]);
        setNotFound(true);
        setLoading(false);
        return;
      }
      const normalized = normalizePage(data as Page);
      setPage(normalized);
      const { data: variants } = await (supabase as any)
        .from("seo_localized_pages")
        .select("locale,path,base_route")
        .eq("base_route", normalized.base_route)
        .eq("status", "published")
        .eq("noindex", false);
      if (!cancelled) {
        setAlternates((variants ?? []) as AlternatePage[]);
        setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [locale, slug]);

  const hreflang = useMemo(() => {
    if (!page) return [];
    return [
      { locale: "en", href: page.base_route },
      ...alternates.map((item) => ({ locale: item.locale, href: item.path })),
    ];
  }, [alternates, page]);

  if (loading) {
    return <div className="min-h-[60vh] flex items-center justify-center"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;
  }
  if (notFound || !page) {
    return (
      <div className="container mx-auto px-6 py-28 text-center">
        <SEO title="Localized page not found — Irha Apparels" description="This localized page is not published." path={`/intl/${locale}/${slug}`} noindex />
        <Globe2 size={32} className="mx-auto text-gold mb-4" />
        <h1 className="font-display text-3xl">Localized page not found</h1>
        <p className="text-sm text-muted-foreground mt-3">The requested language page is not published or has moved.</p>
        <Link to="/products" className="inline-flex items-center gap-2 mt-7 border border-gold/60 text-gold px-5 py-3 text-xs uppercase tracking-[0.2em]">View products <ArrowRight size={13} /></Link>
      </div>
    );
  }

  const direction = page.seo_locales?.direction === "rtl" ? "rtl" : "ltr";
  return (
    <div dir={direction}>
      <SEO
        title={page.seo_title}
        description={page.seo_description}
        path={page.path}
        locale={page.locale}
        direction={direction}
        alternates={hreflang}
        xDefaultPath={page.base_route}
        jsonLd={page.json_ld}
      />

      <section className="border-b border-border/60 bg-gradient-to-br from-card/70 via-background to-gold/5">
        <div className="container mx-auto px-6 py-20 md:py-28 max-w-5xl">
          {page.eyebrow && <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-4">{page.eyebrow}</p>}
          <h1 className="font-display text-4xl md:text-6xl leading-tight">{page.h1}</h1>
          <p className="text-base md:text-lg text-foreground/70 leading-relaxed mt-6 max-w-3xl">{page.intro}</p>
          <div className="flex flex-wrap gap-3 mt-8">
            <Link to={safePath(page.cta.primary_href) || "/inquiry?intent=rfq"} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
              {page.cta.primary_label || "Request a Quote"} <ArrowRight size={13} />
            </Link>
            <Link to={safePath(page.cta.secondary_href) || "/contact"} className="inline-flex items-center gap-2 border border-border/70 px-6 py-3 text-xs uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
              {page.cta.secondary_label || "Contact"}
            </Link>
          </div>
        </div>
      </section>

      <div className="container mx-auto px-6 py-16 md:py-24 max-w-5xl space-y-16">
        {page.sections.map((section, index) => (
          <section key={`${section.heading}-${index}`} className="grid md:grid-cols-12 gap-6 md:gap-10 border-b border-border/40 pb-14 last:border-0">
            <div className="md:col-span-4"><h2 className="font-display text-2xl md:text-3xl text-gold">{section.heading}</h2></div>
            <div className="md:col-span-8">
              <p className="text-sm md:text-base text-foreground/75 leading-relaxed whitespace-pre-wrap">{section.body}</p>
              {section.bullets && section.bullets.length > 0 && (
                <ul className="grid sm:grid-cols-2 gap-3 mt-6">
                  {section.bullets.map((bullet, bulletIndex) => (
                    <li key={`${bullet}-${bulletIndex}`} className="flex items-start gap-2 text-sm text-foreground/70"><CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" />{bullet}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        ))}

        {page.faqs.length > 0 && (
          <section>
            <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-3">FAQ</p>
            <div className="grid md:grid-cols-2 gap-4">
              {page.faqs.map((faq, index) => (
                <article key={`${faq.question}-${index}`} className="border border-border/60 bg-card/30 p-5">
                  <h2 className="font-display text-xl">{faq.question}</h2>
                  <p className="text-sm text-foreground/70 leading-relaxed mt-3">{faq.answer}</p>
                </article>
              ))}
            </div>
          </section>
        )}

        <section className="border border-gold/40 bg-gold/5 p-8 md:p-12 text-center">
          <h2 className="font-display text-3xl">{page.cta.title || page.h1}</h2>
          {page.cta.body && <p className="text-sm text-foreground/70 max-w-2xl mx-auto mt-4">{page.cta.body}</p>}
          <Link to={safePath(page.cta.primary_href) || "/inquiry?intent=rfq"} className="inline-flex items-center gap-2 mt-7 bg-gradient-gold text-primary-foreground px-6 py-3 text-xs uppercase tracking-[0.2em]">
            {page.cta.primary_label || "Request a Quote"} <ArrowRight size={13} />
          </Link>
        </section>

        {page.internal_links.length > 0 && (
          <nav aria-label="Related pages" className="flex flex-wrap justify-center gap-3">
            {page.internal_links.map((link, index) => safePath(link.href) ? (
              <Link key={`${link.href}-${index}`} to={link.href as string} className="border border-border/60 px-4 py-2 text-xs text-foreground/70 hover:border-gold hover:text-gold">{link.label}</Link>
            ) : null)}
          </nav>
        )}
      </div>
    </div>
  );
}

function normalizePage(page: Page): Page {
  return {
    ...page,
    sections: Array.isArray(page.sections) ? page.sections : [],
    faqs: Array.isArray(page.faqs) ? page.faqs : [],
    cta: page.cta && typeof page.cta === "object" ? page.cta : {},
    internal_links: Array.isArray(page.internal_links) ? page.internal_links : [],
    json_ld: page.json_ld && typeof page.json_ld === "object" ? page.json_ld : {},
  };
}

function safePath(value?: string | null) {
  return value && value.startsWith("/") && !value.startsWith("//") ? value : null;
}
