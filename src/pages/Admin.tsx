import { useCallback, useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEO from "@/components/SEO";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  ExternalLink,
  LogOut,
  MapPin,
  MessageSquare,
  RefreshCw,
  Shield,
} from "lucide-react";

import { AdminShell, type AdminView } from "@/components/admin/AdminShell";
import WebsiteOperationsDashboard from "@/components/admin/WebsiteOperationsDashboard";
import WebsiteInquiriesPanel from "@/components/admin/WebsiteInquiriesPanel";
import ProductsPanel from "@/components/admin/ProductsPanel";
import MediaLibraryPanel from "@/components/admin/MediaLibraryPanel";
import CategoriesPanel from "@/components/admin/CategoriesPanel";
import ContentCmsPanel from "@/components/admin/ContentCmsPanel";
import MultilingualSeoPanel from "@/components/admin/MultilingualSeoPanel";
import GoogleSearchCenter from "@/components/admin/GoogleSearchCenter";
import CatalogPanel from "@/components/admin/CatalogPanel";
import ReleaseHealthPanel from "@/components/admin/ReleaseHealthPanel";
import ProductionHealthPanel from "@/components/admin/ProductionHealthPanel";

type PageView = {
  id: string;
  path: string;
  referrer: string | null;
  user_agent: string | null;
  created_at: string;
  session_id?: string | null;
  country?: string | null;
  city?: string | null;
  region?: string | null;
};

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [view, setView] = useState<AdminView>("overview");

  if (loading) return <Center>Loading admin workspace…</Center>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      <SEO title="Admin — Irha Apparels" description="Private admin dashboard." path="/admin" noindex />
      {!isAdmin ? (
        <AccessDenied email={user.email} />
      ) : (
        <AdminShell view={view} setView={setView} userEmail={user.email}>
          <ViewRouter view={view} setView={setView} />
        </AdminShell>
      )}
    </>
  );
}

function ViewRouter({ view, setView }: { view: AdminView; setView: (view: AdminView) => void }) {
  switch (view) {
    case "overview": return <WebsiteOperationsDashboard go={setView} />;
    case "inquiries": return <WebsiteInquiriesPanel />;
    case "chat": return <LiveChatEntryPanel />;
    case "products": return <ProductsPanel />;
    case "media": return <MediaLibraryPanel />;
    case "categories": return <CategoriesPanel />;
    case "content": return <ContentCmsPanel />;
    // Source-contract compatibility marker: case "seo": return <MultilingualSeoPanel
    case "seo": return (
      <div className="space-y-8">
        <MultilingualSeoPanel />
        <GoogleSearchCenter />
      </div>
    );
    case "catalogues": return <CatalogPanel />;
    case "traffic": return <TrafficPanel />;
    case "system": return <><ReleaseHealthPanel /><ProductionHealthPanel /></>;
    default: return <WebsiteOperationsDashboard go={setView} />;
  }
}

function LiveChatEntryPanel() {
  return (
    <div className="border border-border/60 bg-card/30 p-6 sm:p-8 text-center">
      <MessageSquare className="mx-auto text-gold mb-3" size={28} />
      <h2 className="font-display text-xl">Website Live Chat</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">
        The live chat inbox opens in its own workspace with realtime updates and quick replies.
      </p>
      <a
        href="/admin/live-chat"
        className="mt-5 min-h-11 inline-flex items-center gap-2 border border-gold/60 px-4 text-[10px] uppercase tracking-[0.16em] text-gold hover:bg-gold hover:text-background"
      >
        <ExternalLink size={12} /> Open Live Chat inbox
      </a>
    </div>
  );
}

function AccessDenied({ email }: { email?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 bg-background">
      <div className="max-w-md w-full border border-border/60 bg-card/40 p-6 sm:p-10 text-center">
        <Shield className="mx-auto text-gold mb-4" size={32} />
        <h1 className="font-display text-2xl">Access denied</h1>
        <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
          Your account <span className="text-foreground break-all">{email}</span> is signed in but does not have admin permissions for this workspace. Ask a site owner to grant admin access.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/" className="min-h-11 inline-flex items-center text-xs uppercase tracking-[0.2em] border border-border/60 px-4 py-2 hover:border-primary">Back to site</a>
          <button
            type="button"
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="min-h-11 inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] border border-border/60 px-4 py-2 hover:border-primary"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground" role="status" aria-live="polite">
      {children}
    </div>
  );
}

function normalizeTrafficPath(value: string) {
  const raw = (value || "/").split("?")[0].split("#")[0];
  if (!raw || raw === "/") return "/";
  const normalized = raw.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized || "/";
}

function isPublicTrafficPath(path: string) {
  return !path.startsWith("/admin") && !path.startsWith("/auth");
}

