import { useCallback, useEffect, useMemo, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Clock3, Play, RefreshCw, RotateCcw, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type AutomationSettings = {
  enabled: boolean;
  timezone: string;
  daily_run_time: string;
  daily_lead_candidate_limit: number;
  daily_seo_draft_limit: number;
  daily_listing_task_limit: number;
  daily_social_draft_limit: number;
  weekly_reel_target: number;
  lead_auto_import: boolean;
  seo_auto_publish: boolean;
  external_listing_publish: boolean;
  social_auto_publish: boolean;
  last_run_at: string | null;
  next_run_at: string | null;
};

type AutomationRun = {
  id: string;
  trigger_source: string;
  status: string;
  external_execution: boolean;
  summary: Record<string, unknown> | null;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

type AutomationTask = {
  id: string;
  module: string;
  action: string;
  title: string;
  status: string;
  requires_approval: boolean;
  external_action: boolean;
  error: string | null;
  created_at: string;
};

type BusinessRules = {
  version: number;
  status: string;
  approved_at: string | null;
  updated_at: string;
};

type Snapshot = {
  settings: AutomationSettings | null;
  runs: AutomationRun[];
  tasks: AutomationTask[];
  rules: BusinessRules | null;
};

const emptySnapshot: Snapshot = { settings: null, runs: [], tasks: [], rules: null };

export default function AutomationControlCenter() {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [actingTaskId, setActingTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const load = useCallback(async () => {
    const db = supabase as any;
    const [settingsResult, runsResult, tasksResult, rulesResult] = await Promise.all([
      db.from("automation_settings").select("enabled,timezone,daily_run_time,daily_lead_candidate_limit,daily_seo_draft_limit,daily_listing_task_limit,daily_social_draft_limit,weekly_reel_target,lead_auto_import,seo_auto_publish,external_listing_publish,social_auto_publish,last_run_at,next_run_at").eq("id", "default").maybeSingle(),
      db.from("automation_runs").select("id,trigger_source,status,external_execution,summary,error,started_at,completed_at").order("started_at", { ascending: false }).limit(8),
      db.from("automation_tasks").select("id,module,action,title,status,requires_approval,external_action,error,created_at").order("created_at", { ascending: false }).limit(50),
      db.from("ai_business_rules").select("version,status,approved_at,updated_at").eq("id", "default").maybeSingle(),
    ]);

    const queryError = settingsResult.error || runsResult.error || tasksResult.error || rulesResult.error;
    if (queryError) {
      setError(queryError.message || "Automation data could not load");
      setLoading(false);
      return;
    }

    setSnapshot({
      settings: settingsResult.data as AutomationSettings | null,
      runs: (runsResult.data as AutomationRun[]) || [],
      tasks: (tasksResult.data as AutomationTask[]) || [],
      rules: rulesResult.data as BusinessRules | null,
    });
    setError(null);
    setLoading(false);
    setLastSync(new Date());
  }, []);

  useEffect(() => {
    void load();
    const interval = window.setInterval(() => void load(), 30_000);
    return () => window.clearInterval(interval);
  }, [load]);

  const runPlanningCycle = async () => {
    setRunning(true);
    setError(null);
    const db = supabase as any;
    const { error: rpcError } = await db.rpc("create_automation_planning_cycle", { _trigger_source: "manual" });
    if (rpcError) setError(rpcError.message || "Planning cycle failed");
    await load();
    setRunning(false);
  };

  const updateTaskStatus = async (task: AutomationTask, nextStatus: "approved" | "ready_for_review" | "cancelled") => {
    if (task.external_action && nextStatus === "approved") {
      toast({
        title: "External execution remains blocked",
        description: "Reviewing this task does not authorize an email, public post, SEO publication or listing change.",
        variant: "destructive",
      });
      return;
    }

    setActingTaskId(task.id);
    const db = supabase as any;
    const values: Record<string, unknown> = { status: nextStatus };
    if (nextStatus === "ready_for_review") values.error = null;
    const { error: updateError } = await db.from("automation_tasks").update(values).eq("id", task.id);

    if (updateError) {
      toast({ title: "Task update failed", description: updateError.message, variant: "destructive" });
    } else {
      const title = nextStatus === "approved" ? "Task approved for internal processing" : nextStatus === "cancelled" ? "Task cancelled" : "Task returned to review queue";
      toast({ title, description: "No external action was executed." });
    }
    await load();
    setActingTaskId(null);
  };

  const taskCounts = useMemo(() => {
    const result: Record<string, number> = {};
    snapshot.tasks.forEach((task) => {
      if (!["cancelled", "executed"].includes(task.status)) result[task.module] = (result[task.module] || 0) + 1;
    });
    return result;
  }, [snapshot.tasks]);

  const activeTasks = snapshot.tasks.filter((task) => !["cancelled", "executed"].includes(task.status));
  const pending = activeTasks.filter((task) => ["draft", "ready_for_review", "approved"].includes(task.status)).length;
  const failed = activeTasks.filter((task) => task.status === "failed" || Boolean(task.error)).length;
  const rulesApproved = snapshot.rules?.status === "approved";
  const safeMode = !rulesApproved;

  return (
    <section className="border border-border/60 bg-card/30 p-4 sm:p-6 space-y-5" aria-labelledby="automation-control-title">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">AI Growth Engine</p>
          <h2 id="automation-control-title" className="font-display text-2xl">Automation Control Center</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Daily lead, SEO, listing, social and Canva planning. Review controls update internal task state only; they never send or publish externally.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button type="button" onClick={() => void runPlanningCycle()} disabled={running || !snapshot.settings?.enabled} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-background px-4 py-2 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">
            <Play size={13} /> {running ? "Running…" : "Run planning cycle"}
          </button>
        </div>
      </div>

      {error && <div className="border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive flex items-start gap-2"><AlertTriangle size={16} className="mt-0.5 shrink-0" /><span>{error}</span></div>}

      <div className="grid sm:grid-cols-2 xl:grid-cols-5 gap-3">
        <StatusCard label="Engine" value={snapshot.settings?.enabled ? "Enabled" : "Disabled"} tone={snapshot.settings?.enabled ? "good" : "warn"} />
        <StatusCard label="Safety mode" value={safeMode ? "Plan only" : "Rules approved"} tone={safeMode ? "warn" : "good"} />
        <StatusCard label="Review queue" value={String(pending)} tone={pending > 0 ? "warn" : "good"} />
        <StatusCard label="Failed tasks" value={String(failed)} tone={failed > 0 ? "bad" : "good"} />
        <StatusCard label="External execution" value="Disabled" tone="good" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="border border-border/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-gold"><Clock3 size={15} /><p className="text-xs uppercase tracking-[0.18em]">Daily schedule</p></div>
          <Detail label="Timezone" value={snapshot.settings?.timezone || "—"} />
          <Detail label="Run time" value={snapshot.settings?.daily_run_time || "—"} />
          <Detail label="Last run" value={formatDate(snapshot.settings?.last_run_at)} />
          <Detail label="Next run" value={formatDate(snapshot.settings?.next_run_at)} />
          <Detail label="Last admin sync" value={lastSync ? lastSync.toLocaleTimeString() : "—"} />
        </div>

        <div className="border border-border/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-gold"><ShieldCheck size={15} /><p className="text-xs uppercase tracking-[0.18em]">Guardrails</p></div>
          <Detail label="Business Rules" value={snapshot.rules ? `${snapshot.rules.status} · v${snapshot.rules.version}` : "Missing"} />
          <Detail label="Lead auto-import" value={yesNo(snapshot.settings?.lead_auto_import)} />
          <Detail label="SEO auto-publish" value={yesNo(snapshot.settings?.seo_auto_publish)} />
          <Detail label="Listing auto-publish" value={yesNo(snapshot.settings?.external_listing_publish)} />
          <Detail label="Social auto-publish" value={yesNo(snapshot.settings?.social_auto_publish)} />
        </div>

        <div className="border border-border/50 p-4 space-y-3">
          <div className="flex items-center gap-2 text-gold"><Activity size={15} /><p className="text-xs uppercase tracking-[0.18em]">Current workload</p></div>
          {Object.keys(taskCounts).length === 0 ? <p className="text-xs text-muted-foreground">No active automation tasks.</p> : Object.entries(taskCounts).map(([module, count]) => <Detail key={module} label={module} value={String(count)} />)}
        </div>
      </div>

      <div className="grid xl:grid-cols-2 gap-4">
        <div className="border border-border/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] mb-3">Recent runs</p>
          {snapshot.runs.length === 0 ? <Empty text="No planning run recorded." /> : <div className="space-y-2">{snapshot.runs.map((run) => (
            <div key={run.id} className="border-b border-border/30 pb-2 last:border-0 text-xs flex items-start justify-between gap-3">
              <div className="min-w-0"><p className="capitalize">{run.trigger_source} · {run.status}</p><p className="text-muted-foreground mt-1">{new Date(run.started_at).toLocaleString()}</p>{run.error && <p className="text-destructive mt-1 break-words">{run.error}</p>}</div>
              <span className="shrink-0 text-[9px] uppercase tracking-[0.16em] text-muted-foreground">external: {run.external_execution ? "yes" : "no"}</span>
            </div>
          ))}</div>}
        </div>

        <div className="border border-border/50 p-4">
          <p className="text-xs uppercase tracking-[0.18em] mb-3">Task review queue</p>
          {activeTasks.length === 0 ? <Empty text="No tasks are waiting." /> : <div className="space-y-3 max-h-[32rem] overflow-y-auto pr-1">{activeTasks.slice(0, 20).map((task) => {
            const busy = actingTaskId === task.id;
            const canApprove = ["draft", "ready_for_review"].includes(task.status) && !task.external_action;
            const canRetry = ["failed", "blocked"].includes(task.status) || Boolean(task.error);
            return (
              <div key={task.id} className="border border-border/40 p-3 text-xs">
                <div className="flex items-start justify-between gap-3"><p className="leading-relaxed">{task.title}</p><span className="shrink-0 text-[9px] uppercase tracking-[0.14em] text-gold">{task.status.replaceAll("_", " ")}</span></div>
                <p className="mt-1 text-muted-foreground capitalize">{task.module} · {task.action.replaceAll("_", " ")} · approval {task.requires_approval ? "required" : "not required"}</p>
                {task.external_action && <p className="mt-2 text-amber-400">External action: execution remains blocked.</p>}
                {task.error && <p className="mt-2 text-destructive">{task.error}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {canApprove && <button type="button" disabled={busy} onClick={() => void updateTaskStatus(task, "approved")} className="min-h-9 inline-flex items-center gap-2 border border-emerald-500/40 px-3 text-[9px] uppercase tracking-[0.14em] text-emerald-400 disabled:opacity-40"><CheckCircle2 size={11} /> Approve internal</button>}
                  {canRetry && <button type="button" disabled={busy} onClick={() => void updateTaskStatus(task, "ready_for_review")} className="min-h-9 inline-flex items-center gap-2 border border-amber-500/40 px-3 text-[9px] uppercase tracking-[0.14em] text-amber-400 disabled:opacity-40"><RotateCcw size={11} /> Retry review</button>}
                  <button type="button" disabled={busy} onClick={() => void updateTaskStatus(task, "cancelled")} className="min-h-9 inline-flex items-center gap-2 border border-border/60 px-3 text-[9px] uppercase tracking-[0.14em] text-muted-foreground disabled:opacity-40"><XCircle size={11} /> Cancel</button>
                </div>
              </div>
            );
          })}</div>}
        </div>
      </div>
    </section>
  );
}

function StatusCard({ label, value, tone }: { label: string; value: string; tone: "good" | "warn" | "bad" }) {
  const toneClass = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-500" : "text-destructive";
  return <div className="border border-border/50 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className={`font-display text-xl mt-2 ${toneClass}`}>{value}</p></div>;
}

function Detail({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start justify-between gap-3 text-xs border-b border-border/20 pb-2 last:border-0"><span className="text-muted-foreground capitalize">{label}</span><span className="text-right break-words">{value}</span></div>;
}

function Empty({ text }: { text: string }) { return <p className="text-xs text-muted-foreground py-4">{text}</p>; }
function yesNo(value: boolean | undefined) { return value ? "Enabled" : "Disabled"; }
function formatDate(value: string | null | undefined) { return value ? new Date(value).toLocaleString() : "—"; }
