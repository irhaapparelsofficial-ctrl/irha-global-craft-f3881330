import { Link, useLocation } from "react-router-dom";
import { FileText, Headphones } from "lucide-react";

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

  const openLiveChat = () => window.dispatchEvent(new CustomEvent("irha:open-human-chat"));

  return (
    <div
      className="sticky-mobile-cta fixed bottom-[max(.55rem,env(safe-area-inset-bottom))] left-3 right-3 z-[70] grid grid-cols-2 overflow-hidden rounded-xl border border-primary/40 bg-black/95 shadow-[0_16px_48px_rgba(0,0,0,.58)] backdrop-blur-xl md:hidden"
      aria-label="Primary contact actions"
    >
      <button
        type="button"
        onClick={openLiveChat}
        aria-label="Open live chat with the Irha Apparels team"
        className="flex min-h-[50px] items-center justify-center gap-2 border-r border-white/20 px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-white transition-colors hover:bg-white/5"
      >
        <Headphones size={16} className="text-emerald-300" /> Live chat
      </button>
      <Link
        to={quoteHref}
        aria-label={categorySlug ? "Request a quote for this category" : "Request a quote"}
        className="flex min-h-[50px] items-center justify-center gap-2 bg-gradient-gold px-3 text-[10px] font-semibold uppercase tracking-[0.15em] text-primary-foreground"
      >
        <FileText size={15} /> Request quote
      </Link>
    </div>
  );
}
