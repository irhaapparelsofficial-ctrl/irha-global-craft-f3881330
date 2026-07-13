import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, ExternalLink, Loader2, Play, RefreshCw, ShieldCheck, Unplug, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;
type Platform = "facebook" | "instagram" | "linkedin" | "tiktok";

type Account = {
  id: string;
  platform: Platform;
  display_name: string;
  external_account_id: string | null;
  enabled: boolean;
  verification_status: "missing" | "pending" | "verified" | "failed";
  capabilities: Record<string, boolean>;
  last_verified_at: string | null;
  connection_note: string | null;
};

type CalendarItem = {
  id: string;
  title: string;
  platform: Platform;
  content_type: "text" | "single_image" | "carousel" | "reel";
  status: string;
  caption: string;
  image_url: string | null;
  video_url: string | null;
  render_verified: boolean;
  source_render_job_id: string | null;
  approved_at: string | null;
  publish_approved_at: string | null;
  delivery_mode: "manual" | "automatic";
  scheduled_at: string | null;
  next_attempt_at: string | null;
  publish_attempts: number;
  max_attempts: number;
  external_post_id: string | null;
  external_post_url: string | null;
  error: string | null;
  updated_at: string;
};

type RenderJob = {
  id: string;
  title: string;
  render_type: "reel" | "carousel";
  status: string;
  output_url: string | null;
  created_at: string;
};

type PublishRun = {
  id: string;
  status: string;
  trigger_source: string;
  claimed_count: number;
  published_count: number;
  manual_count: number;
  failed_count: number;
  started_at: string;
  completed_at: string | null;
};

type Health = {
  ok?: boolean;
  database_ready?: boolean;
  scheduler_secret_configured?: boolean;
  generic_gateway_configured?: boolean;
  accounts?: Account[];
  error?: string;
};

