import { Link, useParams } from "react-router-dom";
import SEO from "@/components/SEO";
import { ARTICLES } from "./Journal";
import { ArrowLeft, ArrowUpRight } from "lucide-react";

// Generic editorial body shared across article slugs. In a real project these would be MDX.
const BODY: Record<string, string[]> = {
  "craft-of-lederhosen": [
    "A pair of heritage lederhosen begins not in a factory, but in a tannery — usually months before the first stitch. The hides are selected for grain consistency, supple hand feel and the natural drape that comes only from properly tanned deer suede.",
    "Once the leather arrives at our Sialkot atelier, our master cutter inspects every panel for natural marks, density and weight variance. Anything outside our tolerance window is downgraded — never used on a heritage line.",
    "The front panel embroidery — the soul of the garment — is done by hand. A senior embroiderer takes 6 to 8 hours per pair, working a single needle through traditional alpine motifs that haven't changed for 200 years.",
    "What buyers receive is not a 'cheap import.' It is a heritage garment, made by artisans whose families have been stitching for three generations, finished to the same standard you'd find in a Munich trachten house — for a fraction of the lead time.",
  ],
  "leather-grades-explained": [
    "Most buyers see leather as a single material. It isn't. There are six commercially relevant grades, and choosing the wrong one is the single most expensive mistake in leather sourcing.",
    "Full-grain is the top layer of the hide with the natural grain intact. It is the strongest, most durable and most expensive — and the only grade we use for biker jackets and long coats.",
    "Napa leather is a finishing technique, not a grade. It refers to soft, smooth, full-grain or top-grain hides that have been chrome-tanned for a buttery hand feel — ideal for moto jackets, leather pants and gloves.",
    "Bonded leather is leather scrap glued together. It looks like leather and costs a fraction — but it cracks within 18 months. We do not produce in bonded leather under any circumstance, even when asked.",
  ],
  "sialkot-apparel-legacy": [
    "Sialkot sits on the Punjab plain near the Kashmir border. For two centuries it has been Pakistan's industrial atelier — first for surgical instruments, then sports goods, and now for premium apparel that ships to every continent.",
    "What makes Sialkot different from Sialkot or Faisalabad is generational specialization. The cutter you work with learned from his father, who learned from his. The result is craftsmanship density you rarely find in single-generation manufacturing zones.",
    "We sit inside that lineage. Our floor combines master artisans with engineering-grade industrial machines — and the result is a hybrid that buyers can't replicate anywhere else at our price point.",
  ],
  "streetwear-500gsm": [
    "A premium streetwear hoodie is engineered, not assembled. Five decisions separate a $25 hoodie from a $95 hoodie — and once you understand them, you'll never look at a hoodie the same way.",
    "First, fabric weight. 280 GSM is supermarket. 320 GSM is decent. 400+ GSM is premium. 500 GSM brushed-back French terry is what every serious streetwear label specs.",
    "Second, the brush. A 'brushed back' fleece is mechanically raised on the inside to create that soft, peached hand feel. Cheap fleece skips this entirely.",
    "Third, garment dye. Piece-dyed fabric is uneven and fades fast. Garment-dyed hoodies hit Pantone consistency lot after lot — and they're what buyers expect from a $95 retail price point.",
    "Fourth, hardware. Self-fabric drawcords with metal aglets, not plastic. YKK zippers, not generic. Custom tonal labels, not blank tags.",
    "Fifth, packaging. A folded poly bag is the floor. A printed band, branded hangtag and recycled mailer is the ceiling — and it shows on the unboxing.",
  ],
  "sustainable-cotton-program": [
    "Every buyer asks for 'sustainable cotton' but few know what they're actually asking for. There are three relevant certifications — BCI, organic-on-request, and OCS — and they certify completely different things.",
    "BCI (Better Cotton Initiative) is a mass-balance program. It funds better farming practices but the actual cotton in your garment may not be sustainable cotton programs. It's the lowest-cost 'sustainable' claim and it works for high-volume basics.",
    "organic-on-request (Global Organic Textile Standard) certifies organically grown cotton through the entire chain of custody. It's the gold standard — and the most expensive — and the only claim that lets you call a garment 'certified organic.'",
    "OCS (Organic Content Standard) sits between the two. It tracks organic cotton from farm to finished product but doesn't certify processing chemicals the way organic-on-request does.",
  ],
  "moq-economics": [
    "Buyers often ask why our flexible MOQ costs more per unit than 500. The answer is fabric minimums, machine setup and digitizing — three fixed costs spread across whatever quantity you order.",
    "Fabric minimums are the first wall. Mills typically run 300+ meters minimum per shade. Below that, we buy stock and charge a premium.",
    "Machine setup is the second. Setting up a sublimation press, embroidery digitizing or a screen frame takes the same 2 hours whether you're printing our flexible MOQ or 5,000. That cost gets amortized.",
    "Digitizing — converting your logo to a machine-readable embroidery file — is a one-time $30 fee. On our flexible MOQ it's $0.60 per garment. On 5,000 it's $0.006.",
    "The good news: as an emerging brand, you can negotiate the MOQ wall by combining colors within a single fabric/wash, by sharing setup costs across multiple SKUs, and by committing to a re-order cadence we can plan around.",
  ],
};

