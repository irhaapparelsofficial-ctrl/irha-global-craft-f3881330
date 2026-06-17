import SEO from "@/components/SEO";
import { CATEGORIES, type Category } from "@/lib/categories";
import { Link } from "react-router-dom";
import { ArrowUpRight, Download, Eye } from "lucide-react";
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const previewPages = (slug: string) =>
  [1, 2, 3, 4].map((n) => `/catalogs/thumbs/${slug}-catalog-${n}.jpg`);


export default function Products() {
  return (
    <>
      <SEO
        title="Collections — Bavarian, Sportswear, Leather, Streetwear | Irha Apparels"
        description="Premium apparel collections by Irha Apparels: Bavarian wear, sportswear, leatherwear, streetwear, leisurewear, nightwear. OEM, ODM & private label manufacturing."
        path="/products"
      />

      <section className="pt-40 pb-20 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-6">The Collections</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Six categories. <br />
            One obsession with <span className="text-gold italic">craft</span>.
          </h1>
          <p className="mt-10 text-lg text-foreground/70 max-w-2xl">
            Every collection below is produced in-house at our Sialkot atelier, with OEM, ODM and
            private-label programs tailored to your brand specifications.
          </p>

          {/* Catalog downloads */}
          <div className="mt-14 border-t border-border/60 pt-10">
            <div className="flex flex-wrap items-end justify-between gap-6 mb-6">
              <div>
                <p className="eyebrow mb-2">Wholesale Catalogs</p>
                <h2 className="font-display text-2xl md:text-3xl">Download the line sheets</h2>
              </div>
              <p className="text-xs uppercase tracking-[0.3em] text-foreground/50">
                PDF · A4 · 2026 collection
              </p>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
              {CATEGORIES.map((c) => (
                <a
                  key={c.slug}
                  href={c.catalog}
                  download
                  className="group flex flex-col gap-2 p-4 border border-border/60 hover:border-primary hover:bg-card/40 transition-colors"
                >
                  <Download size={16} className="text-gold" />
                  <span className="font-display text-base leading-tight">{c.name}</span>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/50">
                    Download PDF
                  </span>
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-luxe space-y-32">
          {CATEGORIES.map((c, i) => {
            const reverse = i % 2 === 1;
            return (
              <article key={c.slug} id={c.slug} className="scroll-mt-32">
                <div className="grid lg:grid-cols-12 gap-10 lg:gap-16 items-center">
                  <div className={`lg:col-span-7 ${reverse ? "lg:order-2" : ""}`}>
                    <div className="relative aspect-[4/5] overflow-hidden group">
                      <img
                        src={c.image}
                        alt={c.name}
                        loading="lazy"
                        width={1024}
                        height={1280}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105"
                      />
                    </div>
                  </div>
                  <div className={`lg:col-span-5 ${reverse ? "lg:order-1" : ""}`}>
                    <p className="font-display text-7xl text-gold/30">0{i + 1}</p>
                    <p className="eyebrow mt-2 mb-4">{c.short}</p>
                    <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">{c.name}</h2>
                    <p className="text-foreground/75 mt-6 leading-relaxed">{c.description}</p>
                    <ul className="mt-8 space-y-3">
                      {c.details.map((d) => (
                        <li key={d} className="flex items-start gap-3 text-sm text-foreground/80">
                          <span className="text-primary mt-1">✦</span> {d}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to="/inquiry"
                      className="mt-10 inline-flex items-center gap-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] transition-all"
                    >
                      Request a Quote <ArrowUpRight size={16} />
                    </Link>
                  </div>
                </div>

                {/* Products grid */}
                <div className="mt-20">
                  <div className="flex items-end justify-between mb-10 border-b border-border/60 pb-6">
                    <div>
                      <p className="eyebrow mb-2">Featured Styles</p>
                      <h3 className="font-display text-2xl md:text-3xl">
                        {c.name} <span className="text-foreground/40">— Signature Pieces</span>
                      </h3>
                    </div>
                    <p className="hidden md:block text-xs uppercase tracking-[0.3em] text-foreground/50">
                      {c.products.length} styles
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
                    {c.products.map((p) => (
                      <div key={p.name} className="group flex flex-col">
                        <div className="relative aspect-[3/4] overflow-hidden bg-card mb-5">
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            width={1024}
                            height={1024}
                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        </div>
                        <h4 className="font-display text-xl leading-tight">{p.name}</h4>
                        <p className="text-sm text-foreground/65 mt-3 leading-relaxed">
                          {p.description}
                        </p>
                        <ul className="mt-4 space-y-1.5">
                          {p.specs.map((s) => (
                            <li
                              key={s}
                              className="text-[11px] uppercase tracking-[0.18em] text-foreground/55 flex items-center gap-2"
                            >
                              <span className="text-gold">—</span> {s}
                            </li>
                          ))}
                        </ul>
                        <Link
                          to="/inquiry"
                          className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-primary hover:gap-3 transition-all"
                        >
                          Inquire <ArrowUpRight size={14} />
                        </Link>
                      </div>
                    ))}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </section>
    </>
  );
}
