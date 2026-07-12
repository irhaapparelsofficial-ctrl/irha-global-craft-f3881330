import { useCallback, useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, ShieldCheck, UserSearch } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AdminView } from "./AdminShell";

type Campaign = {
  id: string;
  name: string;
  market: string;
  status: string;
  target_count: number;
  discovered_count: number;
  reviewed_count: number;
  verified_count: number;
  imported_count: number;
  last_run_at: string | null;
};

type Candidate = {
  id: string;
  country: string | null;
  verification_status: string;
  verification_score: number;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
};

type Snapshot = {
  campaign: Campaign | null;
  candidates: Candidate[];
};

const emptySnapshot: Snapshot = { campaign: null, candidates: [] };
const db = supabase as any;

export default function LeadWaveSummary({ go }: { go: (view: AdminView) => void }) {
  const [snapshot, setSnapshot] = useState<Snapshot>(emptySnapshot);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const campaignResult = await db
      .from("lead_campaigns")
      .select("id,name,market,status,target_count,discovered_count,reviewed_count,verified_count,imported_count,last_run_at")
      .in("status", ["running", "draft", "paused"])
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (campaignResult.error) {
      setError(campaignResult.error.message || "Lead campaign could not load");
      setSnapshot(emptySnapshot);
      setLoading(false);
      return;
    }

    const campaign = (campaignResult.data as Campaign | null) ?? null;
    if (!campaign) {
      setSnapshot(emptySnapshot);
      setError(null);
      setLoading(false);
      return;
    }

    const candidateResult = await db
      .from("lead_candidates")
      .select("id,country,verification_status,verification_score,email,phone,whatsapp")
      .eq("campaign_id", campaign.id)
      .order("verification_score", { ascending: false })
      .limit(1000);

    if (candidateResult.error) {
      setError(candidateResult.error.message || "Lead candidates could not load");
      setSnapshot({ campaign, candidates: [] });
      setLoading(false);
      return;
    }

    setSnapshot({ campaign, candidates: (candidateResult.data as Candidate[]) ?? [] });
    setError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const metrics = useMemo(() => {
    const countries: Record<string, number> = {};
    let needsReview = 0;
    let highConfidence = 0;
    let contactReady = 0;
    let topScore = 0;

    snapshot.candidates.forEach((candidate) => {
      const country = candidate.country?.trim() || "Unknown";
      countries[country] = (countries[country] || 0) + 1;
      if (candidate.verification_status === "needs_review") needsReview += 1;
      if (candidate.verification_score >= 85) highConfidence += 1;
      if (candidate.email || candidate.phone || candidate.whatsapp) contactReady += 1;
      topScore = Math.max(topScore, candidate.verification_score || 0);
    });

    return {
      needsReview,
      highConfidence,
      contactReady,
      topScore,
      countries: Object.entries(countries).sort((a, b) => b[1] - a[1]),
    };
  }, [snapshot.candidates]);

  return (
    <section className="border border-border/60 bg-card/30 p-4 sm:p-6 space-y-4" aria-labelledby="lead-wave-summary-title">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div>
          <p className="eyebrow mb-2">Buyer acquisition</p>
          <h2 id="lead-wave-summary-title" className="font-display text-2xl">Active Lead Wave</h2>
          <p className="mt-2 text-sm text-muted-foreground max-w-3xl leading-relaxed">
            Evidence-backed buyer candidates stay in owner review. Nothing is imported into Buyer CRM or contacted automatically.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => void load()}
            className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={() => go("lead_engine")}
            className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-background px-4 py-2 text-[10px] uppercase tracking-[0.18em]"
          >
            <UserSearch size={13} /> Review candidates
          </button>
        </div>
      </div>

      {error && <p className="border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {!loading && !snapshot.campaign ? (
        <div className="border border-dashed border-border/50 p-6 text-center">
          <UserSearch size={20} className="mx-auto text-gold/70 mb-2" />
          <p className="text-sm">No active lead campaign.</p>
          <button type="button" onClick={() => go("lead_engine")} className="mt-3 text-[10px] uppercase tracking-[0.18em] text-gold hover:underline">
            Open Lead Acquisition
          </button>
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 xl:grid-cols-6 gap-3">
            <Metric label="Discovered" value={snapshot.candidates.length} />
            <Metric label="Needs review" value={metrics.needsReview} attention={metrics.needsReview > 0} />
            <Metric label="Score 85+" value={metrics.highConfidence} />
            <Metric label="Contact present" value={metrics.contactReady} />
            <Metric label="Top score" value={metrics.topScore} suffix="/100" />
            <Metric label="CRM imported" value={snapshot.campaign?.imported_count ?? 0} safe />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 border border-border/50 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-[0.18em] text-gold">{snapshot.campaign?.status || "—"}</p>
                  <p className="font-display text-xl mt-1 truncate">{snapshot.campaign?.name || "Loading…"}</p>
                  <p className="text-xs text-muted-foreground mt-1">{snapshot.campaign?.market || "—"}</p>
                </div>
                <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground shrink-0">
                  Target {snapshot.campaign?.target_count ?? 0}
                </span>
              </div>
              <div className="h-2 bg-secondary/60 overflow-hidden" aria-label="Lead discovery progress">
                <div
                  className="h-full bg-gradient-gold"
                  style={{ width: `${Math.min(100, ((snapshot.candidates.length || 0) / Math.max(1, snapshot.campaign?.target_count || 1)) * 100)}%` }}
                />
              </div>
              <p className="text-[10px] uppercase tracking-[0.15em] text-muted-foreground">
                Last run {formatDate(snapshot.campaign?.last_run_at)}
              </p>
            </div>

            <div className="border border-border/50 p-4">
              <p className="text-xs uppercase tracking-[0.18em] mb-3">Country coverage</p>
              {metrics.countries.length === 0 ? (
                <p className="text-xs text-muted-foreground">No candidates yet.</p>
              ) : (
                <div className="space-y-2">
                  {metrics.countries.map(([country, count]) => (
                    <div key={country} className="flex items-center justify-between gap-3 text-xs border-b border-border/20 pb-2 last:border-0">
                      <span>{country}</span>
                      <span className="tabular-nums text-gold">{count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 border border-emerald-500/30 bg-emerald-500/5 p-3 text-xs text-muted-foreground">
            <ShieldCheck size={15} className="text-emerald-500 shrink-0 mt-0.5" />
            <p>
              Review-only guard is active. Verification, CRM import and outreach remain separate owner-controlled steps.
            </p>
            <ExternalLink size={12} className="ml-auto opacity-40 shrink-0" />
          </div>
        </>
      )}
    </section>
  );
}

function Metric({ label, value, suffix = "", attention = false, safe = false }: { label: string; value: number; suffix?: string; attention?: boolean; safe?: boolean }) {
  const tone = attention ? "text-amber-500" : safe ? "text-emerald-500" : "text-foreground";
  return (
    <div className="border border-border/50 p-4">
      <p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p>
      <p className={`font-display text-2xl mt-2 tabular-nums ${tone}`}>{value.toLocaleString()}{suffix}</p>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleString() : "—";
}
