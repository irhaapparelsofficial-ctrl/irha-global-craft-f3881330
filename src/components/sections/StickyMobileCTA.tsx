import { Link, useLocation } from "react-router-dom";
import { FileText, Headphones } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";

function categoryFromPath(pathname: string): string | null {
  const match = pathname.match(/^(?:\/products|\/intl\/[^/]+\/products)\/([^/]+)/);
  const slug = match?.[1] ?? null;
  return slug && slug !== "all" ? slug : null;
}

export default function StickyMobileCTA() {
  const { data: settings } = useSiteSettings();
  const { pathname } = useLocation();
  const categorySlug = categoryFromPath(pathname);
  const quoteHref = categorySlug
    ? `/inquiry?intent=rfq&category=${encodeURIComponent(categorySlug)}&utm_source=mobile-dock&utm_content=${encodeURIComponent(pathname)}`
    : settings.ctas.quoteHref;

  const openLiveChat = () => {
    window.dispatchEvent(new CustomEvent("irha:open-human-chat"));
  };

  return (
    <div
      className="md:hidden fixed left-3 right-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-[70] grid grid-cols-[1.35fr_1fr] overflow-hidden rounded-full border border-gold/45 bg-background/95 shadow-elegant backdrop-blur"
      aria-label="Primary contact actions"
    >
      <button
        type="button"
        onClick={openLiveChat}
        aria-label="Open live chat with the Irha Apparels team"
        className="flex min-h-14 items-center justify-center gap-2 bg-gradient-gold px-4 text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-foreground"
      >
        <Headphones size={17} /> Live Chat
      </button>
      <Link
        to={quoteHref}
        aria-label={categorySlug ? "Request a quote for this category" : "Request a quote"}
        className="flex min-h-14 items-center justify-center gap-2 border-l border-border/60 px-4 text-[10px] font-semibold uppercase tracking-[0.16em] text-foreground"
      >
        <FileText size={15} className="text-gold" /> Quote
      </Link>
    </div>
  );
}
