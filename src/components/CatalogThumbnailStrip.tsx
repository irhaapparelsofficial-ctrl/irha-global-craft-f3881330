import { CATALOG_PAGES, catalogThumb } from "@/lib/catalogPages";
import { Eye } from "lucide-react";

type Props = {
  slug: string;
  /** Limit how many thumbs to render (default 5). */
  count?: number;
  /** Skip cover pages. Default 1 → start from page 2. */
  skip?: number;
  onClick: () => void;
  className?: string;
  /** "row" stacks horizontally with peek effect, "strip" gives equal grid. */
  variant?: "row" | "strip";
};

/**
 * Reusable horizontal strip of catalog page thumbnails. Clicking any thumb
 * (or the trailing "Preview" tile) triggers onClick — typically opening the
 * CatalogFlipbook. Keeps the existing single-source-of-truth thumbnail set
 * in /public/catalogs/thumbs/.
 */
export default function CatalogThumbnailStrip({
  slug,
  count = 5,
  skip = 1,
  onClick,
  className = "",
  variant = "row",
}: Props) {
  const total = CATALOG_PAGES[slug] ?? 0;
  if (total === 0) return null;
  const pages = Array.from({ length: total }, (_, i) => i + 1)
    .filter((p) => p > skip)
    .slice(0, count);
  if (pages.length === 0) return null;

  return (
    <div
      className={`flex gap-2 md:gap-3 overflow-x-auto no-scrollbar snap-x ${className}`}
      aria-label="Catalog page previews"
    >
      {pages.map((p, i) => (
        <button
          key={p}
          type="button"
          onClick={onClick}
          className={`group relative shrink-0 snap-start aspect-[1/1.414] ${
            variant === "row" ? "w-24 md:w-32" : "w-28 md:w-36"
          } border border-border/60 bg-card overflow-hidden hover:border-primary transition-colors`}
          style={{
            transform: variant === "row" ? `rotate(${(i % 2 === 0 ? -1 : 1) * 0.6}deg)` : undefined,
          }}
          aria-label={`Open catalog at page ${p}`}
        >
          <img
            src={catalogThumb(slug, p)}
            alt=""
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
          <span className="absolute bottom-1.5 right-1.5 text-[8px] uppercase tracking-[0.2em] text-background/90 bg-foreground/70 px-1.5 py-0.5">
            {p}
          </span>
          <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Eye size={14} className="text-gold" />
          </div>
        </button>
      ))}
      <button
        type="button"
        onClick={onClick}
        className="group shrink-0 snap-start aspect-[1/1.414] w-24 md:w-32 border border-dashed border-border/60 hover:border-primary bg-card/40 flex flex-col items-center justify-center gap-2 transition-colors"
        aria-label="Open full catalog flipbook"
      >
        <Eye size={18} className="text-gold" />
        <span className="text-[9px] uppercase tracking-[0.25em] text-foreground/70 group-hover:text-primary text-center px-2">
          View all<br />{total} pages
        </span>
      </button>
    </div>
  );
}
