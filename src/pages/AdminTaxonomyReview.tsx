import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MAIN_CATEGORIES } from "@/lib/catalogTaxonomyManifest";
import { toast } from "@/hooks/use-toast";

type AssignmentRow = {
  product_id: string;
  taxonomy_node_id: string;
  assignment_source: string;
  review_state: "proposed" | "approved" | "rejected";
  created_at: string;
  updated_at: string;
  approved_at: string | null;
  products: {
    id: string;
    slug: string;
    name: string;
    sku: string | null;
    image_url: string | null;
    is_published: boolean;
    gallery: string[] | null;
  } | null;
  catalog_taxonomy_nodes: {
    id: string;
    slug: string;
    name: string;
    node_type: string;
    depth: number;
    full_slug_path: string;
    publish_state: string;
  } | null;
};

type ReviewFilter = "all" | "proposed" | "approved" | "rejected";

export default function AdminTaxonomyReview() {
  const { user, isAdmin, loading } = useAuth();
  const [rows, setRows] = useState<AssignmentRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [search, setSearch] = useState("");
  const [mainFilter, setMainFilter] = useState<string>("all");
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>("proposed");
  const [mediaFilter, setMediaFilter] = useState<"all" | "missing" | "attached">("all");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user || !isAdmin) return;
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      // Cast: table exists via migration but generated types may lag until
      // the release workflow refreshes src/integrations/supabase/types.ts.
      const client = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => {
            order: (col: string, opts: { ascending: boolean }) => {
              limit: (n: number) => Promise<{ data: unknown; error: { message: string } | null }>;
            };
          };
        };
      };
      const { data, error: err } = await client
        .from("product_taxonomy_assignments")
        .select(
          "product_id, taxonomy_node_id, assignment_source, review_state, created_at, updated_at, approved_at, products:product_id ( id, slug, name, sku, image_url, is_published, gallery ), catalog_taxonomy_nodes:taxonomy_node_id ( id, slug, name, node_type, depth, full_slug_path, publish_state )",
        )
        .order("updated_at", { ascending: false })
        .limit(500);
      if (cancelled) return;
      if (err) {
        setError(err.message);
        setBusy(false);
        return;
      }
      setRows((data ?? []) as unknown as AssignmentRow[]);
      setBusy(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, isAdmin]);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (reviewFilter !== "all" && r.review_state !== reviewFilter) return false;
      if (mainFilter !== "all") {
        const path = r.catalog_taxonomy_nodes?.full_slug_path ?? "";
        if (!path.startsWith(mainFilter)) return false;
      }
      const hasMedia =
        Boolean(r.products?.image_url) ||
        (r.products?.gallery && r.products.gallery.length > 0);
      if (mediaFilter === "missing" && hasMedia) return false;
      if (mediaFilter === "attached" && !hasMedia) return false;
      if (term) {
        const haystack = [
          r.products?.name,
          r.products?.slug,
          r.products?.sku,
          r.catalog_taxonomy_nodes?.full_slug_path,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [rows, reviewFilter, mainFilter, mediaFilter, search]);

  async function update(productId: string, next: "approved" | "rejected" | "proposed") {
    setBusy(true);
    const payload =
      next === "approved"
        ? { review_state: next, approved_at: new Date().toISOString(), approved_by: user!.id }
        : { review_state: next, approved_at: null, approved_by: null };
    const client = supabase as unknown as {
      from: (t: string) => {
        update: (p: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    };
    const { error: err } = await client
      .from("product_taxonomy_assignments")
      .update(payload)
      .eq("product_id", productId);
    if (err) {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    } else {
      setRows((prev) =>
        prev.map((r) =>
          r.product_id === productId
            ? { ...r, review_state: next, approved_at: payload.approved_at ?? null }
            : r,
        ),
      );
      toast({ title: `Assignment marked ${next}` });
    }
    setBusy(false);
  }

  if (loading) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Checking owner access…</div>;
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <div className="min-h-[60vh] flex items-center justify-center text-sm text-muted-foreground">Admin access is required.</div>;

  return (
    <main className="min-h-screen bg-background p-3 text-foreground sm:p-6 lg:p-8">
      <SEO
        title="Taxonomy review — Irha Apparels admin"
        description="Approve, reject or reassign catalogue taxonomy proposals."
        path="/admin/taxonomy-review"
        noindex
      />
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          <a
            href="/admin"
            className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.14em] hover:border-gold hover:text-gold"
          >
            <ArrowLeft size={12} /> Main admin
          </a>
          <h1 className="ml-2 text-xl font-semibold uppercase tracking-[0.16em]">
            Taxonomy review queue
          </h1>
        </div>

        <div className="grid gap-2 md:grid-cols-4">
          <Input
            placeholder="Search name / slug / reference"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Select value={mainFilter} onValueChange={setMainFilter}>
            <SelectTrigger><SelectValue placeholder="Main category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All main categories</SelectItem>
              {MAIN_CATEGORIES.map((m) => (
                <SelectItem key={m.slug} value={m.slug}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={reviewFilter} onValueChange={(v) => setReviewFilter(v as ReviewFilter)}>
            <SelectTrigger><SelectValue placeholder="Review state" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              <SelectItem value="proposed">Proposed</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select value={mediaFilter} onValueChange={(v) => setMediaFilter(v as typeof mediaFilter)}>
            <SelectTrigger><SelectValue placeholder="Media" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All media</SelectItem>
              <SelectItem value="missing">Missing media only</SelectItem>
              <SelectItem value="attached">Media attached</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {error && (
          <div className="border border-destructive/40 bg-destructive/10 px-4 py-3 text-xs text-destructive">
            {error}
          </div>
        )}

        <div className="border border-border/60">
          <table className="w-full text-xs">
            <thead className="border-b border-border/60 bg-muted/40 text-[10px] uppercase tracking-[0.14em]">
              <tr>
                <th className="p-2 text-left">Product</th>
                <th className="p-2 text-left">Reference</th>
                <th className="p-2 text-left">Proposed node</th>
                <th className="p-2 text-left">Media</th>
                <th className="p-2 text-left">Published</th>
                <th className="p-2 text-left">Review</th>
                <th className="p-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {busy && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Loading…</td></tr>
              )}
              {!busy && filtered.length === 0 && (
                <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">No assignments match the current filters.</td></tr>
              )}
              {filtered.map((r) => {
                const hasMedia =
                  Boolean(r.products?.image_url) ||
                  (r.products?.gallery && r.products.gallery.length > 0);
                return (
                  <tr key={r.product_id} className="border-b border-border/40 align-top">
                    <td className="p-2">
                      <div className="font-medium">{r.products?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{r.products?.slug}</div>
                    </td>
                    <td className="p-2 font-mono text-[11px]">{r.products?.sku ?? "—"}</td>
                    <td className="p-2">
                      <div>{r.catalog_taxonomy_nodes?.name ?? "—"}</div>
                      <div className="text-[10px] text-muted-foreground">{r.catalog_taxonomy_nodes?.full_slug_path}</div>
                    </td>
                    <td className="p-2">
                      {hasMedia ? (
                        <Badge variant="outline">attached</Badge>
                      ) : (
                        <Badge variant="destructive">missing</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      {r.products?.is_published ? (
                        <Badge>live</Badge>
                      ) : (
                        <Badge variant="secondary">draft</Badge>
                      )}
                    </td>
                    <td className="p-2">
                      <Badge
                        variant={
                          r.review_state === "approved"
                            ? "default"
                            : r.review_state === "rejected"
                              ? "destructive"
                              : "outline"
                        }
                      >
                        {r.review_state}
                      </Badge>
                    </td>
                    <td className="p-2">
                      <div className="flex flex-wrap gap-1">
                        <Button size="sm" variant="outline" disabled={busy || r.review_state === "approved"} onClick={() => update(r.product_id, "approved")}>
                          Approve
                        </Button>
                        <Button size="sm" variant="outline" disabled={busy || r.review_state === "rejected"} onClick={() => update(r.product_id, "rejected")}>
                          Reject
                        </Button>
                        <Button size="sm" variant="ghost" disabled={busy || r.review_state === "proposed"} onClick={() => update(r.product_id, "proposed")}>
                          Reopen
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
          Approval is required before a product can render publicly. Media must be attached and the product marked live from its own workflow — this queue only sets taxonomy fit.
        </p>
      </div>
    </main>
  );
}
