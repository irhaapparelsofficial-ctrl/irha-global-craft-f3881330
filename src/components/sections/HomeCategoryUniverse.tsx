import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import {
  CatalogCard,
  CatalogCardActions,
  CatalogCardBody,
  CatalogCardDescription,
  CatalogCardEyebrow,
  CatalogCardMedia,
  CatalogCardTitle,
} from "@/components/catalog/CatalogCard";
import { useCanonicalCategoryMedia } from "@/hooks/useCanonicalCategoryMedia";
import { MAIN_CATEGORY_SLUGS } from "@/lib/categoryMediaRegistry";

export default function HomeCategoryUniverse() {
  const { mediaBySlug } = useCanonicalCategoryMedia();

  return (
    <section id="programs" className="relative overflow-hidden bg-background py-11 text-foreground md:py-18">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="container-luxe relative">
        <div className="mb-6 grid gap-3 lg:mb-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-primary sm:text-[10px]">Manufacturing programs</p>
            <h2 className="mt-2 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">Choose the product line your business needs.</h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm leading-6 text-foreground/65 sm:leading-7">Browse references, then send the target material, quantity, branding and destination.</p>
            <Link to="/products" className="mt-2 inline-flex min-h-11 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary hover:text-foreground sm:mt-3">All products <ArrowRight size={13} /></Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 min-[520px]:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {MAIN_CATEGORY_SLUGS.map((slug) => {
            const program = mediaBySlug[slug];
            return (
              <Link
                key={program.id}
                to={`/products/${program.slug}`}
                className="min-w-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                data-category-media-id={program.id}
              >
                <CatalogCard>
                  <CatalogCardMedia ratio="landscape">
                    <ResilientImage
                      sources={[program.src, program.fallbackSrc]}
                      alt={program.alt}
                      loading="lazy"
                      decoding="async"
                      width={1200}
                      height={900}
                      sizes="(max-width: 519px) 92vw, (max-width: 1023px) 46vw, (max-width: 1535px) 30vw, 18vw"
                      className="relative h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-[1.025] sm:p-5 motion-reduce:transition-none"
                      style={{ objectPosition: program.position }}
                    />
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/84 via-black/5 to-transparent" />
                    <span className="absolute bottom-3 left-3 right-3 text-[7px] font-semibold uppercase tracking-[0.14em] text-white/80 sm:text-[8px]">
                      Digital catalogue reference · Made-to-order program
                    </span>
                  </CatalogCardMedia>
                  <CatalogCardBody>
                    <CatalogCardEyebrow>Manufacturing category</CatalogCardEyebrow>
                    <CatalogCardTitle>{program.name}</CatalogCardTitle>
                    <CatalogCardDescription>{program.description}</CatalogCardDescription>
                    <CatalogCardActions className="flex min-h-11 items-end justify-between gap-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary">
                      <span>Review program</span>
                      <ArrowRight size={15} className="shrink-0 transition-transform group-hover:translate-x-1 motion-reduce:transition-none" />
                    </CatalogCardActions>
                  </CatalogCardBody>
                </CatalogCard>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
