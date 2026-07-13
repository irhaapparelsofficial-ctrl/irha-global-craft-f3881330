import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import {
  aggregateByPlatform,
  buildTrackingUrl,
  engagementCount,
  engagementRate,
  observedPerformanceScore,
  type SocialGrowthRow,
  type SocialMetricSnapshot,
  type SocialPlatform,
} from "@/lib/socialGrowthAnalytics";

const db = supabase as any;
const FIELD = "min-h-11 w-full border border-border/60 bg-background px-3 text-sm outline-none focus:border-gold";

type GrowthViewRow = {
  item_id: string;
  campaign_id: string | null;
  title: string;
  platform: SocialPlatform;
  content_type: string;
  status: string;
  external_post_id: string | null;
  external_post_url: string | null;
  published_at: string | null;
  tracking_url: string | null;
  metrics_last_collected_at: string | null;
  snapshot_id: string | null;
  snapshot_at: string | null;
  impressions: number | null;
  reach: number | null;
  views: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  profile_visits: number | null;
  followers_delta: number | null;
  metric_source: string | null;
  metric_verified: boolean | null;
  landing_count: number | null;
  attributed_lead_count: number | null;
};

type Recommendation = {
  id: string;
  item_id: string | null;
  recommendation_type: string;
  priority: number;
  reason: string;
  proposed_action: string;
  evidence: Record<string, unknown>;
  status: "open" | "approved" | "dismissed" | "completed";
  created_at: string;
};

type Health = {
  ok?: boolean;
  database_ready?: boolean;
  published_items?: number;
  verified_snapshots?: number;
  meta_configured?: boolean;
  generic_gateway_configured?: boolean;
  linkedin_metrics_configured?: boolean;
  tiktok_metrics_configured?: boolean;
  note?: string;
  error?: string;
};

type ManualDraft = {
  impressions: string;
  reach: string;
  views: string;
  likes: string;
  comments: string;
  shares: string;
  saves: string;
  clicks: string;
  profileVisits: string;
  followersDelta: string;
  evidence: string;
};

const emptyManual: ManualDraft = {
  impressions: "",
  reach: "",
  views: "",
  likes: "",
  comments: "",
  shares: "",
  saves: "",
  clicks: "",
  profileVisits: "",
  followersDelta: "",
  evidence: "",
};

function asNumber(value: number | null | undefined) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function toGrowthRow(row: GrowthViewRow): SocialGrowthRow {
  const snapshot: SocialMetricSnapshot | null = row.snapshot_at ? {
    id: row.snapshot_id || undefined,
    item_id: row.item_id,
    platform: row.platform,
    snapshot_at: row.snapshot_at,
    impressions: asNumber(row.impressions),
    reach: asNumber(row.reach),
    views: asNumber(row.views),
    likes: asNumber(row.likes),
    comments: asNumber(row.comments),
    shares: asNumber(row.shares),
    saves: asNumber(row.saves),
    clicks: asNumber(row.clicks),
    profile_visits: asNumber(row.profile_visits),
    followers_delta: asNumber(row.followers_delta),
    source: row.metric_source || "unknown",
    verified: Boolean(row.metric_verified),
  } : null;
  return {
    item_id: row.item_id,
    title: row.title,
    platform: row.platform,
    content_type: row.content_type,
    status: row.status,
    external_post_id: row.external_post_id,
    external_post_url: row.external_post_url,
    published_at: row.published_at,
    tracking_url: row.tracking_url,
    snapshot,
  };
}

