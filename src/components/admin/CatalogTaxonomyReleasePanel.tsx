import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, RefreshCw, ShieldCheck, Undo2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

type Summary = {
  node_count: number;
  ready_node_count: number;
  published_node_count: number;
  assignment_count: number;
  approved_count: number;
  proposed_count: number;
  rejected_count: number;
  unassigned_product_count: number;
  empty_leaf_count: number;
  invalid_assignment_count: number;
  snapshot_hash: string;
  confirmation_phrase: string;
  is_published: boolean;
  can_publish: boolean;
};

type ReviewEvent = {
  id: string;
  action: "review_approved" | "publish" | "unpublish";
  node_count: number;
  assignment_count: number;
  snapshot_hash: string;
  created_at: string;
};

const asNumber = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

function normalize(value: unknown): Summary {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    node_count: asNumber(row.node_count),
    ready_node_count: asNumber(row.ready_node_count),
    published_node_count: asNumber(row.published_node_count),
    assignment_count: asNumber(row.assignment_count),
    approved_count: asNumber(row.approved_count),
    proposed_count: asNumber(row.proposed_count),
    rejected_count: asNumber(row.rejected_count),
    unassigned_product_count: asNumber(row.unassigned_product_count),
    empty_leaf_count: asNumber(row.empty_leaf_count),
    invalid_assignment_count: asNumber(row.invalid_assignment_count),
    snapshot_hash: String(row.snapshot_hash || ""),
    confirmation_phrase: String(row.confirmation_phrase || ""),
    is_published: Boolean(row.is_published),
    can_publish: Boolean(row.can_publish),
  };
}

