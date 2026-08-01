import { Link, useLocation } from "react-router-dom";
import { Mail, MapPin, MessageCircle } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { SEO_BUYER_INTENT_FOOTER_LINKS, SEO_BUYER_INTENT_LANDING_PAGES } from "@/lib/buyerIntentSeoPages";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";
import { BRAND_ASSETS } from "@/lib/brandAssets";
import { GERMAN_GATEWAY_CONTENT } from "@/lib/germanGatewayContent";
import { getLocaleGateway, getRouteLocale, type LocaleCode } from "@/lib/i18nFoundation";
import { ROUTES } from "@/data/buyerCapabilities";
import LanguageSelector from "@/components/LanguageSelector";

function InstagramIcon({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="20" x="2" y="2" rx="5" ry="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" x2="17.51" y1="6.5" y2="6.5" /></svg>; }
function FacebookIcon({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" /></svg>; }
function LinkedInIcon({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z" /><rect width="4" height="12" x="2" y="9" /><circle cx="4" cy="4" r="2" /></svg>; }
function TikTokIcon({ size = 18 }: { size?: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M9 12a4 4 0 1 0 4 4V4a5 5 0 0 0 5 5" /></svg>; }

const COPY: Record<LocaleCode, {
  tagline: string; intro: string; detail: string; published: string; buyers: string; contact: string;
  trade: string; tradeNote: string; privacyHeading: string; privacyText: string; priority: string;
  rights: string; privacy: string; terms: string; cookies: string;
}> = {
  en: { tagline: "Manufacturing Specialists", intro: "Custom apparel manufacturing for brands, wholesalers and importers.", detail: "Made-to-order Bavarian wear, sportswear, leatherwear, streetwear and leisure apparel from Sialkot, Pakistan.", published: "Product programs", buyers: "For buyers", contact: "Contact", trade: "Supported trade terms", tradeNote: "The named place, destination coverage, duties and commercial responsibility are confirmed in the written quotation. DDP is destination and shipment dependent.", privacyHeading: "Data privacy & GDPR", privacyText: "Inquiry data and private tech packs are collected for quotation, sampling and order communication. Buyers can review the privacy policy, manage non-essential cookies, or request access and deletion through the published contact details.", priority: "Priority sourcing markets", rights: "All rights reserved.", privacy: "Privacy / GDPR", terms: "Terms", cookies: "Cookie settings" },
  de: { tagline: "Fertigungsspezialisten", intro: "Kundenspezifische Bekleidungsfertigung für Marken, Großhändler und Importeure.", detail: "Made-to-order Fertigung in Sialkot, Pakistan. Der vollständige Katalog bleibt auf Englisch verfügbar.", published: "Veröffentlichte Seiten", buyers: "Für Einkäufer", contact: "Kontakt", trade: "Unterstützte Handelsbedingungen", tradeNote: "Benannter Ort, Zielabdeckung, Abgaben und Verantwortlichkeiten werden im schriftlichen Angebot bestätigt. DDP hängt von Zielort und Sendung ab.", privacyHeading: "Datenschutz & DSGVO", privacyText: "Anfragedaten und private Tech Packs werden für Angebot, Muster und Auftragskommunikation verarbeitet. Details stehen in der englischen Datenschutzrichtlinie.", priority: "Deutsche B2B-Seiten", rights: "Alle Rechte vorbehalten.", privacy: "Datenschutz (Englisch)", terms: "Bedingungen (Englisch)", cookies: "Cookie-Einstellungen" },
  fr: { tagline: "Spécialistes de la fabrication", intro: "Fabrication de vêtements personnalisés pour marques, grossistes et importateurs.", detail: "Production sur commande à Sialkot, au Pakistan. Le catalogue complet reste disponible en anglais.", published: "Pages publiées", buyers: "Pour les acheteurs", contact: "Contact", trade: "Conditions commerciales disponibles", tradeNote: "Le lieu nommé, la couverture de destination, les droits et les responsabilités sont confirmés dans l’offre écrite. Le DDP dépend de la destination et de l’envoi.", privacyHeading: "Confidentialité et RGPD", privacyText: "Les données de demande et les dossiers techniques privés sont utilisés pour le devis, l’échantillonnage et le suivi de commande. La politique détaillée est disponible en anglais.", priority: "Pages B2B en français", rights: "Tous droits réservés.", privacy: "Confidentialité (anglais)", terms: "Conditions (anglais)", cookies: "Paramètres des cookies" },
  nl: { tagline: "Productiespecialisten", intro: "Maatwerk kledingproductie voor merken, groothandels en importeurs.", detail: "Productie op bestelling in Sialkot, Pakistan. De volledige catalogus blijft beschikbaar in het Engels.", published: "Gepubliceerde pagina’s", buyers: "Voor inkopers", contact: "Contact", trade: "Ondersteunde handelsvoorwaarden", tradeNote: "De genoemde plaats, bestemmingsdekking, heffingen en verantwoordelijkheden worden in de schriftelijke offerte bevestigd. DDP hangt af van bestemming en zending.", privacyHeading: "Privacy en AVG", privacyText: "Aanvraaggegevens en vertrouwelijke tech packs worden gebruikt voor offertes, monsters en ordercommunicatie. De volledige privacyverklaring is beschikbaar in het Engels.", priority: "Nederlandstalige B2B-pagina’s", rights: "Alle rechten voorbehouden.", privacy: "Privacy (Engels)", terms: "Voorwaarden (Engels)", cookies: "Cookie-instellingen" },
};

const DIRECT_LINKS: Record<LocaleCode, ReadonlyArray<{ label: string; href: string }>> = {
  en: [
    { label: "Materials", href: ROUTES.materials.en }, { label: "Buyer Information", href: ROUTES.buyerInformation.en },
    { label: "Inquiry Cart", href: "/inquiry-cart" }, { label: "Buyer Trust", href: "/buyer-trust" },
    { label: "Factory Video Call", href: "/factory-video-call" }, { label: "Compliance Review", href: "/compliance" },
  ],
  de: [
    { label: "Materialien", href: ROUTES.materials.de }, { label: "Einkäuferinformationen", href: ROUTES.buyerInformation.de },
    { label: "Anfrageliste", href: "/inquiry-cart" }, { label: "Fabrik-Videoanruf", href: "/factory-video-call" },
    { label: "Katalog (Englisch)", href: "/products" },
  ],
  fr: [
    { label: "Matières", href: ROUTES.materials.fr }, { label: "Informations acheteurs", href: ROUTES.buyerInformation.fr },
    { label: "Liste de demande", href: "/inquiry-cart" }, { label: "Visite vidéo de l’usine", href: "/factory-video-call" },
    { label: "Catalogue (anglais)", href: "/products" },
  ],
  nl: [
    { label: "Materialen", href: ROUTES.materials.nl }, { label: "Inkopersinformatie", href: ROUTES.buyerInformation.nl },
    { label: "Aanvraaglijst", href: "/inquiry-cart" }, { label: "Live videogesprek met de fabriek", href: "/factory-video-call" },
    { label: "Catalogus (Engels)", href: "/products" },
  ],
};

const TRADE_TERMS: Record<LocaleCode, readonly string[]> = {
  en: ["EXW", "FOB — named Pakistani point", "CIF — named destination", "DDP — where available"],
  de: ["EXW", "FOB — benannter pakistanischer Ort", "CIF — benanntes Ziel", "DDP — soweit verfügbar"],
  fr: ["EXW", "FOB — point pakistanais nommé", "CIF — destination nommée", "DDP — si disponible"],
  nl: ["EXW", "FOB — genoemde Pakistaanse plaats", "CIF — genoemde bestemming", "DDP — waar beschikbaar"],
};

export default function Footer() {
  const { pathname } = useLocation();
  const locale = getRouteLocale(pathname);
  const copy = COPY[locale];
  const { data: settings } = useSiteSettings();
  const whatsappHref = `https://wa.me/${PUBLIC_IDENTITY.whatsappNumber}`;
  const socials = [
    { name: "Instagram", href: PUBLIC_IDENTITY.socialProfiles.instagram, Icon: InstagramIcon },
    { name: "Facebook", href: PUBLIC_IDENTITY.socialProfiles.facebook, Icon: FacebookIcon },
    { name: "LinkedIn", href: PUBLIC_IDENTITY.socialProfiles.linkedin, Icon: LinkedInIcon },
    { name: "TikTok", href: PUBLIC_IDENTITY.socialProfiles.tiktok, Icon: TikTokIcon },
  ];
  const localizedPages = SEO_BUYER_INTENT_LANDING_PAGES
    .filter((page) => page.locale.toLowerCase().startsWith(locale) && page.path.startsWith(`/${locale}/`))
    .slice(0, 5)
    .map(({ h1, path }) => ({ label: h1, href: path }));
  const collections = locale === "de"
    ? GERMAN_GATEWAY_CONTENT.links.slice(0, 5).map(({ title, href }) => ({ label: title, href }))
    : locale === "en" ? settings.footer.collectionLinks.filter((item) => item.enabled).slice(0, 5) : localizedPages;
  const marketLinks = locale === "de"
    ? GERMAN_GATEWAY_CONTENT.links.map(({ title, href }) => ({ label: title, href }))
    : locale === "en" ? SEO_BUYER_INTENT_FOOTER_LINKS.slice(0, 8) : localizedPages;

  return (
    <footer className="relative border-t border-border/60 bg-[#080808] pb-24 pt-12 text-foreground/80 md:pb-8 md:pt-16" lang={locale}>
      <div className="container-luxe grid gap-9 sm:grid-cols-2 lg:grid-cols-[1.35fr_.8fr_.8fr_1fr] lg:gap-10">
        <div className="sm:col-span-2 lg:col-span-1">
          <Link to={getLocaleGateway(locale)} className="inline-flex items-center" aria-label={`${PUBLIC_IDENTITY.name} ${copy.tagline}`}>
            <img
              src={BRAND_ASSETS.footerLogo}
              alt="Official Irha Apparels Manufacturing Specialists logo"
              width="192"
              height="192"
              className="h-20 w-20 shrink-0 object-contain sm:h-24 sm:w-24"
              loading="eager"
              decoding="async"
            />
            <span className="sr-only">{PUBLIC_IDENTITY.name} — {copy.tagline}</span>
          </Link>
          <p className="mt-4 max-w-md text-sm font-medium leading-6 text-foreground/85">{copy.intro}</p>
          <p className="mt-2 max-w-md text-xs leading-5 text-foreground/52">{copy.detail}</p>
          <p className="mt-4 flex max-w-md items-start gap-2 text-xs leading-5 text-foreground/50"><MapPin size={14} className="mt-0.5 shrink-0 text-primary" /> {PUBLIC_IDENTITY.address.display}</p>
          <LanguageSelector className="mt-5 w-fit" />
        </div>

        <div><p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">{copy.published}</p><ul className="space-y-2.5 text-sm">{collections.map((item) => <li key={item.href}><Link to={item.href} className="text-foreground/62 transition-colors hover:text-primary">{item.label}</Link></li>)}</ul></div>
        <div><p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">{copy.buyers}</p><ul className="space-y-2.5 text-sm">{DIRECT_LINKS[locale].map((item) => <li key={item.href}><Link to={item.href} className="text-foreground/62 transition-colors hover:text-primary">{item.label}</Link></li>)}</ul></div>

        <div>
          <p className="mb-4 text-[9px] font-semibold uppercase tracking-[0.22em] text-primary">{copy.contact}</p>
          <ul className="space-y-3 text-sm">
            <li><a href={whatsappHref} target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 text-foreground/72 hover:text-primary"><MessageCircle size={15} className="text-emerald-400" /> {PUBLIC_IDENTITY.telephone}</a></li>
            <li><a href={`mailto:${PUBLIC_IDENTITY.email}`} className="inline-flex items-start gap-2 break-all text-foreground/72 hover:text-primary"><Mail size={15} className="mt-0.5 shrink-0 text-primary" /> {PUBLIC_IDENTITY.email}</a></li>
          </ul>
          <div className="mt-5 flex gap-2">{socials.map((social) => <a key={social.name} href={social.href} target="_blank" rel="noreferrer noopener" aria-label={`${PUBLIC_IDENTITY.name} on ${social.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 text-foreground/60 transition-colors hover:border-primary hover:text-primary"><social.Icon /></a>)}</div>
        </div>
      </div>

      <div className="container-luxe mt-10 grid gap-5 border-t border-foreground/10 pt-6 md:grid-cols-[1fr_1.3fr]">
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/38">{copy.trade}</p><div className="mt-3 flex flex-wrap gap-2">{TRADE_TERMS[locale].map((term) => <Link key={term} to={`${ROUTES.buyerInformation[locale]}#logistics`} className="border border-foreground/15 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-foreground/58 hover:border-primary hover:text-primary">{term}</Link>)}</div><p className="mt-3 text-[10px] leading-5 text-foreground/38">{copy.tradeNote}</p></div>
        <div><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/38">{copy.privacyHeading}</p><p className="mt-3 max-w-3xl text-[11px] leading-6 text-foreground/48">{copy.privacyText}</p></div>
      </div>

      <div className="container-luxe mt-8 border-t border-foreground/10 pt-6"><p className="text-[9px] font-semibold uppercase tracking-[0.2em] text-foreground/38">{copy.priority}</p><div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-[11px]">{marketLinks.map((item) => <Link key={item.href} to={item.href} className="text-foreground/48 hover:text-primary">{item.label}</Link>)}</div></div>
      <div className="container-luxe mt-7 flex flex-col gap-3 border-t border-foreground/10 pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-[9px] uppercase tracking-[0.18em] text-foreground/38">© {new Date().getFullYear()} {PUBLIC_IDENTITY.name}. {locale === "en" ? settings.footer.copyrightSuffix : copy.rights}</p><div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] uppercase tracking-[0.18em]"><Link to="/privacy-policy" className="text-foreground/42 hover:text-primary">{copy.privacy}</Link><Link to="/terms-of-service" className="text-foreground/42 hover:text-primary">{copy.terms}</Link><button type="button" onClick={() => window.dispatchEvent(new Event("irha:open-cookie-settings"))} className="text-foreground/42 hover:text-primary">{copy.cookies}</button></div></div>
    </footer>
  );
}
