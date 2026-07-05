import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import { resolveAsset } from "@/lib/assetResolver";

const ORDER = [
  "bavarian-trachten-wear",
  "premium-leather-apparel",
  "sportswear",
  "streetwear-activewear",
  "leisure-nightwear",
];

export default function FiveCategories() {
  const { data: tree = [] } = usePublicCatalogTree();
  const cats = ORDER.map((slug) => tree.find((t) => t.slug === slug)).filter(
    (c): c is NonNullable<typeof c> => !!c,
  );

  if (cats.length === 0) return null;

  return (
    <section className="py-20 md:py-28">
      <div className="container-luxe">
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6 mb-12">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">Product Categories</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">
              Five categories, <span className="text-gold italic">one atelier</span>.
            </h2>
          </div>
          <Link
            to="/products"
            className="text-[11px] uppercase tracking-[0.28em] text-foreground/70 hover:text-gold transition-colors inline-flex items-center gap-2"
          >
            View all collections <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
          {cats.map((c) => {
            const productCount = c.subs.reduce((n, s) => n + s.products.length, 0) + c.directProducts.length;
            const img = c.image_url ? resolveAsset(c.image_url) : "/placeholder.svg";
            return (
              <Link
                key={c.slug}
                to={`/products/${c.slug}`}
                className="group relative aspect-[3/4] overflow-hidden bg-black border border-border/40 hover:border-gold/70 transition-colors"
              >
                <img
                  src={img}
                  alt={c.name}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-[1.06]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />
                <div className="absolute inset-x-0 bottom-0 p-4">
                  <h3 className="font-display text-white text-base md:text-lg leading-tight">
                    {c.name}
                  </h3>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.25em] text-white/60">
                    {productCount > 0 ? `${productCount} products` : "View Collection"}
                  </p>
                  <span className="mt-2 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.28em] text-gold opacity-0 group-hover:opacity-100 transition-opacity">
                    View Collection <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
