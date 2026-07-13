import { Link } from "react-router-dom";
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ClipboardList,
  MessageCircle,
  Video,
} from "lucide-react";
import SEO from "@/components/SEO";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import { whatsappLink } from "@/lib/constants";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import manufacturingImg from "@/assets/manufacturing.jpg";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";

const CALL_TOPICS = [
  "Your product category and expected order structure",
  "Relevant production capabilities and workflow",
  "Reference garments, tech packs, artwork or samples",
  "Private-label, labels, tags and packaging requirements",
  "Sampling, approval and bulk-production checkpoints",
  "Commercial details that need confirmation after review",
];

const PREP = [
  "Company or brand name and destination market",
  "Product category and target quantity range",
  "Reference images, tech pack or specification if available",
  "Preferred meeting date, time window and timezone",
  "Questions your sourcing or quality team wants covered",
];

const HERO_SLIDES = [
  {
    src: factoryCinematic,
    alt: "Live factory video call view at Irha Apparels",
    fit: "cover" as const,
  },
  {
    src: manufacturingImg,
    alt: "Sialkot apparel manufacturing environment for live buyer verification",
    fit: "cover" as const,
  },
];

export default function FactoryVideoCall() {
  const pageUrl = `${SITE_URL}/factory-video-call`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Request a Live Factory Video Call — Irha Apparels",
      description:
        "Request a scheduled live video call with Irha Apparels to discuss a B2B apparel program and view relevant factory areas.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Factory Video Call", path: "/factory-video-call" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Request a Live Factory Video Call | Irha Apparels"
        description="Schedule a live factory video call with Irha Apparels in Sialkot to discuss your apparel program, manufacturing requirements and verification questions."
        path="/factory-video-call"
        image={factoryCinematic}
        jsonLd={jsonLd}
      />

      <section className="relative pt-36 md:pt-44 pb-20 border-b border-border/60 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--gold)/0.12),transparent_38%)]" />
        <div className="container-luxe relative grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5">Live factory verification</p>
            <h1 className="font-display text-5xl md:text-7xl leading-[0.96]">
              Meet the team and view the factory <span className="text-gold italic">live.</span>
            </h1>
            <p className="mt-7 text-base md:text-lg text-foreground/70 leading-relaxed max-w-3xl">
              Irha Apparels is an experienced manufacturer and the website is newly built. A scheduled video call gives your buying team a more direct way to discuss the program, ask verification questions and view relevant working areas before moving forward.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/inquiry?intent=meeting"
                className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-7 py-4 text-[10px] uppercase tracking-[0.24em]"
              >
                <Calendar size={14} /> Request meeting
              </Link>
              <a
                href={whatsappLink("Hi Irha Apparels, I would like to request a live factory video call for a B2B apparel program.")}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex items-center gap-2 border border-foreground/25 hover:border-emerald-400 hover:text-emerald-300 px-7 py-4 text-[10px] uppercase tracking-[0.24em]"
              >
                <MessageCircle size={14} /> Ask on WhatsApp
              </a>
            </div>
          </div>

          <aside className="lg:col-span-5 relative min-h-[500px] overflow-hidden border border-border/60 bg-card">
            <HeroMediaSlideshow
              slides={HERO_SLIDES}
              label="Factory video call slideshow"
              controlsClassName="top-4 right-4 bottom-auto"
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/35 to-black/10" />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 p-7 md:p-9">
              <Video className="text-gold" size={30} />
              <h2 className="font-display text-white text-3xl mt-5">What happens next</h2>
              <ol className="mt-6 space-y-4 text-sm text-white/78">
                <li className="flex gap-3"><span className="font-mono text-gold">01</span><span>Submit your meeting topic, preferred time window and contact details.</span></li>
                <li className="flex gap-3"><span className="font-mono text-gold">02</span><span>The team reviews the category and confirms availability and call scope.</span></li>
                <li className="flex gap-3"><span className="font-mono text-gold">03</span><span>You receive a confirmed time and the agreed communication channel.</span></li>
              </ol>
              <p className="text-[11px] text-white/55 mt-6 leading-relaxed">
                A requested time is not automatically booked. Availability is confirmed after review.
              </p>
            </div>
          </aside>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid lg:grid-cols-2 gap-8">
          <article className="border border-border/60 bg-card/30 p-7 md:p-9">
            <ClipboardList className="text-gold" size={24} />
            <h2 className="font-display text-3xl mt-5">Topics the call can cover</h2>
            <ul className="mt-6 space-y-4 text-sm text-foreground/70">
              {CALL_TOPICS.map((item) => (
                <li key={item} className="flex gap-3"><CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </article>
          <article className="border border-border/60 bg-card/30 p-7 md:p-9">
            <Calendar className="text-gold" size={24} />
            <h2 className="font-display text-3xl mt-5">Prepare these details</h2>
            <ul className="mt-6 space-y-4 text-sm text-foreground/70">
              {PREP.map((item) => (
                <li key={item} className="flex gap-3"><CheckCircle2 size={16} className="text-gold shrink-0 mt-0.5" />{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="py-20 md:py-28 bg-secondary/35 border-y border-border/60">
        <div className="container-luxe max-w-4xl">
          <p className="eyebrow mb-4">Viewing scope</p>
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            A useful verification call, not a staged sales promise.
          </h2>
          <div className="mt-8 grid md:grid-cols-2 gap-5 text-sm text-foreground/68 leading-relaxed">
            <p className="border border-border/60 bg-background/50 p-6">
              The call is planned around the product category and buyer questions. Relevant production or development areas may be shown where operations, privacy and safety allow.
            </p>
            <p className="border border-border/60 bg-background/50 p-6">
              Some documents, customer work, restricted areas or active production details may not be shown publicly. Program-specific evidence is discussed separately where appropriate.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24">
        <div className="container-luxe max-w-4xl text-center">
          <h2 className="font-display text-3xl md:text-5xl leading-[1.04]">
            Ready to request a <span className="text-gold italic">factory call?</span>
          </h2>
          <p className="text-sm md:text-base text-foreground/65 mt-5 max-w-2xl mx-auto">
            Use the meeting option in the inquiry form. Include your category, market, preferred date and timezone so the team can review the request properly.
          </p>
          <Link
            to="/inquiry?intent=meeting"
            className="mt-9 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-8 py-4 text-[10px] uppercase tracking-[0.24em]"
          >
            Request factory video call <ArrowRight size={13} />
          </Link>
        </div>
      </section>
    </>
  );
}