export default function SocialGrowthAnalyticsPanel() {
  const [rows, setRows] = useState<GrowthViewRow[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [period, setPeriod] = useState<"30" | "90" | "all">("30");
  const [manualItemId, setManualItemId] = useState<string | null>(null);
  const [manualDraft, setManualDraft] = useState<ManualDraft>(emptyManual);

  const load = useCallback(async () => {
    setLoading(true);
    const [rowResult, recommendationResult] = await Promise.all([
      db.from("social_growth_latest").select("*").order("published_at", { ascending: false }).limit(300),
      db.from("social_growth_recommendations").select("*").in("status", ["open", "approved"]).order("priority", { ascending: false }).limit(100),
    ]);
    const error = rowResult.error || recommendationResult.error;
    if (error) {
      setBackendError(error.message || "Social analytics backend is not active yet");
      setRows([]);
      setRecommendations([]);
    } else {
      setBackendError(null);
      setRows((rowResult.data || []) as GrowthViewRow[]);
      setRecommendations((recommendationResult.data || []) as Recommendation[]);
    }
    setLoading(false);
  }, []);

  const checkHealth = useCallback(async () => {
    const { data, error } = await supabase.functions.invoke("social-analytics", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : data as Health);
  }, []);

  useEffect(() => { void Promise.all([load(), checkHealth()]); }, [load, checkHealth]);

  const filtered = useMemo(() => {
    if (period === "all") return rows;
    const cutoff = Date.now() - Number(period) * 86_400_000;
    return rows.filter((row) => row.published_at && new Date(row.published_at).getTime() >= cutoff);
  }, [rows, period]);

  const normalized = useMemo(() => filtered.map(toGrowthRow), [filtered]);
  const platformSummaries = useMemo(() => aggregateByPlatform(normalized), [normalized]);
  const measured = useMemo(() => normalized.filter((row) => row.snapshot?.verified), [normalized]);
  const totals = useMemo(() => measured.reduce((value, row) => {
    const snapshot = row.snapshot!;
    value.impressions += snapshot.impressions;
    value.reach += snapshot.reach;
    value.views += snapshot.views;
    value.engagements += engagementCount(snapshot);
    value.clicks += snapshot.clicks;
    return value;
  }, { impressions: 0, reach: 0, views: 0, engagements: 0, clicks: 0 }), [measured]);
  const topPosts = useMemo(() => [...normalized]
    .filter((row) => row.snapshot?.verified)
    .sort((a, b) => observedPerformanceScore(b.snapshot) - observedPerformanceScore(a.snapshot))
    .slice(0, 12), [normalized]);

  const collect = async () => {
    if (!window.confirm("Collect verified metrics for recent published posts? No post will be edited or published.")) return;
    setBusy("collect");
    const { data, error } = await supabase.functions.invoke("social-analytics", { body: { action: "collect" } });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: "Metric collection failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Metric check complete", description: `${data?.collected || 0} verified snapshots · ${data?.failed || 0} failed` });
    await Promise.all([load(), checkHealth()]);
  };

  const createRecommendations = async () => {
    setBusy("recommend");
    const { data, error } = await supabase.functions.invoke("social-analytics", { body: { action: "recommend" } });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: "Recommendations could not be prepared", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({ title: "Internal recommendations prepared", description: `${data?.created || 0} new review item(s). Nothing was posted.` });
    await load();
  };

  const prepareTracking = async (row: GrowthViewRow) => {
    try {
      const trackingUrl = buildTrackingUrl({
        destination: "https://irhaapparels.com/inquiry",
        platform: row.platform,
        itemId: row.item_id,
        campaignId: row.campaign_id,
      });
      setBusy(`tracking:${row.item_id}`);
      const { error } = await db.rpc("social_set_tracking", {
        _item_id: row.item_id,
        _tracking_url: trackingUrl,
        _utm_source: row.platform,
        _utm_medium: "social",
        _utm_campaign: row.campaign_id || "irha-social",
        _utm_content: row.item_id,
      });
      setBusy(null);
      if (error) throw error;
      await navigator.clipboard.writeText(trackingUrl);
      toast({ title: "Tracking link saved and copied", description: "Publication approval was cleared for a fresh owner review." });
      await load();
    } catch (error) {
      setBusy(null);
      toast({ title: "Tracking link was not saved", description: error instanceof Error ? error.message : String(error), variant: "destructive" });
    }
  };

  const saveManual = async () => {
    if (!manualItemId || manualDraft.evidence.trim().length < 6) {
      toast({ title: "Metric evidence note is required", variant: "destructive" });
      return;
    }
    setBusy(`manual:${manualItemId}`);
    const { error } = await db.rpc("social_record_manual_metrics", {
      _item_id: manualItemId,
      _snapshot_at: new Date().toISOString(),
      _impressions: Number(manualDraft.impressions || 0),
      _reach: Number(manualDraft.reach || 0),
      _views: Number(manualDraft.views || 0),
      _likes: Number(manualDraft.likes || 0),
      _comments: Number(manualDraft.comments || 0),
      _shares: Number(manualDraft.shares || 0),
      _saves: Number(manualDraft.saves || 0),
      _clicks: Number(manualDraft.clicks || 0),
      _profile_visits: Number(manualDraft.profileVisits || 0),
      _followers_delta: Number(manualDraft.followersDelta || 0),
      _evidence: { note: manualDraft.evidence.trim(), entered_at: new Date().toISOString() },
    });
    setBusy(null);
    if (error) {
      toast({ title: "Manual snapshot was not saved", description: error.message, variant: "destructive" });
      return;
    }
    setManualItemId(null);
    setManualDraft(emptyManual);
    toast({ title: "Verified manual snapshot saved" });
    await load();
  };

  const updateRecommendation = async (id: string, status: "approved" | "dismissed" | "completed") => {
    setBusy(`recommendation:${id}`);
    const { error } = await db.rpc("social_set_recommendation_status", { _id: id, _status: status });
    setBusy(null);
    if (error) {
      toast({ title: "Recommendation was not updated", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: status === "approved" ? "Recommendation approved for internal work" : status === "completed" ? "Recommendation completed" : "Recommendation dismissed", description: "No social post was published." });
    await load();
  };

  return (
    <section className="border border-gold/40 bg-card/25 mb-6">
      <div className="p-5 md:p-6 border-b border-border/60 flex flex-col xl:flex-row xl:items-start xl:justify-between gap-5">
        <div className="flex items-start gap-3">
          <BarChart3 size={22} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Phase 5.4</p>
            <h2 className="font-display text-2xl md:text-4xl">Verified Growth Analytics</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-4xl leading-relaxed">Collect exact platform metrics, preserve snapshot evidence, connect UTM tracking and prepare internal optimization drafts. Rankings use observed engagement only — never invented leads, revenue or order probability.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void Promise.all([load(), checkHealth()])} disabled={loading || busy !== null} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.15em] hover:border-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
          <button type="button" onClick={() => void collect()} disabled={busy !== null || Boolean(backendError)} className="min-h-11 inline-flex items-center gap-2 border border-gold/60 text-gold px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50">{busy === "collect" ? <Loader2 size={13} className="animate-spin" /> : <Activity size={13} />} Collect metrics</button>
          <button type="button" onClick={() => void createRecommendations()} disabled={busy !== null || Boolean(backendError)} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.15em] disabled:opacity-50">{busy === "recommend" ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />} Prepare actions</button>
        </div>
      </div>

      {backendError && <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.05] p-4 flex items-start gap-3"><AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" /><div><p className="text-sm text-amber-200">Growth analytics backend needs final activation.</p><p className="text-xs text-foreground/55 mt-1 break-all">{backendError}</p></div></div>}

      <div className="p-4 md:p-5 border-b border-border/60">
        <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground"><Target size={14} className="text-gold" /> Evidence window</div>
          <select value={period} onChange={(event) => setPeriod(event.target.value as typeof period)} className="border border-border/60 bg-background px-3 py-2 text-xs"><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="all">All verified history</option></select>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-2">
          <Metric label="Published evidence" value={normalized.length} />
          <Metric label="Measured posts" value={measured.length} />
          <Metric label="Impressions" value={totals.impressions} />
          <Metric label="Reach" value={totals.reach} />
          <Metric label="Engagements" value={totals.engagements} />
          <Metric label="Clicks" value={totals.clicks} />
        </div>
        {health && <div className="grid grid-cols-2 lg:grid-cols-5 gap-2 mt-3 text-[9px] uppercase tracking-[0.11em]"><Status label="Database" ready={Boolean(health.database_ready)} /><Status label="Meta" ready={Boolean(health.meta_configured)} /><Status label="Gateway" ready={Boolean(health.generic_gateway_configured)} /><Status label="LinkedIn" ready={Boolean(health.linkedin_metrics_configured)} /><Status label="TikTok" ready={Boolean(health.tiktok_metrics_configured)} /></div>}
      </div>

      <div className="p-4 md:p-5 border-b border-border/60">
        <p className="eyebrow mb-3">Platform evidence</p>
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {platformSummaries.map((summary) => <article key={summary.platform} className="border border-border/60 bg-background/30 p-4"><div className="flex items-center justify-between gap-2"><h3 className="font-display text-xl capitalize">{summary.platform}</h3><span className="text-[9px] text-muted-foreground">{summary.measuredPosts}/{summary.posts} measured</span></div><div className="grid grid-cols-2 gap-2 mt-3"><Mini label="Reach" value={summary.reach} /><Mini label="Views" value={summary.views} /><Mini label="Engage" value={summary.engagements} /><Mini label="Clicks" value={summary.clicks} /></div></article>)}
        </div>
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.65fr)] gap-5 p-4 md:p-5">
        <section className="space-y-3">
          <p className="eyebrow">Observed post performance</p>
          {loading ? <p className="text-sm text-muted-foreground py-8">Loading verified metrics…</p> : topPosts.length === 0 ? <Empty text="No published post has a verified metric snapshot yet." /> : topPosts.map((row, index) => {
            const source = filtered.find((item) => item.item_id === row.item_id);
            const rate = engagementRate(row.snapshot);
            return <article key={row.item_id} className="border border-border/60 bg-background/25 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[9px] uppercase tracking-[0.14em] text-gold">#{index + 1} · {row.platform} · {row.content_type.replace(/_/g, " ")}</p><h3 className="font-display text-xl mt-1 truncate">{row.title}</h3></div>{row.snapshot?.verified ? <CheckCircle2 size={17} className="text-emerald-400 shrink-0" /> : <XCircle size={17} className="text-muted-foreground shrink-0" />}</div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-3"><Mini label="Reach" value={row.snapshot?.reach || 0} /><Mini label="Views" value={row.snapshot?.views || 0} /><Mini label="Likes" value={row.snapshot?.likes || 0} /><Mini label="Share/Save" value={(row.snapshot?.shares || 0) + (row.snapshot?.saves || 0)} /><Mini label="Clicks" value={row.snapshot?.clicks || 0} /><Mini label="Eng. rate" value={rate === null ? "—" : `${rate.toFixed(2)}%`} /></div>
              <div className="mt-3 flex items-center justify-between gap-3 flex-wrap text-[10px] text-muted-foreground"><span>Source: {row.snapshot?.source || "none"} · {row.snapshot?.snapshot_at ? new Date(row.snapshot.snapshot_at).toLocaleString() : "no snapshot"}</span><div className="flex gap-2">{row.external_post_url && <a href={row.external_post_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-gold"><ExternalLink size={11} /> Post</a>}<button type="button" onClick={() => source && void prepareTracking(source)} disabled={busy !== null} className="inline-flex items-center gap-1 text-gold"><Link2 size={11} /> {row.tracking_url ? "Refresh UTM" : "Add UTM"}</button><button type="button" onClick={() => { setManualItemId(row.item_id); setManualDraft(emptyManual); }} className="text-gold">Manual metrics</button></div></div>
            </article>;
          })}
        </section>

        <section className="space-y-3">
          <p className="eyebrow">Owner review actions</p>
          {recommendations.length === 0 ? <Empty text="No open evidence-based recommendation." /> : recommendations.map((item) => <article key={item.id} className="border border-border/60 bg-background/25 p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.14em] text-gold">Priority {item.priority} · {item.recommendation_type.replace(/_/g, " ")}</p><h3 className="font-display text-lg mt-1">{item.reason}</h3></div><span className="border border-border/60 px-2 py-1 text-[8px] uppercase">{item.status}</span></div><p className="text-xs text-foreground/65 mt-3 leading-relaxed">{item.proposed_action}</p><div className="grid grid-cols-2 gap-2 mt-4"><button type="button" onClick={() => void updateRecommendation(item.id, item.status === "approved" ? "completed" : "approved")} disabled={busy !== null} className="min-h-10 border border-gold/60 text-gold text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">{item.status === "approved" ? "Mark complete" : "Approve internal work"}</button><button type="button" onClick={() => void updateRecommendation(item.id, "dismissed")} disabled={busy !== null} className="min-h-10 border border-border/60 text-[9px] uppercase tracking-[0.12em] disabled:opacity-50">Dismiss</button></div></article>)}
        </section>
      </div>

      {manualItemId && <div className="border-t border-border/60 p-4 md:p-5 bg-background/20"><div className="flex items-center justify-between gap-3"><div><p className="eyebrow">Verified manual metric snapshot</p><p className="text-xs text-muted-foreground mt-1">Enter only values shown by the platform and add an evidence note. This does not publish anything.</p></div><button type="button" onClick={() => setManualItemId(null)} className="text-xs text-muted-foreground">Close</button></div><div className="grid grid-cols-2 md:grid-cols-5 gap-2 mt-4">{(["impressions","reach","views","likes","comments","shares","saves","clicks","profileVisits","followersDelta"] as const).map((key) => <label key={key} className="text-[9px] uppercase tracking-[0.11em] text-muted-foreground">{key.replace(/([A-Z])/g, " $1")}<input type="number" min={key === "followersDelta" ? undefined : 0} value={manualDraft[key]} onChange={(event) => setManualDraft((current) => ({ ...current, [key]: event.target.value }))} className={`${FIELD} mt-1`} /></label>)}</div><label className="block text-[9px] uppercase tracking-[0.11em] text-muted-foreground mt-3">Evidence note *<textarea rows={3} value={manualDraft.evidence} onChange={(event) => setManualDraft((current) => ({ ...current, evidence: event.target.value }))} className={`${FIELD} mt-1 py-3`} placeholder="Example: copied from Instagram Insights on 13 July 2026; screenshot retained privately." /></label><button type="button" onClick={() => void saveManual()} disabled={busy !== null} className="mt-3 min-h-11 bg-gradient-gold text-primary-foreground px-5 text-[10px] uppercase tracking-[0.14em] disabled:opacity-50">{busy === `manual:${manualItemId}` ? "Saving…" : "Save verified snapshot"}</button></div>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: number }) { return <div className="border border-border/60 bg-background/30 p-3"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="font-display text-xl mt-1">{value.toLocaleString()}</p></div>; }
function Mini({ label, value }: { label: string; value: number | string }) { return <div className="border border-border/50 p-2"><p className="text-[7px] uppercase tracking-[0.1em] text-muted-foreground">{label}</p><p className="text-sm mt-0.5">{typeof value === "number" ? value.toLocaleString() : value}</p></div>; }
function Status({ label, ready }: { label: string; ready: boolean }) { return <div className={`border px-3 py-2 ${ready ? "border-emerald-500/30 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>{label}: {ready ? "ready" : "not ready"}</div>; }
function Empty({ text }: { text: string }) { return <div className="border border-dashed border-border/60 p-6 text-center text-xs text-muted-foreground">{text}</div>; }
