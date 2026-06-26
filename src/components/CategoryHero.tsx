import { useEffect, useRef, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, ChevronLeft, ChevronRight } from "lucide-react";

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

/**
 * Auto-playing category banner slideshow.
 * - 4s autoplay, pause on hover/focus
 * - arrow + dot controls
 * - touch swipe on mobile
 * - lazy-loads non-active images, eager preloads only the first
 * - smooth fade transition
 */
export default function CategoryHero({ slides, intervalMs = 4000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (next: number) => {
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
    <section
      className="relative w-full overflow-hidden bg-card border-b border-border/60 h-[50vh] min-h-[380px] md:h-[70vh] md:min-h-[520px]"
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
      {slides.map((s, i) => {
        const shouldLoad = loaded.has(i);
        return (
          <img
            key={`img-${i}`}
            src={shouldLoad ? s.image : undefined}
            alt={s.title}
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            decoding="async"
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1000ms] ease-in-out ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
            aria-hidden={i !== index}
          />
        );
      })}

      {/* Dark overlay for readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-black/20" />

      {/* Per-slide content */}
      {slides.map((s, i) => {
        const active = i === index;
        return (
          <div
            key={`content-${i}`}
            className={`absolute inset-0 z-10 transition-opacity duration-[900ms] ${
              active ? "opacity-100" : "opacity-0 pointer-events-none"
            }`}
            aria-hidden={!active}
          >
            <div className="container-luxe relative h-full flex items-center">
              <div className="max-w-2xl py-12">
                <div className="h-px w-16 bg-gold mb-5" />
                {s.eyebrow && (
                  <p className="eyebrow mb-4 text-gold">{s.eyebrow}</p>
                )}
                <h2 className="font-display text-white text-3xl md:text-5xl lg:text-6xl leading-[1.02]">
                  {s.title}
                </h2>
                {s.subtitle && (
                  <p className="mt-5 text-sm md:text-base text-white/80 max-w-xl leading-relaxed">
                    {s.subtitle}
                  </p>
                )}
                {s.ctaHref && (
                  <Link
                    to={s.ctaHref}
                    tabIndex={active ? 0 : -1}
                    className="group mt-8 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-3.5 text-[11px] uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all"
                  >
                    {s.ctaLabel ?? "View Collection"}
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
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous slide"
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/70 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next slide"
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-20 h-11 w-11 items-center justify-center bg-background/70 backdrop-blur border border-border/60 hover:border-gold hover:text-gold transition-colors"
          >
            <ChevronRight size={18} />
          </button>

          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-20">
            {slides.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  i === index ? "w-10 bg-gold" : "w-5 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
