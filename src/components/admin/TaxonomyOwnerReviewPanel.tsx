import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Layers3,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const db = supabase as any;

type TaxonomyNode = {
  id: string;
  parent_id: string | null;
  node_type: "main_category" | "audience" | "buyer_group" | "product_type" | "accessories" | "collection";
  slug: string;
  name: string;
  depth: number;
  full_slug_path: string;
  description: string | null;
  seo_title: string | null;
  seo_description: string | null;
  sort_order: number;
  publish_state: "draft" | "review" | "published" | "archived";
  updated_at: string;
};

type Assignment = {
  product_id: string;
  taxonomy_node_id: string;
  assignment_source: "manual" | "migration" | "admin";
  review_state: "proposed" | "approved" | "rejected";
  approved_by: string | null;
  approved_at: string | null;
  updated_at: string;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  is_published: boolean;
};

type View = "hierarchy" | "assignments";
type AssignmentFilter = "all" | Assignment["review_state"];

const nodeTypeLabel: Record<TaxonomyNode["node_type"], string> = {
  main_category: "Main category",
  audience: "Audience",
  buyer_group: "Buyer group",
  product_type: "Product type",
  accessories: "Accessories",
  collection: "Collection",
};

export default function TaxonomyOwnerReviewPanel() {
  const [nodes, setNodes] = useState<TaxonomyNode[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [view, setView] = useState<View>("hierarchy");
  const [assignmentFilter, setAssignmentFilter] = useState<AssignmentFilter>("all");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    const [nodeResult, assignmentResult, productResult] = await Promise.all([
      db
        .from("catalog_taxonomy_nodes")
        .select("id,parent_id,node_type,slug,name,depth,full_slug_path,description,seo_title,seo_description,sort_order,publish_state,updated_at")
        .order("full_slug_path", { ascending: true })
        .limit(500),
      db
        .from("product_taxonomy_assignments")
        .select("product_id,taxonomy_node_id,assignment_source,review_state,approved_by,approved_at,updated_at")
        .order("updated_at", { ascending: false })
        .limit(500),
      db
        .from("products")
        .select("id,name,slug,is_published")
        .order("name", { ascending: true })
        .limit(500),
    ]);

    const message = nodeResult.error?.message || assignmentResult.error?.message || productResult.error?.message || null;
    setError(message);
    setNodes((nodeResult.data as TaxonomyNode[] | null) || []);
    setAssignments((assignmentResult.data as Assignment[] | null) || []);
    setProducts((productResult.data as Product[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const nodeById = useMemo(() => new Map(nodes.map((node) => [node.id, node])), [nodes]);
  const productById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const normalizedQuery = query.trim().toLowerCase();

  const nodeRows = useMemo(() => {
    if (!normalizedQuery) return nodes;
    return nodes.filter((node) => `${node.name} ${node.full_slug_path} ${node.node_type}`.toLowerCase().includes(normalizedQuery));
  }, [nodes, normalizedQuery]);

  const assignmentRows = useMemo(() => assignments.filter((assignment) => {
    if (assignmentFilter !== "all" && assignment.review_state !== assignmentFilter) return false;
    if (!normalizedQuery) return true;
    const product = productById.get(assignment.product_id);
    const node = nodeById.get(assignment.taxonomy_node_id);
    return `${product?.name || ""} ${product?.slug || ""} ${node?.full_slug_path || ""}`.toLowerCase().includes(normalizedQuery);
  }), [assignments, assignmentFilter, nodeById, normalizedQuery, productById]);

  const counts = useMemo(() => ({
    nodes: nodes.length,
    draftNodes: nodes.filter((node) => node.publish_state === "draft").length,
    reviewNodes: nodes.filter((node) => node.publish_state === "review").length,
    publishedNodes: nodes.filter((node) => node.publish_state === "published").length,
    assignments: assignments.length,
    proposedAssignments: assignments.filter((assignment) => assignment.review_state === "proposed").length,
    approvedAssignments: assignments.filter((assignment) => assignment.review_state === "approved").length,
    rejectedAssignments: assignments.filter((assignment) => assignment.review_state === "rejected").length,
  }), [assignments, nodes]);

  const reviewComplete = counts.nodes > 0
    && counts.reviewNodes === counts.nodes
    && counts.assignments > 0
    && counts.approvedAssignments === counts.assignments;

  const updateNodeState = async (node: TaxonomyNode, nextState: "draft" | "review") => {
    setBusyKey(`node:${node.id}`);
    try {
      const { data: authData } = await supabase.auth.getUser();
      const { error: updateError } = await db
        .from("catalog_taxonomy_nodes")
        .update({ publish_state: nextState, updated_by: authData.user?.id || null, updated_at: new Date().toISOString() })
        .eq("id", node.id);
      if (updateError) throw updateError;
      setNodes((current) => current.map((row) => row.id === node.id ? { ...row, publish_state: nextState, updated_at: new Date().toISOString() } : row));
      toast({ title: nextState === "review" ? "Hierarchy item reviewed" : "Returned to draft", description: node.full_slug_path });
    } catch (caught) {
      toast({ title: "Hierarchy review failed", description: caught instanceof Error ? caught.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  const updateAssignmentState = async (assignment: Assignment, nextState: Assignment["review_state"]) => {
    const product = productById.get(assignment.product_id);
    const node = nodeById.get(assignment.taxonomy_node_id);

    if (nextState === "approved") {
      const accepted = window.confirm(
        `Approve this one product assignment?\n\n${product?.name || assignment.product_id}\n→ ${node?.full_slug_path || assignment.taxonomy_node_id}\n\nThis does not publish the taxonomy.`,
      );
      if (!accepted) return;
    }

    setBusyKey(`assignment:${assignment.product_id}`);
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (nextState === "approved" && !authData.user?.id) throw new Error("Signed-in owner identity is required for approval");

      const approval = nextState === "approved"
        ? { approved_by: authData.user!.id, approved_at: new Date().toISOString() }
        : { approved_by: null, approved_at: null };

      const { error: updateError } = await db
        .from("product_taxonomy_assignments")
        .update({ review_state: nextState, assignment_source: "admin", ...approval, updated_at: new Date().toISOString() })
        .eq("product_id", assignment.product_id);
      if (updateError) throw updateError;

      setAssignments((current) => current.map((row) => row.product_id === assignment.product_id
        ? { ...row, review_state: nextState, assignment_source: "admin", ...approval, updated_at: new Date().toISOString() }
        : row));
      toast({
        title: nextState === "approved" ? "Product assignment approved" : nextState === "rejected" ? "Product assignment rejected" : "Assignment reset for review",
        description: product?.name || assignment.product_id,
      });
    } catch (caught) {
      toast({ title: "Assignment review failed", description: caught instanceof Error ? caught.message : "Unknown error", variant: "destructive" });
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="max-w-4xl">
          <div className="flex items-center gap-2 text-gold">
            <ShieldCheck size={18} />
            <p className="text-[10px] uppercase tracking-[0.18em]">Owner-controlled review</p>
          </div>
          <h3 className="mt-2 font-display text-xl sm:text-2xl">Main Category → Audience → Product Type</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Review the new three-level B2B structure and each product assignment individually. This workspace can mark items ready for review, approve or reject one product mapping at a time, and return work to draft.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh review data
        </button>
      </div>

      <div className="flex items-start gap-3 border border-amber-500/40 bg-amber-500/[0.07] p-4">
        <AlertTriangle size={17} className="mt-0.5 shrink-0 text-amber-300" />
        <div className="text-xs leading-relaxed text-foreground/75">
          <p className="font-medium text-amber-200">Public cutover stays blocked</p>
          <p className="mt-1">There is no publish button in this workspace. A separate reviewed release is required after owner evidence is complete, SEO routes are checked and the exact current main passes Quality Gate.</p>
        </div>
      </div>

      {error && <div className="break-words border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">{error}</div>}

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4 xl:grid-cols-6">
        <Metric label="Hierarchy nodes" value={counts.nodes} />
        <Metric label="Ready for review" value={counts.reviewNodes} tone={counts.reviewNodes === counts.nodes && counts.nodes > 0 ? "good" : "neutral"} />
        <Metric label="Still draft" value={counts.draftNodes} tone={counts.draftNodes > 0 ? "warn" : "good"} />
        <Metric label="Product mappings" value={counts.assignments} />
        <Metric label="Approved mappings" value={counts.approvedAssignments} tone={counts.approvedAssignments === counts.assignments && counts.assignments > 0 ? "good" : "neutral"} />
        <Metric label="Proposed / rejected" value={`${counts.proposedAssignments} / ${counts.rejectedAssignments}`} tone={counts.rejectedAssignments > 0 ? "warn" : "neutral"} />
      </div>

      <div className={`flex items-start gap-3 border p-4 ${reviewComplete ? "border-emerald-500/40 bg-emerald-500/[0.06]" : "border-border/60 bg-background/30"}`}>
        {reviewComplete ? <CheckCircle2 size={17} className="mt-0.5 shrink-0 text-emerald-400" /> : <Layers3 size={17} className="mt-0.5 shrink-0 text-gold" />}
        <div className="text-xs leading-relaxed">
          <p className="font-medium">{reviewComplete ? "Owner review records are complete" : "Owner review is not complete"}</p>
          <p className="mt-1 text-muted-foreground">
            {reviewComplete
              ? "All hierarchy items are in review state and every product mapping has an owner approval record. Public release is still a separate controlled step."
              : `${counts.draftNodes} hierarchy item(s) remain draft and ${counts.assignments - counts.approvedAssignments} product assignment(s) still need an approval decision.`}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 md:flex-row md:items-center md:justify-between">
        <div className="inline-flex w-full rounded-md border border-border/60 p-1 md:w-auto">
          <ViewButton active={view === "hierarchy"} onClick={() => setView("hierarchy")}>Hierarchy review</ViewButton>
          <ViewButton active={view === "assignments"} onClick={() => setView("assignments")}>Product assignments</ViewButton>
        </div>
        <div className="flex w-full flex-col gap-2 sm:flex-row md:max-w-2xl">
          {view === "assignments" && (
            <select
              value={assignmentFilter}
              onChange={(event) => setAssignmentFilter(event.target.value as AssignmentFilter)}
              className="min-h-11 border border-border/60 bg-background px-3 text-xs outline-none focus:border-gold"
              aria-label="Filter product assignments"
            >
              <option value="all">All decisions</option>
              <option value="proposed">Proposed</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
            </select>
          )}
          <label className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={view === "hierarchy" ? "Search hierarchy path…" : "Search product or assigned path…"}
              className="min-h-11 w-full border border-border/60 bg-background pl-9 pr-3 text-sm outline-none focus:border-gold"
            />
          </label>
        </div>
      </div>

      {loading && nodes.length === 0 ? (
        <div className="py-14 text-center text-sm text-muted-foreground" role="status">Loading owner review workspace…</div>
      ) : view === "hierarchy" ? (
        <HierarchyTable rows={nodeRows} busyKey={busyKey} onState={updateNodeState} />
      ) : (
        <AssignmentTable
          rows={assignmentRows}
          nodeById={nodeById}
          productById={productById}
          busyKey={busyKey}
          onState={updateAssignmentState}
        />
      )}
    </div>
  );
}

function HierarchyTable({
  rows,
  busyKey,
  onState,
}: {
  rows: TaxonomyNode[];
  busyKey: string | null;
  onState: (node: TaxonomyNode, state: "draft" | "review") => Promise<void>;
}) {
  if (rows.length === 0) return <Empty text="No hierarchy item matched this search." />;
  return (
    <div className="max-h-[42rem] overflow-auto border border-border/60">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="sticky top-0 z-10 bg-secondary text-[9px] uppercase tracking-[0.17em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Hierarchy item</th>
            <th className="px-4 py-3 text-left">Type</th>
            <th className="px-4 py-3 text-left">Review state</th>
            <th className="px-4 py-3 text-right">Owner action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((node) => {
            const busy = busyKey === `node:${node.id}`;
            return (
              <tr key={node.id} className="border-t border-border/40 align-top hover:bg-muted/20">
                <td className="px-4 py-3">
                  <div className="flex items-start gap-3" style={{ paddingLeft: `${node.depth * 14}px` }}>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-gold/70" />
                    <div className="min-w-0">
                      <p className="font-medium text-foreground/90">{node.name}</p>
                      <p className="mt-1 break-all text-[11px] text-muted-foreground">{node.full_slug_path}</p>
                      {node.seo_title && <p className="mt-1 line-clamp-1 text-[10px] text-foreground/50">SEO: {node.seo_title}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-foreground/70">{nodeTypeLabel[node.node_type]}</td>
                <td className="px-4 py-3"><StateBadge value={node.publish_state} /></td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {node.publish_state !== "review" && (
                      <ActionButton disabled={busy || node.publish_state === "published"} onClick={() => void onState(node, "review")} icon={<Check size={13} />}>Mark reviewed</ActionButton>
                    )}
                    {node.publish_state !== "draft" && node.publish_state !== "published" && (
                      <ActionButton disabled={busy} onClick={() => void onState(node, "draft")} icon={<RotateCcw size={13} />}>Return draft</ActionButton>
                    )}
                    {node.publish_state === "published" && <span className="text-[10px] text-amber-300">Locked: already public</span>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AssignmentTable({
  rows,
  nodeById,
  productById,
  busyKey,
  onState,
}: {
  rows: Assignment[];
  nodeById: Map<string, TaxonomyNode>;
  productById: Map<string, Product>;
  busyKey: string | null;
  onState: (assignment: Assignment, state: Assignment["review_state"]) => Promise<void>;
}) {
  if (rows.length === 0) return <Empty text="No product assignment matched this search or filter." />;
  return (
    <div className="max-h-[42rem] overflow-auto border border-border/60">
      <table className="w-full min-w-[900px] text-sm">
        <thead className="sticky top-0 z-10 bg-secondary text-[9px] uppercase tracking-[0.17em] text-muted-foreground">
          <tr>
            <th className="px-4 py-3 text-left">Product</th>
            <th className="px-4 py-3 text-left">Assigned product type</th>
            <th className="px-4 py-3 text-left">Decision</th>
            <th className="px-4 py-3 text-right">Owner action</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((assignment) => {
            const product = productById.get(assignment.product_id);
            const node = nodeById.get(assignment.taxonomy_node_id);
            const busy = busyKey === `assignment:${assignment.product_id}`;
            return (
              <tr key={assignment.product_id} className="border-t border-border/40 align-top hover:bg-muted/20">
                <td className="px-4 py-3">
                  <p className="font-medium text-foreground/90">{product?.name || assignment.product_id}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">{product?.slug || "Product record unavailable"}</p>
                  {product && !product.is_published && <p className="mt-1 text-[10px] text-amber-300">Legacy product is not published</p>}
                </td>
                <td className="px-4 py-3">
                  <p className="break-all text-xs text-foreground/75">{node?.full_slug_path || assignment.taxonomy_node_id}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{node ? nodeTypeLabel[node.node_type] : "Missing taxonomy node"}</p>
                </td>
                <td className="px-4 py-3">
                  <StateBadge value={assignment.review_state} />
                  {assignment.approved_at && <p className="mt-1 text-[10px] text-muted-foreground">{new Date(assignment.approved_at).toLocaleString()}</p>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    {assignment.review_state !== "approved" && <ActionButton disabled={busy || !node || !product} onClick={() => void onState(assignment, "approved")} icon={<Check size={13} />}>Approve</ActionButton>}
                    {assignment.review_state !== "rejected" && <ActionButton disabled={busy} onClick={() => void onState(assignment, "rejected")} icon={<X size={13} />}>Reject</ActionButton>}
                    {assignment.review_state !== "proposed" && <ActionButton disabled={busy} onClick={() => void onState(assignment, "proposed")} icon={<RotateCcw size={13} />}>Reset</ActionButton>}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ViewButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={`min-h-10 flex-1 px-4 text-xs font-medium md:flex-none ${active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>{children}</button>;
}

function ActionButton({ disabled, onClick, icon, children }: { disabled: boolean; onClick: () => void; icon: React.ReactNode; children: React.ReactNode }) {
  return <button type="button" disabled={disabled} onClick={onClick} className="inline-flex min-h-9 items-center gap-1.5 border border-border/60 px-2.5 text-[10px] uppercase tracking-[0.12em] hover:border-gold hover:text-gold disabled:cursor-not-allowed disabled:opacity-40">{icon}{children}</button>;
}

function StateBadge({ value }: { value: string }) {
  const tone = value === "approved" || value === "review"
    ? "border-emerald-500/45 text-emerald-400"
    : value === "rejected" || value === "archived"
      ? "border-red-500/45 text-red-300"
      : value === "published"
        ? "border-amber-500/45 text-amber-300"
        : "border-border/60 text-muted-foreground";
  return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.15em] ${tone}`}>{value.replace("_", " ")}</span>;
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: string | number; tone?: "neutral" | "good" | "warn" }) {
  const toneClass = tone === "good" ? "text-emerald-400" : tone === "warn" ? "text-amber-300" : "text-foreground";
  return <div className="min-w-0 border border-border/50 bg-background/35 p-3"><p className="truncate text-[8px] uppercase tracking-[0.14em] text-muted-foreground">{label}</p><p className={`mt-1 font-display text-xl ${toneClass}`}>{value}</p></div>;
}

function Empty({ text }: { text: string }) {
  return <div className="border border-dashed border-border/60 px-4 py-12 text-center text-sm text-muted-foreground">{text}</div>;
}
