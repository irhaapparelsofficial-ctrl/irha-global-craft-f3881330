import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import { BLOG_POSTS } from "@/lib/blogPosts";

const SITE_URL = "https://www.irhaapparels.com";

export default function Blog() {
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: BLOG_POSTS.map((p, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/blog/${p.slug}`,
      name: p.title,
    })),
  };

  return (
    <>
      <SEO
        title="Apparel Manufacturing Blog | Sourcing & B2B Insights | Irha Apparels"
        description="B2B insights on apparel sourcing, sportswear, lederhosen, streetwear, OEM/ODM and Sialkot manufacturing — from a verified Pakistan factory."
        path="/blog"
        jsonLd={itemListJsonLd}
      />
      <Breadcrumbs items={[{ label: "Blog" }]} />

      <section className="pb-12 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-6">Apparel Manufacturing Journal</p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.02] max-w-3xl">
            B2B insights from a <span className="text-gold italic">verified Pakistan</span> apparel factory.
          </h1>
          <p className="text-foreground/70 mt-6 max-w-2xl">
            Sourcing guides, manufacturing explainers, supply-chain analysis and category deep-dives — written for buyers, brand founders and procurement teams.
          </p>
        </div>
      </section>

      <section className="py-16">
        <div className="container-luxe grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {BLOG_POSTS.map((p) => (
            <Link
              key={p.slug}
              to={`/blog/${p.slug}`}
              className="group flex flex-col border border-border hover:border-primary/60 transition-colors"
            >
              <div className="aspect-[16/10] overflow-hidden">
                <img
                  src={p.heroImage}
                  alt={p.heroAlt}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-6 flex flex-col flex-1">
                <p className="eyebrow text-muted-foreground mb-3">
                  {new Date(p.publishedAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })} · {p.readingMinutes} min read
                </p>
                <h2 className="font-display text-2xl leading-snug">{p.title}</h2>
                <p className="text-sm text-foreground/70 mt-3 line-clamp-3">{p.excerpt}</p>
                <span className="inline-flex items-center gap-2 mt-5 text-[11px] uppercase tracking-[0.25em] text-primary">
                  Read article <ArrowRight size={12} />
                </span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
