import { useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Leaf,
  MapPin,
  PackageSearch,
  ShieldCheck,
  SwatchBook,
  Truck,
  Video,
} from "lucide-react";
import SEO from "@/components/SEO";
import {
  BUYER_INFORMATION_COPY,
  MATERIAL_DISCLAIMER,
  MATERIAL_FAMILIES,
  MATERIAL_PAGE_COPY,
  MATERIALS,
  ROUTES,
  materialDetail,
  type MaterialFamilyId,
} from "@/data/buyerCapabilities";
import { localizedMaterialSpecification } from "@/data/materialSpecificationCopy";
import { getRouteLocale, type LocaleCode } from "@/lib/i18nFoundation";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

const MATERIAL_PATHS = new Set<string>(Object.values(ROUTES.materials));

function isMaterialsRoute(pathname: string) {
  return MATERIAL_PATHS.has(pathname.replace(/\/+$/, "") || "/");
}

function localPath(locale: LocaleCode, kind: keyof typeof ROUTES) {
  return ROUTES[kind][locale];
}

export default function BuyerConfidence() {
  const { pathname } = useLocation();
  const locale = getRouteLocale(pathname);
  return isMaterialsRoute(pathname) ? <MaterialsPage locale={locale} path={pathname} /> : <BuyerInformationPage locale={locale} path={pathname} />;
}

