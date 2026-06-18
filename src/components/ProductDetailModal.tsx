import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import type { Product } from "@/lib/categories";
import { ArrowUpRight, MessageCircle, X } from "lucide-react";
import { useState, useEffect } from "react";
import { whatsappLink } from "@/lib/constants";

interface Props {
  product: (Product & { sku?: string; subName?: string }) | null;
  onClose: () => void;
}

export default function ProductDetailModal({ product, onClose }: Props) {
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [product]);

  return (
    <Dialog open={!!product} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0 bg-background border-border/60 [&>button]:hidden">
        {product && (
          <div className="grid lg:grid-cols-2 max-h-[92vh] overflow-y-auto">
            {/* Gallery */}
            <div className="relative bg-card">
              <div className="aspect-[4/5] lg:aspect-auto lg:h-full relative overflow-hidden">
                <img
                  src={product.gallery[active]}
                  alt={product.name}
                  className="absolute inset-0 w-full h-full object-cover transition-opacity duration-500"
                  loading="lazy"
                />
              </div>
              <div className="absolute left-4 bottom-4 flex gap-2">
                {product.gallery.map((g, i) => (
                  <button
                    key={g + i}
                    onClick={() => setActive(i)}
                    aria-label={`Image ${i + 1}`}
                    className={`w-14 h-14 overflow-hidden border-2 transition-all ${
                      active === i ? "border-primary" : "border-background/60 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={g} alt="" loading="lazy" decoding="async" width="56" height="56" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
              <button
                onClick={onClose}
                aria-label="Close"
                className="absolute right-4 top-4 lg:hidden bg-background/80 backdrop-blur p-2 rounded-full"
              >
                <X size={18} />
              </button>
            </div>

            {/* Details */}
            <div className="relative p-6 md:p-10 overflow-y-auto">
              <button
                onClick={onClose}
                aria-label="Close"
                className="hidden lg:flex absolute right-6 top-6 p-2 hover:bg-card rounded-full transition-colors"
              >
                <X size={20} />
              </button>

              <DialogTitle className="font-display text-3xl md:text-4xl leading-tight pr-10">
                {product.name}
              </DialogTitle>
              <DialogDescription className="sr-only">{product.description}</DialogDescription>

              <p className="text-foreground/75 mt-5 leading-relaxed text-sm md:text-base">
                {product.description}
              </p>

              <div className="mt-8">
                <p className="eyebrow mb-4">Highlights</p>
                <ul className="grid grid-cols-2 gap-2">
                  {product.specs.map((s) => (
                    <li
                      key={s}
                      className="text-[11px] uppercase tracking-[0.18em] text-foreground/70 flex items-start gap-2"
                    >
                      <span className="text-gold mt-0.5">✦</span> {s}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 border-t border-border/60 pt-6">
                <p className="eyebrow mb-4">Full Specifications</p>
                <dl className="divide-y divide-border/60">
                  {product.details.map((d) => (
                    <div key={d.label} className="grid grid-cols-[140px_1fr] gap-4 py-3">
                      <dt className="text-[10px] uppercase tracking-[0.25em] text-foreground/55 pt-0.5">
                        {d.label}
                      </dt>
                      <dd className="text-sm text-foreground/85 leading-relaxed">{d.value}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <div className="mt-10 flex flex-col sm:flex-row gap-3">
                <a
                  href={whatsappLink(
                    `Hello Irha Apparels — I'd like a quote for the following product:\n\n` +
                    `*Product:* ${product.name}\n` +
                    (product.sku ? `*SKU:* ${product.sku}\n` : "") +
                    (product.subName ? `*Category:* ${product.subName}\n` : "") +
                    `*Description:* ${product.description}\n\n` +
                    `Please share MOQ, pricing, and lead time.`
                  )}
                  target="_blank"
                  rel="noreferrer"
                  onClick={onClose}
                  className="flex-1 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
                >
                  <MessageCircle size={14} /> Request Quote via WhatsApp
                </a>
                <a
                  href={whatsappLink(`Hi Irha Apparels, I'm interested in: ${product.name}. Please share MOQ & pricing.`)}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-2 border border-border hover:border-primary text-foreground/80 hover:text-foreground px-6 py-4 text-xs uppercase tracking-[0.3em] transition-all"
                >
                  <MessageCircle size={14} /> Quick WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
