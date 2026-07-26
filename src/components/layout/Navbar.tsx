import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ChevronRight, ClipboardList, Home, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useInquiryCart } from "@/lib/inquiryCart";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { PUBLIC_IDENTITY } from "@/lib/publicIdentity.mjs";
import LanguageSelector from "@/components/LanguageSelector";
import { getLocaleGateway, getRouteLocale, SHARED_UI_COPY } from "@/lib/i18nFoundation";

const CORE_NAV: ReadonlyArray<{ label: string; href: string; anchor?: boolean }> = [
  { label: "Home", href: "/" },
  { label: "Products", href: "/products" },
  { label: "Manufacturing", href: "/manufacturing" },
  { label: "How it works", href: "/#process", anchor: true },
  { label: "Buyer trust", href: "/buyer-trust" },
];

const ENGLISH_FACTORY_CALL = "Factory call";
const ENGLISH_REQUEST_QUOTE = "Request quote";
const ENGLISH_REQUEST_A_QUOTE = "Request a quote";
const ENGLISH_REVIEW_INQUIRY = "Review inquiry";
const BRAND_TAGLINE = {
  en: "Manufacturing Specialists",
  de: "Fertigungsspezialisten",
  fr: "Spécialistes de la fabrication",
  nl: "Productiespecialisten",
} as const;

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const locale = getRouteLocale(pathname);
  const copy = SHARED_UI_COPY[locale];
  const inquiryCart = useInquiryCart();
  const { data: settings } = useSiteSettings();
  const inquiryCount = inquiryCart.count;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 18);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", closeOnEscape); };
  }, [open]);

  const localizedNavLabel = (label: string) => {
    if (locale === "en") return label;
    if (label === "Home") return copy.home;
    if (label === "Products") return copy.products;
    if (label === "Manufacturing") return copy.manufacturing;
    if (label === "How it works") return copy.process;
    if (label === "Buyer trust") return copy.buyerTrust;
    return label;
  };
  const homeHref = getLocaleGateway(locale);
  const localizedNavHref = (href: string) => href === "/" ? homeHref : href;
  const primaryNavigationLabelId = locale === "en" ? undefined : `${locale}-primary-navigation-label`;
  const mobileNavigationLabelId = locale === "en" ? undefined : `${locale}-mobile-navigation-label`;
  const headerSolid = scrolled || open || pathname !== "/";
  const quoteHref = inquiryCount > 0 ? "/inquiry-cart" : (settings.ctas.quoteHref || "/inquiry?intent=rfq");
  const quoteLabel = inquiryCount > 0
    ? `${locale === "en" ? ENGLISH_REVIEW_INQUIRY : copy.reviewInquiry} (${inquiryCount})`
    : locale === "en" ? ENGLISH_REQUEST_A_QUOTE : copy.requestQuote;
  const factoryCallLabel = locale === "en" ? ENGLISH_FACTORY_CALL : copy.factoryCall;
  void ENGLISH_REQUEST_QUOTE;

  return (
    <header className={cn("fixed inset-x-0 top-0 z-50 border-b transition-all duration-300", headerSolid ? "border-border/70 bg-background/96 py-2 shadow-[0_12px_35px_rgba(0,0,0,.22)] backdrop-blur-xl" : "border-transparent bg-gradient-to-b from-black/75 to-transparent py-2.5")}>
      <span id="de-primary-navigation-label" className="sr-only" lang="de">Hauptnavigation</span>
      <span id="de-mobile-navigation-label" className="sr-only" lang="de">Mobile Navigation</span>
      <span id="fr-primary-navigation-label" className="sr-only" lang="fr">Navigation principale</span>
      <span id="fr-mobile-navigation-label" className="sr-only" lang="fr">Navigation mobile</span>
      <span id="nl-primary-navigation-label" className="sr-only" lang="nl">Hoofdnavigatie</span>
      <span id="nl-mobile-navigation-label" className="sr-only" lang="nl">Mobiele navigatie</span>
      <div className="container-luxe flex min-h-16 items-center justify-between gap-3">
        <Link to={homeHref} className="group flex min-w-0 shrink-0 items-center gap-2.5" aria-label={`${PUBLIC_IDENTITY.name} — ${copy.home}`}>
          <img src="/favicon.svg" alt="Official Irha Apparels Manufacturing Specialists crest" className="h-14 w-14 shrink-0 object-contain transition-transform group-hover:scale-[1.02] sm:h-16 sm:w-16" loading="eager" decoding="async" />
          <span className="min-w-0 leading-none"><span className="block whitespace-nowrap font-display text-[1.18rem] font-semibold tracking-[0.01em] text-foreground sm:text-[1.45rem]">{PUBLIC_IDENTITY.name}</span><span className="mt-1 block whitespace-nowrap text-[6.5px] font-bold uppercase tracking-[0.18em] text-primary sm:text-[8px] sm:tracking-[0.22em]">{BRAND_TAGLINE[locale]}</span></span>
        </Link>

        <nav className="hidden items-center gap-5 xl:flex" aria-label="Primary navigation" aria-labelledby={primaryNavigationLabelId}>{CORE_NAV.map((item) => {
          const href = localizedNavHref(item.href);
          const label = localizedNavLabel(item.label);
          return item.anchor
            ? <a key={item.href} href={href} hrefLang={locale === "en" ? undefined : "en"} className="min-h-11 inline-flex items-center text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/72 transition-colors hover:text-primary">{label}</a>
            : <NavLink key={item.href} to={href} end={href === homeHref} className={({ isActive }) => cn("min-h-11 inline-flex items-center text-[9px] font-semibold uppercase tracking-[0.18em] transition-colors", isActive ? "text-primary" : "text-foreground/72 hover:text-primary")}>{label}</NavLink>;
        })}</nav>

        <div className="hidden items-center gap-2 lg:flex">
          <LanguageSelector />
          <Link to="/inquiry-cart" aria-label={`${copy.inquiryCart} (${inquiryCount})`} title={copy.inquiryCart} className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/70 text-foreground/70 transition-colors hover:border-primary hover:text-primary"><ClipboardList size={17} />{inquiryCount > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">{inquiryCount}</span>}</Link>
          <Link to="/factory-video-call" className="hidden min-h-11 items-center px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground/70 transition-colors hover:text-primary xl:inline-flex">{factoryCallLabel}</Link>
          <Link to={quoteHref} className="inline-flex min-h-11 items-center gap-2 rounded-md bg-gradient-gold px-4 text-[9px] font-semibold uppercase tracking-[0.16em] text-primary-foreground transition-all hover:shadow-gold">{quoteLabel} <ChevronRight size={14} /></Link>
        </div>

        <div className="flex items-center gap-2 lg:hidden">
          {pathname !== homeHref && <Link to={homeHref} aria-label={copy.home} title={copy.home} className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-primary/35 bg-black/35 text-primary"><Home size={20} /></Link>}
          <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-white/15 bg-black/25 text-foreground" aria-label={open ? copy.closeMenu : copy.openMenu} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X size={22} /> : <Menu size={23} />}</button>
        </div>
      </div>

      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" aria-labelledby={mobileNavigationLabelId} className="container-luxe max-h-[calc(100dvh-76px)] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 lg:hidden">
        <LanguageSelector mobile className="mb-3" />
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-elegant">{CORE_NAV.map((item) => {
          const href = localizedNavHref(item.href);
          const label = localizedNavLabel(item.label);
          return item.anchor
            ? <a key={item.href} href={href} className="flex min-h-14 items-center justify-between border-b border-border/60 px-5 text-sm font-medium text-foreground/85 last:border-b-0">{label}<ChevronRight size={16} className="text-primary" /></a>
            : <NavLink key={item.href} to={href} end={href === homeHref} className={({ isActive }) => cn("flex min-h-14 items-center justify-between border-b border-border/60 px-5 text-sm font-medium last:border-b-0", isActive ? "bg-primary/8 text-primary" : "text-foreground/85")}>{label}<ChevronRight size={16} className="text-primary" /></NavLink>;
        })}</div>
        <div className="mt-3 grid grid-cols-2 gap-2"><Link to="/factory-video-call" className="inline-flex min-h-12 items-center justify-center rounded-md border border-border/70 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground/75">{factoryCallLabel}</Link><Link to="/inquiry-cart" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border/70 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground/75"><ClipboardList size={14} /> {copy.inquiryCart} {inquiryCount || ""}</Link></div>
        <Link to={quoteHref} className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-md bg-gradient-gold px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground">{quoteLabel} <ChevronRight size={15} /></Link>
        <p className="mt-4 text-center text-xs text-muted-foreground">{PUBLIC_IDENTITY.telephone}</p>
      </nav>}
    </header>
  );
}
