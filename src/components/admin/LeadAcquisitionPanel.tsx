import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  Globe2,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
  UploadCloud,
  Users,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type CampaignStatus = "draft" | "running" | "paused" | "completed" | "failed" | "cancelled";
type CandidateStatus = "unverified" | "needs_review" | "verified" | "rejected" | "duplicate" | "imported";
type SearchRunStatus = "running" | "completed" | "failed" | "skipped";

type Campaign = {
  id: string;
  name: string;
  market: string;
  product_focus: string[];
  buyer_types: string[];
  search_queries: string[];
  source_providers: string[];
  target_count: number;
  status: CampaignStatus;
  discovered_count: number;
  reviewed_count: number;
  verified_count: number;
  imported_count: number;
  last_run_at: string | null;
  error: string | null;
  created_at: string;
  updated_at: string;
};

type Candidate = {
  id: string;
  campaign_id: string;
  company_name: string;
  website: string | null;
  website_domain: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  buyer_type: string | null;
  product_fit: string[];
  source_url: string;
  source_title: string | null;
  source_query: string | null;
  source_provider: string;
  source_excerpt: string | null;
  evidence: Record<string, unknown>;
  verification_status: CandidateStatus;
  verification_score: number;
  duplicate_reason: string | null;
  imported_lead_id: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
};

type SearchRun = {
  id: string;
  campaign_id: string;
  query: string;
  provider: string;
  status: SearchRunStatus;
  result_count: number;
  response_meta: Record<string, unknown>;
  error: string | null;
  started_at: string;
  completed_at: string | null;
};

type EngineHealth = {
  ok?: boolean;
  database_ready?: boolean;
  discovery_ready?: boolean;
  search_provider?: string;
  classification_provider?: string;
  billing_mode?: string;
  external_api_keys_required?: boolean;
  checked_at?: string;
  note?: string;
  error?: string;
};

type CampaignDraft = {
  name: string;
  market: string;
  products: string;
  buyerTypes: string;
  targetCount: number;
  searchQueries: string;
};

const emptyDraft: CampaignDraft = {
  name: "",
  market: "Germany & Austria",
  products: "Lederhosen, Dirndl, Trachten wear",
  buyerTypes: "Wholesaler, Importer, Distributor, Retailer, Private-label brand",
  targetCount: 10,
  searchQueries: "",
};

const candidateStatusStyle: Record<CandidateStatus, string> = {
  unverified: "border-border/60 text-muted-foreground",
  needs_review: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  verified: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  rejected: "border-red-500/40 text-red-300 bg-red-500/10",
  duplicate: "border-slate-500/40 text-slate-300 bg-slate-500/10",
  imported: "border-cyan-500/40 text-cyan-300 bg-cyan-500/10",
};

const campaignStatusStyle: Record<CampaignStatus, string> = {
  draft: "border-border/60 text-muted-foreground",
  running: "border-blue-500/40 text-blue-300 bg-blue-500/10",
  paused: "border-amber-500/40 text-amber-300 bg-amber-500/10",
  completed: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10",
  failed: "border-red-500/40 text-red-300 bg-red-500/10",
  cancelled: "border-slate-500/40 text-slate-300 bg-slate-500/10",
};

const runStatusStyle: Record<SearchRunStatus, string> = {
  running: "text-blue-300",
  completed: "text-emerald-300",
  failed: "text-red-300",
  skipped: "text-muted-foreground",
};

const db = supabase as any;

