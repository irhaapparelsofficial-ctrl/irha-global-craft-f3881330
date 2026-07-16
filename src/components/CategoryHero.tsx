import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";
import { BAVARIAN_MENS_COLLECTIONS } from "@/lib/bavarianMensCollections";
import { categoryHeroImage, topCategorySlugFromPath } from "@/lib/heroMedia";

export type CategoryHeroSlide = {
  image: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type Props = {
  slides: CategoryHeroSlide[];
  intervalMs?: number;
};

export default function CategoryHero({ slides, intervalMs = 4000 }: Props) {
  const { pathname } = useLocation();
  const categorySlug = topCategorySlugFromPath(pathname);
  const displaySlides = useMemo(() => {
    if (!categorySlug || slides.length === 0) return slides;
    const curatedImage = categoryHeroImage(categorySlug, slides[0]?.image);
    return curatedImage ? [{ ...slides[0], image: curatedImage }] : slides;
  }, [categorySlug, slides]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const count = displaySlides.length;
  const showBavarianMensNav = pathname === "/products/bavarian-trachten-wear";

  useEffect(() => {
    setIndex(0);
    setLoaded(new Set([0]));
  }, [displaySlides]);

  const go = useCallback(
    (next: number) => {
      if (count < 2) return;
      const n = ((next % count) + count) % count;
      setLoaded((prev) => {
        if (prev.has(n)) return prev;
        const copy = new Set(prev);
        copy.add(n);
        return copy;
      });
      setIndex(n);
    },
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % count;
        setLoaded((prev) => {
          if (prev.has(next)) return prev;
          const copy = new Set(prev);
          copy.add(next);
          return copy;
        });
        return next;
      });
    }, intervalMs);
    return () => window.clearInterval(id);
  }, [paused, count, intervalMs]);

  if (count === 0) return null;

  return (
    <>
      <section
        className="relative h-[54vh] min-h-[420px] w-full overflow-hidden border-b border-border/60 bg-card md:h-[72vh] md:min-h-[560px]"
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocus={() => setPaused(true)}
        onBlur={() => setPaused(false)}
        onTouchStart={(e) => {
          touchStartX.current = e.touches[0].clientX;
        }}
        onTouchEnd={(e) => {
          if (touchStartX.current == null) return;
          const dx = e.changedTouches[0].clientX - touchStartX.current;
          if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
          touchStartX.current = null;
        }}
        aria-roledescription="carousel"
      >
        {displaySlides.map((slide, slideIndex) => {
          const shouldLoad = loaded.has(slideIndex);
          return (
            <img
              key={`${slide.image}-${slideIndex}`}
              src={shouldLoad ? slide.image : undefined}
              alt={slide.title}
              loading={slideIndex === 0 ? "eager" : "lazy"}
              fetchPriority={slideIndex === 0 ? "high" : "low"}
              decoding="async"
              className={`absolute inset-0 h-full w-full object-cover object-center transition-[opacity,transform] duration-[1200ms] ease-out ${
                slideIndex === index ? "scale-100 opacity-100" : "scale-[1.02] opacity-0"
              }`}
              aria-hidden={slideIndex !== index}
            />
          );
        })}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/88 via-black/58 to-black/18" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-black/10" />

        {displaySlides.map((slide, slideIndex) => {
          const active = slideIndex === index;
          return (
            <div
              key={`content-${slide.image}-${slideIndex}`}
              className={`absolute inset-0 z-10 transition-opacity duration-[900ms] ${
                active ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
              aria-hidden={!active}
            >
              <div className="container-luxe relative flex h-full items-center">
                <div className="max-w-2xl py-12 text-white">
                  <div className="mb-5 h-px w-16 bg-gold" />
                  {slide.eyebrow && <p className="eyebrow mb-4 text-gold">{slide.eyebrow}</p>}
                  <h2 className="font-display text-3xl leading-[1.02] text-white md:text-5xl lg:text-6xl">{slide.title}</h2>
                  {slide.subtitle && <p className="mt-5 max-w-xl text-sm leading-relaxed text-white/82 md:text-base">{slide.subtitle}</p>}
                  {slide.ctaHref && (
                    <Link
                      to={slide.ctaHref}
                      tabIndex={active ? 0 : -1}
                      className="group mt-8 inline-flex items-center gap-3 bg-gradient-gold px-7 py-3.5 text-[11px] font-medium uppercase tracking-[0.3em] text-primary-foreground transition-all hover:shadow-gold"
                    >
                      {slide.ctaLabel ?? "View Collection"}
                      <ArrowUpRight size={16} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {count > 1 && (
          <>
            <button type="button" onClick={() => go(index - 1)} aria-label="Previous slide" className="absolute left-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/45 text-white backdrop-blur transition-colors hover:border-gold hover:text-gold md:flex">
              <ChevronLeft size={18} />
            </button>
            <button type="button" onClick={() => go(index + 1)} aria-label="Next slide" className="absolute right-4 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/45 text-white backdrop-blur transition-colors hover:border-gold hover:text-gold md:flex">
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2">
              {displaySlides.map((_, slideIndex) => (
                <button
                  key={slideIndex}
                  type="button"
                  onClick={() => go(slideIndex)}
                  aria-label={`Go to slide ${slideIndex + 1}`}
                  className={`h-1.5 rounded-full transition-all ${slideIndex === index ? "w-10 bg-gold" : "w-5 bg-white/40 hover:bg-white/70"}`}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {showBavarianMensNav && (
        <section className="border-b border-border/60 bg-background" aria-labelledby="mens-trachten-collections-heading">
          <div className="container-luxe py-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <p className="eyebrow mb-1">Men&apos;s Trachten</p>
                <h2 id="mens-trachten-collections-heading" className="font-display text-2xl md:text-3xl">
                  Browse buyer-ready collections
                </h2>
              </div>
              <Link
                to="/products/bavarian-trachten-wear?subcategory=men"
                className="hidden text-[10px] uppercase tracking-[0.22em] text-primary hover:underline sm:inline-flex"
              >
                View all men&apos;s styles
              </Link>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {BAVARIAN_MENS_COLLECTIONS.map((collection) => (
                <Link
                  key={collection.slug}
                  to={`/products/bavarian-trachten-wear/mens-trachten/${collection.slug}`}
                  className="whitespace-nowrap border border-border/60 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-foreground/70 transition-colors hover:border-primary hover:text-primary"
                >
                  {collection.shortName}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
