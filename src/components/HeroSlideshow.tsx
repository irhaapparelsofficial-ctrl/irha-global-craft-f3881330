import { useEffect, useState } from "react";

interface Slide {
  src: string;
  srcSet?: string;
  alt: string;
}

interface HeroSlideshowProps {
  slides: Slide[];
  interval?: number;
  sizes?: string;
}

export default function HeroSlideshow({
  slides,
  interval = 5000,
  sizes = "100vw",
}: HeroSlideshowProps) {
  const [index, setIndex] = useState(0);
  const [loaded, setLoaded] = useState<Set<number>>(() => new Set([0]));

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => {
        const next = (i + 1) % slides.length;
        // Pre-warm the slide after next so the upcoming transition is smooth
        setLoaded((prev) => {
          if (prev.has(next)) return prev;
          const copy = new Set(prev);
          copy.add(next);
          return copy;
        });
        return next;
      });
    }, interval);
    return () => clearInterval(id);
  }, [slides.length, interval]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((s, i) => {
        const shouldLoad = loaded.has(i) || i === (index + 1) % slides.length;
        return (
          <img
            key={s.src}
            src={shouldLoad ? s.src : undefined}
            srcSet={shouldLoad ? s.srcSet : undefined}
            sizes={sizes}
            alt={s.alt}
            width={1920}
            height={1280}
            decoding="async"
            loading={i === 0 ? "eager" : "lazy"}
            fetchPriority={i === 0 ? "high" : "low"}
            onLoad={() =>
              setLoaded((prev) => {
                if (prev.has(i)) return prev;
                const copy = new Set(prev);
                copy.add(i);
                return copy;
              })
            }
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out animate-[kenburns_22s_ease-in-out_infinite_alternate] ${
              i === index ? "opacity-100" : "opacity-0"
            }`}
          />
        );
      })}

      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => {
                setIndex(i);
                setLoaded((prev) => {
                  if (prev.has(i)) return prev;
                  const copy = new Set(prev);
                  copy.add(i);
                  return copy;
                });
              }}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-1 transition-all duration-500 ${
                i === index ? "w-10 bg-gold" : "w-5 bg-foreground/40 hover:bg-foreground/70"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
