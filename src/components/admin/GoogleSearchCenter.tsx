import { useState } from "react";
import { Copy, Loader2, ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SITE = "https://irhaapparels.com";
const HOME_URL = `${SITE}/`;
const GSC_PROPERTY = "sc-domain:irhaapparels.com";
const GSC_AUTH_MODE = "google_oauth_refresh_token";
const ALLOWED_HOSTNAMES = new Set(["irhaapparels.com", "www.irhaapparels.com"]);

type Row = { clicks?: number; impressions?: number; position?: number };
type HealthProof = {
  functionSuccess: boolean; ok: boolean; ready: boolean; state: string; authMode: string;
  oauthClientIdConfigured: boolean; oauthClientSecretConfigured: boolean;
  oauthRefreshTokenConfigured: boolean; siteUrlConfigured: boolean;
  tokenExchangeVerified: boolean; propertyAccessVerified: boolean;
  permissionLevel: string; effectiveProperty: string; pass: boolean; error: string | null;
};
type AnalyticsProof = {
  dimension: "query" | "page"; days: 28; functionSuccess: boolean; property: string;
  rowCount: number; totalClicks: number; totalImpressions: number;
  weightedCtr: number | null; weightedAveragePosition: number | null;
  pass: boolean; error: string | null;
};
type InspectionProof = {
  functionSuccess: boolean; url: string; property: string; verdict: string;
  coverageState: string; robotsTxtState: string; indexingState: string;
  pageFetchState: string; lastCrawlTime: string; userCanonical: string;
  googleCanonical: string; sitemapAssociation: string[]; inspectionLink: string;
  pass: boolean; error: string | null;
};
type ProofState = {
  executionTimestamp: string; productionBuildSha: string | null; health: HealthProof;
  queryAnalytics: AnalyticsProof; pageAnalytics: AnalyticsProof;
  homepageInspection: InspectionProof; pass: boolean;
};

function safeText(value: unknown, fallback = "—") {
  return typeof value === "string" && value.trim() ? value.trim().slice(0, 240) : fallback;
}

function sanitizeError(value: unknown) {
  const text = value instanceof Error ? value.message
    : typeof value === "string" ? value
    : typeof value === "object" && value && "message" in value && typeof value.message === "string"
      ? value.message : "Read-only request failed";
  return text
    .replace(/Bearer\s+\S+/gi, "Bearer [redacted]")
    .replace(/(?:GSC[-_]OAUTH[-_](?:CLIENT[-_]ID|CLIENT[-_]SECRET|REFRESH[-_]TOKEN)|(?:access|refresh)[-_ ]?token|client[-_ ]?(?:secret|id)|authorization)\s*[:=]\s*\S+/gi, "credential=[redacted]")
    .replace(/eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g, "[redacted-jwt]")
    .slice(0, 240);
}

function aggregate(rows: Row[]) {
  const totalClicks = rows.reduce((sum, row) => sum + Number(row.clicks || 0), 0);
  const totalImpressions = rows.reduce((sum, row) => sum + Number(row.impressions || 0), 0);
  const positionTotal = rows.reduce(
    (sum, row) => sum + Number(row.position || 0) * Number(row.impressions || 0), 0,
  );
  return {
    rowCount: rows.length,
    totalClicks,
    totalImpressions,
    weightedCtr: totalImpressions ? totalClicks / totalImpressions : null,
    weightedAveragePosition: totalImpressions ? positionTotal / totalImpressions : null,
  };
}

async function readProductionBuildSha() {
  try {
    const response = await fetch(`/build.json?gsc-proof=${Date.now()}`, { cache: "no-store" });
    const data = response.ok ? await response.json() as Record<string, unknown> : {};
    const value = [data.source_commit, data.sourceCommit, data.commit, data.sha]
      .find((item) => typeof item === "string" && /^[0-9a-f]{40}$/i.test(item));
    return typeof value === "string" ? value.toLowerCase() : null;
  } catch { return null; }
}

async function runHealthProof(): Promise<HealthProof> {
  const { data, error } = await supabase.functions.invoke("gsc-analytics", {
    body: { action: "health" },
  });
  const proof: HealthProof = {
    functionSuccess: !error && data?.ok === true,
    ok: data?.ok === true,
    ready: data?.ready === true,
    state: safeText(data?.state, "unknown"),
    authMode: safeText(data?.auth_mode, "unknown"),
    oauthClientIdConfigured: data?.configuration?.oauth_client_id === true,
    oauthClientSecretConfigured: data?.configuration?.oauth_client_secret === true,
    oauthRefreshTokenConfigured: data?.configuration?.oauth_refresh_token === true,
    siteUrlConfigured: data?.configuration?.site_url === true,
    tokenExchangeVerified: data?.google?.token_exchange === true,
    propertyAccessVerified: data?.google?.property_access === true,
    permissionLevel: safeText(data?.google?.permission_level),
    effectiveProperty: safeText(data?.effective_property || data?.site_url, ""),
    pass: false,
    error: error || data?.error || data?.failure_code
      ? sanitizeError(data?.error || data?.failure_code || error) : null,
  };
  proof.pass = proof.functionSuccess && proof.ok && proof.ready && proof.state === "ready"
    && proof.authMode === GSC_AUTH_MODE && proof.oauthClientIdConfigured
    && proof.oauthClientSecretConfigured && proof.oauthRefreshTokenConfigured
    && proof.siteUrlConfigured && proof.tokenExchangeVerified
    && proof.propertyAccessVerified && proof.effectiveProperty === GSC_PROPERTY;
  return proof;
}

async function runAnalyticsProof(dimension: "query" | "page"): Promise<AnalyticsProof> {
  const { data, error } = await supabase.functions.invoke("gsc-analytics", {
    body: { dimension, days: 28 },
  });
  const metrics = aggregate(Array.isArray(data?.rows) ? data.rows as Row[] : []);
  const property = safeText(data?.property || data?.site_url, "");
  const functionSuccess = !error && data?.ok === true;
  return {
    dimension, days: 28, functionSuccess, property, ...metrics,
    pass: functionSuccess && property === GSC_PROPERTY
      && data?.dimension === dimension && Number(data?.days) === 28,
    error: error || data?.error ? sanitizeError(data?.error || error) : null,
  };
}

async function runHomepageInspectionProof(): Promise<InspectionProof> {
  const { data, error } = await supabase.functions.invoke("gsc-inspect", {
    body: { urls: [HOME_URL] },
  });
  const result = Array.isArray(data?.results) ? data.results[0] ?? {} : {};
  const resultError = error || data?.error || result?.error;
  const property = safeText(data?.property, "");
  const functionSuccess = !resultError && data?.ok === true;
  return {
    functionSuccess,
    url: safeText(result?.url, HOME_URL), property,
    verdict: safeText(result?.verdict), coverageState: safeText(result?.coverageState),
    robotsTxtState: safeText(result?.robotsTxtState), indexingState: safeText(result?.indexingState),
    pageFetchState: safeText(result?.pageFetchState), lastCrawlTime: safeText(result?.lastCrawlTime),
    userCanonical: safeText(result?.userCanonical), googleCanonical: safeText(result?.googleCanonical),
    sitemapAssociation: Array.isArray(result?.sitemap)
      ? result.sitemap.filter((item: unknown): item is string => typeof item === "string").slice(0, 10) : [],
    inspectionLink: safeText(result?.inspectionLink),
    pass: functionSuccess && property === GSC_PROPERTY && result?.url === HOME_URL,
    error: resultError ? sanitizeError(resultError) : null,
  };
}

function buildSafeProofReport(proof: ProofState) {
  return {
    executionTimestamp: proof.executionTimestamp,
    productionBuildSha: proof.productionBuildSha,
    health: {
      functionSuccess: proof.health.functionSuccess, ok: proof.health.ok,
      ready: proof.health.ready, state: proof.health.state, authMode: proof.health.authMode,
      oauthClientIdConfigured: proof.health.oauthClientIdConfigured,
      oauthClientSecretConfigured: proof.health.oauthClientSecretConfigured,
      oauthRefreshTokenConfigured: proof.health.oauthRefreshTokenConfigured,
      siteUrlConfigured: proof.health.siteUrlConfigured,
      tokenExchangeVerified: proof.health.tokenExchangeVerified,
      propertyAccessVerified: proof.health.propertyAccessVerified,
      permissionLevel: proof.health.permissionLevel,
      effectiveProperty: proof.health.effectiveProperty, pass: proof.health.pass,
    },
    queryAnalytics: { ...proof.queryAnalytics, error: undefined },
    pageAnalytics: { ...proof.pageAnalytics, error: undefined },
    homepageInspection: {
      url: proof.homepageInspection.url, property: proof.homepageInspection.property,
      verdict: proof.homepageInspection.verdict, coverageState: proof.homepageInspection.coverageState,
      robotsTxtState: proof.homepageInspection.robotsTxtState,
      indexingState: proof.homepageInspection.indexingState,
      pageFetchState: proof.homepageInspection.pageFetchState,
      lastCrawlTime: proof.homepageInspection.lastCrawlTime,
      userCanonical: proof.homepageInspection.userCanonical,
      googleCanonical: proof.homepageInspection.googleCanonical,
      sitemapAssociation: proof.homepageInspection.sitemapAssociation,
      inspectionLink: proof.homepageInspection.inspectionLink,
      pass: proof.homepageInspection.pass,
    },
    pass: proof.pass,
  };
}

export default function GoogleSearchCenter() {
  const [proof, setProof] = useState<ProofState | null>(null);
  const [running, setRunning] = useState(false);
  const [copying, setCopying] = useState(false);

  const runProof = async () => {
    setRunning(true);
    try {
      const [productionBuildSha, health, queryAnalytics, pageAnalytics, homepageInspection] = await Promise.all([
        readProductionBuildSha(), runHealthProof(), runAnalyticsProof("query"),
        runAnalyticsProof("page"), runHomepageInspectionProof(),
      ]);
      const next: ProofState = {
        executionTimestamp: new Date().toISOString(), productionBuildSha,
        health, queryAnalytics, pageAnalytics, homepageInspection,
        pass: health.pass && queryAnalytics.pass && pageAnalytics.pass && homepageInspection.pass,
      };
      setProof(next);
      toast({
        title: next.pass ? "Read-only GSC proof passed" : "Read-only GSC proof needs review",
        description: "The report contains aggregate evidence only and no credential values.",
        variant: next.pass ? undefined : "destructive",
      });
    } finally { setRunning(false); }
  };

  const copySafeReport = async () => {
    if (!proof) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(JSON.stringify(buildSafeProofReport(proof), null, 2));
      toast({ title: "Safe proof report copied" });
    } catch (error) {
      toast({ title: "Copy failed", description: sanitizeError(error), variant: "destructive" });
    } finally { setCopying(false); }
  };

  return (
    <section className="space-y-5" aria-labelledby="gsc-proof-heading">
      <div className="border border-gold/40 bg-card/30 p-6">
        <p className="eyebrow mb-2">Google Search Center</p>
        <h2 id="gsc-proof-heading" className="font-display text-3xl">Authenticated, read-only GSC evidence.</h2>
        <p className="mt-3 text-sm text-foreground/65">
          Owner-controlled direct Google OAuth for {GSC_PROPERTY}. Approved Inspection hosts: {[...ALLOWED_HOSTNAMES].join(" and ")}.
          Google credentials and access tokens never enter the browser.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <button type="button" onClick={() => void runProof()} disabled={running} className="min-h-11 bg-gradient-gold px-5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-50">
            {running ? <Loader2 className="inline animate-spin" size={14} /> : <ShieldCheck className="inline" size={14} />} Run read-only GSC proof
          </button>
          <button type="button" onClick={() => void copySafeReport()} disabled={!proof || copying} className="min-h-11 border border-border/60 px-5 text-[10px] uppercase tracking-[0.18em] disabled:opacity-40">
            {copying ? <Loader2 className="inline animate-spin" size={14} /> : <Copy className="inline" size={14} />} Copy safe proof report
          </button>
        </div>
      </div>

      {proof && <div className="space-y-4">
        <Card title="Health" pass={proof.health.pass} values={[
          ["Function", String(proof.health.functionSuccess)], ["Ready", String(proof.health.ready)],
          ["State", proof.health.state], ["Auth mode", proof.health.authMode],
          ["OAuth Client ID configured", String(proof.health.oauthClientIdConfigured)],
          ["OAuth Client Secret configured", String(proof.health.oauthClientSecretConfigured)],
          ["OAuth Refresh Token configured", String(proof.health.oauthRefreshTokenConfigured)],
          ["Token exchange verified", String(proof.health.tokenExchangeVerified)],
          ["Property access verified", String(proof.health.propertyAccessVerified)],
          ["Permission level", proof.health.permissionLevel],
          ["Effective property", proof.health.effectiveProperty],
          ["Production SHA", proof.productionBuildSha || "Unavailable"],
        ]} error={proof.health.error} />
        <div className="grid gap-4 lg:grid-cols-2">
          <AnalyticsCard title="28-day query Analytics" proof={proof.queryAnalytics} />
          <AnalyticsCard title="28-day page Analytics" proof={proof.pageAnalytics} />
        </div>
        <Card title="Homepage Inspection" pass={proof.homepageInspection.pass} values={[
          ["URL", proof.homepageInspection.url], ["Property", proof.homepageInspection.property],
          ["Verdict", proof.homepageInspection.verdict], ["Coverage", proof.homepageInspection.coverageState],
          ["Robots", proof.homepageInspection.robotsTxtState], ["Fetch", proof.homepageInspection.pageFetchState],
          ["Indexing", proof.homepageInspection.indexingState], ["Last crawl", proof.homepageInspection.lastCrawlTime],
          ["User canonical", proof.homepageInspection.userCanonical], ["Google canonical", proof.homepageInspection.googleCanonical],
          ["Sitemap", proof.homepageInspection.sitemapAssociation.join(", ") || "—"],
          ["Inspection link", proof.homepageInspection.inspectionLink],
        ]} error={proof.homepageInspection.error} />
      </div>}
    </section>
  );
}

