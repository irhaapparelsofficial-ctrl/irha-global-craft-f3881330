import { Link } from "react-router-dom";
import { ArrowUpRight, MessageCircle, Send, Share2 } from "lucide-react";
import { useState } from "react";
import SEO from "@/components/SEO";
import CatalogueLeadForm from "@/components/CatalogueLeadForm";
import { CATALOGUE_GROUPS } from "@/lib/catalogueGroups";
import { whatsappLink } from "@/lib/constants";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

export default function Catalogue() {
  const [shareOpen, setShareOpen] = useState(false);
  const [leadOpen, setLeadOpen] = useState(false);

  const shareUrl = `${SITE_URL}/catalogue`;
  const shareText = "Irha Apparels — B2B product catalogue for custom apparel programs in Sialkot, Pakistan.";
  const description = "Explore custom B2B apparel programs from Irha Apparels in Sialkot, Pakistan. Product specifications and commercial terms are confirmed after requirement review.";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${shareUrl}#collection`,
      name: "Irha Apparels Product Catalogue",
      description,
      url: shareUrl,
      isPartOf: { "@id": WEBSITE_ID },
      publisher: { "@id": ORGANIZATION_ID },
      hasPart: CATALOGUE_GROUPS.map((group) => ({
        "@type": "CollectionPage",
        "@id": `${SITE_URL}/catalogue/${group.slug}#collection`,
        name: group.name,
        url: `${SITE_URL}/catalogue/${group.slug}`,
        description: group.description,
      })),
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Catalogue", path: "/catalogue" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Irha Apparels Product Catalogue | Custom Apparel Manufacturer"
        description={description}
        path="/catalogue"
        image="/og-image.jpg"
        jsonLd={jsonLd}
      />

      <section className="pt-32 md:pt-40 pb-12 border-b border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Catalogue</p>
          <h1 className="font-display text-4xl md:text-6xl lg:text-7xl leading-[0.95] max-w-4xl">
            B2B Product <span className="text-gold italic">Catalogue</span>
          </h1>
          <p className="text-foreground/70 mt-6 max-w-2xl text-sm md:text-base leading-relaxed">
            Browse custom apparel program categories. Materials, construction, branding, MOQ, sampling, pricing, production timing and shipping are confirmed after requirement review.
          </p>
          <div className="flex flex-wrap gap-3 mt-8">
            <button
              onClick={() => setLeadOpen(true)}
              className="inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-7 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
            >
              <Send size={14} /> Request Catalogue
            </button>
            <a
              href={whatsappLink("Hi, I would like to discuss the Irha Apparels product catalogue.")}
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
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://wa.me/?text=${encodeURIComponent(shareText + " " + shareUrl)}`}>WhatsApp</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}>Facebook</a>
              <a className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" target="_blank" rel="noreferrer noopener" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`}>LinkedIn</a>
              <button className="border border-border/60 px-4 py-2 hover:border-gold hover:text-gold" onClick={() => navigator.clipboard?.writeText(shareUrl)}>Copy link</button>
            </div>
          )}
        </div>
      </section>

      <section className="py-16 md:py-24">
        <div className="container-luxe">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
            {CATALOGUE_GROUPS.map((g) => (
              <Link key={g.slug} to={`/catalogue/${g.slug}`} className="group relative block border border-border/60 bg-card/30 p-6 md:p-8 hover:border-gold transition-colors">
                <p className="text-[10px] uppercase tracking-[0.3em] text-gold/70">{g.nameDe}</p>
                <h2 className="font-display text-2xl md:text-3xl mt-2 leading-tight">{g.name}</h2>
                <p className="text-foreground/60 text-sm mt-3">{g.tagline}</p>
                <p className="text-foreground/45 text-xs mt-4 leading-relaxed line-clamp-3">{g.description}</p>
                <div className="mt-5 flex items-center justify-between border-t border-border/40 pt-4">
                  <span className="text-[10px] uppercase tracking-[0.25em] text-foreground/55 group-hover:text-gold transition-colors">View collection</span>
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
          source="catalogue-index"
        />
      )}
    </>
  );
}
