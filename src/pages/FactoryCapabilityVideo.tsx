import SEO from "@/components/SEO";
import {
  FACTORY_CAPABILITY_DESCRIPTION,
  FACTORY_CAPABILITY_DURATION,
  FACTORY_CAPABILITY_POSTER_URL,
  FACTORY_CAPABILITY_PUBLICATION_DATE,
  FACTORY_CAPABILITY_TITLE,
  FACTORY_CAPABILITY_VIDEO_URL,
  FactoryCapabilityPlayer,
} from "@/components/factory/FactoryCapabilityMedia";
import { FileText, MessageCircle, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";

const WATCH_PATH = "/factory-capability-video";

export default function FactoryCapabilityVideo() {
  const pageUrl = `${SITE_URL}${WATCH_PATH}`;
  const description =
    "Watch the real Irha Apparels factory capability video showing actual manufacturing activity in Sialkot, then request a manufacturing quote or a separate live factory video call.";

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "Factory Capability Video | Irha Apparels",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      mainEntity: { "@id": `${pageUrl}#video` },
      inLanguage: "en",
    },
    {
      "@context": "https://schema.org",
      "@type": "VideoObject",
      "@id": `${pageUrl}#video`,
      name: FACTORY_CAPABILITY_TITLE,
      description: FACTORY_CAPABILITY_DESCRIPTION,
      thumbnailUrl: [FACTORY_CAPABILITY_POSTER_URL],
      uploadDate: FACTORY_CAPABILITY_PUBLICATION_DATE,
      duration: FACTORY_CAPABILITY_DURATION,
      contentUrl: FACTORY_CAPABILITY_VIDEO_URL,
      url: pageUrl,
      publisher: { "@id": ORGANIZATION_ID },
    },
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "Factory Capability Video", path: WATCH_PATH },
    ]),
  ];

  return (
    <>
      <SEO
        title="Factory Capability Video | Irha Apparels"
        description={description}
        path={WATCH_PATH}
        canonical={WATCH_PATH}
        image={FACTORY_CAPABILITY_POSTER_URL}
        imageAlt="Real Irha Apparels factory manufacturing floor in Sialkot"
        jsonLd={jsonLd}
      />

      <main>
        <section className="relative overflow-hidden pb-12 pt-36 md:pb-16 md:pt-40">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_80%_8%,hsl(var(--gold)/0.12),transparent_35%)]" />
          <div className="container-luxe relative">
            <p className="eyebrow mb-5">Recorded factory overview</p>
            <h1 className="max-w-5xl font-display text-5xl leading-[0.96] md:text-7xl">Inside the <span className="text-gold italic">Irha Apparels Factory</span></h1>
            <p className="mt-7 max-w-3xl text-base leading-8 text-foreground/72 md:text-lg">
              Watch a real prerecorded capability overview showing actual Irha Apparels manufacturing activity in Sialkot. Recorded proof and appointment-based live verification are separate buyer options.
            </p>
          </div>
        </section>

        <section className="pb-20 md:pb-28" aria-labelledby="factory-capability-player-title">
          <div className="container-luxe">
            <div className="mx-auto max-w-6xl">
              <h2 id="factory-capability-player-title" className="sr-only">Irha Apparels factory capability video player</h2>
              <FactoryCapabilityPlayer preload="metadata" />
            </div>
          </div>
        </section>

        <section className="border-y border-border/60 bg-card/20 py-16 md:py-20">
          <div className="container-luxe grid gap-8 lg:grid-cols-2">
            <article className="border border-border/70 bg-background p-7 md:p-9">
              <p className="eyebrow mb-3">Recorded proof</p>
              <h2 className="font-display text-3xl">Factory capability overview</h2>
              <p className="mt-4 text-sm leading-7 text-foreground/68">
                The video above is a real prerecorded overview. The documented process shown and described includes pattern preparation, fabric marking, cutting-table support, industrial lockstitch and overlock sewing, finishing support and buyer communication.
              </p>
            </article>
            <article className="border border-border/70 bg-background p-7 md:p-9">
              <p className="eyebrow mb-3">Live verification</p>
              <h2 className="font-display text-3xl">Request a live factory video call</h2>
              <p className="mt-4 text-sm leading-7 text-foreground/68">
                A live factory call is appointment-based and remains distinct from this recorded overview. Share the product category, questions, preferred time window and timezone so availability and viewing scope can be reviewed.
              </p>
            </article>
          </div>
        </section>

        <section className="py-20 md:py-28">
          <div className="container-luxe">
            <div className="mx-auto max-w-5xl border border-gold/30 bg-gold/[0.04] p-7 md:p-10">
              <div className="flex items-start gap-4">
                <ShieldCheck size={22} className="mt-1 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <h2 className="font-display text-3xl md:text-4xl">Continue with the actual requirement.</h2>
                  <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/68">Use the existing inquiry workflow for a manufacturing quotation, or request a separate live factory call when real-time discussion or verification is needed.</p>
                </div>
              </div>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link to="/inquiry?intent=rfq" className="inline-flex min-h-12 items-center justify-center gap-2 bg-gradient-gold px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-foreground hover:shadow-gold">
                  <FileText size={15} aria-hidden="true" /> Request manufacturing quote
                </Link>
                <Link to="/factory-video-call" className="inline-flex min-h-12 items-center justify-center gap-2 border border-border px-6 text-[10px] font-semibold uppercase tracking-[0.18em] text-foreground hover:border-gold hover:text-gold">
                  <MessageCircle size={15} aria-hidden="true" /> Request live factory call
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
