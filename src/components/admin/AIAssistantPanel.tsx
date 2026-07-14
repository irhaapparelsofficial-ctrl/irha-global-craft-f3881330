import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Copy,
  DatabaseZap,
  Globe2,
  HelpCircle,
  Loader2,
  Megaphone,
  Play,
  PlugZap,
  RefreshCw,
  Search,
  Send,
  ShieldCheck,
  Sparkles,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type AgentTab = "command" | "approvals" | "activity" | "connections";

type AiRun = {
  id: string;
  command: string;
  mode: string;
  status: string;
  reply: string | null;
  created_at: string;
  updated_at: string;
};

type AiAction = {
  id: string;
  run_id: string;
  action_type: string;
  title: string;
  description: string | null;
  status: string;
  risk_level: "low" | "medium" | "high";
  requires_approval: boolean;
  payload: Record<string, unknown>;
  result: Record<string, unknown>;
  error: string | null;
  approved_at: string | null;
  executed_at: string | null;
  created_at: string;
};

type Capability = {
  key: string;
  label: string;
  configured: boolean;
  verified: boolean;
  publish_capable: boolean;
  note: string;
  details?: unknown;
};

type HealthResponse = {
  ok?: boolean;
  checked_at?: string;
  schema?: { ready?: boolean; tables?: Record<string, { ready: boolean; error?: string }> };
  capabilities?: Capability[];
  error?: string;
};

type LiveSnapshot = {
  checked_at?: string;
  timezone?: string;
  recorded_blockers?: string[];
  catalogue?: {
    published_products?: number;
    published_categories?: number;
    verified_media_assets?: number;
  };
  crm?: {
    total_buyer_records?: number;
    open_tasks?: number;
    overdue_tasks?: number;
    overdue_followups?: number;
  };
  lead_engine?: {
    candidate_statuses?: Record<string, number>;
    campaign_statuses?: Record<string, number>;
  };
  outreach?: { message_statuses?: Record<string, number> };
  social?: { item_statuses?: Record<string, number>; scheduled_draft_generation?: boolean };
  operations?: {
    control?: { last_heartbeat_at?: string; enabled?: boolean };
    latest_run?: { status?: string; action?: string; duration_ms?: number };
  };
};

type AgentResponse = { ok?: boolean; run?: AiRun; actions?: AiAction[]; error?: string };

const QUICK_COMMANDS = [
  {
    label: "Real situation",
    icon: DatabaseZap,
    command: "Hamari real current situation batao. Operational, Needs Owner Approval, Blocked aur Unknown ko alag rakho. Live counts aur evidence timestamp do.",
  },
  {
    label: "Daily owner brief",
    icon: Activity,
    command: "Aaj ka Irha Apparels owner brief banao. Buyer Inbox, overdue tasks, lead review, quotations, samples, outreach, social, SEO, production aur blockers ko live data se summarize kro. Top 5 actions do.",
  },
  {
    label: "CRM tutorial",
    icon: Users,
    command: "Buyer CRM ka complete step-by-step tutorial do. Buyer Inbox, Pipeline, Buyer 360, tasks, follow-ups, files, quotation handoff aur duplicate review ke exact routes include kro.",
  },
  {
    label: "Lead campaign",
    icon: Search,
    command: "Germany, Austria aur Switzerland se 50 Lederhosen, Dirndl aur Trachten wholesalers, importers, distributors aur specialist retailers find kro. Evidence aur duplicate checks save kro. Koi outreach automatically mat kro.",
  },
  {
    label: "Social status",
    icon: Megaphone,
    command: "Social system ki real current situation batao. Drafts, approvals, published posts, verified accounts, renderer aur blockers live data se batao.",
  },
  {
    label: "Website tutorial",
    icon: Globe2,
    command: "Website aur catalogue ka complete tutorial do. Products, Categories, Media Library, Catalogue, Website Editor, drafts, publishing, rollback aur Production Health ke exact routes do.",
  },
  {
    label: "Production workflow",
    icon: ShieldCheck,
    command: "Production workflow ka complete tutorial do. Job, specification, materials, operations, sample decision, QC evidence, rework, shipping, delivery aur closeout ke steps do.",
  },
  {
    label: "System blockers",
    icon: AlertTriangle,
    command: "System mein kya blocked ya missing hai? Email, WhatsApp, social accounts, Search Console, renderer, cron, database aur public website ko live evidence se check kro. Setup routes do.",
  },
];

