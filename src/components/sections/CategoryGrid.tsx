import { Link } from "react-router-dom";
const bavarian = "/__l5e/assets-v1/18e78e80-1ac2-4ed5-bf35-4930c0bc76a3/irha-0035.jpg";
const leather = "/__l5e/assets-v1/b55b7737-37a1-492a-8657-75c9c2d47f8a/irha-fix-0000.jpg";
const sportswear = "/__l5e/assets-v1/6ed8d48e-2b63-4777-a00d-32bdccbd5e05/irha-0109.jpg";
const streetwear = "/__l5e/assets-v1/2b3607f6-d2e8-4dcc-a58b-7b5602639f7b/irha-0206.jpg";
const leisure = "/__l5e/assets-v1/0a87c0d5-13a9-4596-a673-0b4f01711f0c/irha-0105.jpg";
const nightwear = "/__l5e/assets-v1/10eccef4-8445-4dfb-b41b-4c5fff6dda24/irha-0196.jpg";

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
