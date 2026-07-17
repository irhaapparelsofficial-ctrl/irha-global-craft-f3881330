import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Database,
  ExternalLink,
  GitBranch,
  Globe2,
  Loader2,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Status = "ready" | "degraded" | "blocked";
type Run = {
  id: number | null;
  name: string | null;
  head_sha: string | null;
  status: string | null;
  conclusion: string | null;
  run_number: number | null;
  created_at: string | null;
  updated_at: string | null;
  url: string | null;
} | null;

type ReleaseHealth = {
  ok: boolean;
  checked_at: string;
  overall_status: Status;
  repository: string;
  deployment_environment: string;
  supabase_project_ref: string;
  blockers: string[];
  warnings: string[];
  rollback_reference: string | null;
  destructive_write: boolean;
  github: {
    configured: boolean;
    accessible: boolean;
    latest_main_sha: string | null;
    quality_gate: Run;
    dependency_security: Run;
    production_smoke: Run;
    cloudflare_release: Run;
    note: string;
  };
  production: {
    home_status: number;
    build_status: number;
    source_sha: string | null;
    source_identity_state: string | null;
    source_branch: string | null;
    built_at: string | null;
    build_fingerprint: string | null;
    application_fingerprint: string | null;
    supabase_project_ref: string | null;
    repository: string | null;
    parity_with_latest_main: boolean;
    www_redirect: { ok: boolean; status: number; location: string | null; marker: string | null };
    not_found: { ok: boolean; status: number; path: string };
    security_headers: Record<string, { present: boolean; value: string | null; frame_ancestors?: boolean }>;
    sitemap: { ok: boolean; status: number; url_count: number };
  };
  database: {
    read_ok: boolean;
    errors: string[];
    operations: { overall_status: string | null; checked_at: string | null; blockers: unknown[]; metrics: Record<string, unknown> };
    sitemap: { last_attempt_at: string | null; last_success_at: string | null; last_http_status: number | null; last_error: string | null; last_request_id: number | null };
    forms: { inquiry_rows: number | null; catalogue_request_rows: number | null; submission_audit_rows: number | null; controlled_current_release_test: string };
    backup: { status: string; identifier: string | null; note: string };
    latest_checkpoint: { key: string | null; project_ref: string | null; auth_user_count: number | null; admin_role_count: number | null; recorded_migration_count: number | null; created_at: string | null } | null;
  };
};

const shortSha = (value: string | null | undefined) => value ? value.slice(0, 12) : "unavailable";
const dateTime = (value: string | null | undefined) => value ? new Date(value).toLocaleString() : "Not verified";

