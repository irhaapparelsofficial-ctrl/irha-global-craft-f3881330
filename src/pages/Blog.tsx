import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpen, CalendarDays } from "lucide-react";
import SEO from "@/components/SEO";
import { usePublicBlogPosts } from "@/hooks/usePublicContent";

export default function Blog() {
  const { data: posts = [], isLoading } = usePublicBlogPosts("en");

  return (
    <>
      <SEO
        title="B2B Apparel Buyer Journal — Irha Apparels"
        description="Buyer-focused guidance about custom apparel development, specifications, samples, private label, quality planning and manufacturer verification."
        path="/blog"
      />

      <section className="pt-36 md:pt-44 pb-20 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-5">Buyer Journal</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.96] max-w-5xl">
            Practical guidance for <span className="text-gold italic">B2B apparel programs.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
            Articles published here are informational. Product specifications, MOQ, sample scope, commercial terms and production timing are confirmed only after the buyer requirement is reviewed.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe">
          {isLoading ? (
            <div className="min-h-64 flex items-center justify-center text-sm text-muted-foreground" role="status">
              Loading published articles…
            </div>
          ) : posts.length === 0 ? (
            <div className="border border-border/60 bg-card/30 p-8 md:p-14 text-center max-w-4xl mx-auto">
              <BookOpen size={30} className="mx-auto text-gold mb-5" />
              <h2 className="font-display text-3xl md:text-4xl">No journal article is published yet.</h2>
              <p className="mt-4 text-sm md:text-base text-foreground/65 leading-relaxed max-w-2xl mx-auto">
                The verified buyer resources and FAQ remain available while reviewed articles are prepared through the admin publishing workflow.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3">
                <Link to="/resources" className="bg-gradient-gold text-primary-foreground px-7 py-4 text-[10px] uppercase tracking-[0.22em]">
                  Open buyer resources
                </Link>
                <Link to="/faq" className="border border-border/70 hover:border-gold hover:text-gold px-7 py-4 text-[10px] uppercase tracking-[0.22em]">
                  Read buyer FAQ
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-5">
              {posts.map((post) => (
                <article key={post.id} className="group border border-border/60 bg-card/30 overflow-hidden flex flex-col min-w-0">
                  <Link to={`/blog/${post.slug}`} className="block aspect-[16/10] bg-secondary overflow-hidden">
                    <img
                      src={post.cover_image_url || "/og-image.jpg"}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                      loading="lazy"
                    />
                  </Link>
                  <div className="p-5 md:p-6 flex flex-col flex-1">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
                      {post.published_at && (
                        <span className="inline-flex items-center gap-1.5"><CalendarDays size={11} />{new Date(post.published_at).toLocaleDateString()}</span>
                      )}
                      {post.author && <span>{post.author}</span>}
                    </div>
                    <h2 className="font-display text-2xl leading-tight mt-4 break-words">
                      <Link to={`/blog/${post.slug}`} className="hover:text-gold">{post.title}</Link>
                    </h2>
                    {post.excerpt && <p className="text-sm text-foreground/65 mt-4 leading-relaxed line-clamp-4">{post.excerpt}</p>}
                    {post.tags.length > 0 && (
                      <div className="mt-5 flex flex-wrap gap-2">
                        {post.tags.slice(0, 4).map((tag) => (
                          <span key={tag} className="border border-border/50 px-2 py-1 text-[8px] uppercase tracking-[0.13em] text-muted-foreground">{tag}</span>
                        ))}
                      </div>
                    )}
                    <Link to={`/blog/${post.slug}`} className="mt-auto pt-7 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold w-fit">
                      Read article <ArrowUpRight size={13} />
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </>
  );
}