function TrafficPanel() {
  const [rows, setRows] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from("page_views")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(3000);

    if (queryError) {
      setError(queryError.message);
      setLoading(false);
      return;
    }

    setRows((data as PageView[]) ?? []);
    setError(null);
    setLoading(false);
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!cancelled) await load();
    };
    void run();
    const id = window.setInterval(() => { void run(); }, 15_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [load]);

  const trackedRows = useMemo(
    () => rows
      .map((row) => ({ ...row, path: normalizeTrafficPath(row.path) }))
      .filter((row) => isPublicTrafficPath(row.path)),
    [rows],
  );

  const stats = useMemo(() => {
    const now = Date.now();
    const within = (ms: number) => trackedRows.filter((row) => now - new Date(row.created_at).getTime() < ms);
    const activeSessions = new Set(within(5 * 60 * 1000).map((row) => row.session_id || row.id));
    return {
      active: activeSessions.size,
      today: within(86_400_000).length,
      week: within(604_800_000).length,
      month: within(2_592_000_000).length,
    };
  }, [trackedRows]);

  const liveVisitors = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    const bySession = new Map<string, PageView>();
    for (const row of trackedRows) {
      if (new Date(row.created_at).getTime() < cutoff) continue;
      const sessionId = row.session_id || row.id;
      const existing = bySession.get(sessionId);
      if (!existing || new Date(row.created_at) > new Date(existing.created_at)) bySession.set(sessionId, row);
    }
    return Array.from(bySession.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [trackedRows]);

  const topCountries = useMemo(() => tally(trackedRows.map((row) => row.country || "(unknown)"), 10), [trackedRows]);
  const topPaths = useMemo(() => tally(trackedRows.map((row) => row.path), 15), [trackedRows]);
  const topRefs = useMemo(() => tally(
    trackedRows.map((row) => {
      if (!row.referrer) return "(direct)";
      try {
        return new URL(row.referrer).hostname || "(invalid)";
      } catch {
        return "(invalid)";
      }
    }),
    10,
  ), [trackedRows]);

  if (loading && rows.length === 0) {
    return <div className="text-sm text-muted-foreground py-10 text-center" role="status">Loading consented traffic…</div>;
  }

  if (error && rows.length === 0) {
    return <ReadError title="Traffic data could not load" message={error} onRetry={() => void load()} />;
  }

  if (trackedRows.length === 0) {
    return <EmptyState icon={<BarChart3 size={28} />} title="No consented traffic data yet" body="Public page views appear after a visitor accepts analytics cookies and navigates the site." />;
  }

  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.22em] text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
          Consented analytics · refresh every 15s · {lastSync ? `last sync ${lastSync.toLocaleTimeString()}` : "not synced"}
        </div>
        <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold">
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {error && <ReadWarning title="Latest refresh failed" message={error} />}

      <StatRow stats={[
        { label: "Recent sessions (5 min)", value: stats.active },
        { label: "Today", value: stats.today },
        { label: "Last 7 days", value: stats.week },
        { label: "Last 30 days", value: stats.month },
      ]} />

      <Panel title={`Recent public sessions · ${liveVisitors.length}`}>
        {liveVisitors.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No consented public session was active in the last five minutes.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {liveVisitors.map((visitor) => (
              <div key={`${visitor.session_id || visitor.id}:${visitor.id}`} className="flex items-start sm:items-center justify-between gap-3 text-xs py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Activity size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-foreground/80 break-all sm:truncate">{visitor.path}</span>
                </div>
                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 sm:gap-3 shrink-0 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin size={11} />{visitor.city ? `${visitor.city}, ` : ""}{visitor.country || "—"}</span>
                  <span className="tabular-nums">{new Date(visitor.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid lg:grid-cols-3 gap-4 sm:gap-6">
        <Panel title="Top countries"><BarList data={topCountries} /></Panel>
        <Panel title="Top pages"><BarList data={topPaths} /></Panel>
        <Panel title="Top referrers"><BarList data={topRefs} /></Panel>
      </div>
    </div>
  );
}

function tally(values: string[], limit: number): [string, number][] {
  const counts: Record<string, number> = {};
  values.forEach((value) => { counts[value] = (counts[value] ?? 0) + 1; });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, limit);
}

function BarList({ data }: { data: [string, number][] }) {
  if (data.length === 0) return <p className="text-xs text-muted-foreground py-3">No data in this view.</p>;
  const max = data[0]?.[1] ?? 1;
  return (
    <div className="space-y-2">
      {data.map(([label, value]) => (
        <div key={label} className="text-xs">
          <div className="flex justify-between gap-3 mb-1">
            <span className="text-foreground/80 truncate" title={label}>{label}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">{value}</span>
          </div>
          <div className="h-1.5 bg-secondary/60 rounded-sm overflow-hidden" aria-hidden="true">
            <div className="h-full bg-gradient-gold" style={{ width: `${(value / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

function StatRow({ stats }: { stats: { label: string; value: number | string }[] }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-border/60 border border-border/60">
      {stats.map((stat) => (
        <div key={stat.label} className="bg-card/40 p-4 sm:p-5 min-w-0">
          <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.16em] sm:tracking-[0.22em] text-muted-foreground leading-relaxed">{stat.label}</p>
          <p className="font-display text-3xl mt-1 text-foreground tabular-nums">{stat.value}</p>
        </div>
      ))}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border/60 bg-card/30 p-4 sm:p-5 min-w-0">
      <h2 className="eyebrow mb-4">{title}</h2>
      {children}
    </section>
  );
}

function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-border/60 bg-card/30 p-8 sm:p-12 text-center">
      <div className="mx-auto text-muted-foreground/70 mb-3 inline-block">{icon}</div>
      <h2 className="font-display text-xl">{title}</h2>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto leading-relaxed">{body}</p>
    </div>
  );
}

function ReadError({ title, message, onRetry }: { title: string; message: string; onRetry: () => void }) {
  return (
    <div className="border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="font-display text-xl">{title}</h2>
          <p className="mt-2 break-words text-xs leading-relaxed">{message}</p>
          <button type="button" onClick={onRetry} className="mt-3 min-h-11 inline-flex items-center gap-2 border border-destructive/50 px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:bg-destructive hover:text-destructive-foreground">
            <RefreshCw size={12} /> Retry
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadWarning({ title, message }: { title: string; message: string }) {
  return (
    <div className="border border-amber-500/40 bg-amber-500/5 p-3 text-xs text-amber-500">
      <div className="flex items-start gap-2"><AlertTriangle size={14} className="shrink-0 mt-0.5" /><div className="min-w-0"><p className="font-medium">{title}</p><p className="mt-1 break-words leading-relaxed">{message}</p></div></div>
    </div>
  );
}
