import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Bot,
  CheckCircle2,
  FileSearch,
  Globe2,
  ListChecks,
  MailWarning,
  RefreshCw,
  Share2,
  ShieldCheck,
  UserSearch,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  businessRulesApproved,
  businessRulesReadiness,
  loadBusinessRules,
} from "@/lib/businessRules";
import type { AdminView } from "./AdminShell";

type QueueKey = "ai" | "leads" | "outreach" | "email" | "social" | "listings" | "seo";
type QueueResult = {
  count: number | null;
  error: string | null;
  checked: boolean;
};

type QueueDefinition = {
  key: QueueKey;
  label: string;
  description: string;
  view: AdminView;
  icon: typeof Bot;
};

const QUEUES: QueueDefinition[] = [
  { key: "ai", label: "AI approvals", description: "Proposed or failed actions requiring owner review.", view: "ai", icon: Bot },
  { key: "leads", label: "Lead review", description: "Unverified candidates awaiting evidence review.", view: "lead_engine", icon: UserSearch },
  { key: "outreach", label: "Outreach drafts", description: "Draft, approved or failed Gmail outreach messages.", view: "mailing", icon: FileSearch },
  { key: "email", label: "Email exceptions", description: "Failed, bounced, complained, rate-limited or dead-letter sends.", view: "mailing", icon: MailWarning },
  { key: "social", label: "Social attention", description: "Draft, failed or manual-required calendar items.", view: "social", icon: Share2 },
  { key: "listings", label: "Listing attention", description: "Profiles in progress, pending verification or needing attention.", view: "listings", icon: ListChecks },
  { key: "seo", label: "SEO review", description: "Localized pages awaiting review, approval or publish decision.", view: "seo", icon: Globe2 },
];

const emptyQueues = Object.fromEntries(
  QUEUES.map((queue) => [queue.key, { count: null, error: null, checked: false }]),
) as Record<QueueKey, QueueResult>;

const db = supabase as any;

async function countQuery(table: string, configure: (query: any) => any): Promise<QueueResult> {
  try {
    const query = configure(db.from(table).select("*", { count: "exact", head: true }));
    const { count, error } = await query;
    if (error) return { count: null, error: error.message || "Source unavailable", checked: true };
    return { count: count ?? 0, error: null, checked: true };
  } catch (error) {
    return { count: null, error: error instanceof Error ? error.message : "Source unavailable", checked: true };
  }
}

