import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import SEO from "@/components/SEO";
import {
  Inbox, BarChart3, MessageSquare, Search, Shield, RefreshCw, Mail, Globe,
  Trash2, Activity, MapPin, LogOut,
} from "lucide-react";

import { AdminShell, type AdminView } from "@/components/admin/AdminShell";
import OverviewPanel from "@/components/admin/OverviewPanel";
import ProductsPanel from "@/components/admin/ProductsPanel";
import CategoriesPanel from "@/components/admin/CategoriesPanel";
import NotBuiltPanel from "@/components/admin/NotBuiltPanel";

import SocialPanel from "@/components/admin/SocialPanel";
import AIAssistantPanel from "@/components/admin/AIAssistantPanel";
import LeadsPanel from "@/components/admin/LeadsPanel";
import PIGeneratorPanel from "@/components/admin/PIGeneratorPanel";
import MailingPanel from "@/components/admin/MailingPanel";
import CatalogPanel from "@/components/admin/CatalogPanel";
import MacroGatewayPanel from "@/components/admin/MacroGatewayPanel";
import StudioPricingPanel from "@/components/admin/StudioPricingPanel";
import SocialDevOpsPanel from "@/components/admin/SocialDevOpsPanel";
import ExportDirectoryPanel from "@/components/admin/ExportDirectoryPanel";

type Inquiry = {
  id: string; name: string; email: string; company: string | null; country: string | null;
  phone: string | null; category: string | null; quantity: string | null; message: string | null;
  source: string | null; status: string; created_at: string;
};
type PageView = { id: string; path: string; referrer: string | null; user_agent: string | null; created_at: string; session_id?: string | null; country?: string | null; city?: string | null; region?: string | null };
type ChatMsg = { id: string; session_id: string; role: string; message: string; created_at: string };

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [view, setView] = useState<AdminView>("overview");

  if (loading) return <Center>Loading…</Center>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      <SEO title="Admin — Irha Apparels" description="Private admin dashboard." path="/admin" noindex />
      {!isAdmin ? <AccessDenied email={user.email} /> : (
        <AdminShell view={view} setView={setView} userEmail={user.email}>
          <ViewRouter view={view} setView={setView} />
        </AdminShell>
      )}
    </>
  );
}

function ViewRouter({ view, setView }: { view: AdminView; setView: (v: AdminView) => void }) {
  switch (view) {
    case "overview": return <OverviewPanel go={setView} />;
    case "products": return <ProductsPanel />;
    case "categories": return <CategoriesPanel />;
    case "catalogues": return <CatalogPanel />;
    case "blog": return <NotBuiltPanel title="Blog" />;
    case "faqs": return <NotBuiltPanel title="FAQs" />;
    case "seo": return <NotBuiltPanel title="SEO editor" note="Google Search Console analytics are available under Growth → Google Search. Full on-page SEO CRUD is coming next phase." />;
    case "links": return <NotBuiltPanel title="Internal Links" />;
    case "leads": return <LeadsPanel />;
    case "inquiries": return <InquiriesPanel />;
    case "chat": return <ChatPanel />;
    case "mailing": return <MailingPanel />;
    case "ai": return <AIAssistantPanel />;
    case "studio": return <StudioPricingPanel />;
    case "pi": return <PIGeneratorPanel />;
    case "directory": return <ExportDirectoryPanel />;
    case "social": return <SocialPanel />;
    case "devops": return <SocialDevOpsPanel />;
    case "traffic": return <TrafficPanel />;
    case "gsc": return <GSCPanel />;
    case "macro": return <MacroGatewayPanel />;
    case "system": return <SystemPanel />;
    default: return <OverviewPanel go={setView} />;
  }
}

function AccessDenied({ email }: { email?: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-background">
      <div className="max-w-md w-full border border-border/60 bg-card/40 p-10 text-center">
        <Shield className="mx-auto text-gold mb-4" size={32} />
        <h1 className="font-display text-2xl">Access denied</h1>
        <p className="text-sm text-foreground/70 mt-3">
          Your account <span className="text-foreground">{email}</span> is signed in but does not have admin
          permissions for this workspace. Ask a site owner to grant you admin access.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href="/" className="text-xs uppercase tracking-[0.25em] border border-border/60 px-4 py-2 hover:border-primary">Back to site</a>
          <button
            onClick={async () => { await supabase.auth.signOut(); window.location.href = "/auth"; }}
            className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] border border-border/60 px-4 py-2 hover:border-primary"
          >
            <LogOut size={12} /> Sign out
          </button>
        </div>
      </div>
    </div>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex items-center justify-center text-sm text-muted-foreground">{children}</div>;
}