function AnalyticsCard({ title, proof }: { title: string; proof: AnalyticsProof }) {
  return <Card title={title} pass={proof.pass} values={[
    ["Property", proof.property], ["Rows", String(proof.rowCount)],
    ["Clicks", String(proof.totalClicks)], ["Impressions", String(proof.totalImpressions)],
    ["CTR", proof.weightedCtr === null ? "—" : `${(proof.weightedCtr * 100).toFixed(2)}%`],
    ["Average position", proof.weightedAveragePosition === null ? "—" : proof.weightedAveragePosition.toFixed(2)],
  ]} error={proof.error} />;
}

function Card({ title, pass, values, error }: {
  title: string; pass: boolean; values: Array<[string, string]>; error: string | null;
}) {
  return <article className="border border-border/60 bg-card/25 p-5">
    <div className="flex justify-between gap-3"><h3 className="font-display text-2xl">{title}</h3><strong>{pass ? "PASS" : "FAIL"}</strong></div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {values.map(([label, value]) => <div key={label} className="border border-border/50 p-3"><p className="text-[9px] uppercase tracking-[0.14em] text-foreground/40">{label}</p><p className="mt-1 break-words text-xs">{value || "—"}</p></div>)}
    </div>
    {error && <p className="mt-4 border border-red-500/40 bg-red-500/10 p-3 text-xs text-red-200">Sanitized error: {error}</p>}
  </article>;
}