function MaterialsPage({ locale, path }: { locale: LocaleCode; path: string }) {
  const copy = MATERIAL_PAGE_COPY[locale];
  const [family, setFamily] = useState<MaterialFamilyId | "all">("all");
  const visible = useMemo(
    () => (family === "all" ? MATERIALS : MATERIALS.filter((item) => item.family === family)),
    [family],
  );
  const description = copy.intro;
  const pageUrl = `${SITE_URL}${path}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: copy.eyebrow,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: locale,
      mainEntity: {
        "@type": "ItemList",
        numberOfItems: MATERIALS.length,
        itemListElement: MATERIALS.map((material, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: material.name[locale],
          url: `${pageUrl}#${material.id}`,
        })),
      },
    },
    breadcrumbSchema([
      { name: locale === "en" ? "Home" : copy.eyebrow, path: locale === "en" ? "/" : `/${locale}/` },
      { name: copy.eyebrow, path },
    ]),
  ];

  return (
    <>
      <SEO title={`${copy.eyebrow} | Irha Apparels`} description={description} path={path} jsonLd={jsonLd} />

      <section className="border-b border-border/60 pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="container-luxe max-w-6xl">
          <p className="eyebrow mb-5">{copy.eyebrow}</p>
          <h1 className="max-w-5xl font-display text-5xl leading-[0.98] md:text-7xl">{copy.title}</h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-foreground/70 md:text-lg">{copy.intro}</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to={localPath(locale, "buyerInformation")} className="inline-flex min-h-12 items-center gap-2 border border-gold/55 px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-background">
              {copy.related} <ArrowRight size={14} />
            </Link>
            <Link to="/inquiry?intent=rfq&category=materials" className="inline-flex min-h-12 items-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground">
              {copy.unsureCta} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card/20 py-8">
        <div className="container-luxe">
          <div role="group" aria-label={copy.filterLabel} className="flex flex-wrap gap-2">
            <FilterButton active={family === "all"} onClick={() => setFamily("all")}>{copy.all}</FilterButton>
            {MATERIAL_FAMILIES.map((item) => (
              <FilterButton key={item.id} active={family === item.id} onClick={() => setFamily(item.id)}>
                {item.title[locale]}
              </FilterButton>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <div className="mb-10 grid gap-5 border border-gold/30 bg-gold/5 p-6 md:grid-cols-[auto_1fr] md:items-start md:p-8">
            <SwatchBook className="text-gold" size={28} aria-hidden="true" />
            <div>
              <h2 className="font-display text-2xl md:text-3xl">{copy.gsmTitle}</h2>
              <p className="mt-3 max-w-4xl text-sm leading-7 text-foreground/68">{copy.gsmBody}</p>
              <p className="mt-3 max-w-4xl text-sm font-medium leading-7 text-foreground/82">{MATERIAL_DISCLAIMER[locale]}</p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            {visible.map((material) => {
              const detail = materialDetail(material, locale);
              const specification = localizedMaterialSpecification(material, locale);
              const familyData = MATERIAL_FAMILIES.find((item) => item.id === material.family)!;
              const materialReference = encodeURIComponent(`Material reference: ${material.name[locale]}`);
              const rfqHref = `/inquiry?intent=rfq&category=materials&name=${materialReference}`;
              const sampleHref = `/inquiry?intent=sample&category=materials&name=${materialReference}`;
              return (
                <article id={material.id} key={material.id} className="scroll-mt-28 border border-border/60 bg-card/25 p-6 md:p-8">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-gold">{familyData.title[locale]}</p>
                  <h2 className="mt-3 font-display text-3xl leading-tight">{material.name[locale]}</h2>
                  <dl className="mt-7 grid gap-5 text-sm sm:grid-cols-2">
                    <Detail term={copy.composition} value={specification.composition} />
                    <Detail term={copy.weight} value={specification.weight} />
                    <Detail term={copy.structure} value={detail.structure} />
                    <Detail term={copy.sourcing} value={detail.sourcing} />
                    <Detail term={copy.finishes} value={detail.finishes.join(" · ")} wide />
                    <Detail term={copy.uses} value={detail.uses.join(" · ")} wide />
                    <Detail term={copy.customization} value={detail.customization.join(" · ")} wide />
                  </dl>
                  <p className="mt-6 border-t border-border/50 pt-5 text-xs leading-6 text-foreground/55">{MATERIAL_DISCLAIMER[locale]}</p>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <Link to={rfqHref} className="inline-flex min-h-11 items-center gap-2 bg-primary px-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-primary-foreground">
                      {copy.rfq} <ArrowRight size={13} />
                    </Link>
                    <Link to={sampleHref} className="inline-flex min-h-11 items-center gap-2 border border-border px-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-foreground/78 hover:border-gold hover:text-gold">
                      {copy.sample} <PackageSearch size={14} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-secondary/30 py-20 md:py-24">
        <div className="container-luxe grid gap-8 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 className="font-display text-4xl leading-[1.05] md:text-5xl">{copy.unsureTitle}</h2>
            <p className="mt-5 max-w-3xl text-sm leading-7 text-foreground/68 md:text-base">{copy.unsureBody}</p>
          </div>
          <Link to="/inquiry?intent=rfq&category=materials" className="inline-flex min-h-12 items-center justify-center gap-2 bg-gradient-gold px-7 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground">
            {copy.unsureCta} <ArrowRight size={14} />
          </Link>
        </div>
      </section>
    </>
  );
}

function BuyerInformationPage({ locale, path }: { locale: LocaleCode; path: string }) {
  const copy = BUYER_INFORMATION_COPY[locale];
  const description = copy.intro;
  const pageUrl = `${SITE_URL}${path}`;
  const sections = [
    ["story", copy.sections.story.label],
    ["logistics", copy.sections.logistics.label],
    ["confidentiality", copy.sections.confidentiality.label],
    ["sustainability", copy.sections.sustainability.label],
    ["compliance", copy.sections.compliance.label],
  ] as const;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: copy.eyebrow,
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: locale,
    },
    breadcrumbSchema([
      { name: locale === "en" ? "Home" : copy.eyebrow, path: locale === "en" ? "/" : `/${locale}/` },
      { name: copy.eyebrow, path },
    ]),
  ];

  return (
    <>
      <SEO title={`${copy.eyebrow} | Irha Apparels`} description={description} path={path} jsonLd={jsonLd} />

      <section className="border-b border-border/60 pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="container-luxe max-w-6xl">
          <p className="eyebrow mb-5">{copy.eyebrow}</p>
          <h1 className="max-w-5xl font-display text-5xl leading-[0.98] md:text-7xl">{copy.title}</h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-foreground/70 md:text-lg">{copy.intro}</p>
          <nav aria-label={copy.navLabel} className="mt-8 flex flex-wrap gap-2">
            {sections.map(([id, label]) => (
              <a key={id} href={`#${id}`} className="inline-flex min-h-11 items-center border border-border/70 px-4 text-[10px] font-semibold uppercase tracking-[0.17em] text-foreground/70 hover:border-gold hover:text-gold">
                {label}
              </a>
            ))}
          </nav>
        </div>
      </section>

      <InformationSection id="story" eyebrow={copy.sections.story.label} title={copy.sections.story.title} Icon={MapPin}>
        <div className="space-y-5 text-sm leading-7 text-foreground/72 md:text-base md:leading-8">
          {copy.sections.story.paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
        </div>
        <Link to="/factory-video-call" className="mt-7 inline-flex min-h-12 items-center gap-2 border border-gold/55 px-5 text-[10px] font-semibold uppercase tracking-[0.2em] text-gold hover:bg-gold hover:text-background">
          <Video size={15} /> {copy.factoryCall}
        </Link>
      </InformationSection>

      <InformationSection id="logistics" eyebrow={copy.sections.logistics.label} title={copy.sections.logistics.title} Icon={Truck} tone="muted">
        <p className="max-w-4xl text-sm leading-7 text-foreground/72 md:text-base">{copy.sections.logistics.intro}</p>
        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {copy.sections.logistics.terms.map(([term, explanation]) => (
            <article key={term} className="border border-border/60 bg-background p-6">
              <h3 className="font-display text-3xl text-gold">{term}</h3>
              <p className="mt-3 text-sm leading-7 text-foreground/68">{explanation}</p>
            </article>
          ))}
        </div>
        <CheckedList items={copy.sections.logistics.modes} className="mt-8" />
        <div className="mt-8 border border-gold/30 bg-gold/5 p-6 md:p-8">
          <h3 className="font-display text-2xl md:text-3xl">{copy.sections.logistics.timelineTitle}</h3>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {copy.sections.logistics.timelines.map((timeline, index) => (
              <div key={timeline} className="border border-border/60 bg-background/70 p-4 text-sm text-foreground/75">
                <span className="mr-2 font-mono text-xs text-gold">0{index + 1}</span>{timeline}
              </div>
            ))}
          </div>
          <p className="mt-5 text-sm leading-7 text-foreground/68">{copy.sections.logistics.timelineNote}</p>
        </div>
      </InformationSection>

      <InformationSection id="confidentiality" eyebrow={copy.sections.confidentiality.label} title={copy.sections.confidentiality.title} Icon={ShieldCheck}>
        <CheckedList items={copy.sections.confidentiality.points} />
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/inquiry?intent=meeting&name=NDA%20review" className="inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
            <FileText size={15} /> {copy.sections.confidentiality.cta}
          </Link>
          <Link to="/privacy-policy" className="inline-flex min-h-12 items-center gap-2 border border-border px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/75 hover:border-gold hover:text-gold">
            {copy.privacy} <ArrowRight size={14} />
          </Link>
        </div>
      </InformationSection>

      <InformationSection id="sustainability" eyebrow={copy.sections.sustainability.label} title={copy.sections.sustainability.title} Icon={Leaf} tone="muted">
        <CheckedList items={copy.sections.sustainability.points} />
        <Link to="/inquiry?intent=rfq&category=responsible-materials&name=Responsible%20material%20option" className="mt-8 inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
          {copy.rfq} <ArrowRight size={14} />
        </Link>
      </InformationSection>

      <InformationSection id="compliance" eyebrow={copy.sections.compliance.label} title={copy.sections.compliance.title} Icon={ClipboardCheck}>
        <CheckedList items={copy.sections.compliance.points} />
        <p className="mt-8 border-l-2 border-gold pl-5 text-sm font-medium leading-7 text-foreground/82">{copy.sections.compliance.note}</p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/compliance" className="inline-flex min-h-12 items-center gap-2 border border-gold/55 px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-background">
            {copy.compliancePage} <ArrowRight size={14} />
          </Link>
          <Link to="/inquiry?intent=reference&name=Compliance%20requirement" className="inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
            {copy.rfq} <ArrowRight size={14} />
          </Link>
        </div>
      </InformationSection>

      <section className="border-t border-border/60 bg-secondary/30 py-20 md:py-24">
        <div className="container-luxe flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="eyebrow mb-3">{copy.eyebrow}</p>
            <h2 className="max-w-3xl font-display text-4xl leading-[1.05] md:text-5xl">{copy.intro}</h2>
          </div>
          <div className="flex flex-wrap gap-3 md:justify-end">
            <Link to={localPath(locale, "materials")} className="inline-flex min-h-12 items-center gap-2 border border-gold/55 px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold hover:bg-gold hover:text-background">
              <SwatchBook size={15} /> {copy.materials}
            </Link>
            <Link to="/inquiry?intent=rfq" className="inline-flex min-h-12 items-center gap-2 bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground">
              {copy.rfq} <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

function FilterButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={`inline-flex min-h-11 items-center rounded-md border px-4 text-[10px] font-semibold uppercase tracking-[0.16em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${active ? "border-primary bg-primary text-primary-foreground" : "border-border/70 text-foreground/68 hover:border-gold hover:text-gold"}`}>
      {children}
    </button>
  );
}

function Detail({ term, value, wide = false }: { term: string; value: string; wide?: boolean }) {
  return (
    <div className={wide ? "sm:col-span-2" : undefined}>
      <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-gold">{term}</dt>
      <dd className="mt-2 leading-6 text-foreground/68">{value}</dd>
    </div>
  );
}

function InformationSection({ id, eyebrow, title, Icon, tone = "plain", children }: { id: string; eyebrow: string; title: string; Icon: typeof Truck; tone?: "plain" | "muted"; children: React.ReactNode }) {
  return (
    <section id={id} className={`scroll-mt-28 border-b border-border/60 py-16 md:py-24 ${tone === "muted" ? "bg-card/20" : ""}`}>
      <div className="container-luxe grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
        <div>
          <Icon size={28} className="text-gold" aria-hidden="true" />
          <p className="eyebrow mb-4 mt-6">{eyebrow}</p>
          <h2 className="font-display text-4xl leading-[1.05] md:text-5xl">{title}</h2>
        </div>
        <div>{children}</div>
      </div>
    </section>
  );
}

function CheckedList({ items, className = "" }: { items: readonly string[]; className?: string }) {
  return (
    <ul className={`grid gap-3 ${className}`}>
      {items.map((item) => (
        <li key={item} className="flex min-h-12 gap-3 border border-border/55 bg-background/55 p-4 text-sm leading-7 text-foreground/70">
          <CheckCircle2 size={17} className="mt-1 shrink-0 text-gold" aria-hidden="true" />
          <span>{item}</span>
        </li>
      ))}
    </ul>
  );
}
