import { Link } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  FileCheck2,
  MessageCircle,
  ShieldCheck,
  Video,
} from "lucide-react";
import SEO from "@/components/SEO";
import { whatsappLink } from "@/lib/constants";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const TRUST_POINTS = [
  {
    icon: Video,
    title: "Live factory video call",
    text: "A scheduled video call can be requested so your team can discuss the program and view relevant factory areas live, subject to availability and safety restrictions.",
  },
  {
    icon: FileCheck2,
    title: "Requirement-led quotation",
    text: "Prices, MOQ, sampling, production timing and shipping are confirmed only after the product, quantity, destination and customization scope are reviewed.",
  },
  {
    icon: CheckCircle2,
    title: "Approval before bulk",
    text: "References, specifications, artwork and samples can be reviewed before bulk production. The approved scope becomes the working production reference.",
  },
  {
    icon: ShieldCheck,
    title: "Program-specific documentation",
    text: "Material, testing, compliance and shipping documents are confirmed for the exact program and destination instead of being claimed as universal for every order.",
  },
];

const VERIFICATION_STEPS = [
  {
    step: "01",
    title: "Share your buying requirement",
    text: "Tell us the product, target quantity, destination, branding and any reference files. This gives both sides a clear starting point.",
  },
  {
    step: "02",
    title: "Verify the manufacturing team",
    text: "Request a live factory video call, discuss the process and ask for the evidence relevant to your category and order structure.",
  },
  {
    step: "03",
    title: "Approve the development scope",
    text: "Review the quotation, specifications, sample plan, labels, packaging and commercial terms before confirming production.",
  },
  {
    step: "04",
    title: "Track the agreed program",
    text: "Keep decisions, approvals, changes and dispatch documents connected to the same inquiry and order reference.",
  },
];

