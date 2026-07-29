import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import ThumbnailImage from "@/components/ThumbnailImage";

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
  imageSizes?: string;
  label?: string;
  priority?: boolean;
  showArrows?: boolean;
  showDots?: boolean;
};

export function selectEditorialHeroSlides(slides: Array<HeroMediaSlide | null | undefined>) {
  const seen = new Set<string>();
  const deduped = slides.filter((slide): slide is HeroMediaSlide => {
    if (!slide?.src || seen.has(slide.src)) return false;
    seen.add(slide.src);
    return true;
  });
  const coverSlides = deduped.filter((slide) => slide.fit !== "contain");
  return coverSlides.length > 0 ? coverSlides : deduped;
}

export default function HeroMediaSlideshow({
  slides,
  intervalMs = 9_000,
  className = "absolute inset-0",
  imageClassName = "",
  controlsClassName = "bottom-5 right-5",
  imageSizes = "100vw",
  label = "Featured images",
  priority = true,
  showArrows = true,
  showDots = true,
}: HeroMediaSlideshowProps) {
  const normalizedSlides = useMemo(() => selectEditorialHeroSlides(slides), [slides]);

  const [index, setIndex] = useState(0);
  const [loadedIndexes, setLoadedIndexes] = useState<Set<number>>(() => new Set([0]));
  const [firstSlideReady, setFirstSlideReady] = useState(false);
  const [documentHidden, setDocumentHidden] = useState(() => typeof document !== "undefined" && document.hidden);
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
    const update = () => setDocumentHidden(document.hidden);
    update();
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);

  useEffect(() => {
    setIndex((current) => (count > 0 ? Math.min(current, count - 1) : 0));
    setLoadedIndexes(new Set([0]));
    setFirstSlideReady(false);
  }, [count, normalizedSlides]);

  useEffect(() => {
    setLoadedIndexes((current) => {
      if (current.has(index)) return current;
      const next = new Set(current);
      next.add(index);
      return next;
    });
  }, [index]);

  const go = useCallback((next: number) => {
    if (count < 2) return;
    setIndex(((next % count) + count) % count);
  }, [count]);

  useEffect(() => {
    if (count < 2 || paused || reducedMotion || documentHidden || !firstSlideReady) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % count);
    }, intervalMs);
    return () => window.clearInterval(timer);
  }, [count, documentHidden, firstSlideReady, intervalMs, paused, reducedMotion]);

  if (count === 0) return null;

  return (
    <div
      className={`overflow-hidden ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onKeyDown={(event) => {
        if (event.key === "ArrowLeft") {
          event.preventDefault();
          go(index - 1);
        }
        if (event.key === "ArrowRight") {
          event.preventDefault();
          go(index + 1);
        }
      }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused(false);
      }}
      onTouchStart={(event) => {
        setPaused(true);
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
          className={`absolute inset-0 transition-[opacity,transform] duration-1000 ease-out motion-reduce:transition-none ${
            slideIndex === index ? "scale-100 opacity-100" : "pointer-events-none scale-[1.02] opacity-0"
          } ${slide.backgroundClassName ?? ""}`}
        >
          {loadedIndexes.has(slideIndex) && (
            <ThumbnailImage
              src={slide.src}
              originalSrc={slide.src}
              alt={slide.alt}
              width={1440}
              height={960}
              loading={priority && slideIndex === 0 ? "eager" : "lazy"}
              fetchPriority={priority && slideIndex === 0 ? "high" : "low"}
              decoding="async"
              sizes={imageSizes}
              className={`h-full w-full ${slide.fit === "contain" ? "object-contain" : "object-cover"} ${imageClassName}`}
              style={slide.position ? { objectPosition: slide.position } : undefined}
              onLoad={() => {
                if (slideIndex === 0) setFirstSlideReady(true);
              }}
            />
          )}
        </div>
      ))}

      {count > 1 && showArrows && (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous image"
            className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:flex"
          >
            <ChevronLeft size={17} />
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next image"
            className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center border border-white/25 bg-black/45 text-white backdrop-blur-sm transition-colors hover:border-gold hover:text-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold md:flex"
          >
            <ChevronRight size={17} />
          </button>
        </>
      )}

      {count > 1 && showDots && (
        <div className={`absolute z-20 flex items-center gap-0.5 ${controlsClassName}`}>
          {normalizedSlides.map((slide, slideIndex) => (
            <button
              key={`${slide.src}-dot`}
              type="button"
              onClick={() => setIndex(slideIndex)}
              aria-label={`Show image ${slideIndex + 1} of ${count}`}
              aria-current={slideIndex === index ? "true" : undefined}
              className="group inline-flex min-h-11 min-w-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
            >
              <span
                aria-hidden="true"
                className={`h-1.5 rounded-full border border-black/20 shadow-sm transition-all motion-reduce:transition-none ${
                  slideIndex === index ? "w-8 bg-gold" : "w-4 bg-white/65 group-hover:bg-white"
                }`}
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
