import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Maximize2, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { CATALOG_PAGES, catalogPdf, catalogThumb } from "@/lib/catalogPages";


type Props = {
  slug: string;
  title: string;
  open: boolean;
  onClose: () => void;
  /** Page number (1-indexed) to open at. Defaults to the first product/mockup
   * page so buyers see products immediately instead of the cover. */
  startPage?: number;
  /** optional secondary action (e.g. request quote) */
  action?: React.ReactNode;
};

/**
 * Flipbook-style catalog preview. Two-page spread on desktop, single page on
 * mobile, with prev/next nav, keyboard arrows, page counter, jump-to-page
 * dots and a download CTA. Pages are pre-rendered JPGs in /public/catalogs/thumbs.
 */
export default function CatalogFlipbook({ slug, title, open, onClose, startPage, action }: Props) {
  const total = CATALOG_PAGES[slug] ?? 0;
  const [spread, setSpread] = useState(0);
  const [isDesktop, setIsDesktop] = useState(false);
  const [dir, setDir] = useState<1 | -1>(1);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(min-width: 900px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Build the spread list. Desktop pairs pages (1) | (2-3) | (4-5) | ...
  const spreads = useMemo(() => {
    if (total === 0) return [] as number[][];
    if (!isDesktop) return Array.from({ length: total }, (_, i) => [i + 1]);
    const list: number[][] = [[1]];
    for (let p = 2; p <= total; p += 2) {
      const next = p + 1 <= total ? [p, p + 1] : [p];
      list.push(next);
    }
    return list;
  }, [total, isDesktop]);

  // Reset on open / slug change. Skip the cover so buyers land directly on
  // a product/mockup spread. Default jump page differs per catalog.
  useEffect(() => {
    if (!open || spreads.length === 0) return;
    const defaultStart = slug === "master-catalogue-2026" ? 4 : 3;
    const target = startPage ?? defaultStart;
    const i = spreads.findIndex((s) => s.includes(target));
    setSpread(i >= 0 ? i : 0);
    setDir(1);
  }, [open, slug, startPage, spreads]);

  const idx = Math.min(spread, spreads.length - 1);
  const cur = spreads[idx] || [];

  const go = (next: number) => {
    if (next < 0 || next >= spreads.length) return;
    setDir(next > idx ? 1 : -1);
    setSpread(next);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") go(idx + 1);
      else if (e.key === "ArrowLeft") go(idx - 1);
      else if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, idx, spreads.length]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`${title} catalog flipbook`}
      className="fixed inset-0 z-[80] bg-background/95 backdrop-blur-md flex flex-col"
    >
      {/* Top bar */}
      <header className="flex items-start justify-between gap-4 px-5 md:px-8 py-4 border-b border-border/60">
        <div className="min-w-0 flex-1">
          <p className="text-[10px] uppercase tracking-[0.3em] text-gold mb-1">Catalogue Flipbook</p>
          <h2 className="font-display text-base sm:text-lg md:text-2xl leading-tight tracking-tight line-clamp-2 break-words">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => forceDownload(catalogPdf(slug), `Irha-${slug}-catalog.pdf`)}
            className="hidden sm:inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 text-[10px] uppercase tracking-[0.3em] transition-colors"
          >
            <Download size={13} /> Download PDF
          </button>
          <a
            href={catalogPdf(slug)}
            target="_blank"
            rel="noreferrer"
            className="hidden md:inline-flex items-center gap-2 border border-border/60 hover:border-primary px-4 py-2.5 text-[10px] uppercase tracking-[0.3em] transition-colors"
            aria-label="Open PDF in new tab"
          >
            <Maximize2 size={13} /> Open PDF
          </a>
          <button
            type="button"
            onClick={onClose}
            className="p-2.5 border border-border/60 hover:border-primary transition-colors"
            aria-label="Close flipbook"
          >
            <X size={16} />
          </button>
        </div>
      </header>

      {/* Stage */}
      <div className="flex-1 min-h-0 flex items-center justify-center px-3 md:px-10 py-4 md:py-8 relative">
        {/* Prev */}
        <button
          type="button"
          onClick={() => go(idx - 1)}
          disabled={idx === 0}
          className="absolute left-2 md:left-6 z-10 p-3 rounded-full bg-card/80 border border-border/60 backdrop-blur hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous page"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="relative w-full h-full max-w-6xl flex items-center justify-center [perspective:2400px]">
          <AnimatePresence mode="wait" custom={dir}>
            <motion.div
              key={idx}
              custom={dir}
              initial={{ opacity: 0, rotateY: dir === 1 ? 35 : -35, x: dir === 1 ? 60 : -60 }}
              animate={{ opacity: 1, rotateY: 0, x: 0 }}
              exit={{ opacity: 0, rotateY: dir === 1 ? -35 : 35, x: dir === 1 ? -60 : 60 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="flex items-stretch justify-center gap-2 md:gap-3 h-full w-full"
              style={{ transformStyle: "preserve-3d" }}
            >
              {cur.map((p) => (
                <div
                  key={p}
                  className="relative h-full max-h-full aspect-[1/1.414] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] bg-card border border-border/40 overflow-hidden"
                >
                  <img
                    src={catalogThumb(slug, p)}
                    alt={`${title} catalog page ${p}`}
                    loading="eager"
                    decoding="async"
                    className="absolute inset-0 w-full h-full object-contain bg-[#f7f4ee]"
                  />
                  <span className="absolute bottom-2 right-3 text-[9px] uppercase tracking-[0.3em] text-foreground/40">
                    {p} / {total}
                  </span>
                </div>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Next */}
        <button
          type="button"
          onClick={() => go(idx + 1)}
          disabled={idx >= spreads.length - 1}
          className="absolute right-2 md:right-6 z-10 p-3 rounded-full bg-card/80 border border-border/60 backdrop-blur hover:border-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Next page"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Footer: dots + meta + mobile CTA */}
      <footer className="border-t border-border/60 px-5 md:px-8 py-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 flex-wrap" role="tablist" aria-label="Jump to spread">
          {spreads.map((s, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === idx}
              onClick={() => go(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-6 bg-primary" : "w-1.5 bg-foreground/25 hover:bg-foreground/50"
              }`}
              aria-label={`Spread ${i + 1} (page ${s.join("-")})`}
            />
          ))}
        </div>
        <div className="flex items-center gap-3 ml-auto">
          {action}
          <button
            type="button"
            onClick={() => forceDownload(catalogPdf(slug), `Irha-${slug}-catalog.pdf`)}
            className="sm:hidden inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2.5 text-[10px] uppercase tracking-[0.3em] transition-colors"
          >
            <Download size={13} /> Download PDF
          </button>
        </div>
      </footer>
    </div>
  );
}
