import { ArrowRight, BookOpen, CheckCircle2, Layers3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import {
  buildCategoryTaxonomy,
  taxonomyAudiencePath,
  taxonomyCollectionPath,
  type CategoryTaxonomy,
} from "@/lib/globalCategoryTaxonomy";
import { CATEGORY_SEO } from "@/lib/categorySeo";
import {
  localizedAudienceName,
  localizedCollectionName,
  localizedTopName,
  taxonomyUi,
  type TaxonomyLocale,
} from "@/lib/taxonomyI18n";

type Props = {
  category: NormalizedCategory;
  locale?: TaxonomyLocale;
  compact?: boolean;
  taxonomy?: CategoryTaxonomy;
};

export default function CategoryAudienceNavigator({
  category,
  locale = "en",
  compact = false,
  taxonomy: suppliedTaxonomy,
}: Props) {
  const taxonomy = suppliedTaxonomy ?? buildCategoryTaxonomy(category);
  const ui = taxonomyUi(locale);
  const topName = localizedTopName(locale, category.slug, category.name);
  const buyerContent = locale === "en" ? CATEGORY_SEO[category.slug] : undefined;
  const visibleAudiences = taxonomy.audiences
    .map((audience) => ({
      ...audience,
      collections: audience.collections.filter((collection) => collection.products.length > 0),
    }))
    .filter((audience) => audience.productCount > 0 && audience.collections.length > 0);

  if (visibleAudiences.length === 0) return null;

  return (
    <section className={compact ? "py-8" : "py-16 border-y border-border/60"} aria-labelledby={`audience-nav-${category.slug}`}>
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <p className="eyebrow mb-3">{ui.audiences}</p>
            <h2 id={`audience-nav-${category.slug}`} className="font-display text-3xl md:text-5xl leading-tight">
              {topName}
            </h2>
          </div>
          <p className="text-sm text-foreground/60 max-w-xl leading-relaxed">{ui.programNote}</p>
        </div>

        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
          {visibleAudiences.map((audience) => {
            const audienceName = localizedAudienceName(locale, audience.slug, audience.name);
            const visibleCollections = audience.collections.slice(0, compact ? 4 : 6);
            return (
              <article key={audience.slug} className="border border-border/60 bg-card/25 p-5 md:p-6 flex flex-col min-h-full">
                <div className="flex items-start justify-between gap-4">
                  <div className="w-11 h-11 border border-primary/30 bg-primary/5 flex items-center justify-center text-primary">
                    <Users size={19} aria-hidden="true" />
                  </div>
                  <span className="text-[10px] uppercase tracking-[0.22em] text-foreground/45">
                    {audience.productCount} {ui.styles}
                  </span>
                </div>

                <h3 className="font-display text-2xl mt-5">{audienceName}</h3>
                <p className="text-sm text-foreground/65 leading-relaxed mt-3">{audience.description}</p>

                <div className="mt-5 pt-4 border-t border-border/50 flex-1">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-foreground/45 mb-3 inline-flex items-center gap-2">
                    <Layers3 size={12} aria-hidden="true" /> {ui.productCategories}
                  </p>
                  <ul className="space-y-2">
                    {visibleCollections.map((collection) => (
                      <li key={collection.slug}>
                        <Link
                          to={taxonomyCollectionPath(category.slug, audience.slug, collection.slug, locale)}
                          className="group flex items-center justify-between gap-3 text-sm text-foreground/75 hover:text-primary"
                        >
                          <span>{localizedCollectionName(locale, collection.slug, collection.name)}</span>
                          <span className="text-[10px] text-foreground/40 group-hover:text-primary">{collection.products.length}</span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  to={taxonomyAudiencePath(category.slug, audience.slug, locale)}
                  className="mt-6 inline-flex items-center justify-between gap-3 border-t border-border/50 pt-4 text-[11px] uppercase tracking-[0.22em] text-primary hover:text-primary/75"
                >
                  {ui.viewCollection} <ArrowRight size={14} aria-hidden="true" />
                </Link>
              </article>
            );
          })}
        </div>

        {!compact && buyerContent && (
          <div className="mt-16 pt-14 border-t border-border/60">
            <div className="max-w-4xl">
              <p className="eyebrow mb-3">Buyer planning guide</p>
              <h2 className="font-display text-3xl md:text-5xl leading-tight">Plan a specification-led {category.name} program</h2>
              <p className="mt-5 text-sm md:text-base text-foreground/70 leading-relaxed">{buyerContent.intro}</p>
            </div>

            <div className="grid lg:grid-cols-3 gap-5 mt-9">
              {buyerContent.sections.map((section) => (
                <article key={section.heading} className="border border-border/60 bg-card/20 p-6 md:p-7">
                  <h3 className="font-display text-2xl">{section.heading}</h3>
                  <p className="mt-4 text-sm text-foreground/65 leading-relaxed">{section.body}</p>
                  <ul className="mt-5 space-y-3">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-foreground/70">
                        <CheckCircle2 size={15} className="text-gold shrink-0 mt-0.5" aria-hidden="true" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </article>
              ))}
            </div>

            <div className="grid lg:grid-cols-12 gap-8 mt-12">
              <div className="lg:col-span-8">
                <p className="eyebrow mb-3">Buyer questions</p>
                <div className="divide-y divide-border/60 border-y border-border/60">
                  {buyerContent.faqs.map((faq) => (
                    <details key={faq.q} className="group py-5">
                      <summary className="cursor-pointer list-none flex items-start justify-between gap-5">
                        <h3 className="font-display text-lg md:text-xl leading-snug group-open:text-primary">{faq.q}</h3>
                        <span className="text-gold text-xl leading-none group-open:rotate-45 transition-transform">+</span>
                      </summary>
                      <p className="mt-4 text-sm text-foreground/70 leading-relaxed max-w-3xl">{faq.a}</p>
                    </details>
                  ))}
                </div>
              </div>

              <nav aria-label={`${category.name} buyer guides`} className="lg:col-span-4 border border-gold/35 bg-gold/5 p-6">
                <p className="text-[10px] uppercase tracking-[0.26em] text-gold inline-flex items-center gap-2">
                  <BookOpen size={13} aria-hidden="true" /> Related sourcing guides
                </p>
                <div className="mt-5 space-y-3">
                  {buyerContent.buyerGuides.map((guide) => (
                    <Link key={guide.href} to={guide.href} className="flex items-center justify-between gap-3 border-b border-border/50 pb-3 text-sm text-foreground/75 hover:text-primary last:border-b-0 last:pb-0">
                      <span>{guide.label}</span>
                      <ArrowRight size={13} aria-hidden="true" />
                    </Link>
                  ))}
                </div>
              </nav>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
