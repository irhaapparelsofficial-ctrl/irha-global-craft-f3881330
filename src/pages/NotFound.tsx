import { Link, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { ArrowUpRight, MessageCircle, Search } from "lucide-react";
import SEO from "@/components/SEO";
import { whatsappLink } from "@/lib/constants";

const CATEGORIES = [
  { slug: "bavarian-trachten-wear", name: "Bavarian & Trachten" },
  { slug: "premium-leather-apparel", name: "Premium Leather" },
  { slug: "sportswear", name: "Sportswear" },
  { slug: "streetwear-activewear", name: "Streetwear & Activewear" },
  { slug: "leisure-nightwear", name: "Leisure & Nightwear" },
];

export default function NotFound() {
  const location = useLocation();

  useEffect(() => {
    console.warn("404:", location.pathname);
  }, [location.pathname]);

  return (
    <>
      <SEO
        title="Page Not Found — Irha Apparels"
        description="The page you are looking for does not exist. Explore our five apparel programs or request a quote."
        path={location.pathname}
        noindex
      />
      <div className="min-h-[70vh] pt-32 pb-20">
        <div className="container-luxe max-w-3xl">
          <p className="eyebrow mb-4">404 — Page not found</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.95]">
            This page isn't <span className="text-gold italic">here</span>.
          </h1>
          <p className="mt-6 text-foreground/70 max-w-xl">
            The link may be outdated or mistyped. Start again from a category, or ask us directly on WhatsApp — we'll point you to the right product.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/products"
              className="inline-flex items-center gap-3 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              All Products <ArrowUpRight size={14} />
            </Link>
            <Link
              to="/inquiry"
              className="inline-flex items-center gap-3 border border-gold/70 text-gold hover:bg-gold hover:text-background px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              Request Quote
            </Link>
            <a
              href={whatsappLink("Hello Irha Apparels — I hit a broken link, can you help me find the right product?")}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-3 border border-border/60 hover:border-primary px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>

          <div className="mt-14">
            <p className="eyebrow mb-4">Browse categories</p>
            <ul className="grid sm:grid-cols-2 gap-2">
              {CATEGORIES.map((c) => (
                <li key={c.slug}>
                  <Link
                    to={`/products/${c.slug}`}
                    className="flex items-center justify-between border border-border/60 hover:border-primary hover:text-primary px-4 py-3 text-sm transition-colors"
                  >
                    {c.name} <ArrowUpRight size={14} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="mt-10 flex items-center gap-3 text-sm text-foreground/60">
            <Search size={14} />
            <Link to="/products" className="underline hover:text-primary">
              Search all products
            </Link>
            <span>·</span>
            <Link to="/contact" className="underline hover:text-primary">
              Contact us
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
