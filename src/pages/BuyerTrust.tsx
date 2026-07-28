import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileCheck2, MessageCircle, ShieldCheck, Video } from "lucide-react";
import SEO from "@/components/SEO";
import { whatsappLink } from "@/lib/constants";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

const TRUST_POINTS = [
  {
    icon: Video,
    title: "Live factory video call",
    text: "An appointment-based call can be requested to discuss the program and view relevant working areas live, subject to availability, privacy and safety.",
  },
  {
    icon: FileCheck2,
    title: "Requirement-led quotation",
    text: "Price, quantity, sampling, timing and shipping are confirmed only after the product, destination and customization scope are reviewed.",
  },
  {
    icon: CheckCircle2,
    title: "Approval before bulk",
    text: "References, specifications, artwork and samples can be reviewed before bulk production. The written approved scope remains the working reference.",
  },
  {
    icon: ShieldCheck,
    title: "Program-specific documentation",
    text: "Material, testing, compliance and shipping documents are confirmed for the exact program instead of being claimed universally.",
  },
];

const STEPS = [
  ["01", "Share the buying requirement", "Send the product, target quantity, destination, branding and any private reference files."],
  ["02", "Verify the team and process", "Use direct contact and, where helpful, request an appointment-based live factory call."],
  ["03", "Approve the development scope", "Review the quotation, specification, sample route, labels, packaging and commercial terms."],
  ["04", "Keep one program record", "Connect decisions, approvals, changes and dispatch documents to the same inquiry or order reference."],
] as const;

export default function BuyerTrust() {
  const pageUrl = `${SITE_URL}/buyer-trust`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Buyer Trust Center — Irha Apparels",
      description: "How B2B buyers can verify Irha Apparels through direct contact, requirement review, live-call requests and documented approvals.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Buyer Trust", path: "/buyer-trust" }]),
  ];

  return (
    <>
      <SEO
        title="Buyer Trust Center — Verify Irha Apparels Before Ordering"
        description="Verify Irha Apparels through direct contact, a requirement-led quotation, sample discussion, an appointment-based factory-call request and documented approvals."
        path="/buyer-trust"
        jsonLd={jsonLd}
      />

      <section className="relative overflow-hidden border-b border-border/60 pb-20 pt-36 md:pb-24 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_12%,hsl(var(--gold)/0.12),transparent_34%)]" />
        <div className="container-luxe relative grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <p className="eyebrow mb-5">Buyer Trust Center</p>
            <h1 className="max-w-5xl font-display text-5xl leading-[0.96] md:text-7xl">
              Verify the supplier <span className="text-gold italic">before the order</span>.
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-relaxed text-foreground/70 md:text-lg">
              Use direct contact, relevant evidence, clear specifications and documented approvals to evaluate a proposed program before making a commercial commitment.
            </p>
          </div>
          <aside className="border border-amber-500/30 bg-amber-500/[0.04] p-6 lg:col-span-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300">Media status</p>
            <p className="mt-3 text-sm leading-7 text-foreground/70">
              Genuine factory and sample photography is pending. No concept image is presented on this page as production proof.
            </p>
          </aside>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe">
          <div className="grid gap-px border border-border/60 bg-border/60 md:grid-cols-2">
            {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-background p-7 md:p-9">
                <Icon className="text-gold" size={24} />
                <h2 className="mt-5 font-display text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-relaxed text-foreground/66">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/35 py-20 md:py-28">
        <div className="container-luxe grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">Buyer verification path</p>
            <h2 className="font-display text-3xl leading-[1.05] md:text-4xl">A practical route from first contact to an approved scope.</h2>
          </div>
          <div className="space-y-3 lg:col-span-8">
            {STEPS.map(([step, title, text]) => (
              <article key={step} className="grid gap-4 border border-border/60 bg-background/60 p-6 sm:grid-cols-[70px_1fr] md:p-7">
                <span className="font-mono text-lg text-gold">{step}</span>
                <div><h3 className="font-display text-xl md:text-2xl">{title}</h3><p className="mt-2 text-sm leading-relaxed text-foreground/65">{text}</p></div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border/60 bg-card/30 py-24">
        <div className="container-luxe max-w-4xl text-center">
          <h2 className="font-display text-3xl leading-[1.04] md:text-5xl">Start with the requirement and the evidence your team needs.</h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/factory-video-call" className="inline-flex items-center gap-2 bg-gradient-gold px-7 py-4 text-[10px] uppercase tracking-[0.24em] text-primary-foreground"><Video size={14} /> Request video call</Link>
            <Link to="/inquiry?intent=rfq" className="inline-flex items-center gap-2 border border-foreground/25 px-7 py-4 text-[10px] uppercase tracking-[0.24em] hover:border-gold hover:text-gold">Send requirements <ArrowRight size={13} /></Link>
            <a href={whatsappLink("Hi Irha Apparels, I would like to discuss supplier verification for a B2B manufacturing program.")} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 border border-foreground/25 px-7 py-4 text-[10px] uppercase tracking-[0.24em] hover:border-emerald-400 hover:text-emerald-300"><MessageCircle size={14} /> WhatsApp</a>
          </div>
        </div>
      </section>
    </>
  );
}
