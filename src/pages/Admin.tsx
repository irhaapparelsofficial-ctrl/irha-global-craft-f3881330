import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "@/hooks/use-toast";
import SEO from "@/components/SEO";
import { Inbox, BarChart3, MessageSquare, Search, LogOut, Shield, RefreshCw, Mail, Globe, Trash2, Share2, ExternalLink, Sparkles, Home, Users, FileText, Send, Store } from "lucide-react";
import SocialPanel from "@/components/admin/SocialPanel";
import AIAssistantPanel from "@/components/admin/AIAssistantPanel";
import HomePanel from "@/components/admin/HomePanel";
import LeadsPanel from "@/components/admin/LeadsPanel";
import PIGeneratorPanel from "@/components/admin/PIGeneratorPanel";
import MailingPanel from "@/components/admin/MailingPanel";
import ListingsPanel from "@/components/admin/ListingsPanel";

type Inquiry = {
  id: string; name: string; email: string; company: string | null; country: string | null;
  phone: string | null; category: string | null; quantity: string | null; message: string | null;
  source: string | null; status: string; created_at: string;
};
type PageView = { id: string; path: string; referrer: string | null; user_agent: string | null; created_at: string };
type ChatMsg = { id: string; session_id: string; role: string; message: string; created_at: string };

type Tab = "home" | "leads" | "pi" | "mailing" | "listings" | "ai" | "inquiries" | "traffic" | "chat" | "gsc" | "social";

export default function Admin() {
  const { user, isAdmin, loading } = useAuth();
  const [tab, setTab] = useState<Tab>("home");

  if (loading) return <Center>Loading…</Center>;
  if (!user) return <Navigate to="/auth" replace />;

  return (
    <>
      <SEO title="Atelier Dashboard — Irha Apparels" description="Private admin dashboard." path="/admin" noindex />
      <section className="pt-32 pb-24">
        <div className="container-luxe">
          {/* HEADER */}
          <div className="flex flex-wrap items-end justify-between gap-6 mb-10 border-b border-border/60 pb-6">
            <div>
              <p className="eyebrow mb-2">Private · Admin</p>
              <h1 className="font-display text-4xl md:text-5xl">Atelier Dashboard</h1>
              <p className="text-xs text-muted-foreground mt-2 uppercase tracking-[0.2em]">
                Signed in as {user.email}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {!isAdmin && <ClaimAdminButton />}
              <a
                href="/"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] border border-gold/60 text-gold px-4 py-2.5 hover:bg-gold hover:text-background transition-colors"
              >
                <ExternalLink size={14} /> Live Website Preview
              </a>
              <button
                onClick={async () => { await supabase.auth.signOut(); window.location.href = "/"; }}
                className="inline-flex items-center gap-2 text-xs uppercase tracking-[0.25em] border border-border/60 px-4 py-2.5 hover:border-primary hover:text-primary transition-colors"
              >
                <LogOut size={14} /> Sign out
              </button>
            </div>
          </div>

          {!isAdmin ? (
            <div className="border border-border/60 bg-card/40 p-10 text-center">
              <Shield className="mx-auto text-gold mb-4" size={32} />
              <h2 className="font-display text-2xl">Access pending</h2>
              <p className="text-sm text-foreground/70 mt-3 max-w-md mx-auto">
                Your account is signed in but does not have admin access yet. If you are the site owner,
                click <em>Claim admin</em> above (works only once, for the first admin).
              </p>
            </div>
          ) : (
            <>
              {/* TABS */}
              <div className="flex flex-wrap gap-2 mb-8">
                <TabButton active={tab === "home"} onClick={() => setTab("home")} icon={<Home size={14} />} label="Home" />
                <TabButton active={tab === "leads"} onClick={() => setTab("leads")} icon={<Users size={14} />} label="Leads" />
                <TabButton active={tab === "pi"} onClick={() => setTab("pi")} icon={<FileText size={14} />} label="PI Generator" />
                <TabButton active={tab === "mailing"} onClick={() => setTab("mailing")} icon={<Send size={14} />} label="Mailing" />
                <TabButton active={tab === "listings"} onClick={() => setTab("listings")} icon={<Store size={14} />} label="Listings" />
                <TabButton active={tab === "ai"} onClick={() => setTab("ai")} icon={<Sparkles size={14} />} label="AI Assistant" />
                <TabButton active={tab === "inquiries"} onClick={() => setTab("inquiries")} icon={<Inbox size={14} />} label="Inquiries" />
                <TabButton active={tab === "traffic"} onClick={() => setTab("traffic")} icon={<BarChart3 size={14} />} label="Traffic" />
                <TabButton active={tab === "chat"} onClick={() => setTab("chat")} icon={<MessageSquare size={14} />} label="Live Chat" />
                <TabButton active={tab === "gsc"} onClick={() => setTab("gsc")} icon={<Search size={14} />} label="Google Search" />
                <TabButton active={tab === "social"} onClick={() => setTab("social")} icon={<Share2 size={14} />} label="Social" />
              </div>

              {tab === "home" && <HomePanel />}
              {tab === "leads" && <LeadsPanel />}
              {tab === "pi" && <PIGeneratorPanel />}
              {tab === "mailing" && <MailingPanel />}
              {tab === "listings" && <ListingsPanel />}
              {tab === "ai" && <AIAssistantPanel />}
              {tab === "inquiries" && <InquiriesPanel />}
              {tab === "traffic" && <TrafficPanel />}
              {tab === "chat" && <ChatPanel />}
              {tab === "gsc" && <GSCPanel />}
              {tab === "social" && <SocialPanel />}
            </>
          )}
        </div>
      </section>
    </>
  );
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">{children}</div>;
}

