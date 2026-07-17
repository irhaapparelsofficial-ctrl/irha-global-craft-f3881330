import { useCallback, useEffect, useRef, useState } from "react";
import { Globe2, Radio } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
const LIVE_WINDOW_MS = 3 * 60 * 1000;

type VisitorRow = {
  visitor_session_id: string;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  entry_path: string;
  current_path: string;
  device_type: string;
  first_seen_at: string;
  last_seen_at: string;
};

function countryFlag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function visitorLabel(visitor: VisitorRow) {
  const location = [visitor.city, visitor.region, visitor.country || visitor.country_code].filter(Boolean).join(", ");
  return `${countryFlag(visitor.country_code)} ${location || "Country unavailable"} · ${visitor.device_type} · ${visitor.entry_path}`;
}

export default function AdminVisitorPulse() {
  const [visible, setVisible] = useState(false);
  const [liveVisitors, setLiveVisitors] = useState<VisitorRow[]>([]);
  const initialized = useRef(false);
  const seenSessions = useRef(new Set<string>());

  const load = useCallback(async (announce = false) => {
    if (!window.location.pathname.startsWith("/admin") || window.location.pathname.startsWith("/admin/visitors")) {
      setVisible(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setVisible(false);
      return;
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role?.role !== "admin") {
      setVisible(false);
      return;
    }

    setVisible(true);
    const cutoff = new Date(Date.now() - LIVE_WINDOW_MS).toISOString();
    const { data, error } = await db
      .from("site_visitors")
      .select("visitor_session_id,country_code,country,region,city,entry_path,current_path,device_type,first_seen_at,last_seen_at")
      .gte("last_seen_at", cutoff)
      .order("last_seen_at", { ascending: false })
      .limit(50);
    if (error) return;

    const rows = (data ?? []) as VisitorRow[];
    const nextSessions = new Set(rows.map((visitor) => visitor.visitor_session_id));
    if (initialized.current && announce) {
      rows
        .filter((visitor) => !seenSessions.current.has(visitor.visitor_session_id))
        .sort((a, b) => new Date(a.first_seen_at).getTime() - new Date(b.first_seen_at).getTime())
        .forEach((visitor) => {
          const body = visitorLabel(visitor);
          toast({ title: "New website visitor", description: body });
          if ("Notification" in window && Notification.permission === "granted") {
            const notification = new Notification("New Irha website visitor", {
              body,
              icon: "/icon-512x512.png",
              tag: `site-visitor:${visitor.visitor_session_id}`,
            });
            notification.onclick = () => {
              window.focus();
              window.location.assign(`/admin/visitors?visitor=${encodeURIComponent(visitor.visitor_session_id)}`);
              notification.close();
            };
          }
        });
    }

    initialized.current = true;
    seenSessions.current = nextSessions;
    setLiveVisitors(rows);
  }, []);

  useEffect(() => {
    void load(false);
    const interval = window.setInterval(() => void load(true), 15_000);
    const realtime = supabase
      .channel("admin-visitor-pulse")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_visitors" }, () => void load(true))
      .subscribe();
    const authListener = supabase.auth.onAuthStateChange(() => void load(false));
    return () => {
      window.clearInterval(interval);
      authListener.data.subscription.unsubscribe();
      void supabase.removeChannel(realtime);
    };
  }, [load]);

  if (!visible) return null;
  const latest = liveVisitors[0] ?? null;

  return (
    <a
      href={latest ? `/admin/visitors?visitor=${encodeURIComponent(latest.visitor_session_id)}` : "/admin/visitors"}
      className="fixed z-[67] left-3 bottom-[calc(8.75rem+env(safe-area-inset-bottom))] w-[min(21rem,calc(100vw-1.5rem))] rounded-2xl border border-sky-400/30 bg-[#07111f]/95 p-3 text-white shadow-2xl shadow-black/30 backdrop-blur-xl transition hover:border-gold/60 sm:left-5 md:bottom-[5rem]"
      aria-label={`Open live visitors dashboard — ${liveVisitors.length} online`}
    >
      <div className="flex items-center gap-3">
        <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-sky-400/25 bg-sky-400/10 text-sky-300">
          <Globe2 size={20} />
          {liveVisitors.length > 0 && <span className="absolute -right-1 -top-1 inline-flex min-h-5 min-w-5 items-center justify-center rounded-full bg-emerald-400 px-1 text-[9px] font-bold text-[#07111f]">{liveVisitors.length > 99 ? "99+" : liveVisitors.length}</span>}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.16em] text-emerald-300"><Radio size={11} className={liveVisitors.length > 0 ? "animate-pulse" : ""} /> Live visitor intelligence</span>
          <span className="mt-1 block truncate text-sm font-semibold">{latest ? visitorLabel(latest) : "No active visitors right now"}</span>
          <span className="mt-1 block text-[10px] text-white/45">Tap for country, source, page and device details</span>
        </span>
      </div>
    </a>
  );
}
