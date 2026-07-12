import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, MessageCircle } from "lucide-react";
import SEO from "@/components/SEO";
import SafeMarkdown from "@/components/content/SafeMarkdown";
import QuoteForm from "@/components/QuoteForm";
import { usePublicBlogPost } from "@/hooks/usePublicContent";
import { whatsappLink, BRAND } from "@/lib/constants";
import { SITE_URL } from "@/lib/seoSchema";

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: post, isLoading } = usePublicBlogPost(slug, "en");

  if (isLoading) {
    return <div className="min-h-[65vh] flex items-center justify-center text-sm text-muted-foreground" role="status">Loading published article…</div>;
  }

  if (!post) {
    return (
      <>
        <SEO title="Article not found — Irha Apparels" description="The requested buyer article is not published." path={`/blog/${slug || ""}`} noindex />
        <section className="pt-40 pb-28">
          <div className="container-luxe max-w-3xl text-center">
            <p className="eyebrow mb-5">Buyer Journal</p>
            <h1 className="font-display text-4xl md:text-6xl">This article is not published.</h1>
            <p className="mt-5 text-foreground/65">It may still be a private draft, may have been unpublished, or the address may be incorrect.</p>
            <Link to="/blog" className="mt-8 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-7 py-4 text-[10px] uppercase tracking-[0.22em]">
              <ArrowLeft size={13} /> Back to journal
            </Link>
          </div>
        </section>
      </>
    );
  }

  const path = `/blog/${post.slug}`;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.seo_description || post.excerpt || "Buyer guidance from Irha Apparels.",
    image: post.og_image_url || post.cover_image_url || `${SITE_URL}/og-image.jpg`,
    datePublished: post.published_at || undefined,
    dateModified: post.published_at || undefined,
    author: { "@type": "Organization", name: post.author || BRAND.name, url: SITE_URL },
    publisher: { "@type": "Organization", name: BRAND.name, url: SITE_URL },
    mainEntityOfPage: `${SITE_URL}${path}`,
  };
  const wa = whatsappLink(`Hi Irha Apparels, I read "${post.title}" and would like to discuss a manufacturing requirement.`);

  return (
    <>
      <SEO
        title={post.seo_title || post.title}
        description={post.seo_description || post.excerpt || "Buyer guidance from Irha Apparels."}
        path={path}
        image={post.og_image_url || post.cover_image_url || undefined}
        type="article"
        jsonLd={articleJsonLd}
      />

      <article>
        <section className="pt-36 md:pt-44 pb-16 border-b border-border/60">
          <div className="container-luxe max-w-4xl">
            <Link to="/blog" className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-gold mb-8">
              <ArrowLeft size={13} /> Buyer Journal
            </Link>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              {post.published_at && <span className="inline-flex items-center gap-1.5"><CalendarDays size={11} />{new Date(post.published_at).toLocaleDateString()}</span>}
              {post.author && <span>{post.author}</span>}
            </div>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.04] mt-5">{post.title}</h1>
            {post.excerpt && <p className="text-foreground/70 mt-6 text-lg leading-relaxed">{post.excerpt}</p>}
            {post.tags.length > 0 && (
              <div className="mt-7 flex flex-wrap gap-2">
                {post.tags.map((tag) => <span key={tag} className="border border-border/50 px-2.5 py-1 text-[8px] uppercase tracking-[0.13em] text-muted-foreground">{tag}</span>)}
              </div>
            )}
          </div>
        </section>

        {post.cover_image_url && (
          <section className="pt-10">
            <div className="container-luxe max-w-5xl aspect-[16/9] overflow-hidden border border-border/60 bg-secondary">
              <img src={post.cover_image_url} alt="" loading="eager" fetchPriority="high" decoding="async" className="w-full h-full object-cover" />
            </div>
          </section>
        )}

        <section className="py-16 md:py-24">
          <div className="container-luxe max-w-3xl">
            {post.body_md ? (
              <SafeMarkdown markdown={post.body_md} />
            ) : (
              <p className="text-foreground/65">This published entry does not contain article body content yet.</p>
            )}
          </div>
        </section>

        <section className="py-16 border-y border-border/60 bg-card/30">
          <div className="container-luxe grid lg:grid-cols-2 gap-10 items-start max-w-6xl">
            <div>
              <p className="eyebrow mb-4">Discuss Your Requirement</p>
              <h2 className="font-display text-3xl md:text-4xl leading-tight">Turn general guidance into a reviewed buyer brief.</h2>
              <p className="mt-4 text-foreground/70 leading-relaxed">
                Share the product, estimated quantity, material, customization, destination and target window. Commercial commitments are confirmed only after requirement review.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <a href={wa} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-3 border border-emerald-500/60 text-emerald-400 px-6 py-4 text-[10px] uppercase tracking-[0.22em]">
                  WhatsApp <MessageCircle size={14} />
                </a>
                <Link to="/resources" className="inline-flex items-center border border-border/70 hover:border-gold hover:text-gold px-6 py-4 text-[10px] uppercase tracking-[0.22em]">Buyer resources</Link>
              </div>
            </div>
            <QuoteForm pageContext={`Buyer Journal: ${post.title}`} />
          </div>
        </section>
      </article>
    </>
  );
}
