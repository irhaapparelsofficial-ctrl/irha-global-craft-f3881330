import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import manufacturing from "@/assets/manufacturing.jpg?w=1920;1280;800&format=webp&quality=75&as=srcset";
import manufacturingFallback from "@/assets/manufacturing.jpg?w=1600&format=webp&quality=78";

export default function FactoryHero() {
  return (
    <section className="relative w-full h-[70vh] min-h-[520px] overflow-hidden bg-black">
      <img
        src={manufacturingFallback}
        srcSet={manufacturing}
        sizes="100vw"
        alt="Irha Apparels manufacturing facility — Sialkot, Pakistan"
        width={1920}
        height={1280}
        loading="eager"
        fetchPriority="high"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover object-center"
      />
      <div className="absolute inset-0 bg-black/60" />

      <div className="relative z-10 flex h-full w-full flex-col items-center justify-center px-6 text-center">
        <p className="mb-5 text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold">
          Sialkot · Pakistan
        </p>
        <h1 className="font-display text-white text-4xl md:text-6xl lg:text-7xl leading-[1.05] tracking-tight max-w-4xl">
          Premium Manufacturing <br className="hidden sm:block" />
          <span className="text-gold italic font-normal">from Sialkot</span>
        </h1>
        <p className="mt-6 max-w-xl text-sm md:text-base text-white/80 leading-relaxed">
          OEM · ODM · Private Label apparel for retailers and labels across DACH, UK, USA, Canada & Australia.
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