export default function OwnerOperationsCenter({ go }: { go: (view: AdminView) => void }) {
  const [queues, setQueues] = useState<Record<QueueKey, QueueResult>>(emptyQueues);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const rules = loadBusinessRules();
  const rulesReadiness = businessRulesReadiness(rules);
  const rulesApproved = businessRulesApproved(rules);

  const load = useCallback(async () => {
    setLoading(true);
    const [ai, leads, outreach, email, social, listings, seo] = await Promise.all([
      countQuery("ai_actions", (query) => query.in("status", ["proposed", "failed"]).eq("requires_approval", true)),
      countQuery("lead_candidates", (query) => query.in("verification_status", ["unverified", "needs_review"])),
      countQuery("outreach_messages", (query) => query.in("status", ["draft", "approved", "failed"])),
      countQuery("email_send_log", (query) => query.in("status", ["failed", "bounced", "complained", "dlq", "rate_limited"])),
      countQuery("social_calendar_items", (query) => query.in("status", ["draft", "failed", "manual_required"])),
      countQuery("business_listings", (query) => query.in("status", ["in_progress", "pending_verification", "needs_attention"])),
      countQuery("seo_localized_pages", (query) => query.in("status", ["draft", "ai_reviewed", "approved"])),
    ]);
    setQueues({ ai, leads, outreach, email, social, listings, seo });
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const summary = useMemo(() => {
    const available = Object.values(queues).filter((queue) => queue.count !== null);
    const attention = available.reduce((total, queue) => total + (queue.count ?? 0), 0);
    const pendingSources = Object.values(queues).filter((queue) => queue.error).length;
    return { attention, available: available.length, pendingSources };
  }, [queues]);

  return (
    <section className="border border-border/60 bg-card/25">
      <div className="p-4 sm:p-5 md:p-6 border-b border-border/60 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5">
        <div className="flex items-start gap-3">
          <ShieldCheck size={20} className="text-gold shrink-0 mt-1" />
          <div>
            <p className="eyebrow mb-2">Owner Operations Center</p>
            <h2 className="font-display text-2xl md:text-3xl">Online business attention queue</h2>
            <p className="text-sm text-foreground/60 mt-2 max-w-3xl leading-relaxed">
              Read-only cross-system summary. Successful reads show real counts; unavailable backend modules stay Pending instead of reporting a false zero.
            </p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading} className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh all
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 border-b border-border/60">
        <Summary label="Attention items" value={summary.attention} tone={summary.attention > 0 ? "attention" : "clear"} />
        <Summary label="Readable systems" value={`${summary.available}/${QUEUES.length}`} tone={summary.available === QUEUES.length ? "clear" : "pending"} />
        <Summary label="Backend pending" value={summary.pendingSources} tone={summary.pendingSources > 0 ? "pending" : "clear"} />
        <Summary label="Business rules" value={`${rulesReadiness.score}%`} tone={rulesApproved ? "clear" : "attention"} />
      </div>

      {!rulesApproved && (
        <button type="button" onClick={() => go("rules")} className="w-full text-left border-b border-amber-500/25 bg-amber-500/[0.05] p-4 flex items-start gap-3 hover:bg-amber-500/[0.08]">
          <AlertTriangle size={17} className="text-amber-300 shrink-0 mt-0.5" />
          <span>
            <span className="block text-sm text-amber-200">AI remains in plan-only mode.</span>
            <span className="block text-xs text-foreground/55 mt-1">Business Rules are {rulesReadiness.score}% complete and {rules.status}. Complete and approve them before final backend activation.</span>
          </span>
        </button>
      )}

      <div className="p-4 md:p-5 grid sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {QUEUES.map((definition) => (
          <QueueCard key={definition.key} definition={definition} result={queues[definition.key]} loading={loading} onOpen={() => go(definition.view)} />
        ))}
      </div>

      <div className="border-t border-border/60 px-4 sm:px-5 py-3 text-[10px] uppercase tracking-[0.14em] text-foreground/45 flex justify-between gap-3 flex-wrap">
        <span>Owner decisions stay approval-controlled</span>
        <span>{lastChecked ? `Checked ${lastChecked.toLocaleString()}` : "Not checked"}</span>
      </div>
    </section>
  );
}

function QueueCard({ definition, result, loading, onOpen }: { definition: QueueDefinition; result: QueueResult; loading: boolean; onOpen: () => void }) {
  const Icon = definition.icon;
  const pending = result.error !== null;
  const attention = (result.count ?? 0) > 0;
  const tone = pending
    ? "border-amber-500/30 bg-amber-500/[0.04]"
    : attention
      ? "border-gold/35 bg-gold/[0.04]"
      : "border-emerald-500/25 bg-emerald-500/[0.03]";

  return (
    <button type="button" onClick={onOpen} className={`min-h-44 text-left border p-4 hover:border-gold transition-colors ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <span className={pending ? "text-amber-300" : attention ? "text-gold" : "text-emerald-300"}><Icon size={17} /></span>
        {pending ? <AlertTriangle size={14} className="text-amber-300" /> : attention ? <span className="text-[9px] uppercase tracking-[0.14em] text-gold">Review</span> : <CheckCircle2 size={14} className="text-emerald-300" />}
      </div>
      <p className="font-display text-3xl mt-4 tabular-nums">{loading && !result.checked ? "—" : pending ? "Pending" : result.count ?? 0}</p>
      <h3 className="text-[10px] uppercase tracking-[0.18em] mt-2 text-foreground/75">{definition.label}</h3>
      <p className="text-xs text-foreground/50 mt-2 leading-relaxed">{pending ? "Database/runtime activation or permission is still required." : definition.description}</p>
    </button>
  );
}

function Summary({ label, value, tone }: { label: string; value: number | string; tone: "clear" | "attention" | "pending" }) {
  const style = tone === "clear" ? "text-emerald-300" : tone === "attention" ? "text-gold" : "text-amber-300";
  return (
    <div className="p-4 border-r border-b lg:border-b-0 border-border/60 last:border-r-0">
      <p className={`font-display text-2xl ${style}`}>{value}</p>
      <p className="text-[9px] uppercase tracking-[0.16em] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}