// ──────────────────────────────────────────────────────────
// INQUIRIES
// ──────────────────────────────────────────────────────────
function InquiriesPanel() {
  const [rows, setRows] = useState<Inquiry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "new" | "read">("all");

  const load = async () => {
    setLoading(true);
    const { data } = await supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(200);
    setRows((data as Inquiry[]) ?? []);
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((r) => filter === "all" || r.status === filter);
  const newCount = rows.filter((r) => r.status === "new").length;

  const markRead = async (id: string) => { await supabase.from("inquiries").update({ status: "read" }).eq("id", id); void load(); };
  const remove = async (id: string) => {
    if (!confirm("Delete this inquiry?")) return;
    await supabase.from("inquiries").delete().eq("id", id); void load();
  };

  return (
    <div className="space-y-6">
      <StatRow stats={[
        { label: "Total", value: rows.length },
        { label: "New", value: newCount },
        { label: "Last 7 days", value: rows.filter((r) => new Date(r.created_at) > daysAgo(7)).length },
      ]} />

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex gap-2">
          {(["all", "new", "read"] as const).map((f) => (
            <button key={f} onClick={() => setFilter(f)} className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 border ${filter === f ? "border-primary text-primary" : "border-border/60 text-muted-foreground"}`}>{f}</button>
          ))}
        </div>
        <button onClick={load} className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"><RefreshCw size={12} /> Refresh</button>
      </div>

      {loading ? <div className="text-sm text-muted-foreground py-10 text-center">Loading inquiries…</div> : filtered.length === 0 ? (
        <EmptyState icon={<Inbox size={28} />} title="No inquiries yet" body="When someone submits the quote form, it will appear here." />
      ) : (
        <div className="space-y-3">
          {filtered.map((r) => (
            <div key={r.id} className={`border ${r.status === "new" ? "border-primary/40 bg-primary/[0.03]" : "border-border/60 bg-card/30"} p-5`}>
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h3 className="font-display text-lg">{r.name}</h3>
                    {r.company && <span className="text-xs text-muted-foreground">· {r.company}</span>}
                    {r.status === "new" && <span className="text-[9px] uppercase tracking-[0.25em] bg-primary text-primary-foreground px-2 py-0.5">New</span>}
                  </div>
                  <div className="flex items-center gap-4 mt-2 text-xs text-foreground/70 flex-wrap">
                    <a href={`mailto:${r.email}`} className="flex items-center gap-1.5 hover:text-primary"><Mail size={11} /> {r.email}</a>
                    {r.country && <span className="flex items-center gap-1.5"><Globe size={11} /> {r.country}</span>}
                    {r.category && <span>· {r.category}</span>}
                    {r.quantity && <span>· qty {r.quantity}</span>}
                  </div>
                  {r.message && <p className="text-sm text-foreground/80 mt-3 leading-relaxed whitespace-pre-wrap">{r.message}</p>}
                  <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/70 mt-3">{fmtDate(r.created_at)} · {r.source ?? "site"}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {r.status === "new" && <button onClick={() => markRead(r.id)} className="text-[10px] uppercase tracking-[0.2em] border border-border/60 px-3 py-1.5 hover:border-primary hover:text-primary">Mark read</button>}
                  <button onClick={() => remove(r.id)} className="text-[10px] uppercase tracking-[0.2em] text-destructive/80 hover:text-destructive inline-flex items-center gap-1"><Trash2 size={11} /> Delete</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// TRAFFIC
// ──────────────────────────────────────────────────────────
function TrafficPanel() {
  const [rows, setRows] = useState<PageView[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date>(new Date());

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const { data } = await supabase.from("page_views").select("*").order("created_at", { ascending: false }).limit(3000);
      if (cancelled) return;
      setRows((data as PageView[]) ?? []);
      setLoading(false);
      setLastSync(new Date());
    };
    void load();
    const id = setInterval(load, 15000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  const stats = useMemo(() => {
    const now = Date.now();
    const within = (ms: number) => rows.filter((r) => now - new Date(r.created_at).getTime() < ms);
    const activeSids = new Set(within(5 * 60 * 1000).map((r) => r.session_id || r.id));
    return { active: activeSids.size, today: within(864e5).length, week: within(6048e5).length, month: within(2592e6).length };
  }, [rows]);

  const liveVisitors = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000;
    const bySession = new Map<string, PageView>();
    for (const r of rows) {
      if (new Date(r.created_at).getTime() < cutoff) continue;
      const sid = r.session_id || r.id;
      const existing = bySession.get(sid);
      if (!existing || new Date(r.created_at) > new Date(existing.created_at)) bySession.set(sid, r);
    }
    return Array.from(bySession.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [rows]);

  const topCountries = useMemo(() => {
    const t: Record<string, number> = {};
    rows.forEach((r) => { const k = r.country || "(unknown)"; t[k] = (t[k] ?? 0) + 1; });
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);
  const topPaths = useMemo(() => {
    const t: Record<string, number> = {};
    rows.forEach((r) => { t[r.path] = (t[r.path] ?? 0) + 1; });
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [rows]);
  const topRefs = useMemo(() => {
    const t: Record<string, number> = {};
    rows.forEach((r) => {
      let k = "(direct)";
      if (r.referrer) { try { k = new URL(r.referrer).hostname || "(invalid)"; } catch { k = "(invalid)"; } }
      t[k] = (t[k] ?? 0) + 1;
    });
    return Object.entries(t).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  if (loading) return <div className="text-sm text-muted-foreground py-10 text-center">Loading traffic…</div>;
  if (rows.length === 0) return <EmptyState icon={<BarChart3 size={28} />} title="No traffic data yet" body="Page views start logging from now. Visit a few pages to see them here." />;

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          Live · auto-refresh every 15s · last sync {lastSync.toLocaleTimeString()}
        </div>
      </div>

      <StatRow stats={[
        { label: "Active now (5 min)", value: stats.active },
        { label: "Today", value: stats.today },
        { label: "Last 7 days", value: stats.week },
        { label: "Last 30 days", value: stats.month },
      ]} />

      <Panel title={`Live visitors · ${liveVisitors.length} active`}>
        {liveVisitors.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4">No one on the site right now.</p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {liveVisitors.map((v) => (
              <div key={v.id} className="flex items-center justify-between gap-3 text-xs py-2 border-b border-border/30 last:border-0">
                <div className="flex items-center gap-3 min-w-0">
                  <Activity size={12} className="text-emerald-500 shrink-0" />
                  <span className="text-foreground/80 truncate">{v.path}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-muted-foreground">
                  <span className="inline-flex items-center gap-1"><MapPin size={11} />{v.city ? `${v.city}, ` : ""}{v.country || "—"}</span>
                  <span className="tabular-nums">{new Date(v.created_at).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Panel>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Top countries"><BarList data={topCountries} max={topCountries[0]?.[1] ?? 1} /></Panel>
        <Panel title="Top pages"><BarList data={topPaths} max={topPaths[0]?.[1] ?? 1} /></Panel>
        <Panel title="Top referrers"><BarList data={topRefs} max={topRefs[0]?.[1] ?? 1} /></Panel>
      </div>
    </div>
  );
}

function BarList({ data, max }: { data: [string, number][]; max: number }) {
  return (
    <div className="space-y-2">
      {data.map(([k, v]) => (
        <div key={k} className="text-xs">
          <div className="flex justify-between gap-3 mb-1">
            <span className="text-foreground/80 truncate">{k}</span>
            <span className="text-muted-foreground tabular-nums shrink-0">{v}</span>
          </div>
          <div className="h-1.5 bg-secondary/60 rounded-sm overflow-hidden">
            <div className="h-full bg-gradient-gold" style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// CHAT
// ──────────────────────────────────────────────────────────
function ChatPanel() {
  const [rows, setRows] = useState<ChatMsg[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("chat_messages").select("*").order("created_at", { ascending: false }).limit(500);
      setRows((data as ChatMsg[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const sessions = useMemo(() => {
    const map = new Map<string, ChatMsg[]>();
    [...rows].reverse().forEach((m) => { const arr = map.get(m.session_id) ?? []; arr.push(m); map.set(m.session_id, arr); });
    return Array.from(map.entries()).sort((a, b) => new Date(b[1][b[1].length - 1].created_at).getTime() - new Date(a[1][a[1].length - 1].created_at).getTime());
  }, [rows]);

  if (loading) return <div className="text-sm text-muted-foreground py-10 text-center">Loading chats…</div>;
  if (sessions.length === 0) return <EmptyState icon={<MessageSquare size={28} />} title="No conversations yet" body="When visitors use Live Chat, transcripts will appear here." />;

  return (
    <div className="space-y-4">
      <StatRow stats={[
        { label: "Conversations", value: sessions.length },
        { label: "Total messages", value: rows.length },
        { label: "Last 7 days", value: rows.filter((r) => new Date(r.created_at) > daysAgo(7)).length },
      ]} />
      {sessions.map(([sid, msgs]) => (
        <details key={sid} className="border border-border/60 bg-card/30 p-4 group">
          <summary className="cursor-pointer flex items-center justify-between text-xs uppercase tracking-[0.2em] text-foreground/70 hover:text-primary">
            <span>Session · {sid.slice(0, 8)} · {msgs.length} msg</span>
            <span className="text-muted-foreground normal-case tracking-normal">{fmtDate(msgs[msgs.length - 1].created_at)}</span>
          </summary>
          <div className="mt-4 space-y-3">
            {msgs.map((m) => (
              <div key={m.id} className={`text-sm ${m.role === "user" ? "text-foreground" : "text-foreground/70 pl-4 border-l-2 border-gold/40"}`}>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-1">{m.role}</p>
                <p className="whitespace-pre-wrap leading-relaxed">{m.message}</p>
              </div>
            ))}
          </div>
        </details>
      ))}
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// GSC
// ──────────────────────────────────────────────────────────
type GSCRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };
function GSCPanel() {
  const [rows, setRows] = useState<GSCRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [dim, setDim] = useState<"query" | "page" | "country">("query");

  const load = async (d = dim) => {
    setLoading(true); setErr(null);
    const { data, error } = await supabase.functions.invoke("gsc-analytics", { body: { dimension: d, days: 28 } });
    if (error) setErr(error.message);
    else if (data?.error) setErr(data.error);
    else setRows(data?.rows ?? []);
    setLoading(false);
  };
  useEffect(() => { void load("query"); }, []);

  return (
    <div className="space-y-6">
      <div className="flex gap-2 flex-wrap">
        {(["query", "page", "country"] as const).map((d) => (
          <button key={d} onClick={() => { setDim(d); void load(d); }} className={`text-[10px] uppercase tracking-[0.25em] px-3 py-1.5 border ${dim === d ? "border-primary text-primary" : "border-border/60 text-muted-foreground"}`}>By {d}</button>
        ))}
        <button onClick={() => load(dim)} className="ml-auto inline-flex items-center gap-2 text-xs uppercase tracking-[0.2em] text-muted-foreground hover:text-primary"><RefreshCw size={12} /> Refresh</button>
      </div>

      {err && <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{err}</div>}
      {loading ? <div className="text-sm text-muted-foreground py-10 text-center">Loading Search Console…</div> : rows.length === 0 && !err ? (
        <EmptyState icon={<Search size={28} />} title="No data yet" body="Google Search Console needs a few days of impressions before data appears." />
      ) : (
        <div className="border border-border/60 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-secondary/40 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              <tr>
                <th className="text-left py-3 px-4">{dim}</th>
                <th className="text-right py-3 px-4">Clicks</th>
                <th className="text-right py-3 px-4">Impressions</th>
                <th className="text-right py-3 px-4">CTR</th>
                <th className="text-right py-3 px-4">Position</th>
              </tr>
            </thead>
            <tbody>
              {rows.slice(0, 50).map((r, i) => (
                <tr key={i} className="border-t border-border/40">
                  <td className="py-2.5 px-4 text-foreground/85 truncate max-w-xs">{r.keys[0]}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums">{r.clicks}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-foreground/70">{r.impressions}</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-foreground/70">{(r.ctr * 100).toFixed(1)}%</td>
                  <td className="py-2.5 px-4 text-right tabular-nums text-foreground/70">{r.position.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">Last 28 days · Source: Google Search Console</p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// SYSTEM
// ──────────────────────────────────────────────────────────
function SystemPanel() {
  const { user, isAdmin } = useAuth();
  return (
    <div className="space-y-4 max-w-2xl">
      <div className="border border-border/60 bg-card/30 p-5 text-sm space-y-2">
        <p className="eyebrow mb-3">Session</p>
        <Row k="Signed-in email" v={user?.email ?? "—"} />
        <Row k="Admin role" v={isAdmin ? "Yes" : "No"} />
        <Row k="User ID" v={user?.id ?? "—"} />
      </div>
      <div className="border border-border/60 bg-card/30 p-5 text-sm space-y-2">
        <p className="eyebrow mb-3">Backend</p>
        <Row k="Project" v="Lovable Cloud (managed)" />
        <Row k="Auth" v="Google OAuth via Supabase" />
        <Row k="Public site" v={<a className="text-primary hover:underline" href="/" target="_blank" rel="noreferrer">Open live site</a>} />
      </div>
    </div>
  );
}
function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1.5 border-b border-border/30 last:border-0">
      <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{k}</span>
      <span className="text-foreground/85 text-xs text-right break-all">{v}</span>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────────────────
function StatRow({ stats }: { stats: { label: string; value: number | string }[] }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-px bg-border/60 border border-border/60">
      {stats.map((s) => (
        <div key={s.label} className="bg-card/40 p-5">
          <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{s.label}</p>
          <p className="font-display text-3xl mt-1 text-foreground">{s.value}</p>
        </div>
      ))}
    </div>
  );
}
function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border/60 bg-card/30 p-5">
      <p className="eyebrow mb-4">{title}</p>
      {children}
    </div>
  );
}
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="border border-border/60 bg-card/30 p-12 text-center">
      <div className="mx-auto text-muted-foreground/70 mb-3 inline-block">{icon}</div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto">{body}</p>
    </div>
  );
}
function daysAgo(n: number) { return new Date(Date.now() - n * 86400000); }
function fmtDate(s: string) { return new Date(s).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }); }
