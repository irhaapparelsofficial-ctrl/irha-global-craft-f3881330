import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Database,
  Globe2,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  UserSearch,
  XCircle,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type HealthState = "checking" | "ready" | "partial" | "blocked";
type JsonRecord = Record<string, unknown>;

type HealthCheck = {
  id: string;
  title: string;
  state: HealthState;
  summary: string;
  detail?: string;
  evidence?: JsonRecord;
  icon: typeof Activity;
};

type FunctionHealth = JsonRecord & {
  ok?: boolean;
  error?: string;
  database_ready?: boolean;
  ready_to_generate?: boolean;
  ready_to_send?: boolean;
  discovery_ready?: boolean;
  gmail_verified?: boolean;
  ai_gateway_configured?: boolean;
  channels?: Record<string, JsonRecord>;
  note?: string;
};

const EMPTY_CHECKS: HealthCheck[] = [
  { id: "public", title: "Public site & SEO routes", state: "checking", summary: "Checking published buyer pages and sitemap.", icon: Globe2 },
  { id: "gateway", title: "Secure lead gateway", state: "checking", summary: "Checking the deployed public form Edge Function.", icon: ShieldCheck },
  { id: "crm", title: "Buyer CRM database", state: "checking", summary: "Checking workflow fields across buyer sources.", icon: Database },
  { id: "leads", title: "Lead acquisition", state: "checking", summary: "Checking research database, AI and Firecrawl readiness.", icon: UserSearch },
  { id: "outreach", title: "AI outreach & Gmail", state: "checking", summary: "Checking draft generation and real Gmail delivery readiness.", icon: Mail },
  { id: "social", title: "Social calendar", state: "checking", summary: "Checking calendar database, AI and platform delivery connections.", icon: Share2 },
  { id: "seo", title: "Multilingual SEO", state: "checking", summary: "Checking locale registry, page workflow and AI readiness.", icon: Search },
];

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function bool(value: unknown) {
  return value === true;
}

function errorText(value: unknown) {
  if (typeof value === "string") return value;
  if (isRecord(value)) {
    for (const key of ["error", "message", "details", "hint"]) {
      if (typeof value[key] === "string") return String(value[key]);
    }
  }
  return "Unknown runtime error";
}

async function invokeHealth(name: string): Promise<FunctionHealth> {
  const { data, error } = await supabase.functions.invoke(name, { body: { action: "health" } });
  if (error) throw new Error(error.message || `${name} health request failed`);
  if (!isRecord(data)) throw new Error(`${name} returned an invalid health response`);
  if (typeof data.error === "string" && data.error) throw new Error(data.error);
  return data as FunctionHealth;
}

async function publicSiteCheck(): Promise<HealthCheck> {
  const required = ["/buyer-trust", "/factory-video-call", "/resources", "/faq", "/inquiry"];
  const [home, sitemap, robots] = await Promise.all([
    fetch(`/?health=${Date.now()}`, { cache: "no-store" }),
    fetch(`/sitemap.xml?health=${Date.now()}`, { cache: "no-store" }),
    fetch(`/robots.txt?health=${Date.now()}`, { cache: "no-store" }),
  ]);
  if (!home.ok || !sitemap.ok || !robots.ok) {
    throw new Error(`HTTP status — home ${home.status}, sitemap ${sitemap.status}, robots ${robots.status}`);
  }
  const [homeText, sitemapText, robotsText] = await Promise.all([home.text(), sitemap.text(), robots.text()]);
  const missing = required.filter((path) => !sitemapText.includes(path));
  const riskyClaims = ["MOQ 50", "45-day delivery", "reply within 12 hours"].filter((claim) => homeText.toLowerCase().includes(claim.toLowerCase()));
  const robotsReady = robotsText.includes("Disallow: /admin") && robotsText.includes("Sitemap:");
  const ready = missing.length === 0 && riskyClaims.length === 0 && robotsReady;
  return {
    id: "public",
    title: "Public site & SEO routes",
    state: ready ? "ready" : "partial",
    summary: ready ? "Buyer trust routes, sitemap and crawler controls are published." : "Published site needs SEO route or claim review.",
    detail: [missing.length ? `Missing sitemap routes: ${missing.join(", ")}` : null, riskyClaims.length ? `Risky copy detected: ${riskyClaims.join(", ")}` : null, !robotsReady ? "robots.txt admin/sitemap controls incomplete" : null].filter(Boolean).join(" · ") || undefined,
    evidence: { home_status: home.status, sitemap_status: sitemap.status, robots_status: robots.status, missing_routes: missing, risky_claims: riskyClaims },
    icon: Globe2,
  };
}

