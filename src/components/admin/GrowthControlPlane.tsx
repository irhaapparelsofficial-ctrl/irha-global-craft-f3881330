import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { BarChart3, Loader2, RefreshCw, Search, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type MetricRow = {
  key_1?: string;
  key_2?: string;
  canonical_path?: string | null;
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type ProductRow = {
  reference_code?: string | null;
  name?: string | null;
  main_category?: string | null;
  product_type?: string | null;
  canonical_path?: string | null;
  impressions?: number | null;
  clicks?: number | null;
  average_position?: number | null;
  product_views?: number | null;
  intent_events?: number | null;
  submit_events?: number | null;
  search_data_state?: string;
};

type CategoryRow = {
  main_category?: string | null;
  published_products?: number | null;
  products_with_search_data?: number | null;
  observed_impressions?: number | null;
  observed_clicks?: number | null;
  product_views?: number | null;
  intent_events?: number | null;
  submit_events?: number | null;
};

type ControlPlanePayload = {
  ok?: boolean;
  property?: string;
  data_state?: string;
  latest_run?: {
    completed_at?: string | null;
    data_start_date?: string | null;
    data_end_date?: string | null;
    current_rows?: number | null;
    previous_rows?: number | null;
  } | null;
  search?: {
    queries?: MetricRow[];
    pages?: MetricRow[];
    countries?: MetricRow[];
    devices?: MetricRow[];
    opportunities?: {
      high_impression_low_ctr?: MetricRow[];
      near_wins?: MetricRow[];
      losing_pages?: Array<MetricRow & { previous_impressions?: number; impression_delta?: number }>;
    };
  };
  products?: ProductRow[];
  categories?: CategoryRow[];
  measurement?: {
    window_days?: number;
    visitors?: number | null;
    accepted_inquiries?: number | null;
    social_attribution_events?: number | null;
    products_total?: number;
    products_with_search_data?: number;
    products_without_search_data?: number;
    commercial_events?: {
      counts?: Record<string, number>;
      top_intent_pages?: Array<{ path: string; events: number }>;
    };
  };
};

function number(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function pct(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? `${(numeric * 100).toFixed(2)}%` : "NO DATA";
}

function short(value: unknown, fallback = "NO DATA") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 180) : fallback;
}

function weightedTotals(rows: MetricRow[]) {
  const impressions = rows.reduce((sum, row) => sum + number(row.impressions), 0);
  const clicks = rows.reduce((sum, row) => sum + number(row.clicks), 0);
  const weightedPosition = rows.reduce((sum, row) => sum + number(row.position) * number(row.impressions), 0);
  return {
    impressions,
    clicks,
    ctr: impressions > 0 ? clicks / impressions : null,
    position: impressions > 0 ? weightedPosition / impressions : null,
  };
}

export default function GrowthControlPlane() {
  const [payload, setPayload] = useState<ControlPlanePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: invokeError } = await supabase.functions.invoke<ControlPlanePayload>("gsc-analytics", {
      body: { action: "control_plane" },
    });
    if (invokeError || !data?.ok) {
      setError(invokeError?.message || "Search/Growth control plane is not available yet.");
      setPayload(null);
    } else {
      setPayload(data);
      setError(null);
    }
    setLoading(false);
  }, []);

  const sync = async () => {
    setSyncing(true);
    const { data, error: invokeError } = await supabase.functions.invoke("gsc-analytics", {
      body: { action: "sync" },
    });
    if (invokeError || data?.ok !== true) {
      toast({
        title: "Search data sync not completed",
        description: invokeError?.message || data?.failure_code || data?.state || "Google Search Console data is not available.",
        variant: "destructive",
      });
    } else {
      toast({ title: "Search measurement refreshed", description: "The latest available Google Search Console window is now stored." });
      await load();
    }
    setSyncing(false);
  };

  useEffect(() => { void load(); }, [load]);

  const pageTotals = useMemo(() => weightedTotals(payload?.search?.pages || []), [payload]);
  const counts = payload?.measurement?.commercial_events?.counts || {};
  const buyerIntent = number(counts.inquiry_cta_click) + number(counts.whatsapp_click) + number(counts.email_click)
    + number(counts.sample_cta_click) + number(counts.quote_cta_click) + number(counts.rfq_start);
  const submissions = number(counts.rfq_submit) + number(counts.general_inquiry_submit) + number(counts.product_inquiry_submit);

  return (
    <section className="space-y-5" aria-labelledby="growth-control-plane-heading">
      <div className="border border-border/60 bg-card/30 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="eyebrow mb-2">GP-2 Search / Growth Control Plane</p>
            <h2 id="growth-control-plane-heading" className="font-display text-3xl">Search visibility → buyer intent.</h2>
            <p className="mt-2 max-w-3xl text-sm text-foreground/65">
              Business-readable search and commercial measurement. Missing Search Console observations are shown as NO DATA / NOT OBSERVED, never as zero performance.
            </p>
          </div>
          <button type="button" onClick={() => void sync()} disabled={syncing} className="min-h-11 border border-gold/60 px-4 text-[10px] uppercase tracking-[0.16em] text-gold disabled:opacity-40">
            {syncing ? <Loader2 className="mr-2 inline animate-spin" size={13} /> : <RefreshCw className="mr-2 inline" size={13} />}
            Refresh search evidence
          </button>
        </div>
      </div>

      {loading && <div className="border border-border/60 p-5 text-sm text-foreground/60"><Loader2 className="mr-2 inline animate-spin" size={14} />Loading search/growth evidence…</div>}
      {error && <div className="border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">{error}</div>}

      {payload && <>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <Metric label="Search impressions" value={pageTotals.impressions ? pageTotals.impressions.toLocaleString() : payload.data_state || "NO DATA"} />
          <Metric label="Search clicks" value={pageTotals.clicks ? pageTotals.clicks.toLocaleString() : payload.data_state || "NO DATA"} />
          <Metric label="Search CTR" value={pageTotals.ctr === null ? payload.data_state || "NO DATA" : pct(pageTotals.ctr)} />
          <Metric label="Average position" value={pageTotals.position === null ? payload.data_state || "NO DATA" : pageTotals.position.toFixed(2)} />
          <Metric label="Website visitors · 28d" value={payload.measurement?.visitors ?? "NOT YET OBSERVED"} />
          <Metric label="Buyer-intent actions · 28d" value={buyerIntent} />
          <Metric label="Accepted inquiry submissions · 28d" value={submissions || payload.measurement?.accepted_inquiries || "NOT YET OBSERVED"} />
          <Metric label="WhatsApp clicks · 28d" value={number(counts.whatsapp_click)} />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ListCard icon={<Search size={16} />} title="Top search queries" rows={(payload.search?.queries || []).slice(0, 12).map((row) => ({
            primary: short(row.key_1),
            secondary: `${number(row.impressions).toLocaleString()} impressions · ${number(row.clicks).toLocaleString()} clicks · pos ${number(row.position).toFixed(1)}`,
          }))} empty="NO DATA / NOT OBSERVED" />
          <ListCard icon={<BarChart3 size={16} />} title="Top landing pages" rows={(payload.search?.pages || []).slice(0, 12).map((row) => ({
            primary: short(row.canonical_path || row.key_1),
            secondary: `${number(row.impressions).toLocaleString()} impressions · ${pct(row.ctr)} CTR · pos ${number(row.position).toFixed(1)}`,
          }))} empty="NO DATA / NOT OBSERVED" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ListCard icon={<Target size={16} />} title="Near-win search opportunities · position 4–15" rows={(payload.search?.opportunities?.near_wins || []).slice(0, 12).map((row) => ({
            primary: short(row.key_1),
            secondary: `${short(row.canonical_path || row.key_2, "destination not observed")} · ${number(row.impressions).toLocaleString()} impressions · pos ${number(row.position).toFixed(1)}`,
          }))} empty="NOT YET OBSERVED" />
          <ListCard icon={<Target size={16} />} title="High impression / weak CTR" rows={(payload.search?.opportunities?.high_impression_low_ctr || []).slice(0, 12).map((row) => ({
            primary: short(row.key_1),
            secondary: `${short(row.canonical_path || row.key_2, "destination not observed")} · ${number(row.impressions).toLocaleString()} impressions · ${pct(row.ctr)} CTR`,
          }))} empty="NOT YET OBSERVED" />
        </div>

        <div className="grid gap-4 xl:grid-cols-2">
          <ListCard title="Product observability" rows={(payload.products || []).slice(0, 15).map((row) => ({
            primary: `${short(row.reference_code, "No ref")} · ${short(row.name)}`,
            secondary: `${short(row.search_data_state)} · ${number(row.impressions).toLocaleString()} observed impressions · ${number(row.intent_events)} intent actions · ${number(row.submit_events)} submits`,
          }))} empty="NO PRODUCTS OBSERVED" />
          <ListCard title="Category / money-area observability" rows={(payload.categories || []).map((row) => ({
            primary: short(row.main_category),
            secondary: `${number(row.published_products)} products · ${number(row.products_with_search_data)} with search observations · ${number(row.observed_impressions).toLocaleString()} impressions · ${number(row.intent_events)} intent actions`,
          }))} empty="NO DATA / NOT OBSERVED" />
        </div>

        <div className="border border-border/60 bg-card/20 p-5 text-xs text-foreground/60">
          <strong className="text-foreground">Evidence window:</strong> {short(payload.latest_run?.data_start_date)} → {short(payload.latest_run?.data_end_date)} · Last search sync: {short(payload.latest_run?.completed_at, "NOT YET OBSERVED")} · Products: {payload.measurement?.products_total ?? 0} total / {payload.measurement?.products_with_search_data ?? 0} with GSC observations / {payload.measurement?.products_without_search_data ?? 0} NO DATA.
        </div>
      </>}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return <article className="border border-border/60 bg-card/25 p-4">
    <p className="text-[9px] uppercase tracking-[0.14em] text-foreground/45">{label}</p>
    <p className="mt-2 font-display text-2xl">{String(value)}</p>
  </article>;
}

function ListCard({ title, icon, rows, empty }: {
  title: string;
  icon?: ReactNode;
  rows: Array<{ primary: string; secondary: string }>;
  empty: string;
}) {
  return <article className="border border-border/60 bg-card/25 p-5">
    <h3 className="flex items-center gap-2 font-display text-xl">{icon}{title}</h3>
    <div className="mt-4 divide-y divide-border/40">
      {rows.length === 0 && <p className="py-4 text-xs text-foreground/50">{empty}</p>}
      {rows.map((row, index) => <div key={`${row.primary}-${index}`} className="py-3">
        <p className="break-words text-xs font-medium">{row.primary}</p>
        <p className="mt-1 break-words text-[11px] text-foreground/55">{row.secondary}</p>
      </div>)}
    </div>
  </article>;
}
