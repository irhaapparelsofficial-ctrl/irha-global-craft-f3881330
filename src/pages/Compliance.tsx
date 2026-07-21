import { Link } from "react-router-dom";
import {
  ShieldCheck,
  ClipboardCheck,
  FlaskConical,
  Leaf,
  FileText,
  MessageCircle,
} from "lucide-react";
import SEO from "@/components/SEO";
import { whatsappLink } from "@/lib/constants";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const CAPABILITIES = [
  {
    Icon: FileText,
    name: "Documentation Review",
    short: "Confirmed per program",
    desc: "Tell us which commercial, material or shipment documents your buyer or destination market requires. We review availability before confirming them.",
  },
  {
    Icon: ClipboardCheck,
    name: "Buyer Requirements",
    short: "Codes and checklists welcome",
    desc: "Buyer manuals, quality checklists and compliance requirements can be shared during inquiry and reviewed against the proposed production program.",
  },
  {
    Icon: FlaskConical,
    name: "Market Requirements",
    short: "Destination-specific review",
    desc: "Where a destination market has a specific material or chemical requirement, share it before sampling so sourcing and documentation can be reviewed.",
  },
  {
    Icon: Leaf,
    name: "Preferred Materials",
    short: "Sourced on request",
    desc: "Organic, recycled or other buyer-specified material requirements can be reviewed and sourced for suitable programs where available.",
  },
  {
    Icon: ShieldCheck,
    name: "Certification Requests",
    short: "No assumptions",
    desc: "We do not claim a certificate simply because a buyer asks for it. Required certifications are reviewed and confirmed only when valid evidence is available.",
  },
];

const FAQ = [
  {
    q: "Can you provide documents with an order?",
    a: "Share the exact documents you need during inquiry. We will review the requirement and confirm what can be prepared for the specific order before you rely on it.",
  },
  {
    q: "Can we share our own compliance checklist?",
    a: "Yes. Send your buyer manual, quality checklist or destination-market requirement with the inquiry so it can be reviewed against the proposed program.",
  },
  {
    q: "Do you publish certification logos?",
    a: "Only verified certificates approved for public display should appear on the website. A program-specific certificate requirement is reviewed separately before confirmation.",
  },
];

export default function Compliance() {
  const pageUrl = `${SITE_URL}/compliance`;
  const description = "Share buyer, material, documentation and destination-market requirements with Irha Apparels for program-specific review before production commitments are made.";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Compliance & Documentation Review",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "Service",
      "@id": `${pageUrl}#service`,
      name: "Compliance & Documentation Review",
      serviceType: "Buyer requirement, material and destination-market documentation review",
      description,
      provider: { "@id": ORGANIZATION_ID },
      areaServed: "Worldwide",
      url: pageUrl,
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Compliance", path: "/compliance" },
    ]),
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];

  return (
    <>
      <SEO
        title="Compliance & Documentation Review | Irha Apparels"
        description={description}
        path="/compliance"
        jsonLd={jsonLd}
      />

      <section className="pt-32 pb-12 md:pt-40 md:pb-16 bg-[#0A0A0A] border-b border-border/60">
        <div className="container-luxe">
          <p className="text-[11px] uppercase tracking-[0.3em] text-gold mb-5">
            Compliance & Documentation
          </p>
          <h1 className="font-display text-4xl md:text-6xl leading-[1.05] max-w-4xl">
            Requirements first. <span className="text-gold italic">Evidence before claims</span>.
          </h1>
          <p className="mt-6 max-w-2xl text-foreground/70 leading-relaxed">
            Send the exact documentation, material or destination-market requirements for your program.
            We review them before confirming what can be supplied or supported.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-luxe grid lg:grid-cols-12 gap-10">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">How We Work</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.1]">
              No blanket promises for a requirement we have not reviewed.
            </h2>
          </div>
          <div className="lg:col-span-7 space-y-4 text-foreground/75 leading-relaxed">
            <p>
              Compliance needs vary by buyer, material, product and destination market. A requirement that
              applies to one order may not apply to another.
            </p>
            <p>
              That is why certification, testing, material documentation and shipment-document requests are
              reviewed program by program before a final quotation or production commitment.
            </p>
            <p>
              For a direct trust check, buyers may also request a live video call to discuss the program and
              view the manufacturing environment.
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 md:py-16 border-t border-border/60 bg-secondary/30">
        <div className="container-luxe">
          <div className="mb-10">
            <p className="eyebrow mb-3">Requirement Areas</p>
            <h2 className="font-display text-3xl md:text-4xl">
              What buyers can send us for review.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
            {CAPABILITIES.map(({ Icon, name, short, desc }) => (
              <article key={name} className="border border-border/60 bg-background p-6 md:p-7 flex flex-col">
                <div className="w-12 h-12 border border-gold/40 flex items-center justify-center text-gold mb-5">
                  <Icon size={22} strokeWidth={1.4} />
                </div>
                <h3 className="font-display text-xl leading-tight">{name}</h3>
                <p className="text-[11px] uppercase tracking-[0.2em] text-foreground/55 mt-1">{short}</p>
                <p className="text-sm text-foreground/70 leading-relaxed mt-4">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 border-t border-border/60">
        <div className="container-luxe flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="eyebrow mb-3">Send the Requirement</p>
            <h2 className="font-display text-2xl md:text-3xl">
              Let us review what your program actually needs.
            </h2>
            <p className="text-sm text-foreground/65 mt-2 max-w-xl">
              Attach the buyer manual, checklist, reference document or notes and we will review the requirement before confirming it.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/inquiry?intent=reference"
              className="inline-flex items-center gap-2 bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <FileText size={14} /> Upload Requirement
            </Link>
            <a
              href={whatsappLink("Hello Irha Apparels — I want to discuss compliance or documentation requirements for my apparel program.")}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-2 border border-gold/70 text-gold hover:bg-gold hover:text-background px-6 py-3.5 text-xs uppercase tracking-[0.3em] transition-colors"
            >
              <MessageCircle size={14} /> Ask on WhatsApp
            </a>
          </div>
        </div>
      </section>

      <section className="py-16 md:py-20 border-t border-border/60 bg-secondary/30">
        <div className="container-luxe max-w-3xl">
          <p className="eyebrow mb-3">Buyer FAQ</p>
          <h2 className="font-display text-3xl md:text-4xl mb-10">Common documentation questions</h2>
          <div className="space-y-4">
            {FAQ.map((f) => (
              <details key={f.q} className="group border border-border/60 bg-background p-5 md:p-6">
                <summary className="flex items-center justify-between cursor-pointer list-none [&::-webkit-details-marker]:hidden">
                  <span className="font-medium text-base md:text-lg pr-4">{f.q}</span>
                  <span className="text-gold text-xl group-open:rotate-45 transition-transform shrink-0">+</span>
                </summary>
                <p className="mt-4 text-sm text-foreground/70 leading-relaxed">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