async function gatewayCheck(): Promise<HealthCheck> {
  const base = String(import.meta.env.VITE_SUPABASE_URL || "").replace(/\/$/, "");
  if (!base) throw new Error("VITE_SUPABASE_URL is missing");
  const response = await fetch(`${base}/functions/v1/public-lead-gateway`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: String(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ""),
    },
    body: JSON.stringify({ action: "production_health_invalid_action", payload: {} }),
  });
  const text = await response.text();
  const ready = response.status === 400 && text.toLowerCase().includes("unsupported action");
  return {
    id: "gateway",
    title: "Secure lead gateway",
    state: ready ? "ready" : "blocked",
    summary: ready ? "Edge Function is deployed and responding with the expected validation contract." : "Secure form Edge Function did not return the expected contract.",
    detail: ready ? "Invalid-action probe only; no lead or file was created." : `HTTP ${response.status}: ${text.slice(0, 300)}`,
    evidence: { http_status: response.status, response: text.slice(0, 500), destructive_write: false },
    icon: ShieldCheck,
  };
}

async function crmCheck(): Promise<HealthCheck> {
  const results = await Promise.all([
    supabase.from("inquiries").select("id,inquiry_ref,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
    supabase.from("catalogue_leads").select("id,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
    supabase.from("b2b_leads").select("id,crm_status,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
  ]);
  const errors = results.map((result) => result.error).filter(Boolean);
  return {
    id: "crm",
    title: "Buyer CRM database",
    state: errors.length === 0 ? "ready" : "blocked",
    summary: errors.length === 0 ? "Inquiry, catalogue and imported-prospect workflow fields are readable." : "One or more Buyer CRM sources are missing required fields or permissions.",
    detail: errors.length ? errors.map(errorText).join(" · ") : "Status, priority, assignee, follow-up, sample, quotation, PI and timeline fields verified.",
    evidence: { sources_checked: ["inquiries", "catalogue_leads", "b2b_leads"], error_count: errors.length },
    icon: Database,
  };
}

function leadAcquisitionCheck(data: FunctionHealth): HealthCheck {
  const ready = bool(data.discovery_ready);
  const partial = bool(data.database_ready) && bool(data.ai_gateway_configured);
  return {
    id: "leads",
    title: "Lead acquisition",
    state: ready ? "ready" : partial ? "partial" : "blocked",
    summary: ready ? "Public-web discovery, AI classification and CRM import runtime are ready." : partial ? "Core database and AI are ready, but a discovery dependency is missing or unverified." : "Lead acquisition database or AI runtime is not ready.",
    detail: typeof data.note === "string" ? data.note : undefined,
    evidence: data,
    icon: UserSearch,
  };
}

function outreachCheck(data: FunctionHealth): HealthCheck {
  const sendReady = bool(data.ready_to_send) && bool(data.gmail_verified);
  const draftReady = bool(data.ready_to_generate);
  return {
    id: "outreach",
    title: "AI outreach & Gmail",
    state: sendReady ? "ready" : draftReady ? "partial" : "blocked",
    summary: sendReady ? "AI drafts and authenticated Gmail delivery are ready." : draftReady ? "AI draft generation is ready; Gmail identity/delivery still needs verification." : "Outreach database or AI runtime is not ready.",
    detail: typeof data.gmail_error === "string" ? data.gmail_error : typeof data.note === "string" ? data.note : undefined,
    evidence: data,
    icon: Mail,
  };
}

function socialCheck(data: FunctionHealth): HealthCheck {
  const channels = isRecord(data.channels) ? data.channels : {};
  const publishCapable = Object.entries(channels).filter(([, value]) => isRecord(value) && value.publish_capable === true).map(([key]) => key);
  const generateReady = bool(data.ready_to_generate);
  return {
    id: "social",
    title: "Social calendar",
    state: generateReady && publishCapable.length > 0 ? "ready" : generateReady ? "partial" : "blocked",
    summary: generateReady && publishCapable.length > 0 ? `AI calendar ready; verified delivery available for ${publishCapable.join(", ")}.` : generateReady ? "AI calendar is ready, but no platform is currently verified as publish-capable." : "Social calendar database or AI runtime is not ready.",
    detail: isRecord(data.scheduling) && typeof data.scheduling.note === "string" ? data.scheduling.note : undefined,
    evidence: data,
    icon: Share2,
  };
}

function seoCheck(data: FunctionHealth): HealthCheck {
  const ready = bool(data.ready_to_generate);
  const published = Number(data.published_page_count || 0);
  const active = Number(data.active_locale_count || 0);
  return {
    id: "seo",
    title: "Multilingual SEO",
    state: ready ? "ready" : "blocked",
    summary: ready ? `${active} active locale${active === 1 ? "" : "s"}; ${published} reviewed page${published === 1 ? "" : "s"} published.` : "Localized SEO database or AI runtime is not ready.",
    detail: typeof data.note === "string" ? data.note : undefined,
    evidence: data,
    icon: Search,
  };
}

export default function ProductionHealthPanel() {
  const [checks, setChecks] = useState<HealthCheck[]>(EMPTY_CHECKS);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setChecks(EMPTY_CHECKS);

    const tasks: Array<Promise<HealthCheck>> = [
      publicSiteCheck(),
      gatewayCheck(),
      crmCheck(),
      invokeHealth("lead-research").then(leadAcquisitionCheck),
      invokeHealth("outreach-engine").then(outreachCheck),
      invokeHealth("social-calendar").then(socialCheck),
      invokeHealth("multilingual-seo").then(seoCheck),
    ];

    const settled = await Promise.allSettled(tasks);
    const next = settled.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const base = EMPTY_CHECKS[index];
      return {
        ...base,
        state: "blocked" as const,
        summary: "Runtime check failed.",
        detail: result.reason instanceof Error ? result.reason.message : String(result.reason),
      };
    });

    setChecks(next);
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void run(); }, [run]);

  const totals = useMemo(() => ({
    ready: checks.filter((check) => check.state === "ready").length,
    partial: checks.filter((check) => check.state === "partial").length,
    blocked: checks.filter((check) => check.state === "blocked").length,
  }), [checks]);

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-6 md:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.28em] text-gold mb-3"><Activity size={15} /> Production Health Center</div>
            <h2 className="font-display text-3xl md:text-4xl">Exact runtime status, not configuration guesses.</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">
              Read-only checks verify the published site, secure lead gateway, Buyer CRM and each automation engine. A green result means this specific runtime contract responded successfully; it does not claim future delivery outcomes.
            </p>
          </div>
          <button type="button" onClick={() => void run()} disabled={loading} className="inline-flex items-center gap-2 border border-gold/60 text-gold px-4 py-2.5 text-[10px] uppercase tracking-[0.2em] hover:bg-gold hover:text-background disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Run checks
          </button>
        </div>
      </section>

      <div className="grid grid-cols-3 gap-3">
        <Metric label="Ready" value={totals.ready} tone="ready" />
        <Metric label="Partial" value={totals.partial} tone="partial" />
        <Metric label="Blocked" value={totals.blocked} tone="blocked" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {checks.map((check) => <HealthCard key={check.id} check={check} />)}
      </div>

      <div className="border border-border/60 bg-card/25 px-4 py-3 text-xs text-foreground/55 flex items-center justify-between gap-4 flex-wrap">
        <span>No buyer lead, email, post, localized page or file is created by these checks.</span>
        <span>{lastChecked ? `Last checked ${lastChecked.toLocaleString()}` : "Checks have not completed yet."}</span>
      </div>
    </div>
  );
}

