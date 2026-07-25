import { useMemo, useState } from "react";
import { CheckCircle2, Copy, FileSearch, Loader2, Search, ShieldCheck, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SITE = "https://irhaapparels.com";
const HOME_URL = `${SITE}/`;
const GSC_PROPERTY = "sc-domain:irhaapparels.com";
const ALLOWED_HOSTNAMES = new Set(["irhaapparels.com", "www.irhaapparels.com"]);

type GSCRow = {
  keys?: string[];
  clicks?: number;
  impressions?: number;
  ctr?: number;
  position?: number;
};

type HealthProof = {
  functionSuccess: boolean;
  ok: boolean;
  ready: boolean;
  state: string;
  connectorGatewayConfigured: boolean;
  gscConnectionConfigured: boolean;
  effectiveProperty: string;
  pass: boolean;
  error: string | null;
};

type AnalyticsProof = {
  dimension: "query" | "page";
  days: 28;
  functionSuccess: boolean;
  property: string;
  rowCount: number;
  totalClicks: number;
  totalImpressions: number;
  weightedCtr: number | null;
  weightedAveragePosition: number | null;
  pass: boolean;
  error: string | null;
};

type InspectionProof = {
  functionSuccess: boolean;
  url: string;
  property: string;
  verdict: string;
  coverageState: string;
  robotsTxtState: string;
  indexingState: string;
  pageFetchState: string;
  lastCrawlTime: string;
  userCanonical: string;
  googleCanonical: string;
  sitemapAssociation: string[];
  pass: boolean;
  error: string | null;
};

type ProofState = {
  executionTimestamp: string;
  productionBuildSha: string | null;
  health: HealthProof;
  queryAnalytics: AnalyticsProof;
  pageAnalytics: AnalyticsProof;
  homepageInspection: InspectionProof;
  pass: boolean;
};

function safeText(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 240) : fallback;
}

function sanitizeError(value: unknown) {
  const message = value instanceof Error ? value.message : typeof value === "string" ? value : "Read-only request failed";
  return message
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/(?:access|refresh|oauth|authorization|connector)[_-]?(?:token|key)\s*[:=]\s*\S+/gi, "credential=[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .slice(0, 240);
}

function aggregateRows(rows: GSCRow[]) {
  const rowCount = rows.length;
  const totalClicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
  const totalImpressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const weightedPositionNumerator = rows.reduce(
    (sum, row) => sum + Number(row.position || 0) * Number(row.impressions || 0),
    0,
  );
  return {
    rowCount,
    totalClicks,
    totalImpressions,
    weightedCtr: totalImpressions > 0 ? totalClicks / totalImpressions : null,
    weightedAveragePosition: totalImpressions > 0 ? weightedPositionNumerator / totalImpressions : null,
  };
}

