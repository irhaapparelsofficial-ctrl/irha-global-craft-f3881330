import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Health = {
  categoryCount: number;
  publishedCategoryCount: number;
  productCount: number;
  publishedProductCount: number;
  productsMissingImage: number;
  productsMissingDescription: number;
  productsUnderHiddenCategory: number;
  categoriesWithoutParent: number;
  lastCatalogChangeAt: string | null;
};

type ChangeRow = {
  id: string;
  entity_type: "category" | "product";
  entity_id: string;
  action: "insert" | "update" | "delete";
  before_data: Record<string, unknown> | null;
  after_data: Record<string, unknown> | null;
  created_at: string;
};

const db = supabase as any;

export default function CatalogReleaseStatus() {
  const [health, setHealth] = useState<Health | null>(null);
  const [changes, setChanges] = useState<ChangeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [healthResult, changesResult] = await Promise.all([
      db.rpc("catalog_get_admin_health"),
      db.from("catalog_change_log")
        .select("id,entity_type,entity_id,action,before_data,after_data,created_at")
        .order("created_at", { ascending: false })
        .limit(8),
    ]);

    const message = healthResult.error?.message || changesResult.error?.message || null;
    setError(message);
    setHealth((healthResult.data as Health | null) || null);
    setChanges((changesResult.data as ChangeRow[] | null) || []);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const blockers = health
    ? health.productsMissingImage + health.productsMissingDescription + health.productsUnderHiddenCategory + health.categoriesWithoutParent
    : 0;

  return (
    <section className="mb-6 border border-border/60 bg-card/25 p-4 md:p-5">
      <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <Database size={19} className="text-gold shrink-0 mt-0.5" />
          <div>
            <p className="text-[10px] uppercase tracking-[0.2em] text-gold">Live catalog release</p>
            <h2 className="font-display text-xl md:text-2xl mt-1">Database-controlled catalog</h2>
            <p className="text-xs text-foreground/60 mt-2 leading-relaxed max-w-3xl">
              Admin changes are audited. Published database records override the verified committed catalog; unavailable backend data automatically falls back to the committed release instead of breaking buyer pages.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="min-h-11 inline-flex items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
        >
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh health
        </button>
      </div>

      {error && (
        <div className="mt-4 border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive break-words">
          {error}
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-2">
        <Metric label="Categories" value={health ? `${health.publishedCategoryCount}/${health.categoryCount}` : "—"} />
        <Metric label="Products" value={health ? `${health.publishedProductCount}/${health.productCount}` : "—"} />
        <Metric label="Release issues" value={health ? String(blockers) : "—"} tone={blockers > 0 ? "warn" : "good"} />
        <Metric
          label="Last database change"
          value={health?.lastCatalogChangeAt ? new Date(health.lastCatalogChangeAt).toLocaleString() : "No audited change yet"}
          compact
        />
      </div>

      {health && blockers > 0 && (
        <div className="mt-4 border border-amber-500/35 bg-amber-500/[0.06] p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-amber-300 shrink-0 mt-0.5" />
          <div className="text-xs text-foreground/70 leading-relaxed">
            <p className="font-medium text-amber-200">Review before large catalog promotion</p>
            <p className="mt-1">
              Missing image: {health.productsMissingImage} · Missing description: {health.productsMissingDescription} · Published under hidden category: {health.productsUnderHiddenCategory} · Broken category parent: {health.categoriesWithoutParent}
            </p>
          </div>
        </div>
      )}

      {health && blockers === 0 && (
        <div className="mt-4 flex items-center gap-2 text-xs text-emerald-500">
          <CheckCircle2 size={15} /> Catalog release health checks are clear.
        </div>
      )}

      <div className="mt-5 border-t border-border/50 pt-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock3 size={14} className="text-gold" />
          <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent audited changes</p>
        </div>
        {changes.length === 0 ? (
          <p className="text-xs text-muted-foreground">New catalog edits will appear here after this release is active.</p>
        ) : (
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
            {changes.map((row) => {
              const data = row.after_data || row.before_data || {};
              const label = typeof data.name === "string" ? data.name : row.entity_id.slice(0, 8);
              return (
                <div key={row.id} className="border border-border/40 p-3 min-w-0">
                  <p className="text-[9px] uppercase tracking-[0.16em] text-gold capitalize">{row.action} · {row.entity_type}</p>
                  <p className="text-xs mt-1 truncate" title={label}>{label}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(row.created_at).toLocaleString()}</p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
  compact = false,
}: {
  label: string;
  value: string;
  tone?: "neutral" | "good" | "warn";
  compact?: boolean;
}) {
  const toneClass = tone === "good" ? "text-emerald-500" : tone === "warn" ? "text-amber-400" : "text-foreground";
  return (
    <div className="border border-border/40 bg-background/35 p-3 min-w-0">
      <p className="text-[8px] uppercase tracking-[0.15em] text-muted-foreground truncate">{label}</p>
      <p className={`${compact ? "text-xs" : "font-display text-xl"} ${toneClass} mt-1 truncate`} title={value}>{value}</p>
    </div>
  );
}
