import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Languages } from "lucide-react";
import SEO from "@/components/SEO";
import { breadcrumbSchema } from "@/lib/seoSchema";

const groups = [
  {
    title: "Herren",
    description: "Lederhosen, Trachtenhemden, Westen, Janker und passende Accessoires für Großhandel und Eigenmarken.",
    href: "/intl/de/products/bavarian-trachten-wear/men",
  },
  {
    title: "Damen",
    description: "Dirndl, Blusen, Schürzen und Trachtenjacken mit anpassbaren Stoffen, Stickereien und Private-Label-Ausstattung.",
    href: "/intl/de/products/bavarian-trachten-wear/women",
  },
  {
    title: "Kinder",
    description: "Bayerische Kinderbekleidung für Händler, Festprogramme und saisonale Großhandelskollektionen.",
    href: "/intl/de/products/bavarian-trachten-wear/kids",
  },
  {
    title: "Accessoires",
    description: "Hosenträger, Gürtel, Hüte, Socken und weitere Ergänzungen für komplette Trachtenprogramme.",
    href: "/products/bavarian-trachten-wear",
  },
] as const;

const capabilities = [
  "OEM-, ODM- und Private-Label-Fertigung",
  "Material-, Farb- und Stickereianpassung",
  "Größenläufe für DACH-Handelsprogramme",
  "Musterentwicklung vor Serienproduktion",
  "FOB, CIF, EXW und DDP nach Auftragsprüfung",
  "Live-Fabrikeinblick per Videoanruf möglich",
] as const;

export default function GermanBavarianWear() {
  const url = "https://irhaapparels.com/de/bavarian-wear";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Trachten- und Lederhosen-Herstellung für Großhandel",
      serviceType: "B2B Trachtenbekleidung Herstellung",
      provider: {
        "@type": "Organization",
        name: "Irha Apparels",
        url: "https://irhaapparels.com",
        address: {
          "@type": "PostalAddress",
          addressLocality: "Sialkot",
          addressCountry: "PK",
        },
      },
      areaServed: ["Deutschland", "Österreich", "Schweiz"],
      url,
      availableLanguage: ["de", "en"],
    },
    breadcrumbSchema([
      { name: "Startseite", path: "/" },
      { name: "Bayerische Trachten", path: "/de/bavarian-wear" },
    ]),
  ];

  return (
    <>
      <SEO
        title="Trachten & Lederhosen Hersteller für Großhandel | Irha Apparels"
        description="B2B Hersteller für Lederhosen, Dirndl und Trachtenbekleidung in Sialkot. OEM, Private Label, Musterentwicklung und Export für Deutschland, Österreich und die Schweiz."
        path="/de/bavarian-wear"
        locale="de-DE"
        alternates={[
          { locale: "de", href: "/de/bavarian-wear" },
          { locale: "en", href: "/products/bavarian-trachten-wear" },
        ]}
        xDefaultPath="/products/bavarian-trachten-wear"
        jsonLd={jsonLd}
      />

      <section className="border-b border-border/60 pt-32 pb-14 md:pt-40 md:pb-20">
        <div className="container-luxe">
          <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <p className="eyebrow">Deutsch · DACH-Beschaffung</p>
            <Link
              to="/products/bavarian-trachten-wear"
              className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
            >
              <Languages size={14} /> English
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <h1 className="max-w-5xl font-display text-4xl leading-[.98] md:text-7xl">
                Trachtenfertigung für <span className="text-gold italic">Marken und Großhändler</span>.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-foreground/68">
                Irha Apparels fertigt maßgeschneiderte Lederhosen-, Dirndl- und Trachtenprogramme für Geschäftskunden in Deutschland, Österreich und der Schweiz. Preise werden nach Material, Ausführung, Menge, Branding und Lieferanforderungen kalkuliert.
              </p>
            </div>
            <div className="border border-primary/30 bg-primary/5 p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary">B2B ausschließlich</p>
              <p className="mt-3 text-sm leading-7 text-foreground/70">
                Kein Einzelhandel und keine öffentlichen Festpreise. Teilen Sie Zielmenge, Größenlauf und Tech Pack für eine strukturierte Angebotsprüfung.
              </p>
              <Link
                to="/inquiry-cart"
                className="mt-5 inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-[10px] uppercase tracking-[0.2em] text-primary-foreground"
              >
                Anfrage zusammenstellen <ArrowUpRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-luxe">
          <div className="grid gap-5 md:grid-cols-2">
            {groups.map((group) => (
              <Link
                key={group.title}
                to={group.href}
                className="group border border-border/60 bg-card/35 p-7 transition-colors hover:border-primary md:p-9"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Trachtenprogramm</p>
                <h2 className="mt-3 font-display text-3xl">{group.title}</h2>
                <p className="mt-4 max-w-xl text-sm leading-7 text-foreground/62">{group.description}</p>
                <span className="mt-6 inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-primary">
                  Produkte ansehen <ArrowUpRight size={13} className="transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border/60 bg-card/25 py-14 md:py-20">
        <div className="container-luxe grid gap-10 lg:grid-cols-2">
          <div>
            <p className="eyebrow">Fertigungsumfang</p>
            <h2 className="mt-3 font-display text-4xl">Für wiederholbare Handelsprogramme entwickelt.</h2>
            <p className="mt-5 text-sm leading-7 text-foreground/65">
              Machbarkeit, Mindestmenge, Musterzeit, Produktionszeit und Versand werden erst nach Prüfung Ihrer konkreten Anforderungen bestätigt.
            </p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {capabilities.map((capability) => (
              <li key={capability} className="flex items-start gap-3 border border-border/50 p-4 text-sm leading-6 text-foreground/72">
                <CheckCircle2 size={16} className="mt-1 shrink-0 text-primary" />
                {capability}
              </li>
            ))}
          </ul>
        </div>
      </section>
    </>
  );
}
