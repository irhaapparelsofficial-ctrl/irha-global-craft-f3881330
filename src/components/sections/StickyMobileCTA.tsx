import { Link, useLocation } from "react-router-dom";
import { MessageCircle, Send } from "lucide-react";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { settingsWhatsappLink } from "@/lib/siteSettings";

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
    ? `/inquiry?intent=rfq&category=${encodeURIComponent(categorySlug)}&utm_source=mobile-sticky&utm_content=${encodeURIComponent(pathname)}`
    : settings.ctas.quoteHref;

  return (
    <div
      className="md:hidden fixed bottom-0 inset-x-0 z-30 grid grid-cols-2 border-t border-border/60 bg-background/95 backdrop-blur"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <Link
        to={quoteHref}
        aria-label={categorySlug ? "Request a quote for this category" : "Request a quote"}
        className="flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium min-h-11"
      >
        <Send size={14} /> {settings.ctas.quoteLabel}
      </Link>
      <a
        href={settingsWhatsappLink(settings)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Chat on WhatsApp"
        className="flex items-center justify-center gap-2 bg-card border-l border-border/60 py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium text-foreground min-h-11"
      >
        <MessageCircle size={14} className="text-[#25D366]" /> {settings.ctas.whatsappLabel}
      </a>
    </div>
  );
}
