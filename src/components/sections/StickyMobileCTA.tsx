import { Link, useLocation } from "react-router-dom";
import { FileText, MessageCircle } from "lucide-react";

function categoryFromPath(pathname: string): string | null {
  const match = pathname.match(/^(?:\/products|\/intl\/[^/]+\/products)\/([^/]+)/);
  const slug = match?.[1] ?? null;
  return slug && slug !== "all" ? slug : null;
}

export default function StickyMobileCTA() {
  const { pathname } = useLocation();
  const categorySlug = categoryFromPath(pathname);
  const quoteHref = categorySlug
    ? `/inquiry?intent=rfq&category=${encodeURIComponent(categorySlug)}&utm_source=mobile-dock&utm_content=${encodeURIComponent(pathname)}`
    : "/inquiry?intent=rfq";

  const openLiveSupport = () => window.dispatchEvent(new CustomEvent("irha:open-irha-guide"));

  return (
    <div
      className="sticky-mobile-cta fixed bottom-[max(.55rem,env(safe-area-inset-bottom))] left-3 right-3 z-[70] grid grid-cols-2 overflow-hidden rounded-2xl border border-primary/45 bg-black/95 shadow-[0_18px_54px_rgba(0,0,0,.68)] backdrop-blur-xl md:hidden"
      aria-label="Primary contact actions"
    >
      <button
        type="button"
        onClick={openLiveSupport}
        aria-label="Open live support with the AI guide or Irha human team"
        className="flex min-h-[58px] items-center justify-center gap-2.5 border-r border-white/15 px-3 text-left text-white transition-colors hover:bg-white/5"
      >
        <span className="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/10 text-emerald-300">
          <MessageCircle size={17} />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-[0.16em]">Live support</span>
          <span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-white/60">AI guide + human team</span>
        </span>
      </button>
      <Link
        to={quoteHref}
        aria-label={categorySlug ? "Request a quote for this category" : "Request a quote"}
        className="flex min-h-[58px] items-center justify-center gap-2 bg-gradient-gold px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-foreground"
      >
        <FileText size={15} /> Request quote
      </Link>
    </div>
  );
}
