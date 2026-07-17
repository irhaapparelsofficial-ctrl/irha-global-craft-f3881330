import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, MessageCircle } from "lucide-react";

const DEFAULT_QUOTE_HREF = "/inquiry?intent=rfq";

function categoryFromPath(pathname: string): string | null {
  const match = pathname.match(/^(?:\/products|\/intl\/[^/]+\/products)\/([^/]+)/);
  const slug = match?.[1] ?? null;
  return slug && slug !== "all" ? slug : null;
}

export default function StickyMobileCTA() {
  const { pathname } = useLocation();
  const categorySlug = categoryFromPath(pathname);
  const [compact, setCompact] = useState(false);
  const [supportOpened, setSupportOpened] = useState(false);
  const lastScrollY = useRef(0);

  const quoteHref = categorySlug
    ? `${DEFAULT_QUOTE_HREF}&category=${encodeURIComponent(categorySlug)}&utm_source=mobile-dock&utm_content=${encodeURIComponent(pathname)}`
    : `${DEFAULT_QUOTE_HREF}&utm_source=mobile-dock`;

  useEffect(() => {
    setSupportOpened(false);
    setCompact(false);
    lastScrollY.current = window.scrollY;
  }, [pathname]);

  useEffect(() => {
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastScrollY.current;
        if (current < 120) setCompact(false);
        else if (delta > 8) setCompact(true);
        else if (delta < -8) setCompact(false);
        lastScrollY.current = current;
        ticking = false;
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const openLiveSupport = () => {
    setSupportOpened(true);
    window.dispatchEvent(new CustomEvent("irha:open-irha-guide"));
  };

  if (pathname.startsWith("/admin") || pathname.startsWith("/inquiry") || supportOpened) return null;

  return (
    <div
      className={`sticky-mobile-cta fixed bottom-[max(.45rem,env(safe-area-inset-bottom))] left-3 right-3 z-[70] grid grid-cols-2 overflow-hidden border border-primary/45 bg-black/95 shadow-[0_16px_44px_rgba(0,0,0,.62)] backdrop-blur-xl transition-all duration-300 md:hidden ${compact ? "rounded-full" : "rounded-2xl"}`}
      aria-label="Primary contact actions"
      data-compact={compact ? "true" : "false"}
    >
      <button
        type="button"
        onClick={openLiveSupport}
        aria-label="Open live support with the AI guide or Irha human team"
        className={`flex items-center justify-center border-r border-white/15 px-3 text-white transition-all hover:bg-white/5 ${compact ? "min-h-11 gap-2" : "min-h-[54px] gap-2.5"}`}
      >
        <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/10 text-emerald-300 ${compact ? "h-7 w-7" : "h-8 w-8"}`}>
          <MessageCircle size={compact ? 14 : 16} aria-hidden="true" />
          <span className="absolute right-0 top-0 h-2 w-2 rounded-full border border-black bg-emerald-400" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[9px] font-semibold uppercase tracking-[0.14em]">Live support</span>
          {!compact && <span className="mt-0.5 block text-[7px] uppercase tracking-[0.1em] text-white/60">AI guide + human team</span>}
        </span>
      </button>
      <Link
        to={quoteHref}
        aria-label={categorySlug ? "Request a quote for this category" : "Request a quote"}
        className={`flex items-center justify-center gap-2 bg-gradient-gold px-3 font-semibold uppercase text-primary-foreground transition-all ${compact ? "min-h-11 text-[9px] tracking-[0.12em]" : "min-h-[54px] text-[9px] tracking-[0.14em]"}`}
      >
        <FileText size={compact ? 13 : 15} aria-hidden="true" /> Request quote
      </Link>
    </div>
  );
}
