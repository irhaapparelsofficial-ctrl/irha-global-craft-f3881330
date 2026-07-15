import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Database, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import CatalogPriorityAuditPanel from "@/components/admin/CatalogPriorityAuditPanel";
import ProductQualityCenter from "@/components/admin/ProductQualityCenter";

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
    <>
      <details className="group mb-4 border border-red-500/30 bg-card/25" open>
        <summary className="list-none cursor-pointer px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-red-300">Active remediation queue</p>
              <h2 className="mt-1 font-display text-lg sm:text-xl">Catalog priorities</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Live P0–P3 queue for missing gallery views, low-resolution media, reference-style identity review and buyer-data completion.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-red-500/45 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-red-200 group-open:hidden">Open</span>
            <span className="hidden shrink-0 rounded-full border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground group-open:inline-flex">Close</span>
          </div>
        </summary>
        <div className="border-t border-border/60 p-3 sm:p-4">
          <CatalogPriorityAuditPanel />
        </div>
      </details>

      <details className="group mb-4 border border-gold/30 bg-card/25">
        <summary className="list-none cursor-pointer px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Product information check</p>
              <h2 className="mt-1 font-display text-lg sm:text-xl">Product quality review</h2>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                Review missing material, sizes, colours, timelines and product-view details before a product is marked verified.
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-gold/45 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-gold group-open:hidden">Open</span>
            <span className="hidden shrink-0 rounded-full border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground group-open:inline-flex">Close</span>
          </div>
        </summary>
        <div className="border-t border-border/60 p-3 sm:p-4">
          <ProductQualityCenter />
        </div>
      </details>

      <details className="group mb-6 border border-border/60 bg-card/25">
        <summary className="list-none cursor-pointer px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-start gap-3">
              <Database size={18} className="mt-0.5 shrink-0 text-gold" />
              <div className="min-w-0">
                <p className="text-[9px] uppercase tracking-[0.18em] text-gold">Advanced catalog check</p>
                <h2 className="mt-1 font-display text-lg sm:text-xl">Catalog health & recent changes</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {health
                    ? `${health.publishedProductCount}/${health.productCount} products published · ${blockers} release issue${blockers === 1 ? "" : "s"}`
                    : loading
                      ? "Checking live catalog health…"
                      : "Open to review catalog health."}
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground group-open:hidden">Open</span>
            <span className="hidden shrink-0 rounded-full border border-border/60 px-3 py-2 text-[9px] uppercase tracking-[0.16em] text-muted-foreground group-open:inline-flex">Close</span>
          </div>
        </summary>

        <div className="border-t border-border/60 p-4 md:p-5">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div>
              <p className="text-sm font-medium">Database-controlled catalog</p>
              <p className="mt-1 max-w-4xl text-xs leading-relaxed text-foreground/60">
                Admin changes are audited. Published database records override the verified committed catalog; unavailable backend data automatically falls back to the committed release instead of breaking buyer pages.
              </p>
            </div>
            <button
              type="button"
              onClick={() => void load()}
              disabled={loading}
              className="inline-flex min-h-11 items-center justify-center gap-2 border border-border/60 px-4 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-50"
            >
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh health
            </button>
          </div>

          {error && (
            <div className="mt-4 break-words border border-destructive/40 bg-destructive/5 p-3 text-xs text-destructive">
              {error}
            </div>
          )}

          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
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
            <div className="mt-4 flex items-start gap-3 border border-amber-500/35 bg-amber-500/[0.06] p-4">
              <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-300" />
              <div className="text-xs leading-relaxed text-foreground/70">
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
            <div className="mb-3 flex items-center gap-2">
              <Clock3 size={14} className="text-gold" />
              <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Recent audited changes</p>
            </div>
            {changes.length === 0 ? (
              <p className="text-xs text-muted-foreground">New catalog edits will appear here after this release is active.</p>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-4">
                {changes.map((row) => {
                  const data = row.after_data || row.before_data || {};
                  const label = typeof data.name === "string" ? data.name : row.entity_id.slice(0, 8);
                  return (
                    <div key={row.id} className="min-w-0 border border-border/40 p-3">
                      <p className="text-[9px] uppercase capitalize tracking-[0.16em] text-gold">{row.action} · {row.entity_type}</p>
                      <p className="mt-1 truncate text-xs" title={label}>{label}</p>
                      <p className="mt-1 text-[10px] text-muted-foreground">{new Date(row.created_at).toLocaleString()}</p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </details>
    </>
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
    <div className="min-w-0 border border-border/40 bg-background/35 p-3">
      <p className="truncate text-[8px] uppercase tracking-[0.15em] text-muted-foreground">{label}</p>
      <p className={`${compact ? "text-xs" : "font-display text-xl"} ${toneClass} mt-1 truncate`} title={value}>{value}</p>
    </div>
  );
}
