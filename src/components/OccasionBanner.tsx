import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { activeOccasion, type Occasion } from "@/lib/occasions";
import { useGlobalSettings } from "@/hooks/useSiteConfiguration";
import type { AnnouncementTheme } from "@/lib/siteConfiguration";

const THEME: Record<AnnouncementTheme, string> = {
  gold: "bg-[#0A0A0A] text-[#F5F1EA] border-b border-[#C9A961]/40",
  ivory: "bg-[#F5F1EA] text-[#0A0A0A] border-b border-[#0A0A0A]/10",
  emerald: "bg-[#0B3D2E] text-[#F5F1EA] border-b border-[#C9A961]/40",
  crimson: "bg-[#3B0A0A] text-[#F5F1EA] border-b border-[#C9A961]/40",
};

const EYEBROW: Record<AnnouncementTheme, string> = {
  gold: "text-[#C9A961]",
  ivory: "text-[#0A0A0A]/60",
  emerald: "text-[#C9A961]",
  crimson: "text-[#C9A961]",
};

type BannerContent = {
  id: string;
  label: string;
  message: string;
  cta: { text: string; href: string } | null;
  theme: AnnouncementTheme;
  dismissible: boolean;
};

function occasionToBanner(occasion: Occasion | null): BannerContent | null {
  if (!occasion) return null;
  return {
    id: occasion.id,
    label: occasion.label,
    message: occasion.message,
    cta: occasion.cta ? { text: occasion.cta.text, href: occasion.cta.href } : null,
    theme: occasion.theme ?? "gold",
    dismissible: true,
  };
}

export default function OccasionBanner() {
  const { data: settings } = useGlobalSettings();
  const [fallbackOccasion, setFallbackOccasion] = useState<Occasion | null>(null);
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  useEffect(() => {
    setFallbackOccasion(activeOccasion());
  }, []);

  const banner = useMemo<BannerContent | null>(() => {
    const announcement = settings.announcement;
    if (announcement.enabled && announcement.message.trim()) {
      return {
        id: announcement.id,
        label: announcement.label,
        message: announcement.message,
        cta: announcement.ctaText && announcement.ctaHref
          ? { text: announcement.ctaText, href: announcement.ctaHref }
          : null,
        theme: announcement.theme,
        dismissible: announcement.dismissible,
      };
    }
    return occasionToBanner(fallbackOccasion);
  }, [fallbackOccasion, settings.announcement]);

  useEffect(() => {
    if (!banner) return;
    try {
      if (sessionStorage.getItem(`irha:announcement-dismissed:${banner.id}`) === "1") {
        setDismissedId(banner.id);
      } else {
        setDismissedId(null);
      }
    } catch {
      setDismissedId(null);
    }
  }, [banner?.id]);

  if (!banner || dismissedId === banner.id) return null;

  const handleDismiss = () => {
    if (!banner.dismissible) return;
    setDismissedId(banner.id);
    try { sessionStorage.setItem(`irha:announcement-dismissed:${banner.id}`, "1"); } catch { /* unavailable */ }
  };

  return (
    <div role="region" aria-label={banner.label} className={`relative w-full ${THEME[banner.theme]}`}>
      <div className={`container-luxe py-2.5 flex items-center justify-center gap-x-4 gap-y-1 text-center flex-wrap ${banner.dismissible ? "pr-10" : ""}`}>
        <span className={`text-[10px] uppercase tracking-[0.28em] font-medium ${EYEBROW[banner.theme]}`}>
          {banner.label}
        </span>
        <span className="hidden sm:inline opacity-30">·</span>
        <span className="text-[12px] sm:text-[13px] leading-tight">{banner.message}</span>
        {banner.cta && (
          <Link
            to={banner.cta.href}
            className="text-[11px] uppercase tracking-[0.22em] underline underline-offset-4 decoration-current/40 hover:decoration-current transition-colors"
          >
            {banner.cta.text} →
          </Link>
        )}
      </div>
      {banner.dismissible && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss announcement"
          className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 opacity-60 hover:opacity-100 transition-opacity"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