export default function LeadAcquisitionPanel() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [runs, setRuns] = useState<SearchRun[]>([]);
  const [health, setHealth] = useState<EngineHealth | null>(null);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState<CampaignDraft>(emptyDraft);
  const [statusFilter, setStatusFilter] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [migrationReady, setMigrationReady] = useState(true);

  const loadHealth = async () => {
    const { data, error } = await supabase.functions.invoke("lead-research", { body: { action: "health" } });
    setHealth(error ? { error: error.message } : (data as EngineHealth));
  };

  const load = async (campaignId = selectedCampaignId) => {
    setLoading(true);
    const [campaignResult, candidateResult, runResult] = await Promise.all([
      db.from("lead_campaigns").select("*").order("created_at", { ascending: false }).limit(100),
      campaignId
        ? db.from("lead_candidates").select("*").eq("campaign_id", campaignId).order("verification_score", { ascending: false }).limit(1000)
        : Promise.resolve({ data: [], error: null }),
      campaignId
        ? db.from("lead_search_runs").select("*").eq("campaign_id", campaignId).order("started_at", { ascending: false }).limit(30)
        : Promise.resolve({ data: [], error: null }),
    ]);

    const migrationError = [campaignResult.error, candidateResult.error, runResult.error].find(isMigrationError);
    if (migrationError) {
      setMigrationReady(false);
      setCampaigns([]);
      setCandidates([]);
      setRuns([]);
      setLoading(false);
      return;
    }

    setMigrationReady(true);
    if (campaignResult.error) toast({ title: "Campaigns could not load", description: campaignResult.error.message, variant: "destructive" });
    if (candidateResult.error) toast({ title: "Candidates could not load", description: candidateResult.error.message, variant: "destructive" });
    if (runResult.error) toast({ title: "Search history could not load", description: runResult.error.message, variant: "destructive" });

    const nextCampaigns = (campaignResult.data ?? []) as Campaign[];
    setCampaigns(nextCampaigns);
    setCandidates(((candidateResult.data ?? []) as Candidate[]).map(normalizeCandidate));
    setRuns(((runResult.data ?? []) as SearchRun[]).map(normalizeRun));

    if (!campaignId && nextCampaigns[0]?.id) {
      setSelectedCampaignId(nextCampaigns[0].id);
      setLoading(false);
      await load(nextCampaigns[0].id);
      return;
    }
    setLoading(false);
  };

  const refresh = async () => {
    await Promise.all([load(selectedCampaignId), loadHealth()]);
  };

  useEffect(() => {
    void Promise.all([load(), loadHealth()]);
  }, []);

  const activeCampaign = useMemo(
    () => campaigns.find((campaign) => campaign.id === selectedCampaignId) ?? null,
    [campaigns, selectedCampaignId],
  );

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return candidates.filter((candidate) => {
      if (statusFilter && candidate.verification_status !== statusFilter) return false;
      if (!needle) return true;
      return [
        candidate.company_name,
        candidate.website_domain,
        candidate.country,
        candidate.city,
        candidate.email,
        candidate.phone,
        candidate.whatsapp,
        candidate.buyer_type,
        candidate.product_fit.join(" "),
        candidate.source_query,
        candidate.source_excerpt,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(needle);
    });
  }, [candidates, query, statusFilter]);

  const stats = useMemo(() => ({
    total: candidates.length,
    review: candidates.filter((candidate) => candidate.verification_status === "needs_review").length,
    verified: candidates.filter((candidate) => candidate.verification_status === "verified").length,
    imported: candidates.filter((candidate) => candidate.verification_status === "imported").length,
    duplicate: candidates.filter((candidate) => candidate.verification_status === "duplicate").length,
  }), [candidates]);

  const createCampaign = async () => {
    const market = draft.market.trim();
    const productFocus = splitList(draft.products);
    const buyerTypes = splitList(draft.buyerTypes);
    if (!market || productFocus.length === 0 || buyerTypes.length === 0) {
      toast({ title: "Market, products and buyer types are required", variant: "destructive" });
      return;
    }

    setBusy("create");
    const { data, error } = await db.from("lead_campaigns").insert({
      name: draft.name.trim() || `${market} · ${productFocus.slice(0, 2).join(" + ")}`,
      market,
      product_focus: productFocus,
      buyer_types: buyerTypes,
      search_queries: splitList(draft.searchQueries),
      source_providers: ["public_search_no_api_key", "direct_website"],
      target_count: Math.max(1, Math.min(100, Number(draft.targetCount) || 10)),
      status: "draft",
    }).select("*").single();
    setBusy(null);

    if (error || !data) {
      toast({ title: "Campaign could not be created", description: error?.message || "Database insert failed", variant: "destructive" });
      return;
    }

    setDraft(emptyDraft);
    setSelectedCampaignId(data.id);
    setSelectedIds(new Set());
    toast({ title: "Lead campaign created", description: "Ready for zero-credit public web research." });
    await Promise.all([load(data.id), loadHealth()]);
  };

  const startResearch = async (campaign: Campaign) => {
    if (!health?.discovery_ready) {
      toast({ title: "Lead discovery is not ready", description: health?.note || health?.error || "Check the Lead Engine health.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Start public web research for “${campaign.name}”? No paid API or AI credits will be used.`)) return;

    setBusy(`research:${campaign.id}`);
    const { data, error } = await supabase.functions.invoke("lead-research", {
      body: { action: "discover", campaign_id: campaign.id },
    });
    setBusy(null);

    if (error || !data?.ok) {
      toast({ title: "Lead research failed", description: data?.error || error?.message || "No results returned", variant: "destructive" });
      await Promise.all([load(campaign.id), loadHealth()]);
      return;
    }

    toast({
      title: "Lead discovery completed",
      description: `${data.inserted ?? 0} evidence-backed candidates added · ${data.external_credits_used ?? 0} paid credits used.`,
    });
    await load(campaign.id);
  };

  const enrichSelected = async () => {
    const ids = [...selectedIds].slice(0, 20);
    if (ids.length === 0) return;
    if (!window.confirm(`Enrich and verify ${ids.length} selected candidate${ids.length === 1 ? "" : "s"}? Only public company pages will be checked; no paid credits are used.`)) return;

    setBusy("enrich");
    const { data, error } = await supabase.functions.invoke("lead-research", {
      body: { action: "enrich", candidate_ids: ids },
    });
    setBusy(null);

    if (error || !data?.ok) {
      toast({ title: "Enrichment failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }

    toast({ title: "Verification pass completed", description: summarizeOutcomes(data.outcomes) });
    setSelectedIds(new Set());
    await load(selectedCampaignId);
  };

  const importSelected = async () => {
    const ids = [...selectedIds].filter((id) => candidates.find((candidate) => candidate.id === id)?.verification_status === "verified");
    if (ids.length === 0) {
      toast({ title: "Select verified candidates only", description: "Needs-review candidates must be enriched or manually verified first.", variant: "destructive" });
      return;
    }
    if (!window.confirm(`Import ${ids.length} verified candidate${ids.length === 1 ? "" : "s"} into Buyer CRM? Duplicate checks run again before insert.`)) return;

    setBusy("import");
    const { data, error } = await supabase.functions.invoke("lead-research", {
      body: { action: "import", candidate_ids: ids },
    });
    setBusy(null);

    if (error || !data?.ok) {
      toast({ title: "CRM import failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }

    toast({ title: "CRM import completed", description: `${data.imported_count ?? 0} imported · ${data.skipped_count ?? 0} skipped.` });
    setSelectedIds(new Set());
    await load(selectedCampaignId);
  };

  const reviewCandidate = async (candidate: Candidate, status: "verified" | "rejected" | "needs_review") => {
    setBusy(`review:${candidate.id}`);
    const { data, error } = await supabase.functions.invoke("lead-research", {
      body: {
        action: "review",
        candidate_id: candidate.id,
        status,
        verification_score: status === "verified" ? Math.max(70, candidate.verification_score) : candidate.verification_score,
      },
    });
    setBusy(null);

    if (error || !data?.ok) {
      toast({ title: "Review update failed", description: data?.error || error?.message || "Unknown error", variant: "destructive" });
      return;
    }

    toast({ title: `Candidate marked ${status.replace(/_/g, " ")}` });
    await load(selectedCampaignId);
  };

  const deleteCampaign = async (campaign: Campaign) => {
    if (!window.confirm(`Delete campaign “${campaign.name}” and all candidate research records? Imported CRM leads remain in Buyer Inbox.`)) return;
    setBusy(`delete:${campaign.id}`);
    const { error } = await db.from("lead_campaigns").delete().eq("id", campaign.id);
    setBusy(null);

    if (error) {
      toast({ title: "Campaign could not be deleted", description: error.message, variant: "destructive" });
      return;
    }

    setSelectedCampaignId(null);
    setCandidates([]);
    setRuns([]);
    setSelectedIds(new Set());
    toast({ title: "Campaign deleted" });
    await load(null);
  };

  const selectCampaign = async (id: string) => {
    setSelectedCampaignId(id);
    setSelectedIds(new Set());
    await load(id);
  };

  const toggleCandidate = (id: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const exportCandidates = () => {
    const rows = filtered.map((candidate) => [
      candidate.company_name,
      candidate.website || "",
      candidate.country || "",
      candidate.city || "",
      candidate.email || "",
      candidate.phone || "",
      candidate.whatsapp || "",
      candidate.buyer_type || "",
      candidate.product_fit.join(" | "),
      candidate.verification_status,
      candidate.verification_score,
      candidate.source_url,
    ]);
    downloadCsv(
      `irha-lead-candidates-${new Date().toISOString().slice(0, 10)}.csv`,
      ["Company", "Website", "Country", "City", "Email", "Phone", "WhatsApp", "Buyer Type", "Product Fit", "Status", "Score", "Source"],
      rows,
    );
  };

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-6 md:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold mb-3"><Users size={15} /> Find New Buyers</div>
            <h2 className="font-display text-3xl md:text-4xl">Public research → Verify → CRM</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              Searches free public web sources, stores source evidence, checks company websites, removes duplicates and imports only owner-approved verified buyers into the CRM.
            </p>
            <div className="mt-4 inline-flex items-center gap-2 border border-emerald-500/35 bg-emerald-500/10 px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-emerald-300">
              <ShieldCheck size={13} /> Zero paid search or AI credits
            </div>
          </div>
          <button type="button" onClick={() => void refresh()} className="inline-flex min-h-11 items-center gap-2 border border-border/60 px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:border-gold hover:text-gold">
            <RefreshCw size={12} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        </div>
      </section>

      <HealthBanner health={health} migrationReady={migrationReady} />

      <div className="grid xl:grid-cols-12 gap-6">
        <section className="xl:col-span-4 space-y-5">
          <div className="border border-border/60 bg-card/30 p-5">
            <p className="eyebrow mb-2">New campaign</p>
            <div className="space-y-3">
              <Field label="Campaign name"><input className="lead-input" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder="DACH Bavarian buyers" /></Field>
              <Field label="Market *"><input className="lead-input" value={draft.market} onChange={(event) => setDraft((current) => ({ ...current, market: event.target.value }))} /></Field>
              <Field label="Product focus *"><textarea rows={2} className="lead-input resize-y" value={draft.products} onChange={(event) => setDraft((current) => ({ ...current, products: event.target.value }))} /></Field>
              <Field label="Buyer types *"><textarea rows={2} className="lead-input resize-y" value={draft.buyerTypes} onChange={(event) => setDraft((current) => ({ ...current, buyerTypes: event.target.value }))} /></Field>
              <Field label="Target candidates"><input type="number" min={1} max={100} className="lead-input" value={draft.targetCount} onChange={(event) => setDraft((current) => ({ ...current, targetCount: Number(event.target.value) }))} /></Field>
              <Field label="Optional search queries"><textarea rows={3} className="lead-input resize-y" value={draft.searchQueries} onChange={(event) => setDraft((current) => ({ ...current, searchQueries: event.target.value }))} placeholder="One query per line. Leave empty for automatic localized queries." /></Field>
            </div>
            <button type="button" onClick={() => void createCampaign()} disabled={busy !== null || !migrationReady} className="mt-4 w-full min-h-11 inline-flex items-center justify-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40">
              {busy === "create" ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Create campaign
            </button>
          </div>

          <div className="border border-border/60 bg-card/30 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="eyebrow">Campaigns</p>
              <span className="text-[10px] text-muted-foreground">{campaigns.length}</span>
            </div>
            <div className="space-y-2 max-h-[650px] overflow-y-auto pr-1">
              {campaigns.length === 0 && <p className="text-xs text-muted-foreground py-5 text-center">No lead campaigns yet.</p>}
              {campaigns.map((campaign) => (
                <div key={campaign.id} className={`border p-3 ${selectedCampaignId === campaign.id ? "border-gold/70 bg-gold/5" : "border-border/60 bg-background/25"}`}>
                  <button type="button" onClick={() => void selectCampaign(campaign.id)} className="text-left w-full">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="font-display text-lg truncate">{campaign.name}</h3>
                        <p className="text-[10px] text-muted-foreground mt-1 truncate">{campaign.market}</p>
                      </div>
                      <Badge className={campaignStatusStyle[campaign.status]}>{campaign.status}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 mt-3 text-center">
                      <MiniMetric label="Found" value={campaign.discovered_count} />
                      <MiniMetric label="Verified" value={campaign.verified_count} />
                      <MiniMetric label="Imported" value={campaign.imported_count} />
                    </div>
                  </button>
                  <div className="flex gap-2 mt-3">
                    <button type="button" onClick={() => void startResearch(campaign)} disabled={busy !== null || !health?.discovery_ready} className="flex-1 min-h-10 inline-flex items-center justify-center gap-2 border border-gold/50 text-gold px-3 py-2 text-[9px] uppercase tracking-[0.16em] disabled:opacity-35">
                      {busy === `research:${campaign.id}` ? <Loader2 size={11} className="animate-spin" /> : <Play size={11} />} Research free
                    </button>
                    <button type="button" onClick={() => void deleteCampaign(campaign)} disabled={busy !== null} className="min-h-10 min-w-10 inline-flex items-center justify-center border border-border/60 text-muted-foreground hover:text-destructive hover:border-destructive disabled:opacity-35" aria-label="Delete campaign">
                      {busy === `delete:${campaign.id}` ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    </button>
                  </div>
                  {campaign.error && <p className="text-[10px] text-destructive mt-2 break-words">{campaign.error}</p>}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="xl:col-span-8 space-y-5 min-w-0">
          {!activeCampaign ? (
            <EmptyState icon={<Globe2 size={28} />} title="Select or create a campaign" body="Campaign candidates, source evidence and verification controls will appear here." />
          ) : (
            <>
              <div className="border border-border/60 bg-card/30 p-5">
                <div className="flex items-start justify-between gap-5 flex-wrap">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className={campaignStatusStyle[activeCampaign.status]}>{activeCampaign.status}</Badge>
                      <span className="text-[10px] text-muted-foreground">Target {activeCampaign.target_count}</span>
                      <span className="text-[10px] text-emerald-300">Paid credits: 0</span>
                    </div>
                    <h3 className="font-display text-2xl mt-2 break-words">{activeCampaign.name}</h3>
                    <p className="text-xs text-foreground/60 mt-2 break-words">{activeCampaign.product_focus.join(" · ")} · {activeCampaign.buyer_types.join(" · ")}</p>
                  </div>
                  <button type="button" onClick={() => void startResearch(activeCampaign)} disabled={busy !== null || !health?.discovery_ready} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.2em] disabled:opacity-40">
                    {busy === `research:${activeCampaign.id}` ? <Loader2 size={12} className="animate-spin" /> : <Play size={12} />} Start / rerun free research
                  </button>
                </div>

                {activeCampaign.search_queries.length > 0 && (
                  <details className="mt-4 border-t border-border/40 pt-3">
                    <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-gold">Search queries ({activeCampaign.search_queries.length})</summary>
                    <div className="flex flex-wrap gap-2 mt-3">{activeCampaign.search_queries.map((item) => <span key={item} className="border border-border/50 bg-background/30 px-2 py-1 text-[10px] text-foreground/60 break-all">{item}</span>)}</div>
                  </details>
                )}

                {runs.length > 0 && (
                  <details className="mt-4 border-t border-border/40 pt-3" open>
                    <summary className="cursor-pointer text-[10px] uppercase tracking-[0.18em] text-gold">Search run evidence ({runs.length})</summary>
                    <div className="mt-3 space-y-2 max-h-56 overflow-y-auto">
                      {runs.map((run) => (
                        <div key={run.id} className="border border-border/50 bg-background/25 p-3 text-xs">
                          <div className="flex items-start justify-between gap-3">
                            <p className="min-w-0 break-words">{run.query}</p>
                            <span className={`shrink-0 text-[9px] uppercase tracking-[0.14em] ${runStatusStyle[run.status]}`}>{run.status}</span>
                          </div>
                          <p className="mt-1 text-[10px] text-muted-foreground">{run.provider} · {run.result_count} results · paid credits 0</p>
                          {run.error && <p className="mt-2 text-[10px] text-destructive break-words">{run.error}</p>}
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                <Metric label="Candidates" value={stats.total} />
                <Metric label="Needs review" value={stats.review} />
                <Metric label="Verified" value={stats.verified} />
                <Metric label="Imported" value={stats.imported} />
                <Metric label="Duplicates" value={stats.duplicate} />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="flex min-h-11 items-center gap-3 border border-border/60 bg-card/30 px-4 py-2.5 flex-1 min-w-[220px]"><Search size={14} className="text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search company, country, buyer type, contact…" className="bg-transparent outline-none text-sm w-full min-w-0" /></div>
                <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="min-h-11 border border-border/60 bg-card/30 px-3 py-2.5 text-xs"><option value="">All statuses</option>{Object.keys(candidateStatusStyle).map((status) => <option key={status} value={status}>{status.replace(/_/g, " ")}</option>)}</select>
                <button type="button" onClick={exportCandidates} disabled={filtered.length === 0} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 py-2.5 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-40"><Download size={12} /> Export</button>
              </div>

              {selectedIds.size > 0 && (
                <div className="border border-gold/40 bg-gold/5 p-3 flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-gold">{selectedIds.size} candidate{selectedIds.size === 1 ? "" : "s"} selected</span>
                  <div className="flex gap-2 flex-wrap">
                    <button type="button" onClick={() => void enrichSelected()} disabled={busy !== null} className="min-h-10 inline-flex items-center gap-2 border border-gold/60 text-gold px-4 py-2 text-[10px] uppercase tracking-[0.16em] disabled:opacity-40">{busy === "enrich" ? <Loader2 size={11} className="animate-spin" /> : <ShieldCheck size={11} />} Enrich & verify free</button>
                    <button type="button" onClick={() => void importSelected()} disabled={busy !== null} className="min-h-10 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-4 py-2 text-[10px] uppercase tracking-[0.16em] disabled:opacity-40">{busy === "import" ? <Loader2 size={11} className="animate-spin" /> : <UploadCloud size={11} />} Import verified</button>
                  </div>
                </div>
              )}

              {loading ? (
                <div className="border border-border/60 bg-card/20 p-10 text-center text-xs text-muted-foreground"><Loader2 size={18} className="animate-spin mx-auto mb-3" /> Loading candidates…</div>
              ) : filtered.length === 0 ? (
                <EmptyState icon={<Search size={28} />} title="No candidates in this view" body="Start free research or change the filters to see evidence-backed buyer candidates." />
              ) : (
                <div className="grid md:grid-cols-2 gap-4">
                  {filtered.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      selected={selectedIds.has(candidate.id)}
                      busy={busy === `review:${candidate.id}`}
                      onToggle={() => toggleCandidate(candidate.id)}
                      onReview={reviewCandidate}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </section>
      </div>

      <style>{`.lead-input{width:100%;background:hsl(var(--input));border:1px solid hsl(var(--border));padding:.65rem .75rem;font-size:.75rem;outline:none;min-height:2.75rem}.lead-input:focus{border-color:hsl(var(--primary))}`}</style>
    </div>
  );
}

function CandidateCard({
  candidate,
  selected,
  busy,
  onToggle,
  onReview,
}: {
  candidate: Candidate;
  selected: boolean;
  busy: boolean;
  onToggle: () => void;
  onReview: (candidate: Candidate, status: "verified" | "rejected" | "needs_review") => Promise<void>;
}) {
  const selectable = !["duplicate", "imported", "rejected"].includes(candidate.verification_status);
  return (
    <article className="border border-border/60 bg-card/25 p-4 min-w-0">
      <div className="flex items-start gap-3">
        <input className="mt-1" type="checkbox" checked={selected} onChange={onToggle} disabled={!selectable} aria-label={`Select ${candidate.company_name}`} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h4 className="font-display text-lg break-words">{candidate.company_name}</h4>
              <p className="text-[10px] text-muted-foreground mt-1">{[candidate.city, candidate.country].filter(Boolean).join(", ") || "Location not verified"}</p>
            </div>
            <div className="shrink-0 h-12 w-12 rounded-full border border-border/60 flex items-center justify-center font-display">{candidate.verification_score}</div>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <Badge className={candidateStatusStyle[candidate.verification_status]}>{candidate.verification_status.replace(/_/g, " ")}</Badge>
            {candidate.buyer_type && <span className="border border-border/50 px-2 py-1 text-[9px] uppercase tracking-[0.12em] text-foreground/60">{candidate.buyer_type}</span>}
          </div>

          <div className="mt-3 text-xs space-y-1.5">
            {candidate.website && <a href={candidate.website} target="_blank" rel="noreferrer noopener" className="inline-flex max-w-full items-center gap-1 text-cyan-300 hover:underline break-all">{candidate.website_domain || candidate.website}<ExternalLink size={10} className="shrink-0" /></a>}
            {candidate.email && <a href={`mailto:${candidate.email}`} className="block text-gold break-all">{candidate.email}</a>}
            {candidate.whatsapp && <p className="text-emerald-300 break-all">WhatsApp: {candidate.whatsapp}</p>}
            {candidate.phone && candidate.phone !== candidate.whatsapp && <p className="text-foreground/65 break-all">Phone: {candidate.phone}</p>}
            {!candidate.email && !candidate.phone && !candidate.whatsapp && <p className="text-muted-foreground">No public contact verified yet.</p>}
          </div>

          <p className="mt-3 text-[10px] text-foreground/55 break-words">{candidate.product_fit.join(" · ") || "Product fit pending"}</p>
          {candidate.duplicate_reason && <p className="mt-2 text-[10px] text-muted-foreground break-words">{candidate.duplicate_reason}</p>}

          <div className="mt-4 border-t border-border/40 pt-3">
            <p className="text-[9px] uppercase tracking-[0.16em] text-gold mb-2">Public source</p>
            <a href={candidate.source_url} target="_blank" rel="noreferrer noopener" className="inline-flex items-start gap-1 text-xs text-gold hover:underline break-all">{candidate.source_title || candidate.source_url}<ExternalLink size={10} className="mt-0.5 shrink-0" /></a>
            {candidate.source_query && <p className="mt-1 text-[10px] text-muted-foreground break-words">Query: {candidate.source_query}</p>}
          </div>

          <details className="mt-4 border border-border/50 bg-background/25 p-3">
            <summary className="cursor-pointer text-[10px] uppercase tracking-[0.16em] text-gold">Evidence and manual review</summary>
            <pre className="mt-3 max-h-56 overflow-auto whitespace-pre-wrap break-words text-[10px] text-foreground/65">{JSON.stringify(candidate.evidence || {}, null, 2)}</pre>
            {candidate.source_excerpt && <p className="mt-3 text-xs text-foreground/65 leading-relaxed whitespace-pre-wrap break-words">{candidate.source_excerpt}</p>}
            <div className="grid sm:grid-cols-3 gap-2 mt-4">
              <button type="button" onClick={() => void onReview(candidate, "verified")} disabled={busy || candidate.verification_status === "imported"} className="min-h-10 inline-flex items-center justify-center gap-2 border border-emerald-500/50 text-emerald-300 px-3 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40">{busy ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Verify</button>
              <button type="button" onClick={() => void onReview(candidate, "needs_review")} disabled={busy || candidate.verification_status === "imported"} className="min-h-10 inline-flex items-center justify-center gap-2 border border-amber-500/50 text-amber-300 px-3 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"><AlertTriangle size={11} /> Review</button>
              <button type="button" onClick={() => void onReview(candidate, "rejected")} disabled={busy || candidate.verification_status === "imported"} className="min-h-10 inline-flex items-center justify-center gap-2 border border-red-500/50 text-red-300 px-3 py-2 text-[9px] uppercase tracking-[0.14em] disabled:opacity-40"><XCircle size={11} /> Reject</button>
            </div>
          </details>
        </div>
      </div>
    </article>
  );
}

function HealthBanner({ health, migrationReady }: { health: EngineHealth | null; migrationReady: boolean }) {
  if (!migrationReady) {
    return <div className="border border-amber-500/40 bg-amber-500/10 p-5 flex items-start gap-3"><AlertTriangle size={18} className="text-amber-300 shrink-0" /><div><p className="font-medium">Lead Engine database migration pending</p><p className="text-xs text-foreground/65 mt-1">Apply the lead acquisition database migration before campaigns or candidate research can run.</p></div></div>;
  }
  if (!health) return <div className="border border-border/60 bg-card/30 p-4 text-xs text-muted-foreground">Checking zero-credit Lead Engine runtime…</div>;
  if (health.error) return <div className="border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive break-words">{health.error}</div>;

  return (
    <div className={`border p-4 flex items-start gap-3 ${health.discovery_ready ? "border-emerald-500/30 bg-emerald-500/5" : "border-amber-500/40 bg-amber-500/10"}`}>
      {health.discovery_ready ? <CheckCircle2 size={17} className="text-emerald-300 shrink-0" /> : <AlertTriangle size={17} className="text-amber-300 shrink-0" />}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-sm">{health.discovery_ready ? "Zero-credit lead discovery is ready" : "Lead discovery needs attention"}</p>
        <p className="text-xs text-foreground/65 mt-1 leading-relaxed break-words">{health.note || "Runtime health checked."}</p>
        <div className="flex flex-wrap gap-2 mt-3">
          <HealthFlag label="Database" active={Boolean(health.database_ready)} />
          <HealthFlag label="Public search" active={health.search_provider === "public_search_no_api_key"} />
          <HealthFlag label="Rule verification" active={health.classification_provider === "deterministic_rules"} />
          <HealthFlag label="Paid credits: 0" active={health.billing_mode === "no_external_credits"} />
          <HealthFlag label="API keys: not required" active={health.external_api_keys_required === false} />
        </div>
      </div>
    </div>
  );
}

function HealthFlag({ label, active }: { label: string; active: boolean }) {
  return <span className={`border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${active ? "border-emerald-500/40 text-emerald-300" : "border-border/60 text-muted-foreground"}`}>{label}</span>;
}
function Badge({ children, className }: { children: React.ReactNode; className: string }) {
  return <span className={`inline-flex border px-2 py-1 text-[9px] uppercase tracking-[0.14em] ${className}`}>{children}</span>;
}
function Metric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className="font-display text-2xl mt-1">{value}</p></div>;
}
function MiniMetric({ label, value }: { label: string; value: number }) {
  return <div className="border border-border/40 bg-background/20 p-2"><p className="text-[8px] uppercase tracking-[0.12em] text-muted-foreground">{label}</p><p className="font-display text-base mt-0.5">{value}</p></div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label><span className="block text-[9px] uppercase tracking-[0.18em] text-muted-foreground mb-1.5">{label}</span>{children}</label>;
}
function EmptyState({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return <div className="border border-dashed border-border/60 bg-card/20 p-10 sm:p-12 text-center"><div className="inline-flex text-muted-foreground mb-3">{icon}</div><h3 className="font-display text-xl">{title}</h3><p className="text-sm text-muted-foreground mt-2">{body}</p></div>;
}
function normalizeCandidate(candidate: Candidate): Candidate {
  return {
    ...candidate,
    product_fit: Array.isArray(candidate.product_fit) ? candidate.product_fit : [],
    evidence: candidate.evidence && typeof candidate.evidence === "object" ? candidate.evidence : {},
  };
}
function normalizeRun(run: SearchRun): SearchRun {
  return {
    ...run,
    response_meta: run.response_meta && typeof run.response_meta === "object" ? run.response_meta : {},
  };
}
function splitList(value: string) {
  return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
}
function isMigrationError(error: any) {
  const text = `${error?.code || ""} ${error?.message || ""}`.toLowerCase();
  return text.includes("42p01") || text.includes("lead_campaigns") || text.includes("lead_candidates") || text.includes("lead_search_runs");
}
function summarizeOutcomes(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return "Exact outcomes saved in the campaign.";
  const counts = value.reduce<Record<string, number>>((acc, item) => {
    const status = typeof item?.status === "string" ? item.status : "unknown";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(counts).map(([status, count]) => `${count} ${status.replace(/_/g, " ")}`).join(" · ");
}
function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const lines = [headers.join(","), ...rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(","))];
  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
