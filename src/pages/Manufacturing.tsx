import SEO from "@/components/SEO";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import manufacturingImg from "@/assets/manufacturing.jpg";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import { Link } from "react-router-dom";
import { Check, MessageCircle } from "lucide-react";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const STEPS = [
  ["01", "Requirement Review", "Product, quantity, material, branding, sizing and destination needs are reviewed first."],
  ["02", "Sample & Specification", "Reference garments, sketches or tech packs are translated into the details needed for sampling and costing."],
  ["03", "Material & Trim Confirmation", "Fabric, leather, trims, labels and packaging are confirmed against the buyer requirement."],
  ["04", "Production Planning", "Construction, decoration and finishing methods are reviewed before timing and commercial terms are confirmed."],
  ["05", "Quality Review", "Measurements, workmanship and packaging checks are matched to the product and buyer requirement."],
  ["06", "Dispatch Preparation", "Packing, labels, shipment documents and logistics requirements are confirmed for the approved order."],
] as const;

const CAPABILITIES = [
  "Cut-and-sew apparel programs",
  "Embroidery and print options",
  "Private labels, care labels and hangtags",
  "Custom packaging options",
  "Sampling and product development",
  "Buyer-specified materials and trims",
];

const HERO_SLIDES = [
  {
    src: factoryCinematic,
    alt: "Apparel manufacturing environment",
    fit: "cover" as const,
  },
  {
    src: manufacturingImg,
    alt: "Sialkot apparel manufacturing process",
    fit: "cover" as const,
  },
];

export default function Manufacturing() {
  const description = "How Irha Apparels reviews custom B2B apparel programs, from requirements and sampling to production planning, quality review and dispatch preparation.";
  const pageUrl = `${SITE_URL}/manufacturing`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Manufacturing Process — Irha Apparels Sialkot",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${pageUrl}#service`,
      name: "Custom B2B Apparel Manufacturing",
      serviceType: "Apparel manufacturing (OEM, ODM, private label)",
      description,
      provider: { "@id": ORGANIZATION_ID },
      areaServed: "Worldwide",
      url: pageUrl,
      hasOfferCatalog: {
        "@type": "OfferCatalog",
        name: "Manufacturing capabilities",
        itemListElement: CAPABILITIES.map((capability) => ({
          "@type": "Offer",
          itemOffered: { "@type": "Service", name: capability },
        })),
      },
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Manufacturing", path: "/manufacturing" },
    ]),
  ];


  return (
    <>
      <SEO
        title="Manufacturing Process — Irha Apparels Sialkot"
        description={description}
        path="/manufacturing"
        image={factoryCinematic}
        jsonLd={jsonLd}
      />

      <section className="relative pt-40 pb-24 md:pb-32 overflow-hidden">
        <HeroMediaSlideshow
          slides={HERO_SLIDES}
          label="Manufacturing process slideshow"
          imageClassName="opacity-35"
          controlsClassName="bottom-5 right-5"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">Manufacturing</p>
          <h1 className="font-display text-5xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            From requirement to a <span className="text-gold italic">reviewed production path</span>.
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/75">
            Each program is reviewed against its actual construction, material, branding, quantity and destination needs before feasibility, pricing or timing are confirmed.
          </p>
        </div>
      </section>

      <section className="py-24 md:py-32 border-t border-border/60">
        <div className="container-luxe">
          <p className="eyebrow mb-4">Typical Workflow</p>
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05] max-w-2xl mb-14">
            Clear steps before <span className="text-gold italic">commitments</span>.
          </h2>
          <div className="grid md:grid-cols-2 gap-x-16 gap-y-2">
            {STEPS.map(([n, title, body]) => (
              <div key={n} className="grid grid-cols-[auto_1fr] gap-8 py-10 border-b border-border/60">
                <p className="font-display text-5xl text-gold">{n}</p>
                <div>
                  <h3 className="font-display text-2xl">{title}</h3>
                  <p className="text-foreground/70 mt-3 leading-relaxed text-sm">{body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32 bg-secondary/40 border-y border-border/60">
        <div className="container-luxe grid lg:grid-cols-2 gap-14 items-start">
          <div>
            <p className="eyebrow mb-4">Capabilities</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Confirmed against the <span className="text-gold italic">actual program</span>.
            </h2>
            <p className="text-sm text-foreground/65 mt-6 leading-relaxed">
              MOQ, samples, production timing, pricing and shipping are confirmed after requirement review.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {CAPABILITIES.map((item) => (
              <div key={item} className="border border-border/60 bg-background p-6 flex items-start gap-3">
                <Check size={18} className="text-gold shrink-0 mt-0.5" />
                <span className="text-foreground/80">{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-2 gap-14 items-center">
          <div className="relative aspect-[4/3] overflow-hidden">
            <img src={manufacturingImg} alt="Sialkot apparel manufacturing" loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
          </div>
          <div>
            <p className="eyebrow mb-4">Direct Trust Check</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Request a <span className="text-gold italic">live video call</span>.
            </h2>
            <p className="text-foreground/70 mt-6 leading-relaxed">
              Buyers can request a live video call to discuss the program and view the manufacturing environment before moving forward.
            </p>
            <Link to="/inquiry?intent=meeting" className="mt-8 inline-flex items-center gap-3 bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all">
              <MessageCircle size={15} /> Request Live Video Call
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
