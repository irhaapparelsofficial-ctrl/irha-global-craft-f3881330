import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { X } from "lucide-react";
import { activeOccasion, type Occasion } from "@/lib/occasions";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const THEME: Record<NonNullable<Occasion["theme"]>, string> = {
  gold: "bg-[#0A0A0A] text-[#F5F1EA] border-b border-[#C9A961]/40",
  ivory: "bg-[#F5F1EA] text-[#0A0A0A] border-b border-[#0A0A0A]/10",
  emerald: "bg-[#0B3D2E] text-[#F5F1EA] border-b border-[#C9A961]/40",
  crimson: "bg-[#3B0A0A] text-[#F5F1EA] border-b border-[#C9A961]/40",
};

const EYEBROW: Record<NonNullable<Occasion["theme"]>, string> = {
  gold: "text-[#C9A961]",
  ivory: "text-[#0A0A0A]/60",
  emerald: "text-[#C9A961]",
  crimson: "text-[#C9A961]",
};

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

export default function OccasionBanner() {
  const { data: settings } = useSiteSettings();
  const [dismissedId, setDismissedId] = useState<string | null>(null);

  const selected = useMemo(() => {
    const mode = settings.announcement.mode;
    if (mode === "off") return null;
    if (mode === "calendar") {
      const item = activeOccasion();
      return item ? { occasion: item, dismissible: true } : null;
    }
    const today = todayKey();
    const startOk = !settings.announcement.startDate || today >= settings.announcement.startDate;
    const endOk = !settings.announcement.endDate || today <= settings.announcement.endDate;
    if (!startOk || !endOk) return null;
    const custom: Occasion = {
      id: settings.announcement.id,
      label: settings.announcement.label,
      message: settings.announcement.message,
      cta: settings.announcement.ctaLabel ? { text: settings.announcement.ctaLabel, href: settings.announcement.ctaHref } : undefined,
      start: settings.announcement.startDate || today,
      end: settings.announcement.endDate || today,
      theme: settings.announcement.theme,
    };
    return { occasion: custom, dismissible: settings.announcement.dismissible };
  }, [settings]);

  useEffect(() => {
    const id = selected?.occasion.id;
    if (!id) return;
    try {
      if (sessionStorage.getItem(`irha:occasion-dismissed:${id}`) === "1") setDismissedId(id);
    } catch { /* sessionStorage unavailable */ }
  }, [selected?.occasion.id]);

  if (!selected || dismissedId === selected.occasion.id) return null;
  const occasion = selected.occasion;
  const theme = occasion.theme ?? "gold";

  const handleDismiss = () => {
    setDismissedId(occasion.id);
    try { sessionStorage.setItem(`irha:occasion-dismissed:${occasion.id}`, "1"); } catch { /* ignore */ }
  };

  return (
    <div role="region" aria-label={occasion.label} className={`relative w-full ${THEME[theme]}`}>
      <div className={`container-luxe py-2.5 flex items-center justify-center gap-x-4 gap-y-1 text-center flex-wrap ${selected.dismissible ? "pr-10" : ""}`}>
        <span className={`text-[10px] uppercase tracking-[0.28em] font-medium ${EYEBROW[theme]}`}>{occasion.label}</span>
        <span className="hidden sm:inline opacity-30">·</span>
        <span className="text-[12px] sm:text-[13px] leading-tight">{occasion.message}</span>
        {occasion.cta && <Link to={occasion.cta.href} className="text-[11px] uppercase tracking-[0.22em] underline underline-offset-4 decoration-current/40 hover:decoration-current transition-colors">{occasion.cta.text} →</Link>}
      </div>
      {selected.dismissible && <button type="button" onClick={handleDismiss} aria-label="Dismiss announcement" className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 opacity-60 hover:opacity-100 transition-opacity"><X size={14} /></button>}
    </div>
  );
}
