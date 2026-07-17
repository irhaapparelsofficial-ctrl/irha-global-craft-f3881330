import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { FileText, MessageCircle } from "lucide-react";

function categoryFromPath(pathname: string): string | null {
  const match = pathname.match(/^(?:\/products|\/intl\/[^/]+\/products)\/([^/]+)/);
  const slug = match?.[1] ?? null;
  return slug && slug !== "all" ? slug : null;
}

function isProductDetailPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] !== "products" || segments[1] === "all") return false;
  return segments.length >= 5 || (segments.length === 3 && segments[2] !== "all-products");
}

export default function StickyMobileCTA() {
  const { pathname } = useLocation();
  const categorySlug = categoryFromPath(pathname);
  const productDetail = isProductDetailPath(pathname);
  const quoteHref = categorySlug
    ? `/inquiry?intent=rfq&category=${encodeURIComponent(categorySlug)}&utm_source=mobile-dock&utm_content=${encodeURIComponent(pathname)}`
    : "/inquiry?intent=rfq";
  const [collapsed, setCollapsed] = useState(productDetail);
  const [supportOpened, setSupportOpened] = useState(false);
  const lastScrollY = useRef(0);

  useEffect(() => {
    setCollapsed(productDetail);
    setSupportOpened(false);
    lastScrollY.current = window.scrollY;
  }, [pathname, productDetail]);

  useEffect(() => {
    let frame = 0;
    const onScroll = () => {
      if (frame) return;
      frame = window.requestAnimationFrame(() => {
        const current = window.scrollY;
        const delta = current - lastScrollY.current;
        if (productDetail) setCollapsed(true);
        else if (current < 120) setCollapsed(false);
        else if (delta > 10) setCollapsed(true);
        else if (delta < -10) setCollapsed(false);
        lastScrollY.current = current;
        frame = 0;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, [productDetail]);

  const openLiveSupport = () => {
    setSupportOpened(true);
    window.dispatchEvent(new CustomEvent("irha:open-irha-guide"));
  };

  if (pathname.startsWith("/admin") || pathname.startsWith("/inquiry") || supportOpened) return null;

  return (
    <div
      className={`sticky-mobile-cta fixed bottom-[max(.55rem,env(safe-area-inset-bottom))] right-3 z-[70] grid grid-cols-2 overflow-hidden rounded-2xl border border-primary/45 bg-black/95 shadow-[0_18px_54px_rgba(0,0,0,.68)] backdrop-blur-xl transition-all duration-300 md:hidden ${
        collapsed ? "w-[112px]" : "left-3"
      }`}
      aria-label="Primary contact actions"
      data-collapsed={collapsed ? "true" : "false"}
      data-product-detail={productDetail ? "true" : "false"}
    >
      <button
        type="button"
        onClick={openLiveSupport}
        aria-label="Open live support with the AI guide or Irha human team"
        className={`flex items-center justify-center border-r border-white/15 text-white transition-all hover:bg-white/5 ${
          collapsed ? "min-h-[48px] px-2" : "min-h-[58px] gap-2.5 px-3 text-left"
        }`}
      >
        <span className={`relative inline-flex shrink-0 items-center justify-center rounded-full border border-emerald-300/45 bg-emerald-400/10 text-emerald-300 ${collapsed ? "h-8 w-8" : "h-9 w-9"}`}>
          <MessageCircle size={collapsed ? 15 : 17} aria-hidden="true" />
          <span className="absolute right-0 top-0 h-2.5 w-2.5 rounded-full border-2 border-black bg-emerald-400" aria-hidden="true" />
        </span>
        {!collapsed && (
          <span className="min-w-0">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.16em]">Live support</span>
            <span className="mt-0.5 block text-[8px] uppercase tracking-[0.12em] text-white/60">AI guide + human team</span>
          </span>
        )}
      </button>
      <Link
        to={quoteHref}
        aria-label={categorySlug ? "Request a quote for this category" : "Request a quote"}
        className={`flex items-center justify-center bg-gradient-gold font-semibold uppercase text-primary-foreground transition-all ${
          collapsed ? "min-h-[48px] px-2" : "min-h-[58px] gap-2 px-3 text-[10px] tracking-[0.15em]"
        }`}
      >
        <FileText size={collapsed ? 16 : 15} aria-hidden="true" />
        {!collapsed && "Request quote"}
      </Link>
    </div>
  );
}
