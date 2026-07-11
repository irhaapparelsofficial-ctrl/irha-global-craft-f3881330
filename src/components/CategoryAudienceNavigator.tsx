import { ArrowRight, Layers3, Users } from "lucide-react";
import { Link } from "react-router-dom";
import type { NormalizedCategory } from "@/hooks/usePublicCategoryData";
import { buildCategoryTaxonomy, taxonomyAudiencePath, taxonomyCollectionPath } from "@/lib/globalCategoryTaxonomy";
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
};

export default function CategoryAudienceNavigator({ category, locale = "en", compact = false }: Props) {
  const taxonomy = buildCategoryTaxonomy(category);
  const ui = taxonomyUi(locale);
  const topName = localizedTopName(locale, category.slug, category.name);

  if (taxonomy.audiences.length === 0) return null;

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
          {taxonomy.audiences.map((audience) => {
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
      </div>
    </section>
  );
}