const actionLabels: Record<string, string> = {
  social_content_pack: "Social content pack",
  social_publish: "Social publish",
  lead_campaign_plan: "Lead campaign",
  listing_task: "Listing task",
  buyer_reply_draft: "Buyer reply draft",
  seo_localization_plan: "Multilingual SEO",
  weekly_growth_plan: "Growth plan",
  outreach_campaign_plan: "Outreach campaign",
};

const db = supabase as any;

export default function AIAssistantPanel() {
  const [tab, setTab] = useState<AgentTab>("command");
  const [command, setCommand] = useState("");
  const [running, setRunning] = useState(false);
  const [executingId, setExecutingId] = useState<string | null>(null);
  const [runs, setRuns] = useState<AiRun[]>([]);
  const [actions, setActions] = useState<AiAction[]>([]);
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [snapshot, setSnapshot] = useState<LiveSnapshot | null>(null);
  const [knowledgeCount, setKnowledgeCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [migrationReady, setMigrationReady] = useState(true);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [runsResult, actionsResult, snapshotResult, knowledgeResult] = await Promise.all([
      db.from("ai_runs").select("*").order("created_at", { ascending: false }).limit(30),
      db.from("ai_actions").select("*").order("created_at", { ascending: false }).limit(120),
      db.rpc("admin_ai_get_live_snapshot"),
      db.from("admin_ai_knowledge").select("id", { count: "exact", head: true }).eq("is_active", true),
    ]);

    const migrationError = [runsResult.error, actionsResult.error, snapshotResult.error, knowledgeResult.error].find(isMigrationError);
    if (migrationError) {
      setMigrationReady(false);
      setRuns([]);
      setActions([]);
      setSnapshot(null);
      setKnowledgeCount(0);
    } else {
      setMigrationReady(true);
      if (runsResult.error) toast({ title: "AI history could not load", description: runsResult.error.message, variant: "destructive" });
      if (actionsResult.error) toast({ title: "AI actions could not load", description: actionsResult.error.message, variant: "destructive" });
      if (snapshotResult.error) toast({ title: "Live situation could not load", description: snapshotResult.error.message, variant: "destructive" });
      const nextRuns = (runsResult.data ?? []) as AiRun[];
      setRuns(nextRuns);
      setActions(((actionsResult.data ?? []) as AiAction[]).map(normalizeAction));
      setSnapshot((snapshotResult.data ?? null) as LiveSnapshot | null);
      setKnowledgeCount(knowledgeResult.count ?? 0);
      if (!lastReply && nextRuns[0]?.reply) setLastReply(nextRuns[0].reply);
    }
    setLoading(false);
  };

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("admin-agent-health", { body: {} });
    if (error) {
      setHealth({ error: error.message });
      return;
    }
    setHealth((data ?? {}) as HealthResponse);
  };

  useEffect(() => {
    void Promise.all([loadData(), loadHealth()]);
  }, []);

  const pending = useMemo(
    () => actions.filter((action) => action.requires_approval && ["proposed", "failed"].includes(action.status)),
    [actions],
  );
  const failedCount = useMemo(() => actions.filter((action) => action.status === "failed").length, [actions]);
  const verifiedConnections = health?.capabilities?.filter((item) => item.verified).length ?? 0;
  const candidateStatuses = snapshot?.lead_engine?.candidate_statuses ?? {};
  const outreachStatuses = snapshot?.outreach?.message_statuses ?? {};
  const socialStatuses = snapshot?.social?.item_statuses ?? {};
  const blockerCount = snapshot?.recorded_blockers?.length ?? 0;

  const runCommand = async (value = command) => {
    const prompt = value.trim();
    if (!prompt || running) return;
    if (!migrationReady) {
      toast({ title: "Admin AI backend is not ready", description: "Apply the current Business Brain migrations before running commands.", variant: "destructive" });
      return;
    }

    setRunning(true);
    setCommand("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-agent", { body: { command: prompt, mode: "operate" } });
      if (error) throw error;
      const response = (data ?? {}) as AgentResponse;
      if (!response.ok) throw new Error(response.error || "Admin AI did not return a response");
      setLastReply(response.run?.reply || "Response prepared.");
      toast({ title: "Admin AI response ready", description: "Live business context and the checked timestamp were saved in audit history." });
      await loadData();
    } catch (error) {
      toast({ title: "Admin AI command failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const executeAction = async (action: AiAction) => {
    if (executingId) return;
    const message = action.action_type === "social_publish"
      ? "Approve and run this social action? Exact channel results will be logged."
      : "Approve and run this external-write action?";
    if (!window.confirm(message)) return;

    setExecutingId(action.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-agent-execute", { body: { action_id: action.id } });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.result?.error || data?.error || "Action did not complete");
      toast({ title: "Approved action completed", description: executionSummary(data?.result) });
      await Promise.all([loadData(), loadHealth()]);
    } catch (error) {
      toast({ title: "Action failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
      await loadData();
    } finally {
      setExecutingId(null);
    }
  };

  const rejectAction = async (action: AiAction) => {
    if (!window.confirm("Reject this proposed action?")) return;
    const { error } = await db.from("ai_actions").update({ status: "rejected", error: null }).eq("id", action.id);
    if (error) {
      toast({ title: "Could not reject action", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "Action rejected" });
    await loadData();
  };

  const copyValue = async (value: unknown, label = "Content") => {
    const text = typeof value === "string" ? value : JSON.stringify(value, null, 2);
    await navigator.clipboard.writeText(text);
    toast({ title: `${label} copied` });
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold mb-3"><BrainCircuit size={15} /> Irha Admin AI</div>
            <h2 className="font-display text-3xl md:text-4xl">Live Business Brain</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              Ask in Roman Urdu or English. AI reads a PII-free live database snapshot, approved Business Rules and versioned tutorials. It separates Operational, Needs Owner Approval, Blocked and Unknown, and stores every response with its evidence timestamp.
            </p>
          </div>
          <button type="button" onClick={() => void Promise.all([loadData(), loadHealth()])} className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh live data
          </button>
        </div>
      </section>

      {!migrationReady && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-xl">Business Brain migration required</h3>
            <p className="text-xs text-foreground/70 mt-2">The AI knowledge base or live snapshot function is unavailable. Apply the current Supabase migrations before using commands.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-8 gap-3">
        <Metric label="Products" value={snapshot?.catalogue?.published_products ?? 0} icon={<Sparkles size={15} />} />
        <Metric label="Buyers" value={snapshot?.crm?.total_buyer_records ?? 0} icon={<Users size={15} />} />
        <Metric label="Lead review" value={candidateStatuses.needs_review ?? 0} icon={<Search size={15} />} emphasis={(candidateStatuses.needs_review ?? 0) > 0} />
        <Metric label="Open tasks" value={snapshot?.crm?.open_tasks ?? 0} icon={<Clock3 size={15} />} />
        <Metric label="Outreach drafts" value={(outreachStatuses.draft ?? 0) + (outreachStatuses.manual_required ?? 0)} icon={<Send size={15} />} />
        <Metric label="Social drafts" value={socialStatuses.draft ?? 0} icon={<Megaphone size={15} />} />
        <Metric label="AI knowledge" value={knowledgeCount} icon={<HelpCircle size={15} />} />
        <Metric label="Blockers" value={blockerCount} icon={<AlertTriangle size={15} />} emphasis={blockerCount > 0} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {([
          ["command", "Ask AI", BrainCircuit],
          ["approvals", `Approvals (${pending.length})`, ShieldCheck],
          ["activity", "Audit history", Activity],
          ["connections", "Connections", PlugZap],
        ] as const).map(([key, label, Icon]) => (
          <button key={key} type="button" onClick={() => setTab(key)} className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] border ${tab === key ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === "command" && (
        <div className="grid xl:grid-cols-12 gap-6">
          <section className="xl:col-span-7 border border-border/60 bg-card/30 p-5 md:p-6">
            <p className="eyebrow mb-2">Ask about the real business</p>
            <p className="text-xs text-muted-foreground mb-4">Ask for status, blockers, a tutorial, a buyer workflow, a campaign or a grounded draft.</p>
            <textarea
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  void runCommand();
                }
              }}
              rows={6}
              placeholder="Example: Hamari real current situation batao…"
              disabled={running || !migrationReady}
              className="w-full bg-background/70 border border-border/60 focus:border-gold outline-none p-4 text-sm resize-y disabled:opacity-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[10px] text-muted-foreground">Enter to run · Shift+Enter for new line</p>
              <button type="button" onClick={() => void runCommand()} disabled={running || !command.trim() || !migrationReady} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-[10px] uppercase tracking-[0.25em] hover:shadow-gold disabled:opacity-40">
                {running ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {running ? "Reading live data…" : "Ask Admin AI"}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 mt-6">
              {QUICK_COMMANDS.map(({ label, icon: Icon, command: value }) => (
                <button key={label} type="button" onClick={() => void runCommand(value)} disabled={running || !migrationReady} className="text-left border border-border/60 bg-background/30 p-3 hover:border-gold/70 transition-colors disabled:opacity-40">
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Icon size={12} /> {label}</span>
                  <span className="block text-xs text-foreground/65 mt-2 line-clamp-2">{value}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="xl:col-span-5 border border-border/60 bg-card/30 p-5 md:p-6 min-h-[360px]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="eyebrow">Latest response</p>
              {lastReply && <button type="button" onClick={() => void copyValue(lastReply, "Response")} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-gold"><Copy size={11} /> Copy</button>}
            </div>
            {running ? (
              <div className="h-64 flex flex-col items-center justify-center text-center"><Loader2 size={24} className="text-gold animate-spin" /><p className="text-sm text-foreground/70 mt-3">Reading live business data and verified instructions…</p></div>
            ) : lastReply ? (
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{lastReply}</p>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground"><DatabaseZap size={26} className="mb-3 text-gold/70" /><p className="text-sm max-w-sm">Start with “Hamari real current situation batao.”</p></div>
            )}
            <div className="border-t border-border/50 mt-5 pt-4 text-[10px] text-muted-foreground space-y-1">
              <p>Snapshot checked: {snapshot?.checked_at ? new Date(snapshot.checked_at).toLocaleString() : "not available"}</p>
              <p>Last heartbeat: {snapshot?.operations?.control?.last_heartbeat_at ? new Date(snapshot.operations.control.last_heartbeat_at).toLocaleString() : "not recorded"}</p>
            </div>
          </section>
        </div>
      )}

      {tab === "approvals" && (
        <section>
          <SectionHeader title="Approval queue" note="External writes and owner-controlled actions remain here until exact approval." />
          {pending.length === 0 ? <Empty icon={<ShieldCheck size={26} />} title="No pending approvals" body="Approval-gated actions will appear here." /> : <ActionGrid actions={pending} executingId={executingId} onExecute={executeAction} onReject={rejectAction} onCopy={copyValue} />}
        </section>
      )}

      {tab === "activity" && (
        <section className="space-y-5">
          <SectionHeader title="AI audit history" note="Every command stores its live context snapshot, reply and checked time." />
          {loading ? <p className="text-sm text-muted-foreground py-10 text-center">Loading activity…</p> : runs.length === 0 ? <Empty icon={<Clock3 size={26} />} title="No AI runs yet" body="Your command history will appear after the first successful run." /> : (
            <div className="space-y-3">
              {runs.map((run) => {
                const runActions = actions.filter((action) => action.run_id === run.id);
                return (
                  <details key={run.id} className="group border border-border/60 bg-card/30 p-4 md:p-5">
                    <summary className="list-none cursor-pointer flex items-start justify-between gap-4">
                      <div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={run.status} /><span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span></div><h3 className="font-display text-lg mt-2 line-clamp-2">{run.command}</h3></div>
                      <span className="text-xs text-gold shrink-0">{runActions.length} action{runActions.length === 1 ? "" : "s"}</span>
                    </summary>
                    <div className="mt-5 border-t border-border/50 pt-5 space-y-4">{run.reply && <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{run.reply}</p>}<ActionGrid actions={runActions} executingId={executingId} onExecute={executeAction} onReject={rejectAction} onCopy={copyValue} compact /></div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "connections" && (
        <section className="space-y-5">
          <SectionHeader title="Runtime capabilities" note="Configured, verified and publish-capable are separate states. Use the live blocker command for the newest operating answer." />
          {health?.error ? <div className="border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">{health.error}</div> : !health ? <p className="text-sm text-muted-foreground py-10 text-center">Checking runtime capabilities…</p> : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {(health.capabilities ?? []).map((capability) => (
                <div key={capability.key} className="border border-border/60 bg-card/30 p-5">
                  <div className="flex items-start justify-between gap-3"><h3 className="font-display text-xl">{capability.label}</h3>{capability.verified ? <CheckCircle2 size={16} className="text-emerald-400" /> : capability.configured ? <Clock3 size={16} className="text-amber-400" /> : <XCircle size={16} className="text-muted-foreground" />}</div>
                  <div className="flex flex-wrap gap-2 mt-4"><SmallFlag label="Configured" active={capability.configured} /><SmallFlag label="Verified" active={capability.verified} /><SmallFlag label="Publish-capable" active={capability.publish_capable} /></div>
                  <p className="text-xs text-foreground/65 mt-4 leading-relaxed">{capability.note}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}

function ActionGrid({ actions, executingId, onExecute, onReject, onCopy, compact = false }: { actions: AiAction[]; executingId: string | null; onExecute: (action: AiAction) => Promise<void>; onReject: (action: AiAction) => Promise<void>; onCopy: (value: unknown, label?: string) => Promise<void>; compact?: boolean }) {
  if (actions.length === 0) return compact ? null : <Empty icon={<Sparkles size={24} />} title="No generated actions" body="Approval tasks created by supported workflows will appear here." />;
  return (
    <div className={compact ? "space-y-3" : "grid lg:grid-cols-2 gap-4"}>
      {actions.map((action) => {
        const output = Object.keys(action.result ?? {}).length > 0 ? action.result : action.payload;
        const canExecute = action.requires_approval && ["proposed", "failed"].includes(action.status);
        return (
          <article key={action.id} className="border border-border/60 bg-card/30 p-5">
            <div className="flex items-start justify-between gap-4"><div><div className="flex flex-wrap items-center gap-2"><StatusBadge status={action.status} /><span className="text-[9px] uppercase tracking-[0.16em] text-gold/80">{actionLabels[action.action_type] || action.action_type.replace(/_/g, " ")}</span><span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{action.risk_level} risk</span></div><h3 className="font-display text-xl mt-2">{action.title}</h3></div><button type="button" onClick={() => void onCopy(output, action.title)} className="p-2 text-muted-foreground hover:text-gold" aria-label="Copy action"><Copy size={14} /></button></div>
            {action.description && <p className="text-xs text-foreground/65 mt-3 leading-relaxed">{action.description}</p>}
            <pre className={`mt-4 text-[11px] leading-relaxed text-foreground/75 whitespace-pre-wrap break-words border border-border/40 bg-background/40 p-3 overflow-auto ${compact ? "max-h-48" : "max-h-72"}`}>{JSON.stringify(output, null, 2)}</pre>
            {action.error && <p className="text-xs text-destructive mt-3">{action.error}</p>}
            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap"><span className="text-[10px] text-muted-foreground">Created {new Date(action.created_at).toLocaleString()}</span>{canExecute && <div className="flex gap-2"><button type="button" onClick={() => void onReject(action)} disabled={executingId === action.id} className="border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-destructive hover:text-destructive disabled:opacity-40">Reject</button><button type="button" onClick={() => void onExecute(action)} disabled={executingId !== null} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">{executingId === action.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Approve & run</button></div>}</div>
          </article>
        );
      })}
    </div>
  );
}

function Metric({ label, value, icon, emphasis }: { label: string; value: number; icon: ReactNode; emphasis?: boolean }) {
  return <div className={`border p-4 ${emphasis ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-card/30"}`}><div className="flex items-center justify-between gap-3 text-muted-foreground"><span className="text-[9px] uppercase tracking-[0.2em]">{label}</span>{icon}</div><p className="font-display text-3xl mt-2">{value}</p></div>;
}

function SectionHeader({ title, note }: { title: string; note: string }) {
  return <div className="mb-4"><h2 className="font-display text-2xl">{title}</h2><p className="text-xs text-muted-foreground mt-1">{note}</p></div>;
}

function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return <div className="border border-dashed border-border/60 py-14 px-6 text-center text-muted-foreground"><div className="flex justify-center text-gold/70 mb-3">{icon}</div><h3 className="font-display text-xl text-foreground">{title}</h3><p className="text-xs mt-2">{body}</p></div>;
}

function SmallFlag({ label, active }: { label: string; active: boolean }) {
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.12em] ${active ? "border-emerald-500/30 bg-emerald-500/5 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>{label}</span>;
}

function StatusBadge({ status }: { status: string }) {
  const positive = ["completed", "published", "sent", "active"].includes(status);
  const negative = ["failed", "rejected", "cancelled"].includes(status);
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${positive ? "border-emerald-500/30 text-emerald-300" : negative ? "border-destructive/40 text-destructive" : "border-amber-500/30 text-amber-300"}`}>{status.replace(/_/g, " ")}</span>;
}

function normalizeAction(action: AiAction): AiAction {
  return { ...action, payload: action.payload ?? {}, result: action.result ?? {} };
}

function isMigrationError(error: unknown): error is { message: string } {
  if (!error || typeof error !== "object") return false;
  const message = String((error as { message?: string }).message ?? "").toLowerCase();
  return message.includes("does not exist") || message.includes("schema cache") || message.includes("could not find the table") || message.includes("could not find the function");
}

function executionSummary(result: unknown) {
  if (!result || typeof result !== "object") return "The action completed and its result was logged.";
  const value = result as Record<string, unknown>;
  if (value.external_execution === true) return "External execution was reported and logged.";
  if (value.internal_registry_only === true) return "Internal registry updated; no external platform change was claimed.";
  return String(value.note || value.operation || "The action completed and its result was logged.");
}
