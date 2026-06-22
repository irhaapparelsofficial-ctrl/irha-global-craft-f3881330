import { Link } from "react-router-dom";
import bavarian from "@/assets/cat-bavarian.jpg?w=800&format=webp&quality=78";
import leather from "@/assets/cat-leather.jpg?w=800&format=webp&quality=78";
import sportswear from "@/assets/cat-sportswear.jpg?w=800&format=webp&quality=78";
import streetwear from "@/assets/cat-streetwear.jpg?w=800&format=webp&quality=78";
import leisure from "@/assets/cat-leisure.jpg?w=800&format=webp&quality=78";
import nightwear from "@/assets/cat-nightwear.jpg?w=800&format=webp&quality=78";

const CATS = [
  { title: "Bavarian / Trachten", slug: "bavarian", image: bavarian },
  { title: "Leatherwear", slug: "leatherwear", image: leather },
  { title: "Sportswear", slug: "sportswear", image: sportswear },
  { title: "Streetwear", slug: "streetwear", image: streetwear },
  { title: "Leisurewear", slug: "leisurewear", image: leisure },
  { title: "Nightwear", slug: "nightwear", image: nightwear },
];

export default function CategoryGrid() {
  return (
    <section className="py-20 md:py-24 bg-background">
      <div className="container-luxe">
        <div className="mb-12 text-center">
          <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold mb-3">
            Production Categories
          </p>
          <h2 className="font-display text-3xl md:text-5xl leading-tight">
            Engineered across <span className="text-gold italic">six garment worlds</span>
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 md:gap-4">
          {CATS.map((c) => (
            <Link
              key={c.slug}
              to={`/products/${c.slug}`}
              className="group relative aspect-[3/4] overflow-hidden bg-black border border-border/40 hover:border-gold/60 transition-colors"
            >
              <img
                src={c.image}
                alt={c.title}
                loading="lazy"
                decoding="async"
                className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-[1200ms] group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
                <h3 className="font-display text-white text-sm md:text-base leading-tight">
                  {c.title}
                </h3>
                <span className="mt-1 inline-block text-[9px] uppercase tracking-[0.25em] text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                  Explore →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
