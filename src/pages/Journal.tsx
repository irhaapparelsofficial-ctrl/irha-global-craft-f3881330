import SEO from "@/components/SEO";
import journalHero from "@/assets/banners/journal-hero.jpg";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import bavarian from "@/assets/cat-bavarian.jpg";
import leather from "@/assets/cat-leather.jpg";
import streetwear from "@/assets/cat-streetwear.jpg";
import sportswear from "@/assets/cat-sportswear.jpg";
import nightwear from "@/assets/cat-nightwear.jpg";
import factory from "@/assets/banners/factory-cinematic.jpg";

export const ARTICLES = [
  {
    slug: "craft-of-lederhosen",
    title: "The Craft of Lederhosen — From Sialkot to Salzburg",
    excerpt: "Inside the 6-week journey of a single pair of heritage lederhosen — leather selection, hand embroidery, and the artisans behind one of Europe's most enduring garments.",
    category: "Heritage",
    readTime: "8 min",
    image: bavarian,
    date: "May 2026",
  },
  {
    slug: "leather-grades-explained",
    title: "Full-Grain vs. Napa: A Buyer's Guide to Leather Grades",
    excerpt: "What buyers actually need to know about leather sourcing — grain, weight, tannage and finish — and how to read a leather spec sheet like a production manager.",
    category: "Sourcing",
    readTime: "6 min",
    image: leather,
    date: "Apr 2026",
  },
  {
    slug: "sialkot-apparel-legacy",
    title: "Why Sialkot Became the World's Apparel Atelier",
    excerpt: "A short history of how a small Punjabi city became the global hub for premium sportswear, leather and trachten manufacturing — and what that means for your sourcing.",
    category: "Industry",
    readTime: "10 min",
    image: factory,
    date: "Apr 2026",
  },
  {
    slug: "streetwear-500gsm",
    title: "Building a 500 GSM Hoodie Program From Scratch",
    excerpt: "What separates a $25 hoodie from a $95 hoodie — fabric weight, brush, garment dye, hardware and packaging. The full anatomy of a premium streetwear staple.",
    category: "Production",
    readTime: "7 min",
    image: streetwear,
    date: "Mar 2026",
  },
  {
    slug: "sustainable-cotton-program",
    title: "BCI, GOTS, Organic: A Plain-English Guide for Buyers",
    excerpt: "We break down the cotton certifications buyers ask about most — what each actually certifies, what it costs, and how to choose for your brand story.",
    category: "Sustainability",
    readTime: "5 min",
    image: nightwear,
    date: "Mar 2026",
  },
  {
    slug: "moq-economics",
    title: "MOQ Economics: Why 50 Pieces Costs More Per Unit",
    excerpt: "An honest breakdown of how minimum order quantities affect unit cost — fabric minimums, machine setup, embroidery digitizing — and how emerging brands can negotiate.",
    category: "B2B",
    readTime: "6 min",
    image: sportswear,
    date: "Feb 2026",
  },
];

export default function Journal() {
  return (
    <>
      <SEO
        title="The Journal — Apparel Manufacturing Insights | Irha Apparels"
        description="Editorial articles on apparel manufacturing, sourcing, leather, trachten craft, sustainability and B2B production from Irha Apparels' Sialkot atelier."
        path="/journal"
      />

      <section className="relative pt-40 pb-24 md:pb-32 overflow-hidden">
        <img src={journalHero} alt="The Journal" loading="eager" width={1920} height={1080} className="absolute inset-0 w-full h-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/60 to-background" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">The Journal</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Notes from the <span className="text-gold italic">atelier</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">
            Editorial writing on craft, sourcing and the business of manufacturing — for buyers, founders and
            curious creatives.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28 border-t border-border/60">
        <div className="container-luxe">
          {/* Featured */}
          <Link
            to={`/journal/${ARTICLES[0].slug}`}
            className="group grid lg:grid-cols-12 gap-10 lg:gap-16 items-center mb-24 pb-24 border-b border-border/60"
          >
            <div className="lg:col-span-7 aspect-[16/10] overflow-hidden">
              <img src={ARTICLES[0].image} alt={ARTICLES[0].title} loading="lazy" className="w-full h-full object-cover transition-transform duration-[1400ms] group-hover:scale-105" />
            </div>
            <div className="lg:col-span-5">
              <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
                {ARTICLES[0].category} · {ARTICLES[0].readTime} · {ARTICLES[0].date}
              </p>
              <h2 className="font-display text-3xl md:text-5xl leading-[1.05]">{ARTICLES[0].title}</h2>
              <p className="text-foreground/70 mt-6 leading-relaxed">{ARTICLES[0].excerpt}</p>
              <span className="mt-8 inline-flex items-center gap-3 text-xs uppercase tracking-[0.3em] text-primary group-hover:gap-4 transition-all">
                Read article <ArrowUpRight size={14} />
              </span>
            </div>
          </Link>

          {/* Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-10">
            {ARTICLES.slice(1).map((a) => (
              <Link key={a.slug} to={`/journal/${a.slug}`} className="group flex flex-col">
                <div className="aspect-[4/3] overflow-hidden bg-card mb-5">
                  <img src={a.image} alt={a.title} loading="lazy" className="w-full h-full object-cover transition-transform duration-[1200ms] group-hover:scale-105" />
                </div>
                <p className="text-[10px] uppercase tracking-[0.3em] text-primary mb-3">
                  {a.category} · {a.readTime}
                </p>
                <h3 className="font-display text-2xl leading-tight group-hover:text-primary transition-colors">{a.title}</h3>
                <p className="text-sm text-foreground/65 mt-3 leading-relaxed line-clamp-3">{a.excerpt}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
