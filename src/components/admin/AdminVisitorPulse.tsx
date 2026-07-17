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
  return `${countryFlag(visitor.country_code)} ${location || "Country unavailable"} · ${visitor.device_type}`;
}

export default function AdminVisitorPulse() {
  const [authorized, setAuthorized] = useState(false);
  const [liveVisitors, setLiveVisitors] = useState<VisitorRow[]>([]);
  const initialized = useRef(false);
  const seenSessions = useRef(new Set<string>());

  const load = useCallback(async (announce = false) => {
    const path = window.location.pathname;
    if (!path.startsWith("/admin") || path.startsWith("/admin/visitors") || path.startsWith("/admin/live-chat")) {
      setAuthorized(false);
      return;
    }

    const { data: sessionData } = await supabase.auth.getSession();
    const userId = sessionData.session?.user.id;
    if (!userId) {
      setAuthorized(false);
      return;
    }

    const { data: role } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();
    if (role?.role !== "admin") {
      setAuthorized(false);
      return;
    }

    setAuthorized(true);
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
          toast({ title: "New website visitor", description: `${visitorLabel(visitor)} · ${visitor.entry_path}` });
        });
    }

    initialized.current = true;
    seenSessions.current = nextSessions;
    setLiveVisitors(rows);
  }, []);

  useEffect(() => {
    void load(false);
    const interval = window.setInterval(() => void load(true), 20_000);
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

  if (!authorized || liveVisitors.length === 0) return null;
  const latest = liveVisitors[0];

  return (
    <a
      href={`/admin/visitors?visitor=${encodeURIComponent(latest.visitor_session_id)}`}
      className="fixed bottom-[calc(5.35rem+env(safe-area-inset-bottom))] left-3 z-[64] inline-flex min-h-11 max-w-[calc(100vw-6rem)] items-center gap-2 rounded-full border border-sky-400/35 bg-[#07111f]/96 px-3 py-2 text-white shadow-xl backdrop-blur-xl transition hover:border-gold/60 md:bottom-5 md:left-5"
      aria-label={`Open live visitors dashboard — ${liveVisitors.length} online`}
    >
      <span className="relative inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-400/12 text-sky-300">
        <Globe2 size={16} />
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-emerald-400 px-1 text-[8px] font-bold text-[#07111f]">{liveVisitors.length > 99 ? "99+" : liveVisitors.length}</span>
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-1 text-[8px] font-semibold uppercase tracking-[0.14em] text-emerald-300"><Radio size={9} className="animate-pulse" /> Live now</span>
        <span className="block truncate text-xs font-medium">{visitorLabel(latest)}</span>
      </span>
    </a>
  );
}
