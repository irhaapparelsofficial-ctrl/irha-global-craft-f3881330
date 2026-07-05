import { Helmet } from "react-helmet-async";
import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, Send, Share2 } from "lucide-react";
import { CATALOGUE_GROUPS } from "@/lib/catalogueGroups";
import { whatsappLink, BRAND } from "@/lib/constants";
import CatalogueLeadForm from "@/components/CatalogueLeadForm";
import { useState } from "react";

const SITE = "https://www.irhaapparels.com";
const OG_IMAGE = `${SITE}/og-image.jpg`;

export default function Catalogue() {
  const [shareOpen, setShareOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  const shareUrl = `${SITE}/catalogue`;
  const shareText = "Irha Apparels — B2B Product Catalogue (Sialkot, Pakistan). OEM • ODM • Private Label.";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Irha Apparels Product Catalogue",
    description:
      "B2B product catalogue for custom apparel manufacturing — Bavarian garments, leather, sportswear, streetwear, activewear, nightwear. OEM, ODM, private label. Made in Sialkot.",
    url: shareUrl,
    publisher: {
      "@type": "Organization",
      name: BRAND.name,
      url: SITE,
      logo: `${SITE}/icon-512x512.png`,
    },
    hasPart: CATALOGUE_GROUPS.map((g) => ({
      "@type": "CollectionPage",
      name: g.name,
      url: `${SITE}/catalogue/${g.slug}`,
      description: g.description,
    })),
  };

  return (
    <>
      <Helmet>
        <title>Irha Apparels Product Catalogue | Custom Apparel Manufacturer Pakistan</title>
        <meta
          name="description"
          content="Explore the Irha Apparels B2B catalogue — Bavarian garments, lederhosen, dirndls, leather, sportswear, streetwear, activewear & nightwear. OEM, ODM and private label production from Sialkot, Pakistan."
        />
        <link rel="canonical" href={shareUrl} />
        <link rel="alternate" hrefLang="en" href={shareUrl} />
        <link rel="alternate" hrefLang="de" href={`${SITE}/de/katalog`} />
        <link rel="alternate" hrefLang="x-default" href={shareUrl} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Irha Apparels Product Catalogue — Custom Apparel Manufacturer Pakistan" />
        <meta property="og:description" content="OEM, ODM and private label apparel manufacturing — Bavarian, leather, sportswear, streetwear and more. Request a quote." />
        <meta property="og:url" content={shareUrl} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:site_name" content="Irha Apparels" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Irha Apparels Product Catalogue" />
        <meta name="twitter:description" content="B2B apparel manufacturing catalogue — Bavarian, leather, sportswear, streetwear, nightwear." />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
      </Helmet>

      {/* Hero */}
      <section className="pt-32 md:pt-40 pb-12 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Catalogue</p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl">
            B2B Product <span className="text-gold italic">Catalogue</span>
          </h1>
          <p className="text-foreground/70 mt-6 max-w-2xl text-sm md:text-base leading-relaxed">
            Browse our full export range. Every category supports OEM, ODM and private label —
            Flexible MOQ, program-based production timeline, shipped FOB Sialkot.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              onClick={() => setLeadOpen(true)}
              className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
            >
              <Send size={14} /> Request PDF Catalogue
            </button>
            <a
              href={whatsappLink("Hi, I would like the Irha Apparels product catalogue.")}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-3 border border-gold/60 text-gold px-7 py-4 text-xs uppercase tracking-[0.3em] hover:bg-gold hover:text-primary-foreground transition-all"
            >
              <MessageCircle size={14} /> WhatsApp
            </a>
            <button
              onClick={() => setShareOpen((v) => !v)}
              className="inline-flex items-center gap-3 border border-border text-foreground/80 px-7 py-4 text-xs uppercase tracking-[0.3em] hover:border-gold hover:text-gold transition-all"
            >
              <Share2 size={14} /> Share Catalogue
            </button>
          </div>

          {shareOpen && (
            <div className="mt-4 flex flex-wrap gap-2 text-xs">
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener"
                 href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}>WhatsApp</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener"
                 href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}>Facebook</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener"
                 href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}>LinkedIn</a>
              <button className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" onClick={() => { navigator.clipboard?.writeText(shareUrl); }}>Copy link</button>
            </div>
          )}
        </div>
      </section>

      {/* Categories grid */}
      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {CATALOGUE_GROUPS.map((g) => (
              <Link
                key={g.slug}
                to={`/catalogue/${g.slug}`}
                className="group relative block border border-border/60 bg-card/30 p-6 md:p-8 hover:border-gold transition-colors"
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">{g.nameDe}</p>
                <h2 className="font-display text-2xl md:text-3xl mt-2 leading-tight">{g.name}</h2>
                <p className="text-foreground/60 text-sm mt-3">{g.tagline}</p>
                <p className="text-foreground/45 text-xs mt-4 leading-relaxed line-clamp-3">{g.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/55 group-hover:text-gold transition-colors">
                    View collection
                  </span>
                  <ArrowUpRight size={16} className="text-foreground/55 group-hover:text-gold transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {leadOpen && (
        <CatalogueLeadForm
          onClose={() => setLeadOpen(false)}
          catalogueUrl={shareUrl}
          source="catalogue-index-pdf"
        />
      )}
    </>
  );
}
