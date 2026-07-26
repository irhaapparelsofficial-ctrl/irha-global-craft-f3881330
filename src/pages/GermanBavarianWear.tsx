import { Link } from "react-router-dom";
import { ArrowUpRight, CheckCircle2, Languages } from "lucide-react";
import SEO from "@/components/SEO";
import { breadcrumbSchema } from "@/lib/seoSchema";

const groups = [
  {
    title: "Herren",
    description: "Lederhosen, Trachtenhemden, Westen, Janker und passende Accessoires für Großhandel und Eigenmarken.",
    href: "/products/bavarian-trachten-wear/men",
  },
  {
    title: "Damen",
    description: "Dirndl, Blusen, Schürzen und Trachtenjacken mit abgestimmten Stoffen, Besätzen und Eigenmarken-Ausstattung.",
    href: "/products/bavarian-trachten-wear/women",
  },
  {
    title: "Kinder",
    description: "Trachtenbekleidung für Jungen und Mädchen, saisonale Programme und Fachhandelssortimente.",
    href: "/products/bavarian-trachten-wear/kids",
  },
  {
    title: "Accessoires",
    description: "Hosenträger, Gürtel, Hüte, Socken und weitere Ergänzungen für koordinierte Trachtenprogramme.",
    href: "/products/bavarian-trachten-wear",
  },
] as const;

const capabilities = [
  "OEM-, ODM- und Private-Label-Fertigung nach technischer Prüfung",
  "Material-, Farb-, Besatz- und Stickereianpassung",
  "Größenläufe für Großhandel und Fachhandel",
  "Musterentwicklung und dokumentierte Käuferfreigabe",
  "Etiketten, Hangtags und Verpackung nach freigegebenen Daten",
  "Live-Fabrikbesichtigung per Video nach Terminvereinbarung",
] as const;

export default function GermanBavarianWear() {
  const url = "https://irhaapparels.com/de/bavarian-wear";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: "Trachten- und Lederhosenfertigung für Großhandel und Private Label",
      serviceType: "B2B-Trachtenbekleidungsfertigung",
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
      { name: "Deutsch", path: "/de/" },
      { name: "Trachtenfertigung", path: "/de/bavarian-wear" },
    ]),
  ];

  return (
    <div lang="de">
      <SEO
        title="Trachtenhersteller für Großhandel & Private Label | Irha Apparels"
        description="B2B-Trachtenfertigung für Lederhosen, Dirndl und koordinierte Kollektionen aus Sialkot mit Musterfreigabe, Eigenmarken-Ausstattung und direkter Herstellerkommunikation."
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
            <p className="eyebrow">Deutsch · Trachtenbeschaffung für den DACH-Markt</p>
            <Link
              to="/products/bavarian-trachten-wear"
              lang="en"
              className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
            >
              <Languages size={14} /> Englischer Produktkatalog
            </Link>
          </div>

          <div className="grid gap-10 lg:grid-cols-[1.2fr_.8fr] lg:items-end">
            <div>
              <h1 className="max-w-5xl font-display text-4xl leading-[.98] md:text-7xl">
                Trachtenfertigung für <span className="text-gold italic">Großhandel und Eigenmarken</span>.
              </h1>
              <p className="mt-6 max-w-3xl text-base leading-8 text-foreground/68">
                Irha Apparels fertigt Lederhosen-, Dirndl- und Trachtenprogramme in Sialkot, Pakistan, für gewerbliche Einkäufer in Deutschland, Österreich und der Schweiz. Material, Ausführung, Mengenbereich, Größen, Branding, Verpackung und Lieferverantwortung werden vor einer verbindlichen Zusage geprüft.
              </p>
            </div>
            <div className="border border-primary/30 bg-primary/5 p-6">
              <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Ausschließlich B2B</p>
              <p className="mt-3 text-sm leading-7 text-foreground/70">
                Keine Einzelhandelsangebote, keine pauschalen Festpreise und keine allgemeine Mindestmenge. Senden Sie Produktreferenz, Mengenbereich, Größenlauf und gewünschte Ausstattung für eine technische Angebotsprüfung.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  to="/inquiry?intent=rfq&source=%2Fde%2Fbavarian-wear"
                  className="inline-flex min-h-12 items-center gap-2 bg-primary px-5 text-[10px] uppercase tracking-[0.2em] text-primary-foreground"
                >
                  Trachtenprojekt anfragen <ArrowUpRight size={14} />
                </Link>
                <Link
                  to="/factory-video-call"
                  className="inline-flex min-h-12 items-center gap-2 border border-border/70 px-5 text-[10px] uppercase tracking-[0.2em] hover:border-primary hover:text-primary"
                >
                  Fabrik per Video besichtigen
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-14 md:py-20">
        <div className="container-luxe">
          <div className="mb-7">
            <p className="eyebrow">Sortimentsübersicht</p>
            <h2 className="mt-3 font-display text-4xl">Trachtenprogramme nach Zielgruppe</h2>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-foreground/62">Die folgenden Produktbereiche führen in den unveränderten englischen Katalog. Die deutschen Beschaffungs- und Anfragehinweise bleiben auf dieser Seite verfügbar.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            {groups.map((group) => (
              <Link
                key={group.title}
                to={group.href}
                lang="en"
                className="group border border-border/60 bg-card/35 p-7 transition-colors hover:border-primary md:p-9"
              >
                <p className="text-[10px] uppercase tracking-[0.22em] text-primary">Englischer Produktkatalog</p>
                <h3 className="mt-3 font-display text-3xl">{group.title}</h3>
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
            <p className="eyebrow">Fertigungs- und Freigabeumfang</p>
            <h2 className="mt-3 font-display text-4xl">Für nachvollziehbare und widerenholbare Handelsprogramme entwickelt.</h2>
            <p className="mt-5 text-sm leading-7 text-foreground/65">
              Machbarkeit, Mindestmenge, Musteraufwand, Produktionszeit, Verpackung und Lieferbedingungen werden erst nach Prüfung der konkreten Produktspezifikation bestätigt.
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
    </div>
  );
}
