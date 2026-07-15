import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Image as ImageIcon, RefreshCw, Search, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

const db = supabase as any;

type Priority = "P0" | "P1" | "P2" | "P3";
type Filter = "all" | Priority;

type PriorityRow = {
  product_id: string;
  name: string;
  slug: string;
  top_category_name: string;
  subcategory_name: string;
  is_published: boolean;
  gallery_count: number;
  distinct_gallery_count: number;
  minimum_short_edge_px: number | null;
  is_reference_style: boolean;
  review_status: string;
  issue_codes: string[];
  issue_count: number;
  priority: Priority;
};

const PRIORITY_LABELS: Record<Priority, string> = {
  P0: "Missing gallery views",
  P1: "Identity or severe media issue",
  P2: "Media upgrade required",
  P3: "Buyer data completion",
};

const PRIORITY_CLASSES: Record<Priority, string> = {
  P0: "border-red-500/45 bg-red-500/[0.06] text-red-200",
  P1: "border-amber-500/45 bg-amber-500/[0.06] text-amber-200",
  P2: "border-sky-500/45 bg-sky-500/[0.06] text-sky-200",
  P3: "border-emerald-500/40 bg-emerald-500/[0.05] text-emerald-200",
};

const ISSUE_LABELS: Record<string, string> = {
  gallery_under_4: "Fewer than four gallery views",
  image_resolution_under_800: "Image resolution below 800px",
  image_resolution_under_1200: "Image resolution below 1200px",
  reference_style_identity_review: "Reference-style identity must be verified",
  material_specifications: "Material specifications missing",
  primary_material: "Primary material missing",
  fabric_composition: "Fabric composition missing",
  moq_display: "MOQ wording missing",
  sample_available: "Sample availability missing",
  sample_timeline: "Sample timeline missing",
  production_timeline: "Production timeline missing",
  country_of_origin: "Country of origin missing",
  available_sizes: "Available sizes missing",
  available_colors: "Available colours missing",
  packaging_standard: "Packaging standard missing",
};

export default function CatalogPriorityAuditPanel() {
  const [rows, setRows] = useState<PriorityRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("P0");
  const [query, setQuery] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const result = await db
      .from("catalog_priority_audit")
      .select("*")
      .eq("is_published", true)
      .order("priority", { ascending: true })
      .order("issue_count", { ascending: false })
      .order("name", { ascending: true });

    setRows((result.data || []) as PriorityRow[]);
    setError(result.error?.message || null);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const stats = useMemo(() => ({
    total: rows.length,
    P0: rows.filter((row) => row.priority === "P0").length,
    P1: rows.filter((row) => row.priority === "P1").length,
    P2: rows.filter((row) => row.priority === "P2").length,
    P3: rows.filter((row) => row.priority === "P3").length,
  }), [rows]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (filter !== "all" && row.priority !== filter) return false;
      if (!needle) return true;
      return [row.name, row.slug, row.top_category_name, row.subcategory_name, ...(row.issue_codes || [])]
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [rows, filter, query]);

  return (
    <section className="space-y-5 border border-red-500/25 bg-card/25 p-4 sm:p-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <ShieldAlert size={22} className="mt-1 shrink-0 text-red-300" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Live owner-database work queue</p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl">Catalog Priority Audit</h2>
            <p className="mt-2 max-w-4xl text-sm leading-relaxed text-foreground/65">
              Objective media, identity and buyer-data issues are ranked before any product is merged, removed or promoted. P0 is handled first; reference-style pages remain published until their exact product identity is reviewed.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="inline-flex min-h-11 items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={14} className={cn(loading && "animate-spin")} /> Refresh queue
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        <Metric label="All published" value={stats.total} />
        <Metric label="P0 blockers" value={stats.P0} tone="critical" />
        <Metric label="P1 urgent" value={stats.P1} tone="warn" />
        <Metric label="P2 upgrades" value={stats.P2} />
        <Metric label="P3 data" value={stats.P3} tone="good" />
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative max-w-2xl flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search product, category or issue…"
            className="min-h-12 w-full border border-border/60 bg-background pl-10 pr-3 text-sm outline-none focus:border-gold"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0">
          {(["P0", "P1", "P2", "P3", "all"] as Filter[]).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setFilter(item)}
              className={cn(
                "min-h-11 shrink-0 border px-3 text-[10px] uppercase tracking-[0.14em]",
                filter === item ? "border-gold bg-gold/10 text-gold" : "border-border/60 text-muted-foreground",
              )}
            >
              {item === "all" ? "All" : `${item} · ${stats[item]}`}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="border border-red-500/40 bg-red-500/[0.05] p-4 text-sm text-red-200">
          Priority audit could not load: {error}
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-sm text-muted-foreground">Checking live catalog priorities…</div>
      ) : visible.length === 0 ? (
        <div className="border border-dashed border-border/60 p-10 text-center text-sm text-muted-foreground">
          No product matches this filter.
        </div>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <article key={row.product_id} className="border border-border/60 bg-background/35 p-4 sm:p-5">
              <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={cn("inline-flex min-h-7 items-center border px-2 text-[9px] uppercase tracking-[0.13em]", PRIORITY_CLASSES[row.priority])}>
                      {row.priority}
                    </span>
                    <h3 className="font-display text-lg sm:text-xl">{row.name}</h3>
                    {row.is_reference_style && (
                      <span className="border border-amber-500/35 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-amber-200">Identity review</span>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {row.top_category_name} · {row.subcategory_name} · {PRIORITY_LABELS[row.priority]}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {(row.issue_codes || []).map((issue) => (
                      <span key={issue} className="border border-border/50 bg-card/35 px-2 py-1 text-[10px] text-foreground/70">
                        {ISSUE_LABELS[issue] || issue.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid shrink-0 grid-cols-2 gap-2 text-right sm:grid-cols-3">
                  <SmallMetric icon={<ImageIcon size={13} />} label="Gallery" value={`${row.distinct_gallery_count}/${row.gallery_count}`} />
                  <SmallMetric label="Minimum edge" value={row.minimum_short_edge_px ? `${row.minimum_short_edge_px}px` : "Unknown"} />
                  <SmallMetric icon={<AlertTriangle size={13} />} label="Issues" value={String(row.issue_count)} />
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value, tone = "neutral" }: { label: string; value: number; tone?: "neutral" | "critical" | "warn" | "good" }) {
  const valueClass = tone === "critical" ? "text-red-300" : tone === "warn" ? "text-amber-300" : tone === "good" ? "text-emerald-300" : "text-foreground";
  return (
    <div className="border border-border/50 bg-background/35 p-3">
      <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={cn("mt-1 font-display text-2xl", valueClass)}>{value}</p>
    </div>
  );
}

function SmallMetric({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="min-w-24 border border-border/45 px-3 py-2">
      <p className="flex items-center justify-end gap-1 text-[8px] uppercase tracking-[0.13em] text-muted-foreground">{icon}{label}</p>
      <p className="mt-1 text-sm font-medium tabular-nums">{value}</p>
    </div>
  );
}
