import { useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  Activity,
  AlertTriangle,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Copy,
  Globe2,
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
  schema?: {
    ready?: boolean;
    tables?: Record<string, { ready: boolean; error?: string }>;
  };
  capabilities?: Capability[];
  error?: string;
};

type AgentResponse = {
  ok?: boolean;
  run?: AiRun;
  actions?: AiAction[];
  error?: string;
};

const QUICK_COMMANDS = [
  {
    label: "Weekly growth plan",
    icon: Activity,
    command: "Agly 7 din ka Irha Apparels B2B growth plan banao. Leads, LinkedIn, TikTok, Instagram/Facebook content, listings, follow-ups aur SEO sab include kro. Sirf real executable next actions do.",
  },
  {
    label: "Lead campaign",
    icon: Users,
    command: "Germany aur Austria mein Lederhosen, Dirndl aur Trachten ke 100 qualified wholesalers/importers ke liye lead research campaign plan banao. Verification rules, sources, German outreach aur follow-up cadence include kro.",
  },
  {
    label: "Social content pack",
    icon: Megaphone,
    command: "Hamari Bavarian collection ke liye LinkedIn, Instagram, Facebook aur TikTok ka premium B2B content pack banao: captions, hashtags, carousel outline, 10-second reel script aur Request a Quote CTA.",
  },
  {
    label: "Multilingual SEO",
    icon: Globe2,
    command: "Irha Apparels ka maximum-level multilingual SEO rollout plan banao. Major buyer languages, commercial page clusters, native-quality review, hreflang, multilingual sitemap aur anti-spam quality gates include kro.",
  },
  {
    label: "Listings audit",
    icon: Search,
    command: "Meri B2B listings strategy audit kro. Alibaba skip kro. Fibre2Fashion, Textilepages, Tradewheel, Made-in-China, Global Sources, Europages aur relevant Bavarian/fashion directories ke truthful next actions banao. Koi fake active status ya views mat banao.",
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
  const [loading, setLoading] = useState(true);
  const [migrationReady, setMigrationReady] = useState(true);
  const [lastReply, setLastReply] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    const [runsResult, actionsResult] = await Promise.all([
      db.from("ai_runs").select("*").order("created_at", { ascending: false }).limit(30),
      db.from("ai_actions").select("*").order("created_at", { ascending: false }).limit(120),
    ]);

    const migrationError = [runsResult.error, actionsResult.error].find(isMigrationError);
    if (migrationError) {
      setMigrationReady(false);
      setRuns([]);
      setActions([]);
    } else {
      setMigrationReady(true);
      if (runsResult.error) {
        toast({ title: "AI run history could not load", description: runsResult.error.message, variant: "destructive" });
      }
      if (actionsResult.error) {
        toast({ title: "AI actions could not load", description: actionsResult.error.message, variant: "destructive" });
      }
      const nextRuns = (runsResult.data ?? []) as AiRun[];
      setRuns(nextRuns);
      setActions(((actionsResult.data ?? []) as AiAction[]).map(normalizeAction));
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
  const completedDrafts = useMemo(
    () => actions.filter((action) => !action.requires_approval && action.status === "completed"),
    [actions],
  );
  const failedCount = useMemo(() => actions.filter((action) => action.status === "failed").length, [actions]);
  const verifiedConnections = health?.capabilities?.filter((item) => item.verified).length ?? 0;

  const runCommand = async (value = command) => {
    const prompt = value.trim();
    if (!prompt || running) return;
    if (!migrationReady) {
      toast({ title: "AI Command Center migration is pending", description: "Publish/apply the latest database migration before running commands.", variant: "destructive" });
      return;
    }

    setRunning(true);
    setCommand("");
    try {
      const { data, error } = await supabase.functions.invoke("admin-agent", {
        body: { command: prompt, mode: "operate" },
      });
      if (error) throw error;
      const response = (data ?? {}) as AgentResponse;
      if (!response.ok) throw new Error(response.error || "AI did not create a plan");
      setLastReply(response.run?.reply || "Plan prepared.");
      toast({
        title: "AI plan prepared",
        description: `${response.actions?.length ?? 0} structured action${response.actions?.length === 1 ? "" : "s"} created.`,
      });
      await loadData();
    } catch (error) {
      toast({ title: "AI command failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setRunning(false);
    }
  };

  const executeAction = async (action: AiAction) => {
    if (executingId) return;
    const message = action.action_type === "social_publish"
      ? "Approve and run this social action? Exact channel results will be logged."
      : "Approve and save this listing action?";
    if (!window.confirm(message)) return;

    setExecutingId(action.id);
    try {
      const { data, error } = await supabase.functions.invoke("admin-agent-execute", {
        body: { action_id: action.id },
      });
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
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-gold mb-3">
              <BrainCircuit size={15} /> Irha AI Operations
            </div>
            <h2 className="font-display text-3xl md:text-4xl">Command Center</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              Ask in Roman Urdu or English. AI reads a limited business snapshot, creates structured drafts and plans,
              and places external-write actions in an approval queue. It never treats a draft, verification or failed API call as completed work.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void Promise.all([loadData(), loadHealth()])}
            className="inline-flex items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold"
          >
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh system
          </button>
        </div>
      </section>

      {!migrationReady && (
        <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-400 shrink-0 mt-0.5" />
          <div>
            <h3 className="font-display text-xl">AI Command Center database migration pending</h3>
            <p className="text-xs text-foreground/70 mt-2 leading-relaxed">
              The UI is deployed, but the ai_runs, ai_actions and business_listings tables are not readable yet. Apply/publish the latest migration before commands or approvals can run.
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Pending approvals" value={pending.length} icon={<ShieldCheck size={15} />} emphasis={pending.length > 0} />
        <Metric label="Ready drafts" value={completedDrafts.length} icon={<Sparkles size={15} />} />
        <Metric label="Verified connections" value={verifiedConnections} icon={<PlugZap size={15} />} />
        <Metric label="Failed actions" value={failedCount} icon={<AlertTriangle size={15} />} emphasis={failedCount > 0} />
      </div>

      <div className="flex flex-wrap gap-2 border-b border-border/60 pb-3">
        {([
          ["command", "Command", BrainCircuit],
          ["approvals", `Approvals (${pending.length})`, ShieldCheck],
          ["activity", "Activity", Activity],
          ["connections", "Connections", PlugZap],
        ] as const).map(([key, label, Icon]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`inline-flex items-center gap-2 px-4 py-2 text-[10px] uppercase tracking-[0.2em] border ${tab === key ? "border-gold text-gold bg-gold/5" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
          >
            <Icon size={12} /> {label}
          </button>
        ))}
      </div>

      {tab === "command" && (
        <div className="grid xl:grid-cols-12 gap-6">
          <section className="xl:col-span-7 border border-border/60 bg-card/30 p-5 md:p-6">
            <p className="eyebrow mb-2">Give a business command</p>
            <p className="text-xs text-muted-foreground mb-4">
              Examples: find a lead strategy, build a campaign, write buyer replies, prepare multilingual SEO, or propose a verified social post.
            </p>
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
              placeholder="Example: Agly hafty Germany ke Trachten wholesalers target kro, LinkedIn content banao, listings ke next actions do aur follow-up plan tayar kro…"
              disabled={running || !migrationReady}
              className="w-full bg-background/70 border border-border/60 focus:border-gold outline-none p-4 text-sm resize-y disabled:opacity-50"
            />
            <div className="mt-3 flex items-center justify-between gap-3 flex-wrap">
              <p className="text-[10px] text-muted-foreground">Enter to run · Shift+Enter for new line</p>
              <button
                type="button"
                onClick={() => void runCommand()}
                disabled={running || !command.trim() || !migrationReady}
                className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-6 py-3 text-[10px] uppercase tracking-[0.25em] hover:shadow-gold disabled:opacity-40"
              >
                {running ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
                {running ? "Planning…" : "Create action plan"}
              </button>
            </div>

            <div className="grid sm:grid-cols-2 gap-2 mt-6">
              {QUICK_COMMANDS.map(({ label, icon: Icon, command: value }) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => void runCommand(value)}
                  disabled={running || !migrationReady}
                  className="text-left border border-border/60 bg-background/30 p-3 hover:border-gold/70 transition-colors disabled:opacity-40"
                >
                  <span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-gold"><Icon size={12} /> {label}</span>
                  <span className="block text-xs text-foreground/65 mt-2 line-clamp-2">{value}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="xl:col-span-5 border border-border/60 bg-card/30 p-5 md:p-6 min-h-[360px]">
            <div className="flex items-center justify-between gap-3 mb-4">
              <p className="eyebrow">Latest AI response</p>
              {lastReply && (
                <button type="button" onClick={() => void copyValue(lastReply, "Response")} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.16em] text-muted-foreground hover:text-gold">
                  <Copy size={11} /> Copy
                </button>
              )}
            </div>
            {running ? (
              <div className="h-64 flex flex-col items-center justify-center text-center">
                <Loader2 size={24} className="text-gold animate-spin" />
                <p className="text-sm text-foreground/70 mt-3">Reading business context and creating guarded actions…</p>
              </div>
            ) : lastReply ? (
              <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{lastReply}</p>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
                <Sparkles size={26} className="mb-3 text-gold/70" />
                <p className="text-sm max-w-sm">Run a command. The answer and generated actions will be saved in the audit history.</p>
              </div>
            )}
          </section>

          <section className="xl:col-span-12">
            <SectionHeader title="Latest generated actions" note="Drafts are immediately usable. External writes remain in Approvals." />
            <ActionGrid actions={actions.slice(0, 8)} executingId={executingId} onExecute={executeAction} onReject={rejectAction} onCopy={copyValue} />
          </section>
        </div>
      )}

      {tab === "approvals" && (
        <section>
          <SectionHeader title="Approval queue" note="Social publishing and listing changes run only after your approval." />
          {pending.length === 0 ? (
            <Empty icon={<ShieldCheck size={26} />} title="No pending approvals" body="External-write actions proposed by AI will appear here." />
          ) : (
            <ActionGrid actions={pending} executingId={executingId} onExecute={executeAction} onReject={rejectAction} onCopy={copyValue} />
          )}
        </section>
      )}

      {tab === "activity" && (
        <section className="space-y-5">
          <SectionHeader title="AI activity and audit history" note="Every command and action result is stored. A draft is not shown as an external execution." />
          {loading ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Loading activity…</p>
          ) : runs.length === 0 ? (
            <Empty icon={<Clock3 size={26} />} title="No AI runs yet" body="Your command history will appear after the first successful run." />
          ) : (
            <div className="space-y-3">
              {runs.map((run) => {
                const runActions = actions.filter((action) => action.run_id === run.id);
                return (
                  <details key={run.id} className="group border border-border/60 bg-card/30 p-4 md:p-5">
                    <summary className="list-none cursor-pointer flex items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <StatusBadge status={run.status} />
                          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{new Date(run.created_at).toLocaleString()}</span>
                        </div>
                        <h3 className="font-display text-lg mt-2 line-clamp-2">{run.command}</h3>
                      </div>
                      <span className="text-xs text-gold shrink-0">{runActions.length} action{runActions.length === 1 ? "" : "s"}</span>
                    </summary>
                    <div className="mt-5 border-t border-border/50 pt-5 space-y-4">
                      {run.reply && <p className="text-sm text-foreground/80 whitespace-pre-wrap leading-relaxed">{run.reply}</p>}
                      <ActionGrid actions={runActions} executingId={executingId} onExecute={executeAction} onReject={rejectAction} onCopy={copyValue} compact />
                    </div>
                  </details>
                );
              })}
            </div>
          )}
        </section>
      )}

      {tab === "connections" && (
        <section className="space-y-5">
          <SectionHeader title="Runtime capabilities" note="Configured, verified and publish-capable are separate states. Platform acceptance is never guaranteed." />
          {health?.error ? (
            <div className="border border-destructive/40 bg-destructive/5 p-5 text-sm text-destructive">{health.error}</div>
          ) : !health ? (
            <p className="text-sm text-muted-foreground py-10 text-center">Checking runtime capabilities…</p>
          ) : (
            <>
              <div className={`border p-4 flex items-start gap-3 ${health.schema?.ready ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
                {health.schema?.ready ? <CheckCircle2 size={17} className="text-emerald-400 shrink-0" /> : <AlertTriangle size={17} className="text-amber-400 shrink-0" />}
                <div>
                  <p className="font-medium text-sm">Command Center database: {health.schema?.ready ? "ready" : "migration required"}</p>
                  <p className="text-xs text-foreground/60 mt-1">Checked {health.checked_at ? new Date(health.checked_at).toLocaleString() : "now"}</p>
                </div>
              </div>
              <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
                {(health.capabilities ?? []).map((capability) => (
                  <div key={capability.key} className="border border-border/60 bg-card/30 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="font-display text-xl">{capability.label}</h3>
                      {capability.verified ? <CheckCircle2 size={16} className="text-emerald-400" /> : capability.configured ? <Clock3 size={16} className="text-amber-400" /> : <XCircle size={16} className="text-muted-foreground" />}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <SmallFlag label="Configured" active={capability.configured} />
                      <SmallFlag label="Verified" active={capability.verified} />
                      <SmallFlag label="Publish-capable" active={capability.publish_capable} />
                    </div>
                    <p className="text-xs text-foreground/65 mt-4 leading-relaxed">{capability.note}</p>
                    {capability.details != null && (
                      <pre className="mt-3 text-[10px] text-muted-foreground whitespace-pre-wrap break-all border-t border-border/40 pt-3">{JSON.stringify(capability.details, null, 2)}</pre>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      )}
    </div>
  );
}

function ActionGrid({
  actions,
  executingId,
  onExecute,
  onReject,
  onCopy,
  compact = false,
}: {
  actions: AiAction[];
  executingId: string | null;
  onExecute: (action: AiAction) => Promise<void>;
  onReject: (action: AiAction) => Promise<void>;
  onCopy: (value: unknown, label?: string) => Promise<void>;
  compact?: boolean;
}) {
  if (actions.length === 0) {
    return <Empty icon={<Sparkles size={24} />} title="No generated actions" body="Run a command to create structured drafts and approval tasks." />;
  }
  return (
    <div className={compact ? "space-y-3" : "grid lg:grid-cols-2 gap-4"}>
      {actions.map((action) => {
        const output = Object.keys(action.result ?? {}).length > 0 ? action.result : action.payload;
        const canExecute = action.requires_approval && ["proposed", "failed"].includes(action.status);
        return (
          <article key={action.id} className="border border-border/60 bg-card/30 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge status={action.status} />
                  <span className="text-[9px] uppercase tracking-[0.16em] text-gold/80">{actionLabels[action.action_type] || action.action_type.replace(/_/g, " ")}</span>
                  <span className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground">{action.risk_level} risk</span>
                </div>
                <h3 className="font-display text-xl mt-2">{action.title}</h3>
              </div>
              <button type="button" onClick={() => void onCopy(output, action.title)} className="p-2 text-muted-foreground hover:text-gold" aria-label="Copy action content"><Copy size={14} /></button>
            </div>
            {action.description && <p className="text-xs text-foreground/65 mt-3 leading-relaxed">{action.description}</p>}
            <pre className={`mt-4 text-[11px] leading-relaxed text-foreground/75 whitespace-pre-wrap break-words border border-border/40 bg-background/40 p-3 overflow-auto ${compact ? "max-h-48" : "max-h-72"}`}>{JSON.stringify(output, null, 2)}</pre>
            {action.error && <p className="text-xs text-destructive mt-3">{action.error}</p>}
            <div className="flex items-center justify-between gap-3 mt-4 flex-wrap">
              <span className="text-[10px] text-muted-foreground">Created {new Date(action.created_at).toLocaleString()}</span>
              {canExecute && (
                <div className="flex gap-2">
                  <button type="button" onClick={() => void onReject(action)} disabled={executingId === action.id} className="border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-destructive hover:text-destructive disabled:opacity-40">Reject</button>
                  <button type="button" onClick={() => void onExecute(action)} disabled={executingId !== null} className="inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">
                    {executingId === action.id ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Approve & run
                  </button>
                </div>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function Metric({ label, value, icon, emphasis }: { label: string; value: number; icon: ReactNode; emphasis?: boolean }) {
  return (
    <div className={`border p-4 ${emphasis ? "border-amber-500/40 bg-amber-500/5" : "border-border/60 bg-card/30"}`}>
      <div className="flex items-center justify-between gap-3 text-muted-foreground">
        <span className="text-[9px] uppercase tracking-[0.2em]">{label}</span>
        {icon}
      </div>
      <p className="font-display text-3xl mt-2">{value}</p>
    </div>
  );
}

function SectionHeader({ title, note }: { title: string; note: string }) {
  return (
    <div className="flex items-end justify-between gap-4 flex-wrap mb-4">
      <div>
        <p className="eyebrow mb-1">AI Operations</p>
        <h3 className="font-display text-2xl">{title}</h3>
      </div>
      <p className="text-[10px] text-muted-foreground max-w-md text-right">{note}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const style = status === "completed"
    ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/10"
    : status === "failed"
      ? "border-destructive/50 text-destructive bg-destructive/5"
      : status === "proposed" || status === "planned"
        ? "border-amber-500/40 text-amber-300 bg-amber-500/10"
        : status === "rejected" || status === "cancelled"
          ? "border-border text-muted-foreground"
          : "border-blue-500/40 text-blue-300 bg-blue-500/10";
  return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.16em] ${style}`}>{status.replace(/_/g, " ")}</span>;
}

function SmallFlag({ label, active }: { label: string; active: boolean }) {
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${active ? "border-emerald-500/40 text-emerald-300 bg-emerald-500/5" : "border-border/60 text-muted-foreground"}`}>{label}</span>;
}

function Empty({ icon, title, body }: { icon: ReactNode; title: string; body: string }) {
  return (
    <div className="border border-dashed border-border/60 bg-card/20 p-10 text-center">
      <div className="inline-flex text-muted-foreground mb-3">{icon}</div>
      <h3 className="font-display text-xl">{title}</h3>
      <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">{body}</p>
    </div>
  );
}

function normalizeAction(action: AiAction): AiAction {
  return {
    ...action,
    payload: action.payload && typeof action.payload === "object" ? action.payload : {},
    result: action.result && typeof action.result === "object" ? action.result : {},
  };
}

function isMigrationError(error: any) {
  if (!error) return false;
  const text = `${error.code || ""} ${error.message || ""} ${error.details || ""}`.toLowerCase();
  return text.includes("42p01") || text.includes("42703") || text.includes("ai_runs") || text.includes("ai_actions") || text.includes("business_listings");
}

function executionSummary(result: any) {
  if (!result || typeof result !== "object") return "Exact result was saved in the activity log.";
  if (result.operation && result.listing?.platform) return `${result.listing.platform} listing registry ${result.operation}.`;
  const published = Array.isArray(result.published) ? result.published.length : 0;
  const verified = Array.isArray(result.verified_only) ? result.verified_only.length : 0;
  return `${published} published · ${verified} verified only. Exact channel result saved.`;
}