export default function SocialPublishingCenter() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [renderJobs, setRenderJobs] = useState<RenderJob[]>([]);
  const [runs, setRuns] = useState<PublishRun[]>([]);
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [renderChoice, setRenderChoice] = useState<Record<string, string>>({});
  const [scheduleChoice, setScheduleChoice] = useState<Record<string, string>>({});
  const [modeChoice, setModeChoice] = useState<Record<string, "manual" | "automatic">>({});

  const load = useCallback(async () => {
    setLoading(true);
    const [accountResult, itemResult, renderResult, runResult] = await Promise.all([
      db.from("social_platform_accounts").select("*").order("platform"),
      db.from("social_calendar_items").select("id,title,platform,content_type,status,caption,image_url,video_url,render_verified,source_render_job_id,approved_at,publish_approved_at,delivery_mode,scheduled_at,next_attempt_at,publish_attempts,max_attempts,external_post_id,external_post_url,error,updated_at").order("updated_at", { ascending: false }).limit(100),
      db.from("social_render_jobs").select("id,title,render_type,status,output_url,created_at").eq("status", "ready").order("created_at", { ascending: false }).limit(100),
      db.from("social_publish_runs").select("*").order("started_at", { ascending: false }).limit(15),
    ]);
    const error = accountResult.error || itemResult.error || renderResult.error || runResult.error;
    if (error) {
      setBackendError(error.message || "Publishing backend is not active yet");
      setAccounts([]);
      setItems([]);
      setRenderJobs([]);
      setRuns([]);
    } else {
      setBackendError(null);
      setAccounts((accountResult.data ?? []) as Account[]);
      const nextItems = (itemResult.data ?? []) as CalendarItem[];
      setItems(nextItems);
      setRenderJobs((renderResult.data ?? []) as RenderJob[]);
      setRuns((runResult.data ?? []) as PublishRun[]);
      setModeChoice(Object.fromEntries(nextItems.map((item) => [item.id, item.delivery_mode || "automatic"])));
      setScheduleChoice(Object.fromEntries(nextItems.map((item) => [item.id, item.scheduled_at ? toLocal(item.scheduled_at) : ""])));
    }
    setLoading(false);
  }, []);

  const refreshHealth = async () => {
    setBusy("health");
    const { data, error } = await supabase.functions.invoke("social-publish-scheduler", { body: { action: "health" } });
    setBusy(null);
    if (error || data?.error) {
      setHealth({ error: data?.error || error?.message });
      toast({ title: "Connection health check failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    setHealth(data as Health);
    toast({ title: "Social connections checked", description: "No post was published." });
    await load();
  };

  useEffect(() => { void load(); }, [load]);

  const queue = useMemo(() => items.filter((item) => !["published", "cancelled"].includes(item.status)), [items]);
  const dueCount = useMemo(() => queue.filter((item) => item.delivery_mode === "automatic" && item.publish_approved_at && (!item.next_attempt_at || new Date(item.next_attempt_at).getTime() <= Date.now())).length, [queue]);

  const toggleAccount = async (account: Account) => {
    setBusy(`account:${account.id}`);
    const { error } = await db.from("social_platform_accounts").update({ enabled: !account.enabled }).eq("id", account.id);
    setBusy(null);
    if (error) {
      toast({ title: "Account setting failed", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: account.enabled ? `${account.display_name} disabled` : `${account.display_name} enabled`, description: "Connection verification is still required before publishing." });
    await load();
  };

  const attachRender = async (item: CalendarItem) => {
    const jobId = renderChoice[item.id];
    if (!jobId) {
      toast({ title: "Choose a verified render job", variant: "destructive" });
      return;
    }
    setBusy(`render:${item.id}`);
    const { error } = await db.rpc("social_attach_verified_render", { _item_id: item.id, _render_job_id: jobId });
    setBusy(null);
    if (error) {
      toast({ title: "Render could not be attached", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Verified render attached", description: "Public publication approval was cleared for a fresh owner review." });
    await load();
  };

  const approvePublication = async (item: CalendarItem) => {
    if (!item.approved_at) {
      toast({ title: "Approve the content draft first", variant: "destructive" });
      return;
    }
    const localValue = scheduleChoice[item.id];
    const scheduledAt = localValue ? new Date(localValue).toISOString() : new Date().toISOString();
    const mode = modeChoice[item.id] || "automatic";
    if (!window.confirm(`Approve this ${item.platform} item for ${mode === "automatic" ? "automatic" : "manual"} delivery${localValue ? ` at ${new Date(scheduledAt).toLocaleString()}` : " now"}?`)) return;
    setBusy(`approve:${item.id}`);
    const { error } = await db.rpc("social_request_publication", {
      _item_id: item.id,
      _scheduled_at: scheduledAt,
      _timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Karachi",
      _delivery_mode: mode,
    });
    setBusy(null);
    if (error) {
      toast({ title: "Publication approval blocked", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Owner publication approval recorded", description: mode === "automatic" ? "The scheduler may process it after the selected time." : "The item remains manual." });
    await load();
  };

  const revoke = async (item: CalendarItem) => {
    if (!window.confirm("Revoke public publication approval and return this item to draft?")) return;
    setBusy(`revoke:${item.id}`);
    const { error } = await db.rpc("social_revoke_publication", { _item_id: item.id });
    setBusy(null);
    if (error) {
      toast({ title: "Approval could not be revoked", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Publication approval revoked" });
    await load();
  };

  const runDue = async () => {
    if (!window.confirm(`Run the owner-approved due queue now? ${dueCount} item${dueCount === 1 ? " is" : "s are"} currently eligible.`)) return;
    setBusy("run");
    const { data, error } = await supabase.functions.invoke("social-publish-scheduler", { body: { action: "run", limit: 10 } });
    setBusy(null);
    if (error || data?.error) {
      toast({ title: "Publishing run failed", description: data?.error || error?.message, variant: "destructive" });
      return;
    }
    toast({
      title: "Due queue completed",
      description: `${data?.published ?? 0} published · ${data?.manual_required ?? 0} manual · ${data?.failed ?? 0} failed`,
      variant: data?.failed ? "destructive" : "default",
    });
    await load();
  };

  return (
    <section className="border border-gold/40 bg-card/25 mb-6">
      <div className="p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={22} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Phase 5.3</p>
            <h2 className="font-display text-2xl md:text-4xl">Verified Publishing & Scheduler</h2>
            <p className="text-sm text-foreground/65 mt-3 max-w-4xl leading-relaxed">Connect approved content to a verified platform account, attach verified reel outputs, record separate owner publication approval and process a duplicate-safe due queue. A published state requires a real external post ID or HTTPS URL.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void refreshHealth()} disabled={busy !== null || Boolean(backendError)} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.16em] hover:border-gold disabled:opacity-50">{busy === "health" ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />} Check connections</button>
          <button type="button" onClick={() => void runDue()} disabled={busy !== null || Boolean(backendError) || dueCount === 0} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 text-[10px] uppercase tracking-[0.16em] disabled:opacity-50">{busy === "run" ? <Loader2 size={13} className="animate-spin" /> : <Play size={13} />} Run due queue ({dueCount})</button>
        </div>
      </div>

      {backendError && <div className="m-4 md:m-5 border border-amber-500/35 bg-amber-500/[0.05] p-4 flex items-start gap-3"><AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" /><div><p className="text-sm text-amber-200">Publishing backend needs final activation.</p><p className="text-xs text-foreground/55 mt-1 break-all">{backendError}</p></div></div>}
      {health?.error && <div className="m-4 md:m-5 border border-destructive/35 bg-destructive/[0.05] p-4 text-sm text-destructive">{health.error}</div>}

      <div className="p-4 md:p-5 border-b border-border/60">
        <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
          {accounts.map((account) => {
            const verified = account.verification_status === "verified";
            return <article key={account.id} className="border border-border/60 bg-background/35 p-4">
              <div className="flex items-start justify-between gap-3"><div><p className="text-[9px] uppercase tracking-[0.16em] text-gold">{account.platform}</p><h3 className="font-display text-xl mt-1">{account.display_name}</h3></div>{verified ? <CheckCircle2 size={18} className="text-emerald-400" /> : account.verification_status === "failed" ? <XCircle size={18} className="text-destructive" /> : <Unplug size={18} className="text-muted-foreground" />}</div>
              <p className="text-xs text-foreground/55 mt-3 min-h-10">{account.connection_note || "Run a connection check after credentials are configured."}</p>
              <div className="mt-3 flex flex-wrap gap-1.5">{Object.entries(account.capabilities || {}).filter(([, value]) => value).map(([key]) => <span key={key} className="border border-border/60 px-2 py-1 text-[8px] uppercase tracking-[0.12em]">{key}</span>)}</div>
              <button type="button" onClick={() => void toggleAccount(account)} disabled={busy !== null || !verified} className="mt-4 w-full min-h-10 border border-border/60 text-[9px] uppercase tracking-[0.14em] hover:border-gold disabled:opacity-40">{busy === `account:${account.id}` ? "Saving…" : account.enabled ? "Disable publishing" : "Enable after verification"}</button>
            </article>;
          })}
          {!loading && accounts.length === 0 && <div className="sm:col-span-2 xl:col-span-4 border border-dashed border-border/60 p-8 text-center text-sm text-muted-foreground">Platform account registry will appear after backend activation.</div>}
        </div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-[10px] text-muted-foreground"><span>Scheduler secret: {health?.scheduler_secret_configured ? "configured" : "not verified"}</span><span>Publish gateway: {health?.generic_gateway_configured ? "configured" : "built-in adapters only"}</span></div>
      </div>

      <div className="p-4 md:p-5">
        <div className="flex items-center justify-between gap-3 mb-4"><div><p className="eyebrow">Approval & delivery queue</p><p className="text-xs text-muted-foreground mt-1">Content approval and public publication approval are separate.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em]"><RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh</button></div>
        {loading ? <div className="py-12 text-center text-sm text-muted-foreground"><Loader2 size={20} className="animate-spin mx-auto mb-2" />Loading publishing queue…</div> : queue.length === 0 ? <div className="border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">No unpublished social items are available.</div> : <div className="space-y-3">
          {queue.slice(0, 40).map((item) => {
            const compatibleJobs = renderJobs.filter((job) => job.render_type === item.content_type);
            const canAttach = ["reel", "carousel"].includes(item.content_type) && !["publishing", "published"].includes(item.status);
            return <article key={item.id} className="border border-border/60 bg-background/30 p-4">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="border border-gold/35 text-gold px-2 py-1 text-[8px] uppercase tracking-[0.13em]">{item.platform}</span><span className="border border-border/60 px-2 py-1 text-[8px] uppercase tracking-[0.13em]">{item.content_type.replace("_", " ")}</span><span className="border border-border/60 px-2 py-1 text-[8px] uppercase tracking-[0.13em]">{item.status}</span>{item.publish_approved_at && <span className="border border-emerald-500/35 text-emerald-300 px-2 py-1 text-[8px] uppercase tracking-[0.13em]">public approval</span>}</div><h3 className="font-display text-xl mt-2">{item.title}</h3><p className="text-xs text-foreground/60 mt-2 line-clamp-2">{item.caption}</p>{item.error && <p className="text-xs text-destructive mt-2">{item.error}</p>}<div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[10px] text-muted-foreground"><span>Attempts {item.publish_attempts}/{item.max_attempts}</span><span>Render {item.render_verified ? "verified" : "not verified"}</span>{item.scheduled_at && <span>Scheduled {new Date(item.scheduled_at).toLocaleString()}</span>}</div>{item.external_post_url && <a href={item.external_post_url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 text-xs text-gold"><ExternalLink size={12} /> Open verified post</a>}</div>
                <div className="w-full lg:w-[22rem] space-y-3">
                  {canAttach && <div className="flex gap-2"><select value={renderChoice[item.id] || ""} onChange={(event) => setRenderChoice((current) => ({ ...current, [item.id]: event.target.value }))} className="min-h-10 flex-1 bg-background border border-border/60 px-2 text-xs"><option value="">Choose verified {item.content_type} render</option>{compatibleJobs.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}</select><button type="button" onClick={() => void attachRender(item)} disabled={busy !== null || !renderChoice[item.id]} className="min-h-10 border border-border/60 px-3 text-[9px] uppercase tracking-[0.12em] disabled:opacity-40">Attach</button></div>}
                  <div className="grid grid-cols-[1fr_9rem] gap-2"><input type="datetime-local" value={scheduleChoice[item.id] || ""} onChange={(event) => setScheduleChoice((current) => ({ ...current, [item.id]: event.target.value }))} className="min-h-10 bg-background border border-border/60 px-2 text-xs" /><select value={modeChoice[item.id] || "automatic"} onChange={(event) => setModeChoice((current) => ({ ...current, [item.id]: event.target.value as "manual" | "automatic" }))} className="min-h-10 bg-background border border-border/60 px-2 text-xs"><option value="automatic">Automatic</option><option value="manual">Manual</option></select></div>
                  <div className="flex gap-2"><button type="button" onClick={() => void approvePublication(item)} disabled={busy !== null || !item.approved_at || ["publishing", "published"].includes(item.status)} className="min-h-10 flex-1 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-3 text-[9px] uppercase tracking-[0.13em] disabled:opacity-40">{busy === `approve:${item.id}` ? <Loader2 size={12} className="animate-spin" /> : <CalendarClock size={12} />} Approve publication</button>{item.publish_approved_at && <button type="button" onClick={() => void revoke(item)} disabled={busy !== null || item.status === "publishing"} className="min-h-10 border border-destructive/40 text-destructive px-3 text-[9px] uppercase tracking-[0.12em] disabled:opacity-40">Revoke</button>}</div>
                </div>
              </div>
            </article>;
          })}
        </div>}
      </div>

      {runs.length > 0 && <div className="p-4 md:p-5 border-t border-border/60"><p className="eyebrow mb-3">Recent scheduler evidence</p><div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">{runs.slice(0, 6).map((run) => <article key={run.id} className="border border-border/60 bg-background/30 p-3"><div className="flex items-center justify-between gap-3"><span className="text-[9px] uppercase tracking-[0.13em] text-gold">{run.trigger_source}</span><span className="text-[9px] uppercase tracking-[0.13em]">{run.status}</span></div><p className="text-xs text-muted-foreground mt-2">{new Date(run.started_at).toLocaleString()}</p><div className="grid grid-cols-4 gap-2 mt-3 text-center"><Small value={run.claimed_count} label="Claimed" /><Small value={run.published_count} label="Published" /><Small value={run.manual_count} label="Manual" /><Small value={run.failed_count} label="Failed" /></div></article>)}</div></div>}
    </section>
  );
}

function Small({ value, label }: { value: number; label: string }) {
  return <div><p className="font-display text-lg">{value}</p><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p></div>;
}

function toLocal(value: string) {
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60_000).toISOString().slice(0, 16);
}
