import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type CategoryHeroSlide = {
  image: string;
  eyebrow?: string;
  title: string;
  subtitle?: string;
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
 * - lazy-loads non-active images
 */
export default function CategoryHero({ slides, intervalMs = 4000 }: Props) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = slides.length;

  const go = useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  useEffect(() => {
    if (paused || count <= 1) return;
    const id = window.setInterval(() => setIndex((i) => (i + 1) % count), intervalMs);
    return () => window.clearInterval(id);
  }, [paused, count, intervalMs]);

  if (count === 0) return null;

  return (
    <section
      className="relative w-full overflow-hidden bg-card border-b border-border/60"
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
      <div className="relative aspect-[21/9] md:aspect-[21/8] w-full">
        {slides.map((s, i) => {
          const active = i === index;
          return (
            <div
              key={i}
              className={`absolute inset-0 transition-opacity duration-700 ${
                active ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
              aria-hidden={!active}
            >
              <img
                src={s.image}
                alt={s.title}
                loading={i === 0 ? "eager" : "lazy"}
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-background/85 via-background/50 to-background/10" />
              <div className="container-luxe relative h-full flex items-center">
                <div className="max-w-2xl py-12">
                  {s.eyebrow && (
                    <p className="eyebrow mb-4 text-gold">{s.eyebrow}</p>
                  )}
                  <h2 className="font-display text-3xl md:text-5xl lg:text-6xl leading-[1.02]">
                    {s.title}
                  </h2>
                  {s.subtitle && (
                    <p className="mt-5 text-sm md:text-base text-foreground/75 max-w-xl leading-relaxed">
                      {s.subtitle}
                    </p>
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
              className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 items-center justify-center bg-background/70 backdrop-blur border border-border/60 hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(index + 1)}
              aria-label="Next slide"
              className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 h-11 w-11 items-center justify-center bg-background/70 backdrop-blur border border-border/60 hover:border-primary hover:text-primary transition-colors"
            >
              <ChevronRight size={18} />
            </button>

            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10">
              {slides.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => go(i)}
                  aria-label={`Go to slide ${i + 1}`}
                  className={`h-1.5 rounded-full transition-all ${
                    i === index ? "w-8 bg-primary" : "w-4 bg-foreground/30 hover:bg-foreground/60"
                  }`}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}
