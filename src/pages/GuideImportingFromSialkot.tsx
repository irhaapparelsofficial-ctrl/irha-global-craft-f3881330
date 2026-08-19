import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileCheck, Globe2, PackageSearch, Ship, ShieldCheck } from "lucide-react";
import SEO from "@/components/SEO";
import QuoteForm from "@/components/QuoteForm";
import { BRAND } from "@/lib/constants";
import { SITE_URL, breadcrumbSchema } from "@/lib/seoSchema";
import manufacturingImg from "@/assets/manufacturing.jpg";

const path = "/guides/importing-from-sialkot";
const pageUrl = `${SITE_URL}${path}`;
const publishedAt = "2026-08-19";
const title = "Importing Custom Apparel from Sialkot: A B2B Guide";
const metaTitle = "Importing Apparel from Sialkot | Export, Shipping & QC Guide";
const metaDescription =
  "A practical B2B guide to importing custom garments from Sialkot, Pakistan: export documentation, shipping methods, quality inspection workflows and supplier verification for international brands.";

const sections = [
  {
    id: "why-sialkot",
    icon: Globe2,
    heading: "Why Sialkot for custom apparel manufacturing",
    body: "Sialkot is an established export manufacturing cluster in Pakistan with deep experience in sporting goods, leather garments, sewn products and industrial stitching. For international buyers, the practical advantage is access to specialized suppliers, embroidery and printing partners, trim sources and freight forwarders within one industrial region. Country reputation is not enough to approve a supplier: the buyer still needs to verify the exact factory, product capability and export discipline.",
  },
  {
    id: "export-documents",
    icon: FileCheck,
    heading: "Export documentation to request and review",
    body: "A Pakistan-based apparel shipment needs a complete document set before it can leave the factory and clear customs at destination. Ask the supplier to confirm which documents they prepare and which the buyer must arrange separately.",
    items: [
      "Commercial invoice showing exact product description, quantity, unit price and total value",
      "Packing list with net/gross weight, carton dimensions and style breakdown per carton",
      "Bill of lading or airway bill issued by the nominated freight forwarder",
      "Certificate of origin (when required by the destination country or trade agreement)",
      "Textile declaration or import permit if the destination market requires it",
      "Insurance certificate when the agreed Incoterm places risk on the buyer during transit",
    ],
  },
  {
    id: "shipping-methods",
    icon: Ship,
    heading: "Shipping methods from Sialkot",
    body: "The right shipping mode depends on order size, deadline and the buyer's import setup. Sialkot is inland, so most cargo moves by road to Karachi for sea or air export. Discuss each option in terms of transit time, cost and who controls booking.",
    items: [
      "Sea freight (FCL/LCL): best for bulk orders; plan for inland trucking, port handling and destination clearance",
      "Air freight: faster for samples, urgent restocks or high-value small lots; weight and volume pricing differ from sea",
      "Courier/parcel: useful for prototypes and small sample sets; not a bulk production solution",
      "Incoterms: confirm whether the quote is EXW, FOB, CIF, DAP or another term so risk and cost responsibilities are clear",
      "Door-to-door vs port-to-port: decide who handles destination customs, duties and last-mile delivery",
    ],
  },
  {
    id: "quality-inspection",
    icon: PackageSearch,
    heading: "Quality inspection workflow for international brands",
    body: "Inspection should happen before the shipment leaves the factory, not after it arrives. Define the inspection standard, sample size and acceptance criteria in advance so the factory can prepare and the buyer can act on the result.",
    items: [
      "Pre-production meeting: confirm spec, material approvals, sample reference and measurement chart",
      "In-line inspection: check cutting, stitching and construction while production is running",
      "Final random inspection: use AQL sampling against the approved sample and packing list",
      "Measurement check: compare finished garments to the approved size specification",
      "Workmanship review: seams, stitching density, alignment, cleanliness and finishing",
      "Packaging audit: carton marks, polybags, hangtags, labels and carton weight limits",
    ],
  },
  {
    id: "supplier-verification",
    icon: ShieldCheck,
    heading: "Supplier verification before the first order",
    body: "A serious sourcing decision should be based on evidence, not marketing. Use the first development as a low-risk verification project before committing to a large program.",
    items: [
      "Request current factory address, production contact and relevant equipment list",
      "Ask which processes are internal and which are subcontracted",
      "Review a physical sample for fit, construction and finish before approving bulk",
      "Confirm payment terms, production schedule and communication rhythm in writing",
      "Request a live factory video call when an in-person visit is not practical",
    ],
  },
];

