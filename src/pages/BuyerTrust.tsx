import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, ExternalLink, FileBadge2, FileCheck2, MessageCircle, ShieldCheck, Video } from "lucide-react";
import SEO from "@/components/SEO";
import { whatsappLink } from "@/lib/constants";
import { SCCI_PROVISIONAL_MEMBERSHIP } from "@/lib/publicBusinessEvidence.mjs";
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
      description: `Review Irha Apparels' ${SCCI_PROVISIONAL_MEMBERSHIP.shortIssuer} provisional membership evidence plus direct-contact, quotation, sample and factory-call verification paths.`,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Buyer Trust", path: "/buyer-trust" }]),
  ];

  return (
    <>
      <SEO
        title="Buyer Trust Center — SCCI Membership & Supplier Verification"
        description="Review Irha Apparels' SCCI provisional membership evidence, Membership No. A-101267, plus direct-contact, quotation, sample and factory-call verification paths."
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
            <p className="text-[10px] uppercase tracking-[0.24em] text-amber-300">Evidence status</p>
            <p className="mt-3 text-sm leading-7 text-foreground/70">
              The SCCI document below is published as business-membership evidence. It is a provisional certificate, not a product certification, final membership certificate or production-capacity claim.
            </p>
          </aside>
        </div>
      </section>

      <section id="scci-membership" className="border-b border-border/60 bg-card/20 py-16 md:py-24 scroll-mt-28">
        <div className="container-luxe grid gap-8 lg:grid-cols-12 lg:gap-12">
          <div className="lg:col-span-5">
            <p className="eyebrow mb-4">Independent business evidence</p>
            <h2 className="font-display text-3xl leading-[1.05] md:text-5xl">SCCI provisional membership</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-foreground/68 md:text-base">
              Irha Apparels holds a {SCCI_PROVISIONAL_MEMBERSHIP.documentType} issued by {SCCI_PROVISIONAL_MEMBERSHIP.issuer} ({SCCI_PROVISIONAL_MEMBERSHIP.shortIssuer}).
            </p>
            <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/62">
              {SCCI_PROVISIONAL_MEMBERSHIP.qualification}
            </p>
            <a
              href={SCCI_PROVISIONAL_MEMBERSHIP.officialDirectoryUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-6 inline-flex min-h-11 items-center gap-2 border border-gold/50 px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold hover:bg-gold/5"
            >
              Open official SCCI member directory <ExternalLink size={13} />
            </a>
            <p className="mt-3 text-xs leading-5 text-foreground/50">
              On the chamber website, search the membership number or business name to perform an independent directory check where the current SCCI directory record is available.
            </p>
          </div>

          <article aria-label="SCCI provisional membership credential summary" className="border border-gold/35 bg-background p-6 shadow-[0_20px_60px_hsl(var(--background)/0.35)] md:p-9 lg:col-span-7">
            <div className="flex flex-col gap-6 border-b border-border/60 pb-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center border border-gold/40 bg-gold/[0.06] text-gold">
                  <FileBadge2 size={22} strokeWidth={1.6} />
                </span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-gold">Credential summary</p>
                  <h3 className="mt-2 font-display text-2xl md:text-3xl">{SCCI_PROVISIONAL_MEMBERSHIP.documentType}</h3>
                  <p className="mt-2 text-sm text-foreground/58">{SCCI_PROVISIONAL_MEMBERSHIP.issuer}</p>
                </div>
              </div>
              <span className="w-fit border border-amber-400/40 bg-amber-400/[0.07] px-3 py-2 text-[9px] font-semibold uppercase tracking-[0.2em] text-amber-300">
                {SCCI_PROVISIONAL_MEMBERSHIP.status}
              </span>
            </div>

            <dl className="mt-6 grid gap-px border border-border/60 bg-border/60 sm:grid-cols-3">
              <div className="bg-background p-4">
                <dt className="text-[9px] uppercase tracking-[0.2em] text-foreground/45">Business</dt>
                <dd className="mt-2 text-sm font-semibold text-foreground">Irha Apparels</dd>
              </div>
              <div className="bg-background p-4">
                <dt className="text-[9px] uppercase tracking-[0.2em] text-foreground/45">Membership No.</dt>
                <dd className="mt-2 font-mono text-sm font-semibold text-gold">{SCCI_PROVISIONAL_MEMBERSHIP.membershipNumber}</dd>
              </div>
              <div className="bg-background p-4">
                <dt className="text-[9px] uppercase tracking-[0.2em] text-foreground/45">Certificate issued</dt>
                <dd className="mt-2 text-sm font-semibold text-foreground">{SCCI_PROVISIONAL_MEMBERSHIP.issuedDateLabel}</dd>
              </div>
            </dl>

            <div className="mt-6 border-l-2 border-gold/45 pl-4">
              <p className="text-xs leading-6 text-foreground/58">
                {SCCI_PROVISIONAL_MEMBERSHIP.sourceNote} This summary deliberately avoids converting provisional membership evidence into a broader legal, certification or manufacturing claim.
              </p>
            </div>
          </article>
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
