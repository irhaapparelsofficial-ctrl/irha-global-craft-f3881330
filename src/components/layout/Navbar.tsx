import { Link, NavLink, useLocation } from "react-router-dom";
import { useEffect, useState } from "react";
import { Bookmark, ChevronDown, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import MockupRequestButton from "@/components/MockupRequestButton";
import irhaLogo from "@/assets/irha-logo.png.asset.json";
import { useShortlist } from "@/lib/shortlist";
import { useSiteSettings } from "@/hooks/useSiteSettings";

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const { pathname } = useLocation();
  const shortlist = useShortlist();
  const { data: settings } = useSiteSettings();
  const savedCount = shortlist.items.length;
  const mainLinks = settings.navigation.main.filter((link) => link.enabled);
  const moreLinks = settings.navigation.more.filter((link) => link.enabled);
  const tailLinks = settings.navigation.tail.filter((link) => link.enabled);
  const logoSrc = settings.brand.logoUrl || irhaLogo.url;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => { setOpen(false); setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKeyDown);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener("keydown", onKeyDown); };
  }, [open]);

  return (
    <header className={cn("fixed top-0 inset-x-0 z-50 transition-all duration-500", scrolled || open ? "bg-background/90 backdrop-blur-xl border-b border-border/60 py-3" : "bg-transparent py-6")}>
      <div className="container-luxe flex items-center justify-between">
        <Link to="/" className="group flex items-center shrink-0 mr-8" aria-label={`${settings.brand.name} — home`}>
          <img src={logoSrc} alt={settings.brand.name} className="h-9 md:h-12 w-auto object-contain transition-transform group-hover:scale-[1.04]" loading="eager" decoding="async" />
        </Link>

        <nav className="hidden lg:flex items-center gap-8" aria-label="Primary navigation">
          {mainLinks.map((link) => <NavLink key={link.href} to={link.href} end={link.href === "/"} className={({ isActive }) => cn("text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors", isActive ? "text-primary" : "text-foreground/80 hover:text-foreground")}>{link.label}</NavLink>)}

          {moreLinks.length > 0 && <div className="relative" onMouseEnter={() => setMoreOpen(true)} onMouseLeave={() => setMoreOpen(false)} onBlur={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setMoreOpen(false); }} onKeyDown={(event) => { if (event.key === "Escape") { setMoreOpen(false); (event.currentTarget.querySelector("button") as HTMLButtonElement | null)?.focus(); } }}>
            <button type="button" onClick={() => setMoreOpen((value) => !value)} aria-expanded={moreOpen} aria-haspopup="menu" aria-controls="desktop-more-menu" className="min-h-11 flex items-center gap-1 text-[11px] uppercase tracking-[0.25em] text-foreground/80 hover:text-foreground transition-colors">More <ChevronDown size={12} className={cn("transition-transform", moreOpen && "rotate-180")} /></button>
            {moreOpen && <div className="absolute top-full left-1/2 -translate-x-1/2 pt-3 animate-fade-in"><div id="desktop-more-menu" role="menu" className="bg-background border border-border/60 shadow-elegant min-w-[240px] py-2">{moreLinks.map((link) => <NavLink key={link.href} to={link.href} role="menuitem" className={({ isActive }) => cn("block px-5 py-3 text-[11px] uppercase tracking-[0.25em] transition-colors", isActive ? "text-primary" : "text-foreground/75 hover:text-primary hover:bg-card")}>{link.label}</NavLink>)}</div></div>}
          </div>}

          {tailLinks.map((link) => <NavLink key={link.href} to={link.href} className={({ isActive }) => cn("text-[11px] uppercase tracking-[0.25em] hover-gold-underline transition-colors", isActive ? "text-primary" : "text-foreground/80 hover:text-foreground")}>{link.label}</NavLink>)}
        </nav>

        <div className="hidden lg:flex items-center gap-3">
          <MockupRequestButton variant="nav">{settings.ctas.mockupLabel}</MockupRequestButton>
          <Link to="/shortlist" aria-label={`Shortlist (${savedCount} saved)`} className="relative min-h-11 min-w-11 inline-flex items-center justify-center text-foreground/80 hover:text-primary transition-colors"><Bookmark size={18} />{savedCount > 0 && <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-primary text-primary-foreground text-[10px] font-medium flex items-center justify-center">{savedCount}</span>}</Link>
          <Link to={settings.ctas.quoteHref} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.25em] font-medium hover:shadow-gold transition-all">{settings.ctas.quoteLabel}</Link>
        </div>

        <button type="button" onClick={() => setOpen((value) => !value)} className="lg:hidden min-h-11 min-w-11 inline-flex items-center justify-center text-foreground" aria-label={open ? "Close navigation menu" : "Open navigation menu"} aria-expanded={open} aria-controls="mobile-navigation">{open ? <X size={22} /> : <Menu size={22} />}</button>
      </div>

      {open && <nav id="mobile-navigation" aria-label="Mobile navigation" className="lg:hidden container-luxe pt-6 pb-[max(1rem,env(safe-area-inset-bottom))] flex flex-col gap-5 animate-fade-in max-h-[calc(100dvh-72px)] overflow-y-auto overscroll-contain">
        {[...mainLinks, ...moreLinks, ...tailLinks].map((link) => <NavLink key={link.href} to={link.href} end={link.href === "/"} className={({ isActive }) => cn("min-h-11 inline-flex items-center text-sm uppercase tracking-[0.22em]", isActive ? "text-primary" : "text-foreground/80")}>{link.label}</NavLink>)}
        <MockupRequestButton variant="navMobile">{settings.ctas.mockupLabel}</MockupRequestButton>
        <Link to={settings.ctas.quoteHref} className="mt-1 min-h-11 inline-flex w-fit items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-2.5 text-[11px] uppercase tracking-[0.25em]">{settings.ctas.quoteLabel}</Link>
        <p className="text-xs text-muted-foreground pt-2">{settings.brand.phoneDisplay}</p>
      </nav>}
    </header>
  );
}
