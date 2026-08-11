import { ArrowRight, BadgeCheck, Building2, FileCheck2, Mail, MapPin, Phone, ShieldCheck, Video } from "lucide-react";
import { Link } from "react-router-dom";
import SEO from "@/components/SEO";
import { FactoryCapabilityPosterLink } from "@/components/factory/FactoryCapabilityMedia";
import { SCCI_BUSINESS_REFERENCE } from "@/lib/publicBusinessEvidence.mjs";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";
import { breadcrumbSchema, ORGANIZATION_ID, SITE_URL, WEBSITE_ID } from "@/lib/seoSchema";

const pagePath = "/buyer-trust";
const pageTitle = "Buyer Trust Center — Business Reference & Supplier Verification";
const pageDescription = `Verify Irha Apparels through its published business identity, SCCI directory/member reference ${SCCI_BUSINESS_REFERENCE.membershipNumber}, real recorded factory footage, direct contact channels and an appointment-based live factory video call.`;

const verificationCards = [
  {
    Icon: Building2,
    title: "Public business identity",
    text: `${PUBLIC_IDENTITY.name} publishes its Sialkot, Pakistan location and current buyer-facing contact details for direct verification.`,
  },
  {
    Icon: BadgeCheck,
    title: "SCCI directory reference",
    text: `The official SCCI member directory associates IRHA APPARELS with reference/member identifier ${SCCI_BUSINESS_REFERENCE.membershipNumber}.`,
  },
  {
    Icon: FileCheck2,
    title: "Requirement-led quotation review",
    text: "Materials, construction, branding, quantity, packaging, timing, shipping and documentation are confirmed against the actual buyer requirement rather than a blanket website promise.",
  },
  {
    Icon: Video,
    title: "Recorded proof + live verification",
    text: "Buyers can watch the real prerecorded factory capability overview and separately make an appointment-based factory video-call request for real-time discussion and verification.",
  },
] as const;

export default function BuyerTrust() {
  const canonical = `${SITE_URL}${pagePath}`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${canonical}#webpage`,
      url: canonical,
      name: pageTitle,
      description: pageDescription,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Buyer Trust", path: pagePath },
    ]),
  ];

  return (
    <>
      <SEO title={pageTitle} description={pageDescription} path={pagePath} jsonLd={jsonLd} />

      <section className="border-b border-border/60 pb-16 pt-36 md:pb-20 md:pt-44">
        <div className="container-luxe max-w-6xl">
          <p className="eyebrow mb-5">Buyer Trust Center</p>
          <h1 className="max-w-5xl font-display text-5xl leading-[0.98] md:text-7xl">Verify the supplier before the order.</h1>
          <p className="mt-7 max-w-3xl text-base leading-8 text-foreground/70 md:text-lg">
            Use direct contact, relevant evidence, clear specifications and written approvals to evaluate a proposed manufacturing programme before making a commercial commitment.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/inquiry?intent=rfq" className="inline-flex min-h-12 items-center gap-2 bg-gradient-gold px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground">
              Submit a requirement <ArrowRight size={14} />
            </Link>
            <Link to="/factory-video-call" className="inline-flex min-h-12 items-center gap-2 border border-border px-6 text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/78 hover:border-gold hover:text-gold">
              Request live factory call <Video size={14} />
            </Link>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 py-14 md:py-20" aria-labelledby="buyer-trust-factory-proof-title">
        <div className="container-luxe grid max-w-6xl gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <FactoryCapabilityPosterLink label="Watch recorded factory overview" />
          <div>
            <p className="eyebrow">Factory evidence</p>
            <h2 id="buyer-trust-factory-proof-title" className="mt-3 font-display text-4xl leading-tight md:text-5xl">Real recorded footage. Separate live verification.</h2>
            <p className="mt-5 text-sm leading-7 text-foreground/68">The recorded capability overview shows actual Irha Apparels manufacturing activity. Qualified buyers can separately request an appointment-based live factory video call when real-time discussion or verification is needed.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/factory-capability-video" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold hover:underline">Watch factory video <ArrowRight size={13} /></Link>
              <Link to="/factory-video-call" className="inline-flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground/70 hover:text-gold">Request live call <Video size={13} /></Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card/20 py-14 md:py-20">
        <div className="container-luxe max-w-6xl">
          <div className="grid gap-4 md:grid-cols-2">
            {verificationCards.map(({ Icon, title, text }) => (
              <article key={title} className="border border-border/60 bg-background/65 p-6 md:p-7">
                <Icon className="text-gold" size={24} aria-hidden="true" />
                <h2 className="mt-4 font-display text-2xl">{title}</h2>
                <p className="mt-3 text-sm leading-7 text-foreground/66">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="scci-membership" className="scroll-mt-28 border-b border-border/60 py-16 md:py-24">
        <div className="container-luxe grid max-w-6xl gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow">Business evidence</p>
            <h2 className="mt-3 font-display text-4xl leading-tight md:text-5xl">SCCI member-directory reference</h2>
            <p className="mt-5 text-sm leading-7 text-foreground/66">
              Only evidence that can currently be supported by the public Sialkot Chamber directory is presented here.
            </p>
          </div>
          <div className="border border-gold/30 bg-gold/5 p-6 md:p-8">
            <div className="flex items-start gap-4">
              <ShieldCheck className="mt-1 shrink-0 text-gold" size={26} aria-hidden="true" />
              <div>
                <h3 className="font-display text-2xl">IRHA APPARELS · {SCCI_BUSINESS_REFERENCE.membershipNumber}</h3>
                <p className="mt-3 text-sm leading-7 text-foreground/72">{SCCI_BUSINESS_REFERENCE.verificationNote}</p>
                <a href={SCCI_BUSINESS_REFERENCE.officialDirectoryUrl} target="_blank" rel="noreferrer noopener" className="mt-5 inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-gold hover:underline">
                  Open official SCCI member directory <ArrowRight size={13} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-border/60 bg-card/20 py-16 md:py-24">
        <div className="container-luxe max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Current public contact authority</p>
              <h2 className="mt-3 font-display text-4xl">Verify through the published channels.</h2>
              <div className="mt-7 grid gap-3 text-sm text-foreground/72">
                <a href={`mailto:${PUBLIC_IDENTITY.email}`} className="flex items-center gap-3 border border-border/60 p-4 hover:border-gold"><Mail size={17} className="text-gold" /> {PUBLIC_IDENTITY.email}</a>
                <a href={`tel:${PUBLIC_IDENTITY.telephoneHref}`} className="flex items-center gap-3 border border-border/60 p-4 hover:border-gold"><Phone size={17} className="text-gold" /> {PUBLIC_IDENTITY.telephone}</a>
                <div className="flex items-center gap-3 border border-border/60 p-4"><MapPin size={17} className="text-gold" /> {PUBLIC_IDENTITY.address.display}</div>
              </div>
            </div>
            <div>
              <p className="eyebrow">Scope discipline</p>
              <h2 className="mt-3 font-display text-4xl">Evidence does not become a broader claim.</h2>
              <ul className="mt-7 grid gap-3 text-sm leading-7 text-foreground/68">
                <li className="border-l border-gold/50 pl-4">The SCCI directory reference is business-identity evidence; it is not presented as a product or factory certification.</li>
                <li className="border-l border-gold/50 pl-4">No certificate issue date, renewal date or committee status is stated without separate current evidence.</li>
                <li className="border-l border-gold/50 pl-4">Target markets and international enquiry availability are not presented as proof of historical exports or customers.</li>
                <li className="border-l border-gold/50 pl-4">Third-party requirements and program-specific evidence are confirmed only when applicable evidence is available.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
