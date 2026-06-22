import Autoplay from "embla-carousel-autoplay";
import Fade from "embla-carousel-fade";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";

import leatherFlatlay from "@/assets/banners/leather-flatlay.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherFlatlayFallback from "@/assets/banners/leather-flatlay.jpg?w=1600&format=webp&quality=74";
import leatherStack from "@/assets/banners/leather-stack.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherStackFallback from "@/assets/banners/leather-stack.jpg?w=1600&format=webp&quality=74";
import leatherStitch from "@/assets/banners/leather-stitch.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import leatherStitchFallback from "@/assets/banners/leather-stitch.jpg?w=1600&format=webp&quality=74";
import productsFlatlay from "@/assets/banners/products-flatlay.jpg?w=1920;1280;800&format=webp&quality=72&as=srcset";
import productsFlatlayFallback from "@/assets/banners/products-flatlay.jpg?w=1600&format=webp&quality=74";

const SLIDES = [
  { src: productsFlatlayFallback, srcSet: productsFlatlay, alt: "Premium apparel flat-lay — Irha Apparels" },
  { src: leatherFlatlayFallback, srcSet: leatherFlatlay, alt: "Leather goods flat-lay" },
  { src: leatherStackFallback, srcSet: leatherStack, alt: "Folded leather stack — atelier" },
  { src: leatherStitchFallback, srcSet: leatherStitch, alt: "Hand-stitched leather detail" },
];

export default function HeroCarousel() {
  return (
    <section className="relative h-[88vh] min-h-[560px] w-full overflow-hidden bg-background">
      <Carousel
        opts={{ loop: true, duration: 40 }}
        plugins={[
          Autoplay({ delay: 4000, stopOnInteraction: false, stopOnMouseEnter: true }),
          Fade(),
        ]}
        className="absolute inset-0 h-full w-full"
      >
        <CarouselContent className="ml-0 h-full">
          {SLIDES.map((s, i) => (
            <CarouselItem key={s.src} className="pl-0 h-full basis-full">
              <div className="relative h-full w-full">
                <img
                  src={s.src}
                  srcSet={s.srcSet}
                  sizes="100vw"
                  alt={s.alt}
                  width={1920}
                  height={1280}
                  loading={i === 0 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "low"}
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center"
                />
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>
      </Carousel>

      {/* Dark overlay for text contrast */}
      <div className="pointer-events-none absolute inset-0 bg-black/50" />

      {/* Centered content */}
      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
        <p className="mb-5 text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold">
          Sialkot · Worldwide Export
        </p>
        <h1 className="font-display text-white text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight max-w-4xl">
          Premium Garments <br className="hidden sm:block" />
          <span className="text-gold italic font-normal">from Sialkot</span>
        </h1>
        <p className="mt-6 max-w-xl text-sm md:text-base text-white/80 leading-relaxed">
          OEM · ODM · Private Label. Heritage Bavarian, full-grain leather and modern textile production —
          engineered for DACH, UK, USA, Canada & Australia.
        </p>
        <Link
          to="/products"
          className="group mt-9 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] font-medium hover:shadow-gold transition-all"
        >
          View Collections
          <ArrowUpRight size={18} className="transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
        </Link>
      </div>
    </section>
  );
}