export default function BuyerTrust() {
  const pageUrl = `${SITE_URL}/buyer-trust`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Buyer Trust Center — Irha Apparels",
      description:
        "How B2B buyers can verify Irha Apparels, request a live factory video call and confirm requirements before ordering.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Buyer Trust", path: "/buyer-trust" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Buyer Trust Center — Verify Irha Apparels Before Ordering"
        description="Verify Irha Apparels through a live factory video call, requirement-led quotation, sample approval and program-specific documentation before placing a B2B order."
        path="/buyer-trust"
        image={factoryCinematic}
        jsonLd={jsonLd}
      />

      <section className="relative pt-36 md:pt-44 pb-20 md:pb-24 border-b border-border/60 overflow-hidden">
        <img
          src={factoryCinematic}
          alt="Irha Apparels factory environment for buyer verification"
          loading="eager"
          width={1920}
          height={1080}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/72 to-black/35" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />
        <div className="container-luxe relative grid lg:grid-cols-12 gap-12 items-end">
          <div className="lg:col-span-8">
            <div className="h-px w-16 bg-gold mb-6" />
            <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold mb-5">Buyer Trust Center</p>
            <h1 className="font-display text-white text-5xl md:text-7xl leading-[0.96] max-w-5xl">
              Verify the supplier <span className="text-gold italic">before the order.</span>
            </h1>
            <p className="mt-7 max-w-3xl text-base md:text-lg text-white/80 leading-relaxed">
              Irha Apparels is an experienced manufacturer in Sialkot. The website is newly built, so we do not expect buyers to rely on a website alone. Use live discussion, relevant evidence, clear specifications and documented approvals to evaluate the program.
            </p>
          </div>
          <div className="lg:col-span-4 border border-white/20 bg-black/45 backdrop-blur-md p-6">
            <p className="text-[10px] uppercase tracking-[0.28em] text-gold">Direct verification</p>
            <h2 className="font-display text-white text-2xl mt-3">Request a live factory view</h2>
            <p className="text-sm text-white/70 mt-3 leading-relaxed">
              Share your category and preferred time. Availability and the relevant viewing scope are confirmed before the call.
            </p>
            <Link
              to="/factory-video-call"
              className="mt-5 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.22em]"
            >
              Book factory call <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe">
          <div className="max-w-3xl mb-12">
            <p className="eyebrow mb-4">How trust is built</p>
            <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
              Evidence and approvals, <span className="text-gold italic">not unsupported promises.</span>
            </h2>
          </div>
          <div className="grid md:grid-cols-2 gap-px bg-border/60 border border-border/60">
            {TRUST_POINTS.map(({ icon: Icon, title, text }) => (
              <article key={title} className="bg-background p-7 md:p-9">
                <Icon className="text-gold" size={24} />
                <h3 className="font-display text-2xl mt-5">{title}</h3>
                <p className="text-sm text-foreground/66 leading-relaxed mt-3">{text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-secondary/35 border-y border-border/60">
        <div className="container-luxe grid lg:grid-cols-12 gap-14">
          <div className="lg:col-span-4">
            <p className="eyebrow mb-4">Buyer verification path</p>
            <h2 className="font-display text-3xl md:text-4xl leading-[1.05]">
              A practical route from first contact to production.
            </h2>
            <p className="text-sm text-foreground/65 mt-5 leading-relaxed">
              The exact workflow changes by category, but these four controls reduce ambiguity for both buyer and manufacturer.
            </p>
          </div>
          <div className="lg:col-span-8 space-y-3">
            {VERIFICATION_STEPS.map((item) => (
              <article key={item.step} className="border border-border/60 bg-background/60 p-6 md:p-7 grid sm:grid-cols-[70px_1fr] gap-4">
                <span className="font-mono text-gold text-lg">{item.step}</span>
                <div>
                  <h3 className="font-display text-xl md:text-2xl">{item.title}</h3>
                  <p className="text-sm text-foreground/65 leading-relaxed mt-2">{item.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid lg:grid-cols-2 gap-8">
          <article className="border border-emerald-500/30 bg-emerald-500/[0.04] p-7 md:p-9">
            <p className="text-[10px] uppercase tracking-[0.26em] text-emerald-300">Confirm before order</p>
            <ul className="mt-6 space-y-4 text-sm text-foreground/72">
              {[
                "Product specification and customization scope",
                "MOQ and size/color split for the exact program",
                "Sampling requirements, cost and approval steps",
                "Production timing after material and sample approval",
                "Incoterm, shipping scope and destination responsibilities",
                "Required material, test and export documentation",
              ].map((item) => (
                <li key={item} className="flex gap-3"><CheckCircle2 size={16} className="text-emerald-300 shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </article>
          <article className="border border-amber-500/30 bg-amber-500/[0.04] p-7 md:p-9">
            <p className="text-[10px] uppercase tracking-[0.26em] text-amber-300">Not assumed from the website</p>
            <ul className="mt-6 space-y-4 text-sm text-foreground/72">
              {[
                "A universal MOQ for every fabric and style",
                "A fixed price without product requirements",
                "A guaranteed sample or production date before review",
                "A blanket certification claim for every material",
                "A shipping or customs promise for every destination",
                "An order commitment before commercial terms are approved",
              ].map((item) => (
                <li key={item} className="flex gap-3"><ShieldCheck size={16} className="text-amber-300 shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="py-24 border-t border-border/60 bg-card/30">
        <div className="container-luxe max-w-4xl text-center">
          <p className="eyebrow mb-4">Start verification</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            Review the factory and your program <span className="text-gold italic">before committing.</span>
          </h2>
          <div className="mt-9 flex flex-wrap justify-center gap-3">
            <Link to="/factory-video-call" className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-7 py-4 text-[10px] uppercase tracking-[0.24em]">
              <Video size={14} /> Request video call
            </Link>
            <Link to="/inquiry?intent=rfq" className="inline-flex items-center gap-2 border border-foreground/25 hover:border-gold hover:text-gold px-7 py-4 text-[10px] uppercase tracking-[0.24em]">
              Send requirements <ArrowRight size={13} />
            </Link>
            <a href={whatsappLink("Hi Irha Apparels, I would like to verify the factory and discuss a B2B manufacturing program.")} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 border border-foreground/25 hover:border-emerald-400 hover:text-emerald-300 px-7 py-4 text-[10px] uppercase tracking-[0.24em]">
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
