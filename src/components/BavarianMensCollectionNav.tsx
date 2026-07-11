import { Link } from "react-router-dom";
import { BAVARIAN_MENS_COLLECTIONS } from "@/lib/bavarianMensCollections";

export default function BavarianMensCollectionNav() {
  return (
    <section
      className="border-b border-border/60 bg-background"
      aria-labelledby="mens-trachten-collections-heading"
    >
      <div className="container-luxe py-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="eyebrow mb-1">Men&apos;s Trachten</p>
            <h2
              id="mens-trachten-collections-heading"
              className="font-display text-2xl md:text-3xl"
            >
              Browse buyer-ready collections
            </h2>
          </div>
          <Link
            to="/products/bavarian-trachten-wear?subcategory=men"
            className="hidden text-[10px] uppercase tracking-[0.22em] text-primary hover:underline sm:inline-flex"
          >
            View all men&apos;s styles
          </Link>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {BAVARIAN_MENS_COLLECTIONS.map((collection) => (
            <Link
              key={collection.slug}
              to={`/products/bavarian-trachten-wear/mens-trachten/${collection.slug}`}
              className="whitespace-nowrap border border-border/60 px-4 py-3 text-[10px] uppercase tracking-[0.2em] text-foreground/70 transition-colors hover:border-primary hover:text-primary"
            >
              {collection.shortName}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