function TabButton({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs uppercase tracking-[0.25em] border transition-colors ${
        active ? "border-primary text-primary bg-primary/5" : "border-border/60 text-foreground/70 hover:text-foreground"
      }`}
    >
      {icon} {label}
    </button>
  );
}

function ClaimAdminButton() {
  return (
    <div className="text-xs uppercase tracking-[0.25em] text-foreground/60 border border-border/60 px-4 py-2.5">
      <Shield size={14} className="inline mr-2" /> Admin access locked
    </div>
  );
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

  const markRead = async (id: string) => {
    await supabase.from("inquiries").update({ status: "read" }).eq("id", id);
    void load();
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this inquiry?")) return;
    await supabase.from("inquiries").delete().eq("id", id);
    void load();
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

      {loading ? <Center>Loading inquiries…</Center> : filtered.length === 0 ? (
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

  useEffect(() => {
    void (async () => {
      const { data } = await supabase.from("page_views").select("*").order("created_at", { ascending: false }).limit(2000);
      setRows((data as PageView[]) ?? []);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const today = rows.filter((r) => new Date(r.created_at) > daysAgo(1)).length;
    const week = rows.filter((r) => new Date(r.created_at) > daysAgo(7)).length;
    const month = rows.filter((r) => new Date(r.created_at) > daysAgo(30)).length;
    return { today, week, month };
  }, [rows]);

  const topPaths = useMemo(() => {
    const tally: Record<string, number> = {};
    rows.forEach((r) => { tally[r.path] = (tally[r.path] ?? 0) + 1; });
    return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [rows]);

  const topRefs = useMemo(() => {
    const tally: Record<string, number> = {};
    rows.forEach((r) => { const k = r.referrer ? new URL(r.referrer).hostname : "(direct)"; tally[k] = (tally[k] ?? 0) + 1; });
    return Object.entries(tally).sort((a, b) => b[1] - a[1]).slice(0, 10);
  }, [rows]);

  if (loading) return <Center>Loading traffic…</Center>;
  if (rows.length === 0) return <EmptyState icon={<BarChart3 size={28} />} title="No traffic data yet" body="Page views start logging from now. Visit a few pages to see them here." />;

  return (
    <div className="space-y-8">
      <StatRow stats={[
        { label: "Today", value: stats.today },
        { label: "Last 7 days", value: stats.week },
        { label: "Last 30 days", value: stats.month },
      ]} />

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Top pages">
          <BarList data={topPaths} max={topPaths[0]?.[1] ?? 1} />
        </Panel>
        <Panel title="Top referrers">
          <BarList data={topRefs} max={topRefs[0]?.[1] ?? 1} />
        </Panel>
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

  if (loading) return <Center>Loading chats…</Center>;
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
      {loading ? <Center>Loading Search Console…</Center> : rows.length === 0 && !err ? (
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
      <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground/60">
        Last 28 days · Source: Google Search Console
      </p>
    </div>
  );
}

// ──────────────────────────────────────────────────────────
// Shared bits
// ──────────────────────────────────────────────────────────
function StatRow({ stats }: { stats: { label: string; value: number | string }[] }) {
  return (
    <div className="grid grid-cols-3 gap-px bg-border/60 border border-border/60">
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
