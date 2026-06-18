import { useParams, Navigate, Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ArrowRight, MessageCircle } from "lucide-react";
import SEO from "@/components/SEO";
import Breadcrumbs from "@/components/Breadcrumbs";
import QuoteForm from "@/components/QuoteForm";
import { getBlogPost } from "@/lib/blogPosts";
import { whatsappLink, BRAND } from "@/lib/constants";

const SITE_URL = "https://www.irhaapparels.com";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const post = slug ? getBlogPost(slug) : undefined;
  if (!post) return <Navigate to="/blog" replace />;

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription,
    image: `${SITE_URL}${(post.heroImage as unknown as string).startsWith("/") ? post.heroImage : "/" + post.heroImage}`,
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: BRAND.name, url: SITE_URL },
    publisher: { "@type": "Organization", name: BRAND.name, url: SITE_URL, logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.ico` } },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  };

  const wa = whatsappLink(`Hi Irha Apparels — I read "${post.title}" and would like a quote.`);

  return (
    <>
      <SEO
        title={post.metaTitle}
        description={post.metaDescription}
        path={`/blog/${post.slug}`}
        image={post.heroImage}
        type="article"
        jsonLd={articleJsonLd}
      />
      <Helmet>
        <meta name="keywords" content={post.keywords} />
      </Helmet>

      <Breadcrumbs items={[{ label: "Blog", href: "/blog" }, { label: post.title }]} />

      <article>
        <section className="pb-12 border-b border-border/60">
          <div className="container-luxe max-w-4xl">
            <p className="eyebrow text-muted-foreground mb-4">
              {new Date(post.publishedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })} · {post.readingMinutes} min read · {post.author}
            </p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.04]">{post.title}</h1>
            <p className="text-foreground/70 mt-6 text-lg">{post.excerpt}</p>
          </div>
        </section>

        <section className="pt-10">
          <div className="container-luxe max-w-5xl aspect-[16/9] overflow-hidden border border-border">
            <img
              src={post.heroImage}
              alt={post.heroAlt}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        <section className="py-16">
          <div className="container-luxe max-w-3xl prose-blog space-y-6 text-foreground/85 leading-relaxed">
            {post.blocks.map((b, i) => {
              if (b.type === "p") return <p key={i} className="text-[17px]">{b.text}</p>;
              if (b.type === "h2") return <h2 key={i} className="font-display text-3xl md:text-4xl mt-12 mb-2">{b.text}</h2>;
              if (b.type === "h3") return <h3 key={i} className="font-display text-2xl mt-8 mb-2 text-primary">{b.text}</h3>;
              if (b.type === "ul") return (
                <ul key={i} className="space-y-2 list-disc pl-6 marker:text-primary">
                  {b.items.map((it, j) => <li key={j} className="text-[16px]">{it}</li>)}
                </ul>
              );
              if (b.type === "quote") return (
                <blockquote key={i} className="border-l-4 border-primary pl-6 py-2 my-8 font-display text-2xl italic text-foreground/90">
                  "{b.text}"
                </blockquote>
              );
              return null;
            })}
          </div>
        </section>

        {/* CTA */}
        <section className="py-16 border-y border-border/60 bg-card/30">
          <div className="container-luxe grid lg:grid-cols-2 gap-10 items-center max-w-6xl">
            <div>
              <p className="eyebrow mb-4">Ready to Source?</p>
              <h2 className="font-display text-3xl md:text-4xl leading-tight">
                Talk to our factory team directly.
              </h2>
              <p className="mt-4 text-foreground/70">
                WhatsApp the production floor. Replies within 4 working hours.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <a
                  href={wa}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-3 bg-[#25D366] text-white px-7 py-4 text-xs uppercase tracking-[0.3em]"
                >
                  WhatsApp Us <MessageCircle size={14} />
                </a>
                {post.ctaInternalLinks.map((l) => (
                  <Link
                    key={l.href}
                    to={l.href}
                    className="inline-flex items-center gap-2 border border-border hover:border-primary px-5 py-3 text-[11px] uppercase tracking-[0.25em]"
                  >
                    {l.label} <ArrowRight size={12} />
                  </Link>
                ))}
              </div>
            </div>
            <QuoteForm pageContext={`Blog: ${post.title}`} />
          </div>
        </section>

        {/* RELATED */}
        {post.related.length > 0 && (
          <section className="py-16">
            <div className="container-luxe max-w-5xl">
              <p className="eyebrow mb-6">Related Reading</p>
              <div className="grid md:grid-cols-3 gap-6">
                {post.related.map((r) => (
                  <Link
                    key={r.slug}
                    to={`/blog/${r.slug}`}
                    className="border border-border p-6 hover:border-primary/60 transition-colors group"
                  >
                    <h3 className="font-display text-lg leading-snug">{r.title}</h3>
                    <span className="inline-flex items-center gap-2 mt-4 text-[11px] uppercase tracking-[0.25em] text-primary">
                      Read article <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform"/>
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        )}
      </article>
    </>
  );
}
