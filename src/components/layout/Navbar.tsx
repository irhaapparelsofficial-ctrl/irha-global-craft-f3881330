import { useEffect, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { Bookmark, ChevronRight, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useShortlist } from "@/lib/shortlist";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const CORE_NAV: ReadonlyArray<{ label: string; href: string; anchor?: boolean }> = [
  { label: "Products", href: "/products" },
  { label: "Manufacturing", href: "/manufacturing" },
  { label: "How it works", href: "/#process", anchor: true },
  { label: "Buyer trust", href: "/buyer-trust" },
];

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const shortlist = useShortlist();
  const { data: settings } = useSiteSettings();
  const savedCount = shortlist.items.length;

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
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const headerSolid = scrolled || open || pathname !== "/";

  return (
    <header
      className={cn(
        "fixed inset-x-0 top-0 z-50 border-b transition-all duration-300",
        headerSolid
          ? "border-border/70 bg-background/96 py-2.5 shadow-[0_12px_35px_rgba(0,0,0,.22)] backdrop-blur-xl"
          : "border-transparent bg-gradient-to-b from-black/75 to-transparent py-3.5",
      )}
    >
      <div className="container-luxe flex min-h-14 items-center justify-between gap-5">
        <Link
          to="/"
          className="group flex min-w-0 shrink-0 items-center"
          aria-label={`${settings.brand.name} — home`}
        >
          <img
            src="/irha-brand-mark.svg"
            alt="Irha Apparels — B2B custom manufacturing"
            className="h-12 w-auto max-w-[232px] object-contain transition-transform group-hover:scale-[1.015] sm:h-14 sm:max-w-[290px]"
            loading="eager"
            decoding="async"
          />
        </Link>

        <nav className="hidden items-center gap-7 lg:flex" aria-label="Primary navigation">
          {CORE_NAV.map((item) => item.anchor ? (
            <a
              key={item.href}
              href={item.href}
              className="min-h-11 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.2em] text-foreground/72 transition-colors hover:text-primary"
            >
              {item.label}
            </a>
          ) : (
            <NavLink
              key={item.href}
              to={item.href}
              className={({ isActive }) => cn(
                "min-h-11 inline-flex items-center text-[10px] font-semibold uppercase tracking-[0.2em] transition-colors",
                isActive ? "text-primary" : "text-foreground/72 hover:text-primary",
              )}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-2 lg:flex">
          <Link
            to="/shortlist"
            aria-label={`Saved products (${savedCount})`}
            className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border/70 text-foreground/70 transition-colors hover:border-primary hover:text-primary"
          >
            <Bookmark size={17} />
            {savedCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1 text-[9px] font-bold text-primary-foreground">
                {savedCount}
              </span>
            )}
          </Link>
          <Link
            to="/factory-video-call"
            className="inline-flex min-h-11 items-center px-4 text-[9px] font-semibold uppercase tracking-[0.18em] text-foreground/70 transition-colors hover:text-primary"
          >
            Factory call
          </Link>
          <Link
            to={settings.ctas.quoteHref || "/inquiry?intent=rfq"}
            className="inline-flex min-h-11 items-center gap-2 rounded-md bg-gradient-gold px-5 text-[10px] font-semibold uppercase tracking-[0.19em] text-primary-foreground transition-all hover:shadow-gold"
          >
            Request quote <ChevronRight size={14} />
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-full border border-white/15 bg-black/25 text-foreground lg:hidden"
          aria-label={open ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={open}
          aria-controls="mobile-navigation"
        >
          {open ? <X size={22} /> : <Menu size={23} />}
        </button>
      </div>

      {open && (
        <nav
          id="mobile-navigation"
          aria-label="Mobile navigation"
          className="container-luxe max-h-[calc(100dvh-76px)] overflow-y-auto pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4 lg:hidden"
        >
          <div className="overflow-hidden rounded-xl border border-border/70 bg-card/95 shadow-elegant">
            {CORE_NAV.map((item) => item.anchor ? (
              <a
                key={item.href}
                href={item.href}
                className="flex min-h-14 items-center justify-between border-b border-border/60 px-5 text-sm font-medium text-foreground/85 last:border-b-0"
              >
                {item.label}<ChevronRight size={16} className="text-primary" />
              </a>
            ) : (
              <NavLink
                key={item.href}
                to={item.href}
                className={({ isActive }) => cn(
                  "flex min-h-14 items-center justify-between border-b border-border/60 px-5 text-sm font-medium last:border-b-0",
                  isActive ? "bg-primary/8 text-primary" : "text-foreground/85",
                )}
              >
                {item.label}<ChevronRight size={16} className="text-primary" />
              </NavLink>
            ))}
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2">
            <Link
              to="/factory-video-call"
              className="inline-flex min-h-12 items-center justify-center rounded-md border border-border/70 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground/75"
            >
              Factory call
            </Link>
            <Link
              to="/shortlist"
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-md border border-border/70 px-3 text-[9px] font-semibold uppercase tracking-[0.16em] text-foreground/75"
            >
              <Bookmark size={14} /> Saved {savedCount || ""}
            </Link>
          </div>

          <Link
            to={settings.ctas.quoteHref || "/inquiry?intent=rfq"}
            className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-md bg-gradient-gold px-5 py-4 text-[10px] font-semibold uppercase tracking-[0.2em] text-primary-foreground"
          >
            Request a quote <ChevronRight size={15} />
          </Link>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            {settings.brand.phoneDisplay || "Sialkot, Pakistan · B2B manufacturing"}
          </p>
        </nav>
      )}
    </header>
  );
}