async function readProductionBuildSha() {
  try {
    const response = await fetch(`/build.json?gsc-proof=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    const data = await response.json() as Record<string, unknown>;
    const candidate = [data.source_commit, data.sourceCommit, data.commit, data.sha]
      .find((value) => typeof value === "string" && /^[0-9a-f]{40}$/i.test(value));
    return typeof candidate === "string" ? candidate.toLowerCase() : null;
  } catch {
    return null;
  }
}

async function runHealthProof(): Promise<HealthProof> {
  const { data, error } = await supabase.functions.invoke("gsc-analytics", {
    body: { action: "health" },
  });
  const effectiveProperty = safeText(data?.site_url, "");
  const proof: HealthProof = {
    functionSuccess: !error && data?.ok === true,
    ok: data?.ok === true,
    ready: data?.ready === true,
    state: safeText(data?.state, "unknown"),
    connectorGatewayConfigured: data?.configuration?.connector_gateway_key === true,
    gscConnectionConfigured: data?.configuration?.search_console_connection_key === true,
    effectiveProperty,
    pass: false,
    error: error || data?.error ? sanitizeError(data?.error || error) : null,
  };
  proof.pass = proof.functionSuccess
    && proof.ok
    && proof.ready
    && proof.state === "ready"
    && proof.connectorGatewayConfigured
    && proof.gscConnectionConfigured
    && proof.effectiveProperty === GSC_PROPERTY;
  return proof;
}

async function runAnalyticsProof(dimension: "query" | "page"): Promise<AnalyticsProof> {
  const { data, error } = await supabase.functions.invoke("gsc-analytics", {
    body: { dimension, days: 28 },
  });
  const rows = Array.isArray(data?.rows) ? data.rows as GSCRow[] : [];
  const aggregate = aggregateRows(rows);
  const property = safeText(data?.property || data?.site_url, "");
  const functionSuccess = !error && data?.ok === true;
  return {
    dimension,
    days: 28,
    functionSuccess,
    property,
    ...aggregate,
    pass: functionSuccess
      && property === GSC_PROPERTY
      && data?.dimension === dimension
      && Number(data?.days) === 28,
    error: error || data?.error ? sanitizeError(data?.error || error) : null,
  };
}

async function runHomepageInspectionProof(): Promise<InspectionProof> {
  const { data, error } = await supabase.functions.invoke("gsc-inspect", {
    body: { urls: [HOME_URL] },
  });
  const result = Array.isArray(data?.results) ? data.results[0] ?? {} : {};
  const property = safeText(data?.property, "");
  const resultError = error || data?.error || result?.error;
  const functionSuccess = !resultError && data?.ok === true;
  return {
    functionSuccess,
    url: safeText(result?.url, HOME_URL),
    property,
    verdict: safeText(result?.verdict),
    coverageState: safeText(result?.coverageState),
    robotsTxtState: safeText(result?.robotsTxtState),
    indexingState: safeText(result?.indexingState),
    pageFetchState: safeText(result?.pageFetchState),
    lastCrawlTime: safeText(result?.lastCrawlTime),
    userCanonical: safeText(result?.userCanonical),
    googleCanonical: safeText(result?.googleCanonical),
    sitemapAssociation: Array.isArray(result?.sitemap)
      ? result.sitemap.filter((value: unknown): value is string => typeof value === "string").slice(0, 10)
      : [],
    pass: functionSuccess && property === GSC_PROPERTY && result?.url === HOME_URL,
    error: resultError ? sanitizeError(resultError) : null,
  };
}

function buildSafeProofReport(proof: ProofState) {
  return {
    executionTimestamp: proof.executionTimestamp,
    productionBuildSha: proof.productionBuildSha,
    health: {
      functionSuccess: proof.health.functionSuccess,
      ok: proof.health.ok,
      ready: proof.health.ready,
      state: proof.health.state,
      connectorGatewayConfigured: proof.health.connectorGatewayConfigured,
      gscConnectionConfigured: proof.health.gscConnectionConfigured,
      effectiveProperty: proof.health.effectiveProperty,
      pass: proof.health.pass,
    },
    queryAnalytics: {
      dimension: proof.queryAnalytics.dimension,
      days: proof.queryAnalytics.days,
      property: proof.queryAnalytics.property,
      rowCount: proof.queryAnalytics.rowCount,
      totalClicks: proof.queryAnalytics.totalClicks,
      totalImpressions: proof.queryAnalytics.totalImpressions,
      weightedCtr: proof.queryAnalytics.weightedCtr,
      weightedAveragePosition: proof.queryAnalytics.weightedAveragePosition,
      pass: proof.queryAnalytics.pass,
    },
    pageAnalytics: {
      dimension: proof.pageAnalytics.dimension,
      days: proof.pageAnalytics.days,
      property: proof.pageAnalytics.property,
      rowCount: proof.pageAnalytics.rowCount,
      totalClicks: proof.pageAnalytics.totalClicks,
      totalImpressions: proof.pageAnalytics.totalImpressions,
      weightedCtr: proof.pageAnalytics.weightedCtr,
      weightedAveragePosition: proof.pageAnalytics.weightedAveragePosition,
      pass: proof.pageAnalytics.pass,
    },
    homepageInspection: {
      url: proof.homepageInspection.url,
      property: proof.homepageInspection.property,
      verdict: proof.homepageInspection.verdict,
      coverageState: proof.homepageInspection.coverageState,
      robotsTxtState: proof.homepageInspection.robotsTxtState,
      indexingState: proof.homepageInspection.indexingState,
      pageFetchState: proof.homepageInspection.pageFetchState,
      lastCrawlTime: proof.homepageInspection.lastCrawlTime,
      userCanonical: proof.homepageInspection.userCanonical,
      googleCanonical: proof.homepageInspection.googleCanonical,
      sitemapAssociation: proof.homepageInspection.sitemapAssociation,
      pass: proof.homepageInspection.pass,
    },
    pass: proof.pass,
  };
}

export default function GoogleSearchCenter() {
  const [running, setRunning] = useState(false);
  const [copying, setCopying] = useState(false);
  const [proof, setProof] = useState<ProofState | null>(null);
  const [manualQuery, setManualQuery] = useState<AnalyticsProof | null>(null);
  const [manualPage, setManualPage] = useState<AnalyticsProof | null>(null);
  const [manualInspection, setManualInspection] = useState<InspectionProof | null>(null);
  const [manualLoading, setManualLoading] = useState<string | null>(null);

  const proofStatus = useMemo(() => {
    if (!proof) return "Not run";
    return proof.pass ? "PASS" : "REVIEW";
  }, [proof]);

  const runProof = async () => {
    setRunning(true);
    try {
      const executionTimestamp = new Date().toISOString();
      const productionBuildSha = await readProductionBuildSha();
      const health = await runHealthProof();
      const queryAnalytics = await runAnalyticsProof("query");
      const pageAnalytics = await runAnalyticsProof("page");
      const homepageInspection = await runHomepageInspectionProof();
      const next: ProofState = {
        executionTimestamp,
        productionBuildSha,
        health,
        queryAnalytics,
        pageAnalytics,
        homepageInspection,
        pass: health.pass && queryAnalytics.pass && pageAnalytics.pass && homepageInspection.pass,
      };
      setProof(next);
      setManualQuery(queryAnalytics);
      setManualPage(pageAnalytics);
      setManualInspection(homepageInspection);
      toast({
        title: next.pass ? "Read-only GSC proof passed" : "Read-only GSC proof needs review",
        description: "No credentials or individual search queries were added to the proof report.",
        variant: next.pass ? undefined : "destructive",
      });
    } finally {
      setRunning(false);
    }
  };

  const copySafeReport = async () => {
    if (!proof) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildSafeProofReport(proof), null, 2));
      toast({ title: "Safe proof report copied", description: "Aggregate read-only evidence is ready to paste into the Execution Chat." });
    } catch (error) {
      toast({ title: "Copy failed", description: sanitizeError(error), variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  const runManualAnalytics = async (dimension: "query" | "page") => {
    setManualLoading(dimension);
    try {
      const result = await runAnalyticsProof(dimension);
      if (dimension === "query") setManualQuery(result);
      else setManualPage(result);
    } finally {
      setManualLoading(null);
    }
  };

  const runManualInspection = async () => {
    setManualLoading("inspection");
    try {
      setManualInspection(await runHomepageInspectionProof());
    } finally {
      setManualLoading(null);
    }
  };

  return (
    <section className="space-y-6" aria-labelledby="gsc-proof-heading">
      <div className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <p className="eyebrow mb-2">Google Search Center</p>
        <h2 id="gsc-proof-heading" className="font-display text-3xl md:text-4xl">Authenticated, read-only GSC evidence.</h2>
        <p className="text-sm text-foreground/68 mt-3 max-w-3xl leading-relaxed">
          This admin-only console uses the signed-in Supabase browser client. It reads Search Analytics and homepage URL Inspection for {GSC_PROPERTY}. It never reads the browser session token manually.
        </p>
        <p className="text-xs text-foreground/55 mt-2">
          Approved inspection hosts: irhaapparels.com and www.irhaapparels.com. Canonical homepage: {HOME_URL}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <button type="button" onClick={() => void runProof()} disabled={running} className="min-h-11 inline-flex items-center gap-2 bg-gradient-gold text-primary-foreground px-5 py-3 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">
            {running ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} Run read-only GSC proof
          </button>
          <button type="button" onClick={() => void copySafeReport()} disabled={!proof || copying} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-5 py-3 text-[10px] uppercase tracking-[0.18em] hover:border-gold hover:text-gold disabled:opacity-40">
            {copying ? <Loader2 size={14} className="animate-spin" /> : <Copy size={14} />} Copy safe proof report
          </button>
          <StatusBadge pass={proof?.pass ?? false} label={proofStatus} idle={!proof} />
        </div>
      </div>

      {proof && (
        <div className="space-y-4">
          <HealthCard proof={proof.health} buildSha={proof.productionBuildSha} timestamp={proof.executionTimestamp} />
          <div className="grid lg:grid-cols-2 gap-4">
            <AnalyticsCard title="28-day query Analytics" proof={proof.queryAnalytics} />
            <AnalyticsCard title="28-day page Analytics" proof={proof.pageAnalytics} />
          </div>
          <InspectionCard proof={proof.homepageInspection} />
        </div>
      )}

      <div className="border border-border/60 bg-card/25 p-5 md:p-6">
        <h3 className="font-display text-2xl">Individual read-only checks</h3>
        <p className="text-xs text-foreground/55 mt-2">These controls call only gsc-analytics and gsc-inspect and show aggregate or homepage-only evidence.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ManualButton label="Load query aggregate" loading={manualLoading === "query"} onClick={() => void runManualAnalytics("query")} icon={<Search size={12} />} />
          <ManualButton label="Load page aggregate" loading={manualLoading === "page"} onClick={() => void runManualAnalytics("page")} icon={<Search size={12} />} />
          <ManualButton label="Inspect canonical homepage" loading={manualLoading === "inspection"} onClick={() => void runManualInspection()} icon={<FileSearch size={12} />} />
        </div>
        {(manualQuery || manualPage || manualInspection) && (
          <div className="mt-5 grid lg:grid-cols-3 gap-3">
            {manualQuery && <CompactResult label="Query" pass={manualQuery.pass} value={`${manualQuery.rowCount} rows · ${manualQuery.totalImpressions} impressions`} error={manualQuery.error} />}
            {manualPage && <CompactResult label="Page" pass={manualPage.pass} value={`${manualPage.rowCount} rows · ${manualPage.totalImpressions} impressions`} error={manualPage.error} />}
            {manualInspection && <CompactResult label="Homepage" pass={manualInspection.pass} value={`${manualInspection.verdict} · ${manualInspection.coverageState}`} error={manualInspection.error} />}
          </div>
        )}
      </div>
    </section>
  );
}

function StatusBadge({ pass, label, idle = false }: { pass: boolean; label: string; idle?: boolean }) {
  const style = idle ? "border-border/60 text-muted-foreground" : pass ? "border-emerald-500/50 text-emerald-300" : "border-amber-500/50 text-amber-300";
  const Icon = pass ? CheckCircle2 : XCircle;
  return <span className={`min-h-11 inline-flex items-center gap-2 border px-4 text-[10px] uppercase tracking-[0.16em] ${style}`}><Icon size={13} />{label}</span>;
}

function HealthCard({ proof, buildSha, timestamp }: { proof: HealthProof; buildSha: string | null; timestamp: string }) {
  return (
    <article className="border border-border/60 bg-card/25 p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">Health proof</h3><StatusBadge pass={proof.pass} label={proof.pass ? "PASS" : "FAIL"} /></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <Evidence label="Function result" value={proof.functionSuccess ? "2xx / success" : "failed"} />
        <Evidence label="ok / ready" value={`${proof.ok} / ${proof.ready}`} />
        <Evidence label="State" value={proof.state} />
        <Evidence label="Effective property" value={proof.effectiveProperty || "—"} />
        <Evidence label="Connector gateway" value={String(proof.connectorGatewayConfigured)} />
        <Evidence label="GSC connection" value={String(proof.gscConnectionConfigured)} />
        <Evidence label="Production SHA" value={buildSha || "Unavailable"} />
        <Evidence label="Executed" value={timestamp} />
      </div>
      {proof.error && <SafeError message={proof.error} />}
    </article>
  );
}

function AnalyticsCard({ title, proof }: { title: string; proof: AnalyticsProof }) {
  return (
    <article className="border border-border/60 bg-card/25 p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-xl">{title}</h3><StatusBadge pass={proof.pass} label={proof.pass ? "PASS" : "FAIL"} /></div>
      <div className="grid grid-cols-2 gap-3 mt-4">
        <Evidence label="Function result" value={proof.functionSuccess ? "2xx / success" : "failed"} />
        <Evidence label="Property" value={proof.property || "—"} />
        <Evidence label="Rows" value={proof.rowCount.toLocaleString()} />
        <Evidence label="Clicks" value={proof.totalClicks.toLocaleString()} />
        <Evidence label="Impressions" value={proof.totalImpressions.toLocaleString()} />
        <Evidence label="Weighted CTR" value={proof.weightedCtr === null ? "—" : `${(proof.weightedCtr * 100).toFixed(2)}%`} />
        <Evidence label="Weighted position" value={proof.weightedAveragePosition === null ? "—" : proof.weightedAveragePosition.toFixed(2)} />
        <Evidence label="Window" value={`${proof.days} days`} />
      </div>
      {proof.error && <SafeError message={proof.error} />}
    </article>
  );
}

function InspectionCard({ proof }: { proof: InspectionProof }) {
  return (
    <article className="border border-border/60 bg-card/25 p-5">
      <div className="flex items-center justify-between gap-3"><h3 className="font-display text-2xl">Homepage Inspection proof</h3><StatusBadge pass={proof.pass} label={proof.pass ? "PASS" : "FAIL"} /></div>
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-4">
        <Evidence label="Function result" value={proof.functionSuccess ? "2xx / success" : "failed"} />
        <Evidence label="URL" value={proof.url} />
        <Evidence label="Property" value={proof.property || "—"} />
        <Evidence label="Verdict" value={proof.verdict} />
        <Evidence label="Coverage" value={proof.coverageState} />
        <Evidence label="Robots" value={proof.robotsTxtState} />
        <Evidence label="Indexing" value={proof.indexingState} />
        <Evidence label="Page fetch" value={proof.pageFetchState} />
        <Evidence label="Last crawl" value={proof.lastCrawlTime} />
        <Evidence label="User canonical" value={proof.userCanonical} />
        <Evidence label="Google canonical" value={proof.googleCanonical} />
        <Evidence label="Sitemap association" value={proof.sitemapAssociation.join(", ") || "—"} />
      </div>
      {proof.error && <SafeError message={proof.error} />}
    </article>
  );
}

function Evidence({ label, value }: { label: string; value: string }) {
  return <div className="border border-border/50 bg-background/35 p-3 min-w-0"><p className="text-[9px] uppercase tracking-[0.14em] text-foreground/40">{label}</p><p className="mt-1 text-xs break-words">{value}</p></div>;
}

function SafeError({ message }: { message: string }) {
  return <p className="mt-4 border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200 break-words">Sanitized error: {message}</p>;
}

function ManualButton({ label, loading, onClick, icon }: { label: string; loading: boolean; onClick: () => void; icon: React.ReactNode }) {
  return <button type="button" onClick={onClick} disabled={loading} className="min-h-11 inline-flex items-center gap-2 border border-border/60 px-3 py-2 text-[10px] uppercase tracking-[0.16em] hover:border-gold hover:text-gold disabled:opacity-50">{loading ? <Loader2 size={12} className="animate-spin" /> : icon}{label}</button>;
}

function CompactResult({ label, pass, value, error }: { label: string; pass: boolean; value: string; error: string | null }) {
  return <div className="border border-border/50 bg-background/35 p-4"><p className="text-[9px] uppercase tracking-[0.14em] text-foreground/40">{label}</p><p className={pass ? "mt-1 text-xs text-emerald-300" : "mt-1 text-xs text-amber-300"}>{pass ? "PASS" : "REVIEW"} · {value}</p>{error && <p className="mt-2 text-xs text-red-200 break-words">{error}</p>}</div>;
}
