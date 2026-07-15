import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import ResilientImage from "@/components/ResilientImage";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import bavarianImage from "@/assets/og/og-bavarian-hero.jpg";
import leatherImage from "@/assets/og/og-leather.jpg";
import sportswearImage from "@/assets/og/og-sportswear.jpg";
import streetwearImage from "@/assets/og/og-streetwear.jpg";
import nightwearImage from "@/assets/og/og-nightwear.jpg";

const ORDER = [
  "bavarian-trachten-wear",
  "sportswear",
  "premium-leather-apparel",
  "streetwear-activewear",
  "leisure-nightwear",
] as const;

const IMAGES: Record<string, string> = {
  "bavarian-trachten-wear": bavarianImage,
  "premium-leather-apparel": leatherImage,
  sportswear: sportswearImage,
  "streetwear-activewear": streetwearImage,
  "leisure-nightwear": nightwearImage,
};

const DESCRIPTIONS: Record<string, string> = {
  "bavarian-trachten-wear": "Lederhosen, dirndl, shirts, vests and accessories",
  sportswear: "Team uniforms, tracksuits, training and club programs",
  "premium-leather-apparel": "Biker jackets, bombers, vests and leather bottoms",
  "streetwear-activewear": "Hoodies, tees, joggers and private-label sets",
  "leisure-nightwear": "Sleepwear, loungewear and custom leisure programs",
};

const LAYOUTS = ["lg:col-span-7", "lg:col-span-5", "lg:col-span-4", "lg:col-span-4", "lg:col-span-4"] as const;

export default function HomeCategoryUniverse() {
  const { data: tree = [] } = usePublicCatalogTree();
  const categories = ORDER.map((slug) => tree.find((category) => category.slug === slug && category.is_published))
    .filter((category): category is NonNullable<typeof category> => Boolean(category));

  if (categories.length === 0) return null;

  return (
    <section id="programs" className="relative overflow-hidden bg-background py-12 text-foreground md:py-18">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_8%_0%,hsl(var(--primary)/0.08),transparent_28%)]" />
      <div className="container-luxe relative">
        <div className="mb-6 grid gap-4 lg:mb-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <p className="text-[9px] font-semibold uppercase tracking-[0.22em] text-primary sm:text-[10px]">Manufacturing programs</p>
            <h2 className="mt-2 max-w-3xl font-display text-3xl leading-[1.08] sm:text-4xl lg:text-5xl">
              Start with the product line your business needs.
            </h2>
          </div>
          <div className="lg:col-span-4">
            <p className="text-sm leading-6 text-foreground/65 sm:leading-7">
              Browse the range, shortlist references and send the target material, quantity, branding and delivery market for review.
            </p>
            <Link to="/products" className="mt-3 inline-flex min-h-10 items-center gap-2 text-[9px] font-semibold uppercase tracking-[0.17em] text-primary hover:text-foreground">
              Browse all products <ArrowRight size={13} />
            </Link>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12">
          {categories.map((category, index) => {
            const count = category.directProducts.filter((product) => product.is_published).length +
              category.subs.reduce((total, sub) => total + sub.products.filter((product) => product.is_published).length, 0);
            const featuredRow = index < 2;
            const image = IMAGES[category.slug] ?? bavarianImage;

            return (
              <Link
                key={category.slug}
                to={`/products/${category.slug}`}
                className={`group grid min-h-[156px] grid-cols-[43%_57%] overflow-hidden rounded-xl border border-border/70 bg-card transition-all duration-300 hover:-translate-y-1 hover:border-primary/70 hover:shadow-elegant sm:block sm:min-h-0 sm:rounded-none ${LAYOUTS[index] ?? "lg:col-span-4"}`}
              >
                <div className={`relative h-full min-h-[156px] overflow-hidden bg-black sm:min-h-0 ${featuredRow ? "sm:aspect-[16/9]" : "sm:aspect-[4/3]"}`}>
                  <ResilientImage
                    sources={[image]}
                    alt={`${category.name} custom manufacturing program`}
                    loading="lazy"
                    decoding="async"
                    width={1200}
                    height={800}
                    className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.035]"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/5 to-transparent" />
                  <span className="absolute bottom-2 left-2 text-[7px] font-semibold uppercase tracking-[0.14em] text-white/80 sm:bottom-3 sm:left-4 sm:text-[8px]">
                    {count} published styles
                  </span>
                </div>

                <div className="flex min-w-0 flex-col justify-center p-4 sm:block sm:p-5 md:p-6">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className={`min-w-0 font-display leading-tight text-foreground transition-colors group-hover:text-primary ${featuredRow ? "text-xl sm:text-2xl md:text-3xl" : "text-lg sm:text-xl md:text-2xl"}`}>
                      {category.name}
                    </h3>
                    <ArrowRight size={15} className="mt-1 shrink-0 text-primary transition-transform group-hover:translate-x-1" />
                  </div>
                  <p className="mt-2 line-clamp-2 text-[10px] leading-5 text-foreground/58 sm:text-xs sm:leading-6">
                    {DESCRIPTIONS[category.slug] ?? "Custom product development and private-label manufacturing"}
                  </p>
                  <span className="mt-3 inline-flex text-[8px] font-semibold uppercase tracking-[0.16em] text-primary sm:mt-4 sm:text-[9px]">Review program</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
