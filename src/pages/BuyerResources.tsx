import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  PackageCheck,
  Scale,
  Truck,
} from "lucide-react";
import SEO from "@/components/SEO";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const GUIDES = [
  {
    id: "rfq-checklist",
    icon: FileText,
    title: "RFQ checklist",
    intro: "A useful quotation starts with enough information to define the product and commercial scope.",
    items: [
      "Product name, reference image or tech pack",
      "Fabric or material preference, including weight where known",
      "Estimated quantity per style, color and size range",
      "Printing, embroidery, trims, labels and packaging",
      "Destination country and preferred Incoterm if known",
      "Target delivery window and any approval milestones",
    ],
  },
  {
    id: "sample-approval",
    icon: PackageCheck,
    title: "Sample approval checklist",
    intro: "Review the sample against the agreed specification instead of approving it from appearance alone.",
    items: [
      "Measurements and fit against the approved size specification",
      "Fabric, color, hand-feel and material composition",
      "Stitching, seam construction and reinforcement points",
      "Artwork size, placement, embroidery or print finish",
      "Labels, care information, hangtags and packaging",
      "Written list of changes before approving bulk production",
    ],
  },
  {
    id: "oem-odm-private-label",
    icon: Scale,
    title: "OEM, ODM and private label",
    intro: "These terms describe different parts of the development and branding relationship.",
    items: [
      "OEM: the buyer supplies the design/specification and the manufacturer produces it",
      "ODM: the manufacturer helps develop a product direction that the buyer customizes",
      "Private label: the buyer's branding is applied to the agreed product and packaging",
      "A program can combine ODM development with private-label branding",
      "Design ownership, confidentiality and exclusivity should be agreed in writing",
    ],
  },
  {
    id: "quote-comparison",
    icon: ClipboardCheck,
    title: "How to compare quotations",
    intro: "A lower unit price is not comparable if the material, trims, packaging or shipping scope is different.",
    items: [
      "Confirm the same fabric/material specification and construction",
      "Check whether artwork, labels, tags and packaging are included",
      "Compare sample, development and setup charges separately",
      "Confirm Incoterm and which freight/customs costs are excluded",
      "Review payment milestones, production assumptions and validity period",
      "Ask how changes after approval affect cost and timing",
    ],
  },
  {
    id: "shipping-questions",
    icon: Truck,
    title: "Shipping questions to settle",
    intro: "The shipping method should match the order size, deadline, destination and buyer's import setup.",
    items: [
      "Which Incoterm is quoted and where risk transfers",
      "Who books freight and who handles destination customs",
      "Whether insurance, duties and last-mile delivery are included",
      "Packaging dimensions and estimated shipment weight",
      "Documents required by the destination and buyer",
      "How dispatch evidence and tracking will be shared",
    ],
  },
];

export default function BuyerResources() {
  const pageUrl = `${SITE_URL}/resources`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "B2B Apparel Buyer Resources — Irha Apparels",
      description:
        "Practical sourcing checklists for RFQs, samples, OEM/ODM, quotation comparison and apparel shipping discussions.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
      mainEntity: {
        "@type": "ItemList",
        itemListElement: GUIDES.map((guide, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: guide.title,
          url: `${pageUrl}#${guide.id}`,
        })),
      },
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Buyer Resources", path: "/resources" },
    ]),
  ];

  return (
    <>
      <SEO
        title="B2B Apparel Buyer Resources | RFQ, Samples & Sourcing"
        description="Practical B2B apparel sourcing checklists for preparing an RFQ, approving samples, comparing quotations, understanding OEM/ODM and planning shipping discussions."
        path="/resources"
        jsonLd={jsonLd}
      />

      <section className="pt-36 md:pt-44 pb-20 border-b border-border/60">
        <div className="container-luxe max-w-5xl">
          <p className="eyebrow mb-5">Buyer Resources</p>
          <h1 className="font-display text-5xl md:text-7xl leading-[0.96]">
            Better sourcing starts with <span className="text-gold italic">better questions.</span>
          </h1>
          <p className="mt-7 max-w-3xl text-base md:text-lg text-foreground/70 leading-relaxed">
            Use these practical checklists to prepare requirements, compare suppliers and reduce ambiguity before sampling or production. They are general buyer guidance, not fixed terms for every Irha Apparels order.
          </p>
          <div className="mt-8 flex flex-wrap gap-2">
            {GUIDES.map((guide) => (
              <a key={guide.id} href={`#${guide.id}`} className="border border-border/60 hover:border-gold hover:text-gold px-3 py-2 text-[10px] uppercase tracking-[0.18em]">
                {guide.title}
              </a>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe space-y-8">
          {GUIDES.map(({ id, icon: Icon, title, intro, items }, index) => (
            <article id={id} key={id} className="scroll-mt-28 border border-border/60 bg-card/25 p-7 md:p-10 grid lg:grid-cols-12 gap-8">
              <div className="lg:col-span-4">
                <div className="flex items-center gap-3">
                  <Icon className="text-gold" size={24} />
                  <span className="font-mono text-xs text-foreground/45">0{index + 1}</span>
                </div>
                <h2 className="font-display text-3xl md:text-4xl mt-5 leading-[1.05]">{title}</h2>
                <p className="text-sm text-foreground/65 leading-relaxed mt-4">{intro}</p>
              </div>
              <div className="lg:col-span-8 grid sm:grid-cols-2 gap-3">
                {items.map((item) => (
                  <div key={item} className="border border-border/50 bg-background/55 p-5 flex gap-3 text-sm text-foreground/70 leading-relaxed">
                    <CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="py-16 border-y border-border/60 bg-card/25">
        <div className="container-luxe max-w-5xl">
          <p className="eyebrow mb-4">Regional Sourcing</p>
          <h2 className="font-display text-3xl md:text-4xl leading-tight">Importing from Sialkot</h2>
          <p className="mt-4 text-foreground/70 leading-relaxed max-w-3xl">
            A practical B2B guide to export documentation, shipping methods and quality inspection workflows for international brands sourcing custom apparel from Sialkot, Pakistan.
          </p>
          <div className="mt-7">
            <Link to="/guides/importing-from-sialkot" className="inline-flex items-center gap-2 border border-border/70 hover:border-gold hover:text-gold px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Read the Sialkot import guide <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-24 border-t border-border/60 bg-secondary/35">
        <div className="container-luxe max-w-4xl text-center">
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            Turn the checklist into a <span className="text-gold italic">real manufacturing brief.</span>
          </h2>
          <p className="text-sm md:text-base text-foreground/65 mt-5 max-w-2xl mx-auto">
            Send your product, quantity, destination and reference files through the inquiry workflow. The team will confirm what is feasible for the exact program.
          </p>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/inquiry?intent=rfq" className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Prepare an RFQ <ArrowRight size={13} />
            </Link>
            <Link to="/faq" className="inline-flex items-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-8 py-4 text-[10px] uppercase tracking-[0.24em]">
              Read buyer FAQ
            </Link>
          </div>
        </div>
      </section>

    </>
  );
}
