import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import SEO from "@/components/SEO";
import HeroCarousel from "@/components/HeroCarousel";
import ThumbnailImage from "@/components/ThumbnailImage";
import CapabilityStrip from "@/components/sections/CapabilityStrip";
import FiveCategories from "@/components/sections/FiveCategories";
import WhyB2B from "@/components/sections/WhyB2B";
import BuyerTrustSection from "@/components/sections/BuyerTrustSection";
import ProcessTimeline from "@/components/sections/ProcessTimeline";
import StartProgramCTA from "@/components/sections/StartProgramCTA";
import { usePublicCatalogTree } from "@/hooks/usePublicCatalog";
import performanceHubImage from "@/assets/og/og-sportswear.jpg";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  organizationSchema,
  websiteSchema,
} from "@/lib/seoSchema";

const BAVARIAN_PRODUCT_IMAGE =
  "/product-media/distressed-brown-short-lederhosen/01-hero-front.webp";

type HubDef = {
  key: "heritage" | "performance";
  fallbackImg: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  href: string;
  childSlugs: readonly string[];
  productSafe?: boolean;
};

const HUBS: HubDef[] = [
  {
    key: "heritage",
    fallbackImg: BAVARIAN_PRODUCT_IMAGE,
    productSafe: true,
    eyebrow: "Hub 01 · Heritage",
    title: "Bavarian & Leather",
    subtitle: "Trachten craft and full-grain leather construction for heritage programs.",
    href: "/products/bavarian-trachten-wear",
    childSlugs: ["bavarian-trachten-wear", "premium-leather-apparel"] as const,
  },
  {
    key: "performance",
    fallbackImg: performanceHubImage,
    eyebrow: "Hub 02 · Performance",
    title: "Sportswear, Streetwear & Leisure",
    subtitle: "Sublimated performance, heavyweight streetwear and leisure & nightwear programs.",
    href: "/products/sportswear",
    childSlugs: ["sportswear", "streetwear-activewear", "leisure-nightwear"] as const,
  },
];

export default function Home() {
  const { data: tree = [] } = usePublicCatalogTree();
  const allCats = tree.flatMap((item) => [item, ...item.subs]);

  const jsonLd = [
    organizationSchema,
    websiteSchema,
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${SITE_URL}/#webpage`,
      url: `${SITE_URL}/`,
      name: "Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers",
      description:
        "OEM, ODM and private-label apparel manufacturing in Sialkot, Pakistan for brands, wholesalers and importers worldwide.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
  ];

  return (
    <>
      <SEO
        title="Irha Apparels — Custom Apparel Manufacturing for Global B2B Buyers"
        description="OEM, ODM and private-label apparel manufacturer in Sialkot, Pakistan. Custom cut & sew, embroidery, printing, private label and export support for brands and importers worldwide."
        path="/"
        jsonLd={jsonLd}
      />

      <HeroCarousel />
      <CapabilityStrip />

      <section className="py-20 md:py-28">
        <div className="container-luxe">
          <div className="max-w-2xl mb-12 md:mb-14">
            <p className="eyebrow mb-4">Two Production Hubs</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
              One atelier. <span className="text-gold italic">Two production hubs.</span>
            </h2>
            <p className="mt-5 text-foreground/70 text-sm md:text-base leading-relaxed">
              Programs organized into two macro hubs so buyers find the right team fast.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5 lg:gap-7">
            {HUBS.map((hub) => {
              const children = hub.childSlugs
                .map((slug) => allCats.find((category) => category.slug === slug && category.is_published))
                .filter((category): category is NonNullable<typeof category> => Boolean(category));
              return (
                <div
                  key={hub.key}
                  className="group relative overflow-hidden border border-border/60 hover:border-gold/70 transition-all duration-500 min-h-[420px] md:min-h-[480px]"
                >
                  <ThumbnailImage
                    src={hub.fallbackImg}
                    alt={hub.productSafe ? "Distressed brown short Lederhosen with suspenders — Irha Apparels" : hub.title}
                    className={`absolute inset-0 h-full w-full transition-transform duration-[1400ms] group-hover:scale-[1.04] ${hub.productSafe ? "object-contain bg-[#f4f0e7] p-8 md:p-12" : "object-cover"}`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/60 to-black/25" />
                  <div className="relative h-full flex flex-col justify-end p-7 md:p-10">
                    <div className="h-px w-10 bg-gold mb-5" />
                    <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold mb-3">
                      {hub.eyebrow}
                    </p>
                    <h3 className="font-display text-white text-2xl md:text-4xl leading-[1.05]">
                      {hub.title}
                    </h3>
                    <p className="mt-3 text-sm md:text-base text-white/80 max-w-md leading-relaxed">
                      {hub.subtitle}
                    </p>

                    <ul className="mt-6 space-y-1.5">
                      {children.length === 0 && (
                        <li className="text-white/50 text-sm">Loading categories…</li>
                      )}
                      {children.map((category) => (
                        <li key={category.slug}>
                          <Link
                            to={`/products/${category.slug}`}
                            className="group/link inline-flex items-baseline gap-3 text-white/95 hover:text-gold transition-colors"
                          >
                            <span className="font-display text-base md:text-lg leading-tight">
                              {category.name}
                            </span>
                            <span className="text-[10px] uppercase tracking-[0.25em] text-white/50 group-hover/link:text-gold/80">
                              View Collection →
                            </span>
                          </Link>
                        </li>
                      ))}
                    </ul>

                    <Link
                      to={hub.href}
                      className="mt-7 inline-flex items-center gap-3 self-start bg-gradient-gold text-primary-foreground px-6 py-3.5 text-[11px] uppercase tracking-[0.3em] font-medium group-hover:shadow-gold transition-all"
                    >
                      Explore Hub
                      <ArrowUpRight size={15} className="transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <FiveCategories />
      <WhyB2B />
      <BuyerTrustSection />
      <ProcessTimeline />
      <StartProgramCTA />
    </>
  );
}