export default function JournalArticle() {
  const { slug } = useParams<{ slug: string }>();
  const article = ARTICLES.find((a) => a.slug === slug);

  if (!article) {
    return (
      <section className="pt-40 pb-32 container-luxe">
        <h1 className="font-display text-5xl">Article not found</h1>
        <Link to="/journal" className="mt-6 inline-flex text-primary text-xs uppercase tracking-[0.3em]">
          ← Back to Journal
        </Link>
      </section>
    );
  }

  const paragraphs = BODY[article.slug] || [article.excerpt];
  const related = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);

  return (
    <>
      <SEO
        title={`${article.title} — Irha Apparels Journal`}
        description={article.excerpt}
        path={`/journal/${article.slug}`}
        image={typeof article.image === "string" ? article.image : undefined}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.excerpt,
          image: typeof article.image === "string"
            ? `https://www.irhaapparels.com${article.image}`
            : undefined,
          datePublished: article.date,
          author: { "@type": "Organization", name: "Irha Apparels" },
          publisher: {
            "@type": "Organization",
            name: "Irha Apparels",
            logo: { "@type": "ImageObject", url: "https://www.irhaapparels.com/favicon.ico" },
          },
          mainEntityOfPage: `https://www.irhaapparels.com/journal/${article.slug}`,
        }}
      />

      <section className="pt-32 pb-12 border-b border-border/60">
        <div className="container-luxe">
          <Link to="/journal" className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground/60 hover:text-primary transition-colors">
            <ArrowLeft size={14} /> Back to Journal
          </Link>
        </div>
      </section>

      <article className="py-16 md:py-24">
        <div className="container-luxe max-w-4xl">
          <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-6">
            {article.category} · {article.readTime} · {article.date}
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05]">{article.title}</h1>
          <p className="text-xl text-foreground/70 mt-8 leading-relaxed">{article.excerpt}</p>
        </div>

        <div className="container-luxe max-w-5xl mt-14">
          <div className="aspect-[16/9] overflow-hidden">
            <img src={article.image} alt={article.title} loading="lazy" className="w-full h-full object-cover" />
          </div>
        </div>

        <div className="container-luxe max-w-3xl mt-16 space-y-7 text-foreground/85 leading-[1.85] text-lg">
          {paragraphs.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </article>

      <section className="py-20 md:py-28 border-t border-border/60 bg-secondary/40">
        <div className="container-luxe">
          <p className="eyebrow mb-8">More from the Journal</p>
          <div className="grid md:grid-cols-3 gap-8">
            {related.map((a) => (
              <Link key={a.slug} to={`/journal/${a.slug}`} className="group flex flex-col">
                <div className="aspect-[4/3] overflow-hidden mb-4">
                  <img src={a.image} alt={a.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-2">{a.category}</p>
                <h3 className="font-display text-xl group-hover:text-primary transition-colors">{a.title}</h3>
                <span className="mt-4 inline-flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-foreground/60 group-hover:text-primary">
                  Read <ArrowUpRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