export default function GuideImportingFromSialkot() {
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: title,
    description: metaDescription,
    image: `${SITE_URL}${manufacturingImg}`,
    datePublished: publishedAt,
    dateModified: publishedAt,
    author: { "@type": "Organization", name: BRAND.name, url: SITE_URL },
    publisher: { "@type": "Organization", name: BRAND.name, url: SITE_URL },
    mainEntityOfPage: pageUrl,
  };

  const jsonLd = [
    articleJsonLd,
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Buyer Resources", path: "/resources" },
      { name: "Importing from Sialkot", path },
    ]),
  ];

  return (
    <>
      <SEO title={metaTitle} description={metaDescription} path={path} type="article" jsonLd={jsonLd} />

      <article>
        <section className="pt-36 md:pt-44 pb-16 border-b border-border/60">
          <div className="container-luxe max-w-5xl">
            <p className="eyebrow mb-5">B2B Sourcing Guide</p>
            <h1 className="font-display text-4xl md:text-6xl leading-[1.04]">{title}</h1>
            <p className="mt-6 text-foreground/70 text-lg leading-relaxed max-w-3xl">
              A practical guide for international brands planning to import custom garments from Sialkot, Pakistan. Covers export documentation, shipping methods and quality inspection workflows.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="border border-border/60 hover:border-gold hover:text-gold px-3 py-2 text-[10px] uppercase tracking-[0.18em]"
                >
                  {section.heading}
                </a>
              ))}
            </div>
          </div>
        </section>

        <section className="pt-10">
          <div className="container-luxe max-w-5xl aspect-[16/9] overflow-hidden border border-border/60 bg-secondary">
            <img
              src={manufacturingImg}
              alt="Apparel manufacturing and export preparation in Sialkot"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="w-full h-full object-cover"
            />
          </div>
        </section>

        <section className="py-16 md:py-24">
          <div className="container-luxe max-w-3xl space-y-16">
            {sections.map(({ id, icon: Icon, heading, body, items }) => (
              <div key={id} id={id} className="scroll-mt-28">
                <div className="flex items-center gap-3 mb-4">
                  <Icon className="text-gold" size={24} />
                  <h2 className="font-display text-2xl md:text-3xl leading-tight">{heading}</h2>
                </div>
                <p className="text-foreground/70 leading-relaxed">{body}</p>
                {items && (
                  <ul className="mt-6 space-y-3">
                    {items.map((item) => (
                      <li key={item} className="flex gap-3 text-sm text-foreground/75 leading-relaxed">
                        <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 border-y border-border/60 bg-card/30">
          <div className="container-luxe grid lg:grid-cols-2 gap-10 items-start max-w-6xl">
            <div>
              <p className="eyebrow mb-4">Discuss Your Import Program</p>
              <h2 className="font-display text-3xl md:text-4xl leading-tight">Turn this guide into a reviewed sourcing brief.</h2>
              <p className="mt-4 text-foreground/70 leading-relaxed">
                Share the product, estimated quantity, destination and target window. Irha Apparels is an experienced manufacturer in Sialkot and can review whether the program fits its current capability.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/inquiry"
                  className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-8 py-4 text-[10px] uppercase tracking-[0.24em]"
                >
                  Start an inquiry <ArrowRight size={13} />
                </Link>
                <Link
                  to="/factory-video-call"
                  className="inline-flex items-center gap-2 border border-border/70 hover:border-gold hover:text-gold px-8 py-4 text-[10px] uppercase tracking-[0.24em]"
                >
                  Request factory video call
                </Link>
              </div>
            </div>
            <QuoteForm pageContext="Guide: Importing from Sialkot" />
          </div>
        </section>
      </article>
    </>
  );
}