function HealthCard({ check }: { check: HealthCheck }) {
  const Icon = check.icon;
  const state = {
    checking: { label: "Checking", classes: "border-border/60 text-muted-foreground", icon: Loader2 },
    ready: { label: "Ready", classes: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 },
    partial: { label: "Partial", classes: "border-amber-500/40 text-amber-300 bg-amber-500/10", icon: AlertTriangle },
    blocked: { label: "Blocked", classes: "border-red-500/40 text-red-300 bg-red-500/10", icon: XCircle },
  }[check.state];
  const StateIcon = state.icon;
  return (
    <article className="border border-border/60 bg-card/30 p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="border border-border/60 p-2.5 text-gold"><Icon size={18} /></div>
          <div className="min-w-0">
            <h3 className="font-display text-xl">{check.title}</h3>
            <p className="text-sm text-foreground/68 mt-2 leading-relaxed">{check.summary}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] uppercase tracking-[0.14em] shrink-0 ${state.classes}`}>
          <StateIcon size={11} className={check.state === "checking" ? "animate-spin" : ""} /> {state.label}
        </span>
      </div>
      {check.detail && <p className="text-xs text-foreground/50 mt-4 leading-relaxed break-words">{check.detail}</p>}
      {check.evidence && (
        <details className="mt-4 border-t border-border/40 pt-3">
          <summary className="cursor-pointer text-[9px] uppercase tracking-[0.18em] text-gold/80">Technical evidence</summary>
          <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-border/50 bg-background/40 p-3 text-[10px] text-foreground/60">{JSON.stringify(check.evidence, null, 2)}</pre>
        </details>
      )}
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "ready" | "partial" | "blocked" }) {
  const classes = tone === "ready" ? "text-emerald-300" : tone === "partial" ? "text-amber-300" : "text-red-300";
  return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.18em] text-muted-foreground">{label}</p><p className={`font-display text-3xl mt-1 ${classes}`}>{value}</p></div>;
}
