import { Link } from "react-router-dom";
import { ArrowUpRight, Bookmark, GitCompareArrows, MessageCircle, Trash2 } from "lucide-react";
import SEO from "@/components/SEO";
import { useShortlist, useCompare } from "@/lib/shortlist";
import { whatsappLink } from "@/lib/constants";

export default function Shortlist() {
  const shortlist = useShortlist();
  const compare = useCompare();

  const rfqLink = shortlist.items.length
    ? `/inquiry?intent=rfq&shortlist=${encodeURIComponent(shortlist.items.map((i) => i.slug).join(","))}&names=${encodeURIComponent(shortlist.items.map((i) => i.name).join(","))}`
    : "/inquiry?intent=rfq";

  const whatsappMsg = shortlist.items.length
    ? `Hello Irha Apparels — I've shortlisted these products:\n${shortlist.items.map((i, n) => `${n + 1}. ${i.name}`).join("\n")}\n\nPlease share a quotation.`
    : "Hello Irha Apparels — I'd like a quote.";

  return (
    <>
      <SEO title="Your Shortlist | Irha Apparels" description="Saved products ready to send to Irha Apparels for a B2B quotation." path="/shortlist" noindex />

      <section className="pt-32 pb-20">
        <div className="container-luxe max-w-5xl">
          <p className="eyebrow mb-3">Your Shortlist</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[0.95]">
            {shortlist.items.length} saved <span className="text-gold italic">product{shortlist.items.length === 1 ? "" : "s"}</span>
          </h1>

          {shortlist.items.length === 0 ? (
            <div className="mt-12 border border-dashed border-border/60 p-10 text-center">
              <Bookmark size={28} className="mx-auto text-foreground/40 mb-4" />
              <p className="text-foreground/70">Your shortlist is empty. Browse products and tap <span className="text-foreground">Save</span> to add them here.</p>
              <Link to="/products" className="mt-6 inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3 text-xs uppercase tracking-[0.3em]">
                Browse Products <ArrowUpRight size={14} />
              </Link>
            </div>
          ) : (
            <>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Link to={rfqLink} className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em]">
                  Request Quote for All <ArrowUpRight size={14} />
                </Link>
                <a href={whatsappLink(whatsappMsg)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 border border-gold/70 text-gold hover:bg-gold hover:text-background px-6 py-3.5 text-xs uppercase tracking-[0.3em]">
                  <MessageCircle size={14} /> WhatsApp
                </a>
                <Link to="/compare" className="inline-flex items-center gap-2 border border-border/60 hover:border-primary px-6 py-3.5 text-xs uppercase tracking-[0.3em]">
                  <GitCompareArrows size={14} /> Compare ({compare.items.length}/4)
                </Link>
                <button type="button" onClick={shortlist.clear} className="ml-auto text-[11px] uppercase tracking-[0.25em] text-foreground/60 hover:text-foreground inline-flex items-center gap-1">
                  <Trash2 size={12} /> Clear all
                </button>
              </div>

              <div className="mt-10 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
                {shortlist.items.map((p) => {
                  const inCompare = compare.has(p.slug);
                  return (
                    <div key={p.slug} className="group flex flex-col">
                      <Link to={`/products/${p.categorySlug}/${p.slug}`} className="block relative aspect-[3/4] overflow-hidden bg-card mb-3">
                        {p.image && (
                          <img src={p.image} alt={p.name} loading="lazy" className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                        )}
                      </Link>
                      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground/50">{p.categoryName}</p>
                      <Link to={`/products/${p.categorySlug}/${p.slug}`} className="font-display text-sm leading-tight hover:text-primary transition-colors mt-1">
                        {p.name}
                      </Link>
                      <div className="mt-3 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em]">
                        <button type="button" onClick={() => compare.toggle(p)} disabled={!inCompare && compare.items.length >= 4} className={`px-2 py-1.5 border transition-colors ${inCompare ? "border-primary text-primary" : "border-border/60 hover:border-primary disabled:opacity-40 disabled:cursor-not-allowed"}`}>
                          {inCompare ? "In Compare" : "Compare"}
                        </button>
                        <button type="button" onClick={() => shortlist.remove(p.slug)} className="ml-auto p-1.5 text-foreground/50 hover:text-destructive" aria-label={`Remove ${p.name}`}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </section>
    </>
  );
}
