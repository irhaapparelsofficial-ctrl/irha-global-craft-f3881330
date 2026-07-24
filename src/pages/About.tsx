import SEO from "@/components/SEO";
import HeroMediaSlideshow from "@/components/HeroMediaSlideshow";
import manufacturingImg from "@/assets/manufacturing.jpg";
import factoryCinematic from "@/assets/banners/factory-cinematic.jpg";
import { Link } from "react-router-dom";
import { Clock3, Factory, Mail, MapPin, MessageCircle, PackageCheck, Phone, UserRound } from "lucide-react";
import {
  ORGANIZATION_ID,
  SITE_URL,
  WEBSITE_ID,
  breadcrumbSchema,
} from "@/lib/seoSchema";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";

const principles = [
  {
    Icon: Factory,
    title: "Requirement-led manufacturing",
    body: "Materials, construction and finishing are reviewed against the actual program before commitments are made.",
  },
  {
    Icon: PackageCheck,
    title: "Private-label programs",
    body: "Branding, labels, tags and packaging are scoped to the buyer's requirements and confirmed before production.",
  },
];

const HERO_SLIDES = [
  {
    src: factoryCinematic,
    alt: "Irha Apparels manufacturing environment in Sialkot",
    fit: "cover" as const,
  },
  {
    src: manufacturingImg,
    alt: "Apparel manufacturing work in Sialkot",
    fit: "cover" as const,
  },
];

export default function About() {
  const description = "Irha Apparels is a Sialkot-based B2B custom apparel manufacturer for brands, wholesalers and importers. Our website is new; our manufacturing work is built on hands-on production experience.";
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
    breadcrumbSchema([
      { name: "Home", path: "/" },
      { name: "About", path: "/about" },
    ]),
  ];

  return (
    <>
      <SEO
        title="About Irha Apparels — B2B Apparel Manufacturer in Sialkot"
        description={description}
        path="/about"
        image={factoryCinematic}
        jsonLd={jsonLd}
      />

      <section className="relative min-h-[620px] md:min-h-[720px] flex items-end pt-36 pb-20 md:pb-28 border-b border-border/60 overflow-hidden">
        <HeroMediaSlideshow
          slides={HERO_SLIDES}
          label="Irha Apparels factory slideshow"
          controlsClassName="bottom-5 right-5"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/90 via-black/68 to-black/30" />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/25" />
        <div className="container-luxe relative w-full">
          <div className="max-w-4xl">
            <div className="h-px w-16 bg-gold mb-6" />
            <p className="text-[10px] md:text-xs font-mono uppercase tracking-[0.4em] text-gold mb-6">About Irha</p>
            <h1 className="font-display text-white text-5xl md:text-7xl lg:text-8xl leading-[0.95]">
              Built for serious <span className="text-gold italic">B2B programs</span>.
            </h1>
            <p className="mt-9 max-w-3xl text-base md:text-lg text-white/80 leading-relaxed">
              Irha Apparels is a Sialkot-based custom apparel manufacturer working with brands,
              wholesalers, importers and private-label buyers who need requirement-led production.
            </p>
          </div>
        </div>
      </section>

      <section className="py-24 md:py-32">
        <div className="container-luxe grid lg:grid-cols-2 gap-16 items-center">
          <div className="relative aspect-[4/5] overflow-hidden border border-border/60">
            <img
              src={manufacturingImg}
              alt="Apparel manufacturing in Sialkot"
              loading="lazy"
              className="absolute inset-0 w-full h-full object-cover"
            />
          </div>

          <div>
            <p className="eyebrow mb-5">The honest version</p>
            <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
              Our online presence is new. <span className="text-gold italic">Our manufacturing work is not</span>.
            </h2>
            <p className="text-foreground/75 leading-relaxed mt-7">
              This website is a newer part of Irha Apparels. The manufacturing work behind it is based on
              hands-on apparel production experience in Sialkot and direct understanding of sampling,
              materials, customization, branding and buyer requirements.
            </p>
            <p className="text-foreground/75 leading-relaxed mt-5">
              MOQ, samples, pricing, production timing, documentation and shipping are confirmed against
              the actual program before a final commitment is made.
            </p>

            <div className="mt-8 border border-gold/40 bg-card/30 p-6">
              <p className="font-display text-2xl">Factory view available by live video call.</p>
              <p className="text-sm text-foreground/65 mt-3 leading-relaxed">
                Buyers can request a live video call to view the manufacturing environment and discuss requirements directly.
              </p>
              <Link
                to="/inquiry?intent=meeting"
                className="mt-5 inline-flex items-center gap-2 text-xs uppercase tracking-[0.28em] text-gold hover:text-foreground transition-colors"
              >
                <MessageCircle size={14} /> Request a live video call
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-20 md:py-24 border-y border-border/60 bg-card/20" aria-labelledby="public-accountability-title">
        <div className="container-luxe grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="eyebrow mb-4">Public accountability</p>
            <h2 id="public-accountability-title" className="font-display text-4xl md:text-5xl leading-[1.05]">
              A named contact for <span className="text-gold italic">business buyers</span>.
            </h2>
            <p className="mt-5 max-w-xl text-sm leading-7 text-foreground/65">
              This contact block identifies the public business representative for Irha Apparels. It does not state legal ownership or registration status.
            </p>
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

      <section className="py-24 md:py-32 bg-secondary/40 border-b border-border/60">
        <div className="container-luxe grid md:grid-cols-2 gap-px bg-border/60 border border-border/60">
          {principles.map(({ Icon, title, body }) => (
            <article key={title} className="bg-background p-8 md:p-10">
              <Icon size={24} className="text-gold" strokeWidth={1.4} />
              <h3 className="font-display text-2xl mt-6">{title}</h3>
              <p className="text-sm text-foreground/65 mt-4 leading-relaxed">{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="py-24 md:py-32 text-center">
        <div className="container-luxe max-w-3xl">
          <h2 className="font-display text-4xl md:text-5xl leading-[1.05]">
            Bring the requirement. We will review the <span className="text-gold italic">real production path</span>.
          </h2>
          <Link
            to="/inquiry?intent=rfq"
            className="mt-10 inline-flex bg-gradient-gold text-primary-foreground px-8 py-4 text-xs uppercase tracking-[0.3em] hover:shadow-gold transition-all"
          >
            Start an Inquiry
          </Link>
        </div>
      </section>
    </>
  );
}

function AccountabilityItem({
  Icon,
  label,
  value,
  note,
  href,
  className = "",
}: {
  Icon: typeof UserRound;
  label: string;
  value: string;
  note?: string;
  href?: string;
  className?: string;
}) {
  const content = <span className="font-display text-2xl text-foreground break-words">{value}</span>;
  return (
    <article className={`bg-background p-6 md:p-7 ${className}`}>
      <div className="flex items-center gap-3 text-primary"><Icon size={18} /><p className="text-[10px] uppercase tracking-[0.22em]">{label}</p></div>
      <div className="mt-4">{href ? <a href={href} className="hover:text-primary transition-colors">{content}</a> : content}</div>
      {note && <p className="mt-2 text-xs leading-5 text-foreground/55">{note}</p>}
    </article>
  );
}
