import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import {
  ArrowLeft,
  CheckCheck,
  Clock3,
  ExternalLink,
  Globe2,
  Laptop,
  Loader2,
  MapPin,
  MessageSquareText,
  Monitor,
  Radio,
  RefreshCw,
  Search,
  Smartphone,
  Tablet,
  Users,
  XCircle,
} from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

const db = supabase as any;
const LIVE_WINDOW_MS = 3 * 60 * 1000;

type SiteVisitor = {
  visitor_session_id: string;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  entry_path: string;
  current_path: string;
  referrer_host: string | null;
  device_type: "mobile" | "tablet" | "desktop" | "unknown";
  viewport_width: number | null;
  page_view_count: number;
  first_seen_at: string;
  last_seen_at: string;
  chat_opened_at: string | null;
  alerted_at: string | null;
};

type Filter = "live" | "today" | "all" | "chat";

function countryFlag(code: string | null) {
  if (!code || !/^[A-Z]{2}$/.test(code)) return "🌐";
  return String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function isLive(visitor: SiteVisitor) {
  return Date.now() - new Date(visitor.last_seen_at).getTime() <= LIVE_WINDOW_MS;
}

function isToday(value: string) {
  const date = new Date(value);
  const today = new Date();
  return date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
}

function locationLabel(visitor: SiteVisitor) {
  const place = Array.from(new Set([
    visitor.city,
    visitor.region,
    visitor.country || visitor.country_code,
  ].filter((value): value is string => Boolean(value))));
  return place.length > 0 ? place.join(", ") : "Country unavailable";
}

function timeAgo(value: string) {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 45) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  return new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function deviceIcon(type: SiteVisitor["device_type"]) {
  if (type === "mobile") return <Smartphone size={14} />;
  if (type === "tablet") return <Tablet size={14} />;
  if (type === "desktop") return <Monitor size={14} />;
  return <Laptop size={14} />;
}

function safePublicPath(path: string) {
  return path.startsWith("/") && !path.startsWith("/admin") && !path.startsWith("/auth") ? path : "/";
}

export default function AdminVisitors() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const requestedVisitor = useMemo(
    () => typeof window === "undefined" ? null : new URLSearchParams(window.location.search).get("visitor"),
    [],
  );
  const [visitors, setVisitors] = useState<SiteVisitor[]>([]);
  const [filter, setFilter] = useState<Filter>("live");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [marking, setMarking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, setClock] = useState(0);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setRefreshing(true);
    try {
      const { data, error: loadError } = await db
        .from("site_visitors")
        .select("visitor_session_id,country_code,country,region,city,timezone,language,entry_path,current_path,referrer_host,device_type,viewport_width,page_view_count,first_seen_at,last_seen_at,chat_opened_at,alerted_at")
        .order("last_seen_at", { ascending: false })
        .limit(500);
      if (loadError) throw loadError;
      setVisitors((data ?? []) as SiteVisitor[]);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Visitor activity could not load.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!user || !isAdmin) return;
    void load(false);
    const channel = supabase
      .channel("admin-site-visitors")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_visitors" }, () => void load(true))
      .subscribe();
    const refreshTimer = window.setInterval(() => {
      setClock((current) => current + 1);
      if (document.visibilityState === "visible") void load(true);
    }, 30_000);
    return () => {
      window.clearInterval(refreshTimer);
      void supabase.removeChannel(channel);
    };
  }, [isAdmin, load, user]);

  const markAllSeen = useCallback(async () => {
    setMarking(true);
    try {
      const now = new Date().toISOString();
      const { error: updateError } = await db
        .from("crm_notifications")
        .update({ status: "read", read_at: now, updated_at: now })
        .eq("status", "unread")
        .contains("metadata", { channel: "site_visitor" });
      if (updateError) throw updateError;
      setError(null);
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Visitor alerts could not be marked as seen.");
    } finally {
      setMarking(false);
    }
  }, []);

  const stats = useMemo(() => {
    const today = visitors.filter((visitor) => isToday(visitor.first_seen_at));
    return {
      live: visitors.filter(isLive).length,
      today: today.length,
      countries: new Set(today.map((visitor) => visitor.country_code || visitor.country).filter(Boolean)).size,
      chats: today.filter((visitor) => visitor.chat_opened_at).length,
    };
  }, [visitors]);

  const countries = useMemo(() => {
    const counts = new Map<string, { code: string | null; name: string; count: number }>();
    visitors.filter((visitor) => isToday(visitor.first_seen_at)).forEach((visitor) => {
      const name = visitor.country || visitor.country_code || "Unknown";
      const key = visitor.country_code || name;
      const current = counts.get(key);
      counts.set(key, { code: visitor.country_code, name, count: (current?.count || 0) + 1 });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 8);
  }, [visitors]);

  const filteredVisitors = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const rows = visitors.filter((visitor) => {
      if (filter === "live" && !isLive(visitor)) return false;
      if (filter === "today" && !isToday(visitor.first_seen_at)) return false;
      if (filter === "chat" && !visitor.chat_opened_at) return false;
      if (!needle) return true;
      return [
        visitor.country,
        visitor.country_code,
        visitor.region,
        visitor.city,
        visitor.current_path,
        visitor.entry_path,
        visitor.referrer_host,
        visitor.device_type,
      ].filter(Boolean).join(" ").toLowerCase().includes(needle);
    });

    if (!requestedVisitor) return rows;
    return [...rows].sort((a, b) => {
      if (a.visitor_session_id === requestedVisitor) return -1;
      if (b.visitor_session_id === requestedVisitor) return 1;
      return 0;
    });
  }, [filter, query, requestedVisitor, visitors]);

  if (authLoading) {
    return <div className="grid min-h-screen place-items-center bg-background text-muted-foreground"><Loader2 className="animate-spin" /></div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background p-6 text-foreground">
        <div className="max-w-md rounded-2xl border border-destructive/40 bg-card p-8 text-center">
          <XCircle className="mx-auto text-destructive" />
          <h1 className="mt-4 font-display text-2xl">Admin access required</h1>
          <a href="/admin" className="mt-6 inline-flex min-h-11 items-center rounded-xl border border-border/60 px-4 text-xs uppercase tracking-[0.16em]">Back to admin</a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#07111f] pb-[calc(6.5rem+env(safe-area-inset-bottom))] text-white md:pb-8">
      <SEO title="Live Visitors — Irha Admin" description="Private real-time website visitor country dashboard." path="/admin/visitors" noindex />
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111f]/96 px-3 py-2.5 backdrop-blur-xl sm:px-5">
        <div className="mx-auto flex max-w-[1500px] items-center gap-2.5">
          <a href="/admin" className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/65 transition hover:border-gold/70 hover:text-gold" aria-label="Back to admin"><ArrowLeft size={18} /></a>
          <div className="min-w-0 flex-1">
            <p className="text-[8px] font-semibold uppercase tracking-[0.18em] text-gold">Owner intelligence</p>
            <h1 className="truncate font-display text-lg">Website Visitors</h1>
          </div>
          <a href="/admin/live-chat" className="inline-flex h-11 items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 text-[9px] font-semibold uppercase tracking-[0.12em] text-emerald-300"><MessageSquareText size={15} /><span className="hidden xs:inline">Chat</span></a>
          <button type="button" onClick={() => void load(false)} disabled={refreshing} className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 text-white/65 hover:border-gold/70 hover:text-gold disabled:opacity-50" aria-label="Refresh visitors"><RefreshCw size={17} className={refreshing ? "animate-spin" : ""} /></button>
        </div>
      </header>

      <main className="mx-auto max-w-[1500px] space-y-3 p-3 sm:p-5">
        {error && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            <span className="break-words">{error}</span>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss error"><XCircle size={17} /></button>
          </div>
        )}

        <section className="grid grid-cols-2 gap-2.5 xl:grid-cols-4">
          {[
            { label: "Online", value: stats.live, icon: Radio, detail: "Last 3 min", tone: "text-emerald-300 bg-emerald-400/10 border-emerald-400/25" },
            { label: "Today", value: stats.today, icon: Users, detail: "Unique sessions", tone: "text-sky-300 bg-sky-400/10 border-sky-400/25" },
            { label: "Countries", value: stats.countries, icon: Globe2, detail: "Today", tone: "text-gold bg-gold/10 border-gold/25" },
            { label: "Chat opens", value: stats.chats, icon: MessageSquareText, detail: "Today", tone: "text-violet-300 bg-violet-400/10 border-violet-400/25" },
          ].map(({ label, value, icon: Icon, detail, tone }) => (
            <article key={label} className="rounded-2xl border border-white/10 bg-white/[0.035] p-3.5 shadow-lg shadow-black/10 sm:p-4">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[9px] font-semibold uppercase tracking-[0.13em] text-white/45">{label}</p>
                  <p className="mt-1 font-display text-3xl sm:text-4xl">{value.toLocaleString()}</p>
                  <p className="mt-0.5 text-[10px] text-white/40 sm:text-xs">{detail}</p>
                </div>
                <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border sm:h-11 sm:w-11 ${tone}`}><Icon size={18} /></span>
              </div>
            </article>
          ))}
        </section>

        <section className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035]">
          <div className="space-y-2.5 border-b border-white/10 p-3 sm:p-4">
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {(["live", "today", "all", "chat"] as Filter[]).map((option) => (
                <button key={option} type="button" onClick={() => setFilter(option)} className={`min-h-10 shrink-0 rounded-xl border px-3 text-[9px] font-semibold uppercase tracking-[0.12em] transition ${filter === option ? "border-gold bg-gold text-[#07111f]" : "border-white/10 text-white/55 hover:border-gold/50 hover:text-gold"}`}>
                  {option === "chat" ? "Chat opened" : option}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <label className="relative min-w-0 flex-1">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/35" />
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search country, page or source" className="min-h-11 w-full rounded-xl border border-white/10 bg-black/20 pl-9 pr-3 text-sm outline-none placeholder:text-white/30 focus:border-gold/60" />
              </label>
              <button type="button" onClick={markAllSeen} disabled={marking} className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 text-white/50 hover:border-emerald-400/40 hover:text-emerald-300 disabled:opacity-50" aria-label="Mark visitor alerts seen">
                {marking ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={16} />}
              </button>
            </div>
          </div>

          {loading ? (
            <div className="grid min-h-56 place-items-center text-white/45"><Loader2 className="animate-spin" /></div>
          ) : filteredVisitors.length === 0 ? (
            <div className="grid min-h-56 place-items-center p-8 text-center">
              <div><Globe2 className="mx-auto text-white/25" size={32} /><p className="mt-3 font-display text-xl">No visitors in this view</p><p className="mt-1 text-sm text-white/45">New sessions will appear automatically.</p></div>
            </div>
          ) : (
            <div className="divide-y divide-white/8">
              {filteredVisitors.map((visitor) => {
                const live = isLive(visitor);
                const targeted = visitor.visitor_session_id === requestedVisitor;
                return (
                  <article key={visitor.visitor_session_id} className={`p-3.5 transition sm:p-4 ${targeted ? "bg-gold/10 ring-1 ring-inset ring-gold/45" : "hover:bg-white/[0.035]"}`}>
                    <div className="flex items-start gap-3">
                      <span className="relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-black/25 text-xl">
                        {countryFlag(visitor.country_code)}
                        {live && <span className="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full border-2 border-[#07111f] bg-emerald-400" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="truncate text-sm font-semibold sm:text-base">{visitor.country || visitor.country_code || "Unknown country"}</h2>
                            <p className="mt-0.5 flex items-center gap-1.5 truncate text-[11px] text-white/48"><MapPin size={11} /> {locationLabel(visitor)}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-bold uppercase tracking-[0.1em] ${live ? "bg-emerald-400/12 text-emerald-300" : "bg-white/5 text-white/40"}`}>{live ? "Live" : timeAgo(visitor.last_seen_at)}</span>
                        </div>

                        <div className="mt-2 rounded-xl border border-white/8 bg-black/15 px-3 py-2">
                          <p className="text-[8px] font-semibold uppercase tracking-[0.12em] text-white/35">Current page</p>
                          <a href={safePublicPath(visitor.current_path)} target="_blank" rel="noopener noreferrer" className="mt-0.5 block truncate text-xs font-medium text-gold hover:underline">{visitor.current_path}</a>
                        </div>

                        <div className="mt-2 flex flex-wrap gap-1.5 text-[9px] text-white/50">
                          <span className="inline-flex items-center gap-1 rounded-lg border border-white/8 px-2 py-1.5">{deviceIcon(visitor.device_type)} <span className="capitalize">{visitor.device_type}</span></span>
                          <span className="inline-flex max-w-full items-center gap-1 rounded-lg border border-white/8 px-2 py-1.5"><Globe2 size={12} /><span className="truncate">{visitor.referrer_host || "Direct"}</span></span>
                          <span className="inline-flex items-center gap-1 rounded-lg border border-white/8 px-2 py-1.5"><Clock3 size={12} />{visitor.timezone || "Unknown TZ"}</span>
                          <span className="rounded-lg border border-white/8 px-2 py-1.5">{visitor.page_view_count} views</span>
                          {visitor.chat_opened_at && <a href="/admin/live-chat" className="inline-flex items-center gap-1 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-2 py-1.5 font-semibold text-emerald-300"><MessageSquareText size={12} /> Open chat inbox</a>}
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <section className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,.55fr)]">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
            <div className="flex items-center justify-between gap-3">
              <div><p className="text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">Today by country</p><h2 className="mt-1 font-display text-lg">Buyer geography</h2></div>
              <Globe2 className="text-gold" size={20} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {countries.length === 0 ? <p className="text-sm text-white/40">No country data yet.</p> : countries.map((country) => (
                <div key={`${country.code}-${country.name}`} className="flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-2.5">
                  <span className="text-lg">{countryFlag(country.code)}</span>
                  <span className="min-w-0 flex-1 truncate text-sm">{country.name}</span>
                  <span className="rounded-full bg-gold/10 px-2 py-1 text-[9px] font-bold text-gold">{country.count}</span>
                </div>
              ))}
            </div>
          </div>

          <details className="rounded-2xl border border-gold/20 bg-gradient-to-br from-gold/10 to-transparent p-4">
            <summary className="cursor-pointer text-[9px] font-semibold uppercase tracking-[0.14em] text-gold">How location works</summary>
            <p className="mt-3 text-xs leading-relaxed text-white/60">Country is resolved from the visitor network connection at the edge. Raw IP addresses are not stored. VPN or proxy use can change the reported country.</p>
            <a href="/" target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold"><ExternalLink size={12} /> Open website</a>
          </details>
        </section>
      </main>
    </div>
  );
}
