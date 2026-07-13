import { useCallback, useEffect, useState } from "react";
import { Activity, AlertTriangle, CheckCircle2, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SocialPublishingCenter from "@/components/admin/SocialPublishingCenter";
import SocialGrowthAnalyticsPanel from "@/components/admin/SocialGrowthAnalyticsPanel";

type Health = {
  ok?: boolean;
  database_ready?: boolean;
  provider_configured?: boolean;
  callback_configured?: boolean;
  ready_to_dispatch?: boolean;
  note?: string;
  tables?: Array<{ table: string; ready: boolean; error?: string }>;
};

export default function SocialRenderHealthPanel() {
  const [health, setHealth] = useState<Health | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error: invokeError } = await supabase.functions.invoke("social-render-worker", { body: { action: "health" } });
    if (invokeError) {
      setHealth(null);
      setError(invokeError.message || "Renderer health check failed");
    } else {
      setHealth((data ?? {}) as Health);
      setError(null);
    }
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const ready = Boolean(health?.ready_to_dispatch);
  return (
    <>
      <section className={`border p-4 md:p-5 ${ready ? "border-emerald-500/35 bg-emerald-500/[0.04]" : "border-amber-500/35 bg-amber-500/[0.04]"}`}>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            {loading ? <Loader2 size={19} className="text-gold animate-spin mt-0.5" /> : ready ? <CheckCircle2 size={19} className="text-emerald-300 mt-0.5" /> : error ? <AlertTriangle size={19} className="text-amber-300 mt-0.5" /> : <Activity size={19} className="text-amber-300 mt-0.5" />}
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-gold">Renderer health</p>
              <h3 className="font-display text-xl mt-1">{loading ? "Checking renderer…" : ready ? "Ready to dispatch approved jobs" : "Needs configuration"}</h3>
              <p className="text-xs text-foreground/60 mt-2 max-w-3xl leading-relaxed">{error || health?.note || "Renderer status is not available yet."}</p>
            </div>
          </div>
          <button type="button" onClick={() => void load()} disabled={loading} className="min-h-10 inline-flex items-center justify-center gap-2 border border-border/60 px-3 text-[10px] uppercase tracking-[0.14em] hover:border-gold disabled:opacity-50"><RefreshCw size={12} /> Refresh</button>
        </div>
        {!loading && !error && health && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 mt-4 text-[10px] uppercase tracking-[0.12em]">
            <Status label="Database" ready={Boolean(health.database_ready)} />
            <Status label="Provider" ready={Boolean(health.provider_configured)} />
            <Status label="Callback" ready={Boolean(health.callback_configured)} />
            <Status label="Dispatch" ready={Boolean(health.ready_to_dispatch)} />
          </div>
        )}
      </section>
      <SocialPublishingCenter />
      <SocialGrowthAnalyticsPanel />
    </>
  );
}

function Status({ label, ready }: { label: string; ready: boolean }) {
  return <div className={`border px-3 py-2 ${ready ? "border-emerald-500/30 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>{label}: {ready ? "ready" : "not ready"}</div>;
}
