import { useEffect, useState } from "react";

interface Slide {
  src: string;
  alt: string;
}

interface HeroSlideshowProps {
  slides: Slide[];
  interval?: number;
}

export default function HeroSlideshow({ slides, interval = 5000 }: HeroSlideshowProps) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % slides.length);
    }, interval);
    return () => clearInterval(id);
  }, [slides.length, interval]);

  return (
    <div className="absolute inset-0 overflow-hidden">
      {slides.map((s, i) => (
        <img
          key={s.src}
          src={s.src}
          alt={s.alt}
          width={1920}
          height={1280}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[1500ms] ease-in-out animate-[kenburns_22s_ease-in-out_infinite_alternate] ${
            i === index ? "opacity-100" : "opacity-0"
          }`}
          loading={i === 0 ? "eager" : "lazy"}
        />
      ))}

      {/* slide indicators */}
      {slides.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
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
