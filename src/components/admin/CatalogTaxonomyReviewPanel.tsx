import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  RefreshCw,
  Search,
  ShieldCheck,
  Undo2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any; // Additive taxonomy tables/RPCs intentionally lead generated client types.

type ReviewSummary = {
  node_count: number;
  root_count: number;
  audience_count: number;
  leaf_count: number;
  published_node_count: number;
  published_product_count: number;
  assignment_count: number;
  proposed_count: number;
  approved_count: number;
  unassigned_product_count: number;
  empty_leaf_count: number;
  snapshot_hash: string;
  confirmation_phrase: string;
  is_published: boolean;
  can_publish: boolean;
};

type TaxonomyNode = {
  id: string;
  parent_id: string | null;
  node_type: string;
  name: string;
  slug: string;
  depth: number;
  full_slug_path: string;
  publish_state: string;
  sort_order: number;
};

type Assignment = {
  product_id: string;
  taxonomy_node_id: string;
  review_state: string;
  approved_at: string | null;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
};

type ReviewEvent = {
  id: string;
  action: "publish" | "unpublish";
  confirmation: string;
  node_count: number;
  assignment_count: number;
  snapshot_hash: string;
  created_at: string;
};

type MappingRow = {
  product: Product;
  assignment: Assignment;
  node: TaxonomyNode | undefined;
};

