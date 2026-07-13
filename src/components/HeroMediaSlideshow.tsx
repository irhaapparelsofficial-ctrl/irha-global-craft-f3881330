import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type HeroMediaSlide = {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  position?: string;
  backgroundClassName?: string;
};

type HeroMediaSlideshowProps = {
  slides: Array<HeroMediaSlide | null | undefined>;
  intervalMs?: number;
  className?: string;
  imageClassName?: string;
  controlsClassName?: string;
  label?: string;
  priority?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
};

export default function HeroMediaSlideshow({
  slides,
  intervalMs = 5200,
  className = "absolute inset-0",
  imageClassName = "",
  controlsClassName = "bottom-5 right-5",
  label = "Featured images",
  priority = true,
  showArrows = true,
  showDots = true,
}: HeroMediaSlideshowProps) {
  const normalizedSlides = useMemo(() => {
    const seen = new Set<string>();
    return slides.filter((slide): slide is HeroMediaSlide => {
      if (!slide?.src || seen.has(slide.src)) return false;
      seen.add(slide.src);
      return true;
    });
  }, [slides]);

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const count = normalizedSlides.length;

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(media.matches);
    update();
    media.addEventListener?.("change", update);
    return () => media.removeEventListener?.("change", update);
  }, []);

  useEffect(() => {
    setIndex((current) => (count > 0 ? Math.min(current, count - 1) : 0));
  }, [count]);

  const go = useCallback((next: number) => {
    if (count < 2) return;
    setIndex(((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, intervalMs, paused, reducedMotion]);

  if (count === 0) return null;

  return (
    <div
      className={`overflow-hidden ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={(event) => {
        touchStartX.current = event.touches[0]?.clientX ?? null;
      }}
      onTouchEnd={(event) => {
        if (touchStartX.current == null) return;
        const delta = (event.changedTouches[0]?.clientX ?? touchStartX.current) - touchStartX.current;
        if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1));
        touchStartX.current = null;
      }}
    >
      {normalizedSlides.map((slide, slideIndex) => (
        <div
          key={slide.src}
          aria-hidden={slideIndex !== index}
          className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
            slideIndex === index ? "opacity-100" : "opacity-0"
          } ${slide.backgroundClassName ?? ""}`}
        >
          <img
            src={slide.src}
            alt={slide.alt}
            width={1920}
            height={1280}
            loading={priority && slideIndex === 0 ? "eager" : "lazy"}
            fetchPriority={priority && slideIndex === 0 ? "high" : "auto"}
            decoding="async"
            className={`h-full w-full ${slide.fit === "contain" ? "object-contain" : "object-cover"} ${imageClassName}`}
            style={slide.position ? { objectPosition: slide.position } : undefined}
          />
        </div>
      ))}

      {count > 1 && showArrows && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-gold hover:text-gold md:flex"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-gold hover:text-gold md:flex"
          >
            <ChevronRight size={17} />
          </button>
        </>
      )}

      {count > 1 && showDots && (
        <div className={`absolute z-20 flex items-center gap-2 ${controlsClassName}`}>
          {normalizedSlides.map((slide, slideIndex) => (
            <button
              key={`${slide.src}-dot`}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Show image ${slideIndex + 1} of ${count}`}
              aria-current={slideIndex === index ? "true" : undefined}
              className={`h-1.5 rounded-full border border-black/20 shadow-sm transition-all ${
                slideIndex === index ? "w-8 bg-gold" : "w-4 bg-white/65 hover:bg-white"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
