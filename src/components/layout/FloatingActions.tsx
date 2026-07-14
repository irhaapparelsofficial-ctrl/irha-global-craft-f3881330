import { FileText, MessageCircle } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { settingsWhatsappLink } from "@/lib/siteSettings";

function categoryFromPath(pathname: string): string | null {
  const match = pathname.match(/^(?:\/products|\/intl\/[^/]+\/products)\/([^/]+)/);
  const slug = match?.[1] ?? null;
  return slug && slug !== "all" ? slug : null;
}

export default function FloatingActions() {
  const { data: settings } = useSiteSettings();
  const { pathname } = useLocation();
  const categorySlug = categoryFromPath(pathname);
  const quoteHref = categorySlug
    ? `/inquiry?intent=rfq&category=${encodeURIComponent(categorySlug)}&utm_source=category-floating&utm_content=${encodeURIComponent(pathname)}`
    : settings.ctas.quoteHref;

  return (
    <>
      {categorySlug && (
        <Link
          to={quoteHref}
          aria-label="Request a structured quote for this product category"
          data-track="category-quote-floating"
          className="fixed bottom-20 right-6 z-50 hidden min-h-11 items-center gap-2 rounded-full border border-primary/30 bg-background/95 px-5 text-[10px] font-semibold uppercase tracking-[0.18em] text-primary shadow-elegant backdrop-blur transition-transform hover:scale-[1.02] hover:border-primary md:inline-flex"
        >
          <FileText size={15} /> Request quote
        </Link>
      )}
      <a
        href={settingsWhatsappLink(settings)}
        target="_blank"
        rel="noreferrer noopener"
        aria-label="Discuss a B2B manufacturing requirement on WhatsApp"
        title="Discuss your requirement on WhatsApp"
        data-track="whatsapp-floating"
        className="fixed bottom-6 right-6 z-50 hidden h-12 w-12 items-center justify-center rounded-full border border-white/20 bg-[#25D366] text-white shadow-elegant transition-transform hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background md:inline-flex"
      >
        <MessageCircle size={20} />
      </a>
    </>
  );
}
