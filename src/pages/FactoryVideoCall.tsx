import { Link } from "react-router-dom";
import { ArrowRight, Calendar, CheckCircle2, ClipboardList, MessageCircle, Video } from "lucide-react";
import SEO from "@/components/SEO";
import { FactoryCapabilityPosterLink } from "@/components/factory/FactoryCapabilityMedia";
import { whatsappLink } from "@/lib/constants";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

const CALL_TOPICS = [
  "Product category and expected order structure",
  "Relevant development and production workflow",
  "Reference garments, tech packs, artwork or samples",
  "Labels, tags and packaging requirements",
  "Sampling, approval and bulk-production checkpoints",
  "Commercial details that still require written confirmation",
];

const PREP = [
  "Company or brand name and destination market",
  "Product category and target quantity range",
  "Reference image, tech pack or specification if available",
  "Preferred date, time window and timezone",
  "Questions from the sourcing or quality team",
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
      description: "Watch the real recorded Irha Apparels factory capability overview, then separately request an appointment-based live factory call for B2B verification questions.",
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "Factory Video Call", path: "/factory-video-call" }]),
  ];

  return (
    <>
      <SEO
        title="Request a Live Factory Video Call | Irha Apparels"
        description="Watch the real recorded Irha Apparels factory overview or request a separate appointment-based live factory call. Live availability and viewing scope are confirmed after review."
        path="/factory-video-call"
        jsonLd={jsonLd}
      />

      <section className="relative overflow-hidden border-b border-border/60 pb-20 pt-36 md:pt-44">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,hsl(var(--gold)/0.12),transparent_38%)]" />
        <div className="container-luxe relative grid items-center gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <p className="eyebrow mb-5">Live factory verification</p>
            <h1 className="font-display text-5xl leading-[0.96] md:text-7xl">
              Meet the team and view the factory <span className="text-gold italic">live</span>.
            </h1>
            <p className="mt-7 max-w-3xl text-base leading-relaxed text-foreground/70 md:text-lg">
              Use the meeting request to share the program, preferred time window and verification questions. The team reviews the request before confirming a call.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to="/inquiry?intent=meeting" className="inline-flex items-center gap-2 bg-gradient-gold px-7 py-4 text-[10px] uppercase tracking-[0.24em] text-primary-foreground"><Calendar size={14} /> Request meeting</Link>
              <a href={whatsappLink("Hi Irha Apparels, I would like to request a live factory video call for a B2B apparel program.")} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 border border-foreground/25 px-7 py-4 text-[10px] uppercase tracking-[0.24em] hover:border-emerald-400 hover:text-emerald-300"><MessageCircle size={14} /> Ask on WhatsApp</a>
            </div>
          </div>

          <aside className="border border-primary/30 bg-card/35 p-7 lg:col-span-5 md:p-9">
            <Video className="text-gold" size={30} />
            <h2 className="mt-5 font-display text-3xl">What happens next</h2>
            <ol className="mt-6 space-y-4 text-sm text-foreground/72">
              <li className="flex gap-3"><span className="font-mono text-gold">01</span><span>Submit the topic, preferred time window and contact details.</span></li>
              <li className="flex gap-3"><span className="font-mono text-gold">02</span><span>The team reviews the category, questions and viewing scope.</span></li>
              <li className="flex gap-3"><span className="font-mono text-gold">03</span><span>A confirmed time and communication channel are provided before the call.</span></li>
            </ol>
            <p className="mt-6 text-xs leading-5 text-foreground/55">A requested time is not automatically booked. Availability is confirmed after review.</p>
            <p className="mt-3 text-xs leading-5 text-foreground/55">Recorded factory overview and live factory verification are separate. The prerecorded capability video can be watched at any time; a live call is appointment-based and confirmed after review.</p>
          </aside>
        </div>
      </section>

      <section className="border-b border-border/60 py-16 md:py-24" aria-labelledby="recorded-factory-overview-title">
        <div className="container-luxe grid gap-8 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
          <FactoryCapabilityPosterLink label="Watch real factory overview" />
          <div>
            <p className="eyebrow">Recorded factory overview</p>
            <h2 id="recorded-factory-overview-title" className="mt-3 font-display text-4xl leading-tight md:text-5xl">Watch actual factory activity before requesting a live call.</h2>
            <p className="mt-5 text-sm leading-7 text-foreground/68">The real prerecorded capability overview shows actual Irha Apparels manufacturing activity in Sialkot. It provides recorded factory evidence; it does not replace real-time discussion or verification.</p>
            <Link to="/factory-capability-video" className="mt-6 inline-flex min-h-11 items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.18em] text-gold hover:underline">Watch recorded factory overview <ArrowRight size={13} /></Link>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid gap-8 lg:grid-cols-2">
          <article className="border border-border/60 bg-card/30 p-7 md:p-9">
            <ClipboardList className="text-gold" size={24} />
            <h2 className="mt-5 font-display text-3xl">Topics the call can cover</h2>
            <ul className="mt-6 space-y-4 text-sm text-foreground/70">{CALL_TOPICS.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />{item}</li>)}</ul>
          </article>
          <article className="border border-border/60 bg-card/30 p-7 md:p-9">
            <Calendar className="text-gold" size={24} />
            <h2 className="mt-5 font-display text-3xl">Prepare these details</h2>
            <ul className="mt-6 space-y-4 text-sm text-foreground/70">{PREP.map((item) => <li key={item} className="flex gap-3"><CheckCircle2 size={16} className="mt-0.5 shrink-0 text-gold" />{item}</li>)}</ul>
          </article>
        </div>
      </section>

      <section className="border-y border-border/60 bg-secondary/35 py-20 md:py-28">
        <div className="container-luxe max-w-4xl">
          <h2 className="font-display text-3xl leading-[1.04] md:text-5xl">A useful verification call, not a booking or commercial promise.</h2>
          <div className="mt-8 grid gap-5 text-sm leading-relaxed text-foreground/68 md:grid-cols-2">
            <p className="border border-border/60 bg-background/50 p-6">Relevant areas may be shown where active operations, privacy and safety allow.</p>
            <p className="border border-border/60 bg-background/50 p-6">Documents, samples, customer work and commercial commitments remain subject to separate written review.</p>
          </div>
          <Link to="/inquiry?intent=meeting" className="mt-9 inline-flex items-center gap-2 bg-gradient-gold px-8 py-4 text-[10px] uppercase tracking-[0.24em] text-primary-foreground">Request live factory video call <ArrowRight size={13} /></Link>
        </div>
      </section>
    </>
  );
}