export default function CatalogTaxonomyReleasePanel() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [unpublish, setUnpublish] = useState("");
  const [busy, setBusy] = useState<"publish" | "unpublish" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [summaryResult, eventsResult] = await Promise.all([
      db.rpc("catalog_taxonomy_review_summary"),
      db.from("catalog_taxonomy_review_events")
        .select("id,action,node_count,assignment_count,snapshot_hash,created_at")
        .order("created_at", { ascending: false })
        .limit(10),
    ]);

    if (summaryResult.error) {
      setError(summaryResult.error.message || "Release readiness could not load.");
      setLoading(false);
      return;
    }

    setSummary(normalize(summaryResult.data));
    setEvents(eventsResult.error ? [] : ((eventsResult.data as ReviewEvent[] | null) || []));
    setConfirmation("");
    setAcknowledged(false);
    setUnpublish("");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const publishReady = Boolean(
    summary?.can_publish
      && acknowledged
      && confirmation === summary.confirmation_phrase
      && !busy,
  );

  const publish = async () => {
    if (!summary || !publishReady) return;
    setBusy("publish");
    const { error: publishError } = await db.rpc("catalog_publish_reviewed_taxonomy", {
      p_confirmation: confirmation,
      p_expected_assignments: summary.assignment_count,
      p_expected_snapshot_hash: summary.snapshot_hash,
    });
    if (publishError) {
      toast({ title: "Hierarchy was not published", description: publishError.message, variant: "destructive" });
      setBusy(null);
      return;
    }
    toast({ title: "Reviewed hierarchy published", description: "Buyer pages now use the approved database taxonomy." });
    setBusy(null);
    await load();
  };

  const returnToReview = async () => {
    if (unpublish !== "UNPUBLISH TAXONOMY" || busy) return;
    setBusy("unpublish");
    const { error: unpublishError } = await db.rpc("catalog_unpublish_taxonomy", { p_confirmation: unpublish });
    if (unpublishError) {
      toast({ title: "Hierarchy remains published", description: unpublishError.message, variant: "destructive" });
      setBusy(null);
      return;
    }
    toast({ title: "Hierarchy returned to review", description: "Product approvals and legacy records remain preserved." });
    setBusy(null);
    await load();
  };

  if (loading && !summary) return <div className="py-10 text-center text-sm text-muted-foreground">Checking final release status…</div>;
  if (error && !summary) return <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">{error}</div>;
  if (!summary) return null;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-gold"><ShieldCheck size={18} /><p className="text-[10px] uppercase tracking-[0.18em]">Final audited release</p></div>
          <h3 className="mt-2 font-display text-xl sm:text-2xl">Reviewed B2B catalogue hierarchy</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">Publication uses the exact approved 69-node and 86-product snapshot. Existing catalogue records and routes remain preserved, and rollback keeps the product approvals.</p>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || Boolean(busy)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"><RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh</button>
      </div>

      {error && <div className="border border-amber-500/35 bg-amber-500/[0.06] p-3 text-xs text-amber-200">{error}</div>}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <Metric label="Ready nodes" value={`${summary.ready_node_count}/${summary.node_count}`} good={summary.ready_node_count === summary.node_count} />
        <Metric label="Approved mappings" value={`${summary.approved_count}/${summary.assignment_count}`} good={summary.approved_count === summary.assignment_count} />
        <Metric label="Proposed" value={String(summary.proposed_count)} good={summary.proposed_count === 0} />
        <Metric label="Rejected" value={String(summary.rejected_count)} good={summary.rejected_count === 0} />
        <Metric label="Unassigned" value={String(summary.unassigned_product_count)} good={summary.unassigned_product_count === 0} />
        <Metric label="Invalid/empty" value={String(summary.invalid_assignment_count + summary.empty_leaf_count)} good={summary.invalid_assignment_count + summary.empty_leaf_count === 0} />
      </div>

      {summary.is_published ? (
        <div className="space-y-4 border border-emerald-500/40 bg-emerald-500/[0.06] p-4 sm:p-5">
          <div className="flex items-start gap-3"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-emerald-400" /><div><p className="font-medium text-emerald-300">Explicit hierarchy is published</p><p className="mt-1 text-xs leading-relaxed text-foreground/70">{summary.published_node_count} hierarchy nodes and {summary.approved_count} approved product mappings are available to buyer pages.</p></div></div>
          <div className="border-t border-emerald-500/20 pt-4">
            <p className="text-xs text-muted-foreground">Emergency rollback: type <strong className="text-foreground">UNPUBLISH TAXONOMY</strong>.</p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={unpublish} onChange={(event) => setUnpublish(event.target.value)} className="min-h-11 flex-1 border border-border/60 bg-background/50 px-3 text-sm outline-none focus:border-amber-400" placeholder="UNPUBLISH TAXONOMY" /><button type="button" onClick={() => void returnToReview()} disabled={unpublish !== "UNPUBLISH TAXONOMY" || Boolean(busy)} className="inline-flex min-h-11 items-center justify-center gap-2 border border-amber-500/50 px-4 text-xs uppercase tracking-[0.16em] text-amber-300 disabled:opacity-40"><Undo2 size={14} /> {busy === "unpublish" ? "Returning…" : "Return to review"}</button></div>
          </div>
        </div>
      ) : summary.can_publish ? (
        <div className="space-y-4 border border-gold/45 bg-gold/[0.05] p-4 sm:p-5">
          <div className="flex items-start gap-3"><CheckCircle2 size={19} className="mt-0.5 shrink-0 text-gold" /><div><p className="font-medium">All strict release checks passed</p><p className="mt-1 text-xs text-muted-foreground">Type the exact current phrase to publish this immutable snapshot.</p></div></div>
          <label className="flex items-start gap-3 text-sm leading-relaxed"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1" /><span>I authorize this exact reviewed hierarchy and product-mapping snapshot for public release.</span></label>
          <div><p className="text-xs text-muted-foreground">Exact phrase: <strong className="select-all text-foreground">{summary.confirmation_phrase}</strong></p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} className="min-h-11 flex-1 border border-border/60 bg-background/50 px-3 text-sm outline-none focus:border-gold" placeholder={summary.confirmation_phrase} /><button type="button" onClick={() => void publish()} disabled={!publishReady} className="inline-flex min-h-11 items-center justify-center gap-2 bg-gradient-gold px-5 text-xs uppercase tracking-[0.16em] text-primary-foreground disabled:opacity-40"><ShieldCheck size={14} /> {busy === "publish" ? "Publishing…" : "Publish reviewed hierarchy"}</button></div></div>
        </div>
      ) : (
        <div className="flex items-start gap-3 border border-amber-500/40 bg-amber-500/[0.07] p-4"><AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" /><div className="text-xs leading-relaxed text-foreground/75"><p className="font-medium text-amber-200">Final release remains locked</p><p className="mt-1">Complete the owner review workspace until all 69 nodes and all 86 mappings pass the strict checks.</p></div></div>
      )}

      <div className="border-t border-border/50 pt-4">
        <div className="mb-3 flex items-center gap-2"><Clock3 size={14} className="text-gold" /><p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Release evidence</p></div>
        {events.length === 0 ? <p className="text-xs text-muted-foreground">No review or release event recorded yet.</p> : <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">{events.map((event) => <div key={event.id} className="border border-border/40 p-3"><p className="text-[9px] uppercase tracking-[0.16em] text-gold">{event.action.replace("_", " ")}</p><p className="mt-1 text-xs">{event.node_count} nodes · {event.assignment_count} mappings</p><p className="mt-1 truncate font-mono text-[9px] text-muted-foreground" title={event.snapshot_hash}>{event.snapshot_hash}</p><p className="mt-1 text-[10px] text-muted-foreground">{new Date(event.created_at).toLocaleString()}</p></div>)}</div>}
      </div>
    </div>
  );
}

function Metric({ label, value, good }: { label: string; value: string; good: boolean }) {
  return <div className="min-w-0 border border-border/40 bg-background/35 p-3"><p className="truncate text-[8px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p><p className={`mt-1 truncate text-sm ${good ? "text-emerald-400" : "text-amber-300"}`} title={value}>{value}</p></div>;
}
