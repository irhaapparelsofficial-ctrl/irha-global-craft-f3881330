import SEO from "@/components/SEO";
import { Link } from "react-router-dom";
import { Clock3, Factory, Mail, MapPin, MessageCircle, PackageCheck, Phone, UserRound } from "lucide-react";
import { ORGANIZATION_ID, SITE_URL, WEBSITE_ID, breadcrumbSchema } from "@/lib/seoSchema";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";

const principles = [
  { Icon: Factory, title: "Requirement-led manufacturing", body: "Materials, construction and finishing are reviewed against the actual program before commitments are made." },
  { Icon: PackageCheck, title: "Private-label programs", body: "Branding, labels, tags and packaging are scoped to the buyer requirement and confirmed before production." },
];

export default function About() {
  const description = "Irha Apparels is a Sialkot-based B2B custom apparel manufacturer for brands, wholesalers, importers and private-label buyers.";
  const pageUrl = `${SITE_URL}/about`;
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "@id": `${pageUrl}#webpage`,
      url: pageUrl,
      name: "About Irha Apparels",
      description,
      isPartOf: { "@id": WEBSITE_ID },
      about: { "@id": ORGANIZATION_ID },
      mainEntity: { "@id": ORGANIZATION_ID },
      inLanguage: "en",
    },
    breadcrumbSchema([{ name: "Home", path: "/" }, { name: "About", path: "/about" }]),
  ];

  return (
    <>
      <SEO title="About Irha Apparels — B2B Apparel Manufacturer in Sialkot" description={description} path="/about" jsonLd={jsonLd} />

      <section className="relative overflow-hidden border-b border-border/60 pb-20 pt-36 md:pb-28 md:pt-44">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_10%,hsl(var(--gold)/0.12),transparent_35%)]" />
        <div className="container-luxe relative">
          <p className="eyebrow mb-6">About Irha</p>
          <h1 className="max-w-5xl font-display text-5xl leading-[0.95] md:text-7xl lg:text-8xl">
            Built for serious <span className="text-gold italic">B2B programs</span>.
          </h1>
          <p className="mt-9 max-w-3xl text-base leading-relaxed text-foreground/72 md:text-lg">
            Irha Apparels is a Sialkot-based custom apparel manufacturer for brands, wholesalers, importers and private-label buyers seeking requirement-led production.
          </p>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/58">
            Genuine factory and sample media is pending and is not replaced here with concept imagery. Buyers can request direct discussion and an appointment-based live factory call.
          </p>
        </div>
      </section>

      <section className="py-20 md:py-28">
        <div className="container-luxe grid gap-10 lg:grid-cols-[.9fr_1.1fr]">
          <div>
            <p className="eyebrow mb-5">What buyers can verify</p>
            <h2 className="font-display text-4xl leading-[1.05] md:text-5xl">Start with the requirement, then document the approved scope.</h2>
            <p className="mt-7 leading-relaxed text-foreground/75">MOQ, samples, price, production timing, documentation and shipping are confirmed against the actual program before a final commitment.</p>
            <Link to="/inquiry?intent=meeting" className="mt-7 inline-flex min-h-12 items-center gap-2 border border-gold/50 px-5 text-[10px] uppercase tracking-[0.22em] text-gold hover:bg-gold hover:text-background"><MessageCircle size={14} /> Request a live video call</Link>
          </div>
          <div className="grid gap-px border border-border/60 bg-border/60 sm:grid-cols-2">
            {principles.map(({ Icon, title, body }) => (
              <article key={title} className="bg-background p-8">
                <Icon size={24} className="text-gold" />
                <h3 className="mt-6 font-display text-2xl">{title}</h3>
                <p className="mt-4 text-sm leading-relaxed text-foreground/65">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/20 py-20 md:py-24" aria-labelledby="public-accountability-title">
        <div className="container-luxe grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow mb-4">Public accountability</p>
            <h2 id="public-accountability-title" className="font-display text-4xl leading-[1.05] md:text-5xl">A named contact for <span className="text-gold italic">business buyers</span>.</h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-foreground/65">This block presents the public business contact used across the website.</p>
          </div>
          <div className="grid gap-px border border-border/60 bg-border/60 sm:grid-cols-2">
            <AccountabilityItem Icon={UserRound} label="Responsible person" value={PUBLIC_IDENTITY.responsiblePerson.name} note={`${PUBLIC_IDENTITY.responsiblePerson.title}, ${PUBLIC_IDENTITY.name}`} />
            <AccountabilityItem Icon={MapPin} label="Public location" value={PUBLIC_IDENTITY.address.display} note={PUBLIC_IDENTITY.availability.appointmentPolicy} />
            <AccountabilityItem Icon={Phone} label="Telephone / WhatsApp" value={PUBLIC_IDENTITY.telephone} href={`tel:${PUBLIC_IDENTITY.telephoneHref}`} />
            <AccountabilityItem Icon={Mail} label="Business email" value={PUBLIC_IDENTITY.email} href={`mailto:${PUBLIC_IDENTITY.email}`} />
            <AccountabilityItem Icon={Clock3} label="Business availability" value={PUBLIC_IDENTITY.availability.days} note={PUBLIC_IDENTITY.availability.hours} className="sm:col-span-2" />
          </div>
        </div>
      </section>

      <section className="py-24 text-center md:py-32">
        <div className="container-luxe max-w-3xl">
          <h2 className="font-display text-4xl leading-[1.05] md:text-5xl">Bring the requirement. We will review the <span className="text-gold italic">production path</span>.</h2>
          <Link to="/inquiry?intent=rfq" className="mt-10 inline-flex bg-gradient-gold px-8 py-4 text-xs uppercase tracking-[0.3em] text-primary-foreground hover:shadow-gold">Start an inquiry</Link>
        </div>
      </section>
    </>
  );
}

function AccountabilityItem({ Icon, label, value, note, href, className = "" }: { Icon: typeof UserRound; label: string; value: string; note?: string; href?: string; className?: string }) {
  const content = <span className="break-words font-display text-2xl text-foreground">{value}</span>;
  return (
    <article className={`bg-background p-6 md:p-7 ${className}`}>
      <div className="flex items-center gap-3 text-primary"><Icon size={18} /><p className="text-[10px] uppercase tracking-[0.22em]">{label}</p></div>
      <div className="mt-4">{href ? <a href={href} className="transition-colors hover:text-primary">{content}</a> : content}</div>
      {note && <p className="mt-2 text-xs leading-5 text-foreground/55">{note}</p>}
    </article>
  );
}