function number(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeSummary(value: unknown): ReviewSummary {
  const row = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  return {
    node_count: number(row.node_count),
    root_count: number(row.root_count),
    audience_count: number(row.audience_count),
    leaf_count: number(row.leaf_count),
    published_node_count: number(row.published_node_count),
    published_product_count: number(row.published_product_count),
    assignment_count: number(row.assignment_count),
    proposed_count: number(row.proposed_count),
    approved_count: number(row.approved_count),
    unassigned_product_count: number(row.unassigned_product_count),
    empty_leaf_count: number(row.empty_leaf_count),
    snapshot_hash: String(row.snapshot_hash || ""),
    confirmation_phrase: String(row.confirmation_phrase || ""),
    is_published: Boolean(row.is_published),
    can_publish: Boolean(row.can_publish),
  };
}

export default function CatalogTaxonomyReviewPanel() {
  const [summary, setSummary] = useState<ReviewSummary | null>(null);
  const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [events, setEvents] = useState<ReviewEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [acknowledged, setAcknowledged] = useState(false);
  const [unpublishConfirmation, setUnpublishConfirmation] = useState("");
  const [dangerOpen, setDangerOpen] = useState(false);
  const [action, setAction] = useState<"publish" | "unpublish" | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [summaryResult, nodeResult, assignmentResult, productResult, eventResult] = await Promise.all([
      db.rpc("catalog_taxonomy_review_summary"),
      db.from("catalog_taxonomy_nodes").select("id,parent_id,node_type,name,slug,depth,full_slug_path,publish_state,sort_order").order("depth").order("sort_order").order("name"),
      db.from("product_taxonomy_assignments").select("product_id,taxonomy_node_id,review_state,approved_at").order("created_at"),
      db.from("products").select("id,name,slug,is_published").eq("is_published", true).order("name"),
      db.from("catalog_taxonomy_review_events").select("id,action,confirmation,node_count,assignment_count,snapshot_hash,created_at").order("created_at", { ascending: false }).limit(10),
    ]);

    const firstError = [summaryResult.error, nodeResult.error, assignmentResult.error, productResult.error]
      .find((candidate) => candidate);
    if (firstError) {
      setError(firstError.message || "Taxonomy review data could not load.");
      setLoading(false);
      return;
    }

    setSummary(normalizeSummary(summaryResult.data));
    setNodes((nodeResult.data as TaxonomyNode[]) ?? []);
    setAssignments((assignmentResult.data as Assignment[]) ?? []);
    setProducts((productResult.data as Product[]) ?? []);
    setEvents(eventResult.error ? [] : ((eventResult.data as ReviewEvent[]) ?? []));
    setConfirmation("");
    setAcknowledged(false);
    setUnpublishConfirmation("");
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const mappings = useMemo<MappingRow[]>(() => assignments
    .map((assignment) => ({
      assignment,
      product: productById.get(assignment.product_id),
      node: nodeById.get(assignment.taxonomy_node_id),
    }))
    .filter((row): row is MappingRow => Boolean(row.product))
    .sort((a, b) => {
      const pathCompare = (a.node?.full_slug_path || "").localeCompare(b.node?.full_slug_path || "");
      return pathCompare || a.product.name.localeCompare(b.product.name);
    }), [assignments, nodeById, productById]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return mappings;
    return mappings.filter((row) => `${row.product.name} ${row.product.slug} ${row.node?.name || ""} ${row.node?.full_slug_path || ""}`.toLowerCase().includes(needle));
  }, [mappings, query]);

  const visible = showAll ? filtered : filtered.slice(0, 24);
  const roots = nodes.filter((node) => node.depth === 0);
  const canSubmit = Boolean(
    summary?.can_publish
    && acknowledged
    && confirmation === summary.confirmation_phrase
    && !action,
  );

  const publish = async () => {
    if (!summary || !canSubmit) return;
    setAction("publish");
    const { error: publishError } = await db.rpc("catalog_publish_reviewed_taxonomy", {
      p_confirmation: confirmation,
      p_expected_assignments: summary.assignment_count,
      p_expected_snapshot_hash: summary.snapshot_hash,
    });

    if (publishError) {
      toast({
        title: "Catalogue hierarchy was not published",
        description: publishError.message || "Refresh the review and try again.",
        variant: "destructive",
      });
      setAction(null);
      return;
    }

    toast({ title: "Catalogue hierarchy published", description: "The owner-reviewed hierarchy is now available to the public catalogue." });
    setAction(null);
    await load();
  };

  const unpublish = async () => {
    if (unpublishConfirmation !== "UNPUBLISH TAXONOMY" || action) return;
    setAction("unpublish");
    const { error: unpublishError } = await db.rpc("catalog_unpublish_taxonomy", {
      p_confirmation: unpublishConfirmation,
    });

    if (unpublishError) {
      toast({
        title: "Catalogue hierarchy stayed published",
        description: unpublishError.message || "The safety action could not complete.",
        variant: "destructive",
      });
      setAction(null);
      return;
    }

    toast({ title: "Catalogue hierarchy returned to review", description: "Existing product and category records were preserved." });
    setAction(null);
    setDangerOpen(false);
    await load();
  };

  if (loading && !summary) {
    return <div className="rounded-xl border border-border/60 bg-card/35 p-10 text-center text-sm text-muted-foreground" role="status">Loading catalogue review…</div>;
  }

  if (error && !summary) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6">
        <h2 className="font-display text-2xl">Taxonomy review could not load</h2>
        <p className="mt-2 text-sm text-muted-foreground">{error}</p>
        <button type="button" onClick={() => void load()} className="mt-5 inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-xs uppercase tracking-[0.18em] hover:border-primary">
          <RefreshCw size={14} /> Retry
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div className="space-y-6 sm:space-y-8">
      <section className={`rounded-xl border p-5 sm:p-7 ${summary.is_published ? "border-emerald-500/45 bg-emerald-500/5" : "border-gold/40 bg-gold/5"}`}>
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
              {summary.is_published ? <CheckCircle2 size={15} className="text-emerald-500" /> : <ShieldCheck size={15} className="text-gold" />}
              Owner review control
            </div>
            <h2 className="mt-3 font-display text-3xl sm:text-4xl">
              {summary.is_published ? "Catalogue hierarchy is published" : "Review before publishing"}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              This workspace shows the exact Main Category → Audience/Buyer Group → Product Type assignment for every public product. Publishing does not delete products, categories, media or legacy URLs.
            </p>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading || Boolean(action)} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50">
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        {[
          ["Main categories", summary.root_count],
          ["Buyer groups", summary.audience_count],
          ["Product types", summary.leaf_count],
          ["Products mapped", `${summary.assignment_count}/${summary.published_product_count}`],
          ["Unassigned", summary.unassigned_product_count],
          ["Empty types", summary.empty_leaf_count],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-lg border border-border/60 bg-card/35 p-4">
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
            <p className="mt-1 text-[10px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
          </div>
        ))}
      </section>

      <section className="rounded-xl border border-border/60 bg-card/30 p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Hierarchy overview</p>
            <h3 className="mt-2 font-display text-2xl">Five manufacturing programs</h3>
          </div>
          <p className="text-xs text-muted-foreground">Snapshot {summary.snapshot_hash.slice(0, 12)}…</p>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          {roots.map((root) => {
            const audiences = nodes.filter((node) => node.parent_id === root.id);
            const leaves = nodes.filter((node) => audiences.some((audience) => audience.id === node.parent_id));
            const productCount = assignments.filter((assignment) => leaves.some((leaf) => leaf.id === assignment.taxonomy_node_id)).length;
            return (
              <article key={root.id} className="rounded-lg border border-border/50 bg-background/45 p-4">
                <p className="font-display text-lg leading-tight">{root.name}</p>
                <p className="mt-3 text-xs text-muted-foreground">{audiences.length} buyer groups · {leaves.length} product types · {productCount} products</p>
              </article>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border/60 bg-card/30 p-5 sm:p-7">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Product assignment review</p>
            <h3 className="mt-2 font-display text-2xl">{filtered.length} mapped products</h3>
          </div>
          <label className="relative block w-full lg:max-w-sm">
            <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(event) => { setQuery(event.target.value); setShowAll(false); }} placeholder="Search product or target path" className="h-12 w-full rounded-md border border-border/60 bg-background/55 pl-10 pr-3 text-sm outline-none focus:border-gold" />
          </label>
        </div>

        <div className="mt-5 divide-y divide-border/50 border-y border-border/50">
          {visible.map((row) => (
            <div key={row.product.id} className="grid gap-2 py-4 lg:grid-cols-[minmax(0,1fr)_auto_minmax(0,1.4fr)_auto] lg:items-center lg:gap-4">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{row.product.name}</p>
                <p className="truncate text-xs text-muted-foreground">{row.product.slug}</p>
              </div>
              <ArrowRight size={15} className="hidden text-muted-foreground lg:block" aria-hidden="true" />
              <div className="min-w-0 rounded-md bg-background/50 px-3 py-2">
                <p className="truncate text-xs font-medium">{row.node?.name || "Missing target"}</p>
                <p className="truncate text-[10px] text-muted-foreground">/products/{row.node?.full_slug_path || "unresolved"}</p>
              </div>
              <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] uppercase tracking-[0.14em] ${row.assignment.review_state === "approved" ? "border-emerald-500/40 text-emerald-500" : "border-gold/40 text-gold"}`}>
                {row.assignment.review_state}
              </span>
            </div>
          ))}
        </div>

        {filtered.length > 24 && (
          <button type="button" onClick={() => setShowAll((current) => !current)} className="mt-5 inline-flex min-h-11 items-center gap-2 text-xs uppercase tracking-[0.16em] text-gold">
            {showAll ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            {showAll ? "Show first 24" : `Show all ${filtered.length}`}
          </button>
        )}
      </section>

      {!summary.is_published ? (
        <section className="rounded-xl border border-gold/45 bg-card/35 p-5 sm:p-7">
          <div className="flex items-start gap-3">
            <Eye size={20} className="mt-0.5 shrink-0 text-gold" />
            <div>
              <h3 className="font-display text-2xl">Owner publication confirmation</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Review the hierarchy summary and product mappings above. Publication requires this current snapshot; any later mapping change automatically blocks the action until you refresh and review again.
              </p>
            </div>
          </div>

          {!summary.can_publish && (
            <div className="mt-5 flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4 text-sm">
              <AlertTriangle size={18} className="mt-0.5 shrink-0 text-destructive" />
              <p>The hierarchy is not ready. It must have 69 nodes, 51 non-empty product types and all 86 published products mapped exactly once.</p>
            </div>
          )}

          <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-lg border border-border/60 bg-background/45 p-4 text-sm">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 h-4 w-4 accent-[hsl(var(--gold))]" />
            <span>I reviewed the hierarchy summary and the product-to-product-type mappings shown in this workspace.</span>
          </label>

          <div className="mt-4">
            <label className="block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Type exactly: <span className="font-mono text-gold">{summary.confirmation_phrase}</span></label>
            <input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" className="mt-2 h-12 w-full rounded-md border border-border/60 bg-background/55 px-3 font-mono text-sm outline-none focus:border-gold" />
          </div>

          <button type="button" onClick={() => void publish()} disabled={!canSubmit} className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-md bg-gradient-gold px-5 text-xs font-semibold uppercase tracking-[0.18em] text-primary-foreground disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto">
            <ShieldCheck size={16} /> {action === "publish" ? "Publishing…" : "Publish reviewed hierarchy"}
          </button>
        </section>
      ) : (
        <section className="rounded-xl border border-border/60 bg-card/30 p-5 sm:p-7">
          <button type="button" onClick={() => setDangerOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-between gap-3 text-left">
            <span className="inline-flex items-center gap-2 text-sm font-medium"><Undo2 size={16} /> Reversible safety controls</span>
            {dangerOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {dangerOpen && (
            <div className="mt-5 border-t border-border/60 pt-5">
              <p className="text-sm leading-relaxed text-muted-foreground">This returns taxonomy nodes and product assignments to review state. Products, categories, media, leads and legacy URLs remain untouched.</p>
              <label className="mt-4 block text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Type exactly: <span className="font-mono text-destructive">UNPUBLISH TAXONOMY</span></label>
              <input value={unpublishConfirmation} onChange={(event) => setUnpublishConfirmation(event.target.value)} autoComplete="off" className="mt-2 h-12 w-full rounded-md border border-destructive/35 bg-background/55 px-3 font-mono text-sm outline-none focus:border-destructive" />
              <button type="button" onClick={() => void unpublish()} disabled={unpublishConfirmation !== "UNPUBLISH TAXONOMY" || Boolean(action)} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-destructive/50 px-4 text-xs uppercase tracking-[0.16em] text-destructive disabled:opacity-40">
                <Undo2 size={14} /> {action === "unpublish" ? "Returning to review…" : "Return hierarchy to review"}
              </button>
            </div>
          )}
        </section>
      )}

      {events.length > 0 && (
        <section className="rounded-xl border border-border/60 bg-card/30 p-5 sm:p-7">
          <h3 className="font-display text-2xl">Review evidence</h3>
          <div className="mt-4 divide-y divide-border/50">
            {events.map((event) => (
              <div key={event.id} className="flex flex-col gap-1 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium capitalize">{event.action}</p>
                  <p className="text-xs text-muted-foreground">{event.assignment_count} products · {event.node_count} nodes · snapshot {event.snapshot_hash.slice(0, 12)}…</p>
                </div>
                <time className="text-xs text-muted-foreground" dateTime={event.created_at}>{new Date(event.created_at).toLocaleString()}</time>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