export default function ReleaseHealthPanel() {
  const [data, setData] = useState<ReleaseHealth | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data: response, error: invokeError } = await supabase.functions.invoke("release-health", {
      body: { action: "read" },
    });
    if (invokeError) {
      setError(invokeError.message || "Release health could not load");
      setLoading(false);
      return;
    }
    if (!response || typeof response !== "object" || typeof response.overall_status !== "string") {
      setError("Release health returned an invalid response");
      setLoading(false);
      return;
    }
    setData(response as ReleaseHealth);
    setLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const headersReady = useMemo(() => {
    if (!data) return false;
    const headers = data.production.security_headers;
    return Object.values(headers).every((entry) => entry.present)
      && headers["content-security-policy"]?.frame_ancestors === true;
  }, [data]);

  if (loading && !data) {
    return <section className="mb-6 rounded-xl border border-border/60 bg-card/35 p-6" role="status"><div className="flex items-center gap-3 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Reading exact release evidence…</div></section>;
  }

  if (error && !data) {
    return (
      <section className="mb-6 rounded-xl border border-destructive/50 bg-destructive/5 p-6">
        <div className="flex items-start gap-3"><XCircle className="mt-0.5 h-5 w-5 text-destructive" /><div><h2 className="font-medium">Release health is unavailable</h2><p className="mt-1 text-sm text-muted-foreground">{error}</p><button type="button" onClick={() => void load()} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-md border border-border/60 px-4 text-xs uppercase tracking-[0.16em] hover:border-primary"><RefreshCw size={14} /> Retry</button></div></div>
      </section>
    );
  }

  if (!data) return null;

  const statusTone = data.overall_status === "ready"
    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : data.overall_status === "degraded"
      ? "border-amber-500/50 bg-amber-500/10 text-amber-700 dark:text-amber-300"
      : "border-destructive/50 bg-destructive/10 text-destructive";

  return (
    <section className="mb-6 space-y-5 rounded-xl border border-border/60 bg-card/35 p-4 sm:p-6" aria-labelledby="release-health-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground">Read-only production evidence</p>
          <h2 id="release-health-title" className="mt-1 font-display text-xl">Release Health</h2>
          <p className="mt-1 text-sm text-muted-foreground">GitHub main, live build identity, Cloudflare HTTP behavior, owner Supabase and rollback readiness.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full border px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] ${statusTone}`}>{data.overall_status}</span>
          <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-md border border-border/60 text-muted-foreground hover:border-primary hover:text-primary disabled:opacity-50" aria-label="Refresh release health"><RefreshCw size={15} className={loading ? "animate-spin" : ""} /></button>
        </div>
      </div>

      {error && <Notice tone="warning" title="Latest refresh failed" body={error} />}
      {data.blockers.length > 0 && <Notice tone="blocked" title="Release blockers" body={data.blockers.map(label).join(" · ")} />}
      {data.warnings.length > 0 && <Notice tone="warning" title="Remaining warnings" body={data.warnings.map(label).join(" · ")} />}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric icon={GitBranch} label="Latest GitHub main" value={shortSha(data.github.latest_main_sha)} state={data.github.latest_main_sha ? "ready" : "blocked"} detail={data.github.accessible ? "Repository evidence reachable" : data.github.note} mono />
        <Metric icon={Globe2} label="Production build" value={shortSha(data.production.source_sha)} state={data.production.parity_with_latest_main ? "ready" : "blocked"} detail={data.production.parity_with_latest_main ? "Matches latest main" : "Mismatch or unproven"} mono />
        <Metric icon={Database} label="Owner Supabase" value={data.production.supabase_project_ref || "unavailable"} state={data.production.supabase_project_ref === data.supabase_project_ref ? "ready" : "blocked"} detail={`Expected ${data.supabase_project_ref}`} mono />
        <Metric icon={RotateCcw} label="Rollback reference" value={shortSha(data.rollback_reference)} state={data.rollback_reference ? "ready" : "blocked"} detail={data.rollback_reference ? "Current production source" : "No immutable source reference"} mono />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Panel title="Release pipeline" icon={GitBranch}>
          <RunRow label="Quality Gate" run={data.github.quality_gate} />
          <RunRow label="Dependency Security" run={data.github.dependency_security} />
          <RunRow label="Production Smoke" run={data.github.production_smoke} />
          <RunRow label="Cloudflare release" run={data.github.cloudflare_release} />
        </Panel>

        <Panel title="Live HTTP contract" icon={ShieldCheck}>
          <EvidenceRow label="www → apex" value={`${data.production.www_redirect.status} ${data.production.www_redirect.location || "no location"}`} ready={data.production.www_redirect.ok} />
          <EvidenceRow label="Random unknown URL" value={`HTTP ${data.production.not_found.status}`} ready={data.production.not_found.ok} />
          <EvidenceRow label="Security headers" value={headersReady ? "Required headers and CSP frame-ancestors present" : "One or more required headers missing"} ready={headersReady} />
          <EvidenceRow label="Route sitemap" value={`HTTP ${data.production.sitemap.status} · ${data.production.sitemap.url_count} URLs`} ready={data.production.sitemap.ok && data.production.sitemap.url_count > 0} />
        </Panel>

        <Panel title="Database & forms" icon={Database}>
          <EvidenceRow label="Operations snapshot" value={`${data.database.operations.overall_status || "unavailable"} · ${dateTime(data.database.operations.checked_at)}`} ready={data.database.operations.overall_status === "ready"} neutral={data.database.operations.overall_status === "degraded"} />
          <EvidenceRow label="Inquiry rows" value={String(data.database.forms.inquiry_rows ?? "unavailable")} ready={data.database.read_ok} />
          <EvidenceRow label="Catalogue request rows" value={String(data.database.forms.catalogue_request_rows ?? "unavailable")} ready={data.database.read_ok} />
          <EvidenceRow label="Controlled current-release forms" value={data.database.forms.controlled_current_release_test} ready={data.database.forms.controlled_current_release_test === "verified"} />
        </Panel>

        <Panel title="SEO, backup & recovery" icon={Search}>
          <EvidenceRow label="Search Console sitemap" value={data.database.sitemap.last_success_at ? `Succeeded ${dateTime(data.database.sitemap.last_success_at)}` : data.database.sitemap.last_error || "Never succeeded"} ready={Boolean(data.database.sitemap.last_success_at)} />
          <EvidenceRow label="Fresh database backup" value={data.database.backup.identifier || data.database.backup.status} ready={data.database.backup.status === "verified"} />
          <EvidenceRow label="Latest activation checkpoint" value={data.database.latest_checkpoint?.key || "unavailable"} ready={Boolean(data.database.latest_checkpoint)} neutral />
          <EvidenceRow label="Checkpoint time" value={dateTime(data.database.latest_checkpoint?.created_at)} ready={Boolean(data.database.latest_checkpoint?.created_at)} neutral />
        </Panel>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/50 pt-4 text-xs text-muted-foreground">
        <span>Checked {dateTime(data.checked_at)} · destructive write: {String(data.destructive_write)}</span>
        <span className="font-mono">{data.repository}</span>
      </div>
    </section>
  );
}

function Metric({ icon: Icon, label: metricLabel, value, detail, state, mono = false }: { icon: typeof GitBranch; label: string; value: string; detail: string; state: Status; mono?: boolean }) {
  const IconState = state === "ready" ? CheckCircle2 : state === "degraded" ? AlertTriangle : XCircle;
  const tone = state === "ready" ? "text-emerald-500" : state === "degraded" ? "text-amber-500" : "text-destructive";
  return <div className="rounded-lg border border-border/60 bg-background/45 p-4"><div className="flex items-center justify-between gap-2 text-muted-foreground"><span className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.16em]"><Icon size={14} />{metricLabel}</span><IconState size={15} className={tone} /></div><p className={`mt-3 break-all text-sm font-semibold ${mono ? "font-mono" : ""}`}>{value}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{detail}</p></div>;
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof GitBranch; children: React.ReactNode }) {
  return <div className="rounded-lg border border-border/60 bg-background/40 p-4"><h3 className="mb-3 flex items-center gap-2 text-sm font-medium"><Icon size={15} className="text-primary" />{title}</h3><div className="divide-y divide-border/40">{children}</div></div>;
}

function RunRow({ label: runLabel, run }: { label: string; run: Run }) {
  const ready = run?.conclusion === "success";
  const Icon = ready ? CheckCircle2 : run ? AlertTriangle : XCircle;
  return <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"><div className="min-w-0"><p className="text-xs font-medium">{runLabel}</p><p className="mt-1 break-all font-mono text-[11px] text-muted-foreground">{run ? `${shortSha(run.head_sha)} · ${run.conclusion || run.status || "unknown"}` : "No evidence"}</p></div>{run?.url ? <a href={run.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 min-w-10 items-center justify-center text-muted-foreground hover:text-primary" aria-label={`Open ${runLabel} run`}><ExternalLink size={14} /></a> : <Icon size={15} className={ready ? "text-emerald-500" : "text-destructive"} />}</div>;
}

function EvidenceRow({ label: rowLabel, value, ready, neutral = false }: { label: string; value: string; ready: boolean; neutral?: boolean }) {
  const Icon = ready ? CheckCircle2 : neutral ? AlertTriangle : XCircle;
  const tone = ready ? "text-emerald-500" : neutral ? "text-amber-500" : "text-destructive";
  return <div className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"><div><p className="text-xs font-medium">{rowLabel}</p><p className="mt-1 break-all text-[11px] leading-relaxed text-muted-foreground">{value}</p></div><Icon size={15} className={`mt-0.5 shrink-0 ${tone}`} /></div>;
}

function Notice({ tone, title, body }: { tone: "warning" | "blocked"; title: string; body: string }) {
  const blocked = tone === "blocked";
  return <div className={`rounded-lg border p-4 ${blocked ? "border-destructive/50 bg-destructive/5" : "border-amber-500/50 bg-amber-500/5"}`}><div className="flex items-start gap-3">{blocked ? <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" /> : <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />}<div><p className="text-sm font-medium">{title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p></div></div></div>;
}

function label(value: string) {
  return value.replace(/_/g, " ");
}
