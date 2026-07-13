import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  Globe2,
  KeyRound,
  Loader2,
  Mail,
  RefreshCw,
  Search,
  Share2,
  ShieldCheck,
  UserSearch,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  supabase,
  supabaseProjectId,
  supabasePublishableKey,
  supabaseRuntimeUrl,
} from "@/integrations/supabase/client";
import {
  isDeferredBackendError,
  isExpectedGatewayProbe,
  redactRuntimeMessage,
  validateRuntimeIdentity,
} from "@/lib/runtimeSafety";

type State = "checking" | "ready" | "pending" | "partial" | "blocked";
type Json = Record<string, unknown>;
type Check = {
  id: string;
  title: string;
  state: State;
  summary: string;
  detail?: string;
  evidence?: Json;
  icon: LucideIcon;
};

const PLACEHOLDERS: Check[] = [
  { id: "runtime", title: "Backend runtime identity", state: "checking", summary: "Checking the immutable browser runtime and Auth service.", icon: Database },
  { id: "auth", title: "Owner authentication & role", state: "checking", summary: "Checking the current session and database admin role.", icon: KeyRound },
  { id: "public", title: "Public site & SEO routes", state: "checking", summary: "Checking published buyer routes and crawler controls.", icon: Globe2 },
  { id: "gateway", title: "Secure lead gateway", state: "checking", summary: "Checking the deployed public form Edge Function.", icon: ShieldCheck },
  { id: "crm", title: "Buyer CRM database", state: "checking", summary: "Checking workflow fields across all buyer sources.", icon: Database },
  { id: "leads", title: "Lead acquisition", state: "checking", summary: "Checking discovery, AI and CRM-import readiness.", icon: UserSearch },
  { id: "outreach", title: "AI outreach & Gmail", state: "checking", summary: "Checking draft generation and authenticated delivery readiness.", icon: Mail },
  { id: "social", title: "Social calendar", state: "checking", summary: "Checking calendar, AI and platform delivery readiness.", icon: Share2 },
  { id: "seo", title: "Multilingual SEO", state: "checking", summary: "Checking locale, review and publish workflow readiness.", icon: Search },
];

const DEFERRED_BACKEND_IDS = new Set(["leads", "outreach", "social", "seo"]);
const isObject = (value: unknown): value is Json => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const truthy = (value: unknown) => value === true;

const messageOf = (value: unknown) => {
  if (typeof value === "string" || value instanceof Error) return redactRuntimeMessage(value);
  if (isObject(value)) {
    for (const key of ["error", "message", "details", "hint"]) {
      if (typeof value[key] === "string") return redactRuntimeMessage(String(value[key]));
    }
  }
  return "Unknown runtime error";
};

async function invokeHealth(name: string): Promise<Json> {
  const { data, error } = await supabase.functions.invoke(name, { body: { action: "health" } });
  if (error) throw new Error(redactRuntimeMessage(error.message || `${name} health request failed`));
  if (!isObject(data)) throw new Error(`${name} returned an invalid response`);
  if (typeof data.error === "string" && data.error) throw new Error(redactRuntimeMessage(data.error));
  return data;
}

async function checkRuntime(): Promise<Check> {
  const identityErrors = validateRuntimeIdentity({ projectId: supabaseProjectId, url: supabaseRuntimeUrl });
  if (identityErrors.length) {
    return {
      id: "runtime",
      title: "Backend runtime identity",
      state: "blocked",
      summary: "The browser runtime identity is invalid or inconsistent.",
      detail: identityErrors.join(" · "),
      evidence: { project_id: supabaseProjectId, runtime_host: new URL(supabaseRuntimeUrl).hostname, secret_exposed: false },
      icon: Database,
    };
  }

  const response = await fetch(`${supabaseRuntimeUrl.replace(/\/$/, "")}/auth/v1/health`, {
    method: "GET",
    headers: { apikey: supabasePublishableKey },
    cache: "no-store",
  });
  const ready = response.ok;
  return {
    id: "runtime",
    title: "Backend runtime identity",
    state: ready ? "ready" : "blocked",
    summary: ready ? "The immutable Supabase identity and Auth service are reachable." : "The configured Auth service did not pass its health probe.",
    detail: ready ? "Runtime host matches the committed project identity; no service-role credential is used." : `Auth health returned HTTP ${response.status}.`,
    evidence: { project_id: supabaseProjectId, runtime_host: new URL(supabaseRuntimeUrl).hostname, auth_health_status: response.status, destructive_write: false },
    icon: Database,
  };
}

async function checkAuth(): Promise<Check> {
  const { data: userResult, error: userError } = await supabase.auth.getUser();
  if (userError || !userResult.user) throw new Error(userError?.message || "Owner session is missing");
  const { data: role, error: roleError } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userResult.user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (roleError) throw new Error(roleError.message);
  const ready = Boolean(role);
  return {
    id: "auth",
    title: "Owner authentication & role",
    state: ready ? "ready" : "blocked",
    summary: ready ? "The current account is authenticated and has a database-backed admin role." : "The current session is authenticated but does not have the admin role.",
    detail: ready ? "Authentication and authorization were checked separately." : "Sign out and stop; do not weaken route or Row Level Security checks.",
    evidence: { authenticated: true, admin_role: ready, role_source: "public.user_roles", destructive_write: false },
    icon: KeyRound,
  };
}

async function checkPublic(): Promise<Check> {
  const required = ["/buyer-trust", "/factory-video-call", "/resources", "/faq", "/inquiry", "/repeat-order"];
  const stamp = Date.now();
  const [home, sitemap, robots] = await Promise.all([
    fetch(`/?health=${stamp}`, { cache: "no-store" }),
    fetch(`/sitemap.xml?health=${stamp}`, { cache: "no-store" }),
    fetch(`/robots.txt?health=${stamp}`, { cache: "no-store" }),
  ]);
  if (!home.ok || !sitemap.ok || !robots.ok) throw new Error(`HTTP status — home ${home.status}, sitemap ${sitemap.status}, robots ${robots.status}`);
  const [sitemapText, robotsText] = await Promise.all([sitemap.text(), robots.text()]);
  const missing = required.filter((path) => !sitemapText.includes(path));
  const crawlerReady = robotsText.includes("Disallow: /admin") && robotsText.includes("Disallow: /auth") && robotsText.includes("Sitemap:");
  const ready = missing.length === 0 && crawlerReady;
  return {
    id: "public",
    title: "Public site & SEO routes",
    state: ready ? "ready" : "partial",
    summary: ready ? "Buyer routes, sitemap and crawler controls are published." : "A published route or crawler control needs review.",
    detail: [missing.length ? `Missing sitemap routes: ${missing.join(", ")}` : null, !crawlerReady ? "robots.txt admin/auth/sitemap controls incomplete" : null].filter(Boolean).join(" · ") || undefined,
    evidence: { home_status: home.status, sitemap_status: sitemap.status, robots_status: robots.status, missing_routes: missing },
    icon: Globe2,
  };
}

async function checkGateway(): Promise<Check> {
  const response = await fetch(`${supabaseRuntimeUrl.replace(/\/$/, "")}/functions/v1/public-lead-gateway`, {
    method: "POST",
    headers: { "Content-Type": "application/json", apikey: supabasePublishableKey },
    body: JSON.stringify({ action: "production_health_invalid_action", payload: {} }),
  });
  const raw = await response.text();
  const text = redactRuntimeMessage(raw);
  const ready = isExpectedGatewayProbe(response.status, text);
  return {
    id: "gateway",
    title: "Secure lead gateway",
    state: ready ? "ready" : "blocked",
    summary: ready ? "The deployed Edge Function returned the expected non-writing validation contract." : "The secure form gateway did not return the expected contract.",
    detail: ready ? "Invalid-action probe only; no lead or file was created." : `HTTP ${response.status}: ${text.slice(0, 300)}`,
    evidence: { http_status: response.status, response: text.slice(0, 500), destructive_write: false, runtime_project: supabaseProjectId },
    icon: ShieldCheck,
  };
}

async function checkCrm(): Promise<Check> {
  const results = await Promise.all([
    supabase.from("inquiries").select("id,inquiry_ref,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
    supabase.from("catalogue_leads").select("id,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
    supabase.from("b2b_leads").select("id,crm_status,priority,assignee,follow_up_at,quotation_url,pi_url,sample_status,crm_history").limit(1),
  ]);
  const errors = results.map((result) => result.error).filter(Boolean);
  return {
    id: "crm",
    title: "Buyer CRM database",
    state: errors.length ? "blocked" : "ready",
    summary: errors.length ? "One or more Buyer CRM sources are missing fields or permissions." : "Inquiry, catalogue and imported-prospect workflow fields are readable.",
    detail: errors.length ? errors.map(messageOf).join(" · ") : "Status, priority, assignee, follow-up, sample, quotation, PI and timeline fields verified.",
    evidence: { sources_checked: ["inquiries", "catalogue_leads", "b2b_leads"], error_count: errors.length },
    icon: Database,
  };
}

function leadCheck(data: Json): Check {
  const ready = truthy(data.discovery_ready);
  const partial = truthy(data.database_ready) && truthy(data.ai_gateway_configured);
  return { id: "leads", title: "Lead acquisition", state: ready ? "ready" : partial ? "partial" : "blocked", summary: ready ? "Public-web discovery, AI classification and CRM import are ready." : partial ? "Database and AI are ready; discovery remains missing or unverified." : "Lead acquisition database or AI runtime is not ready.", detail: typeof data.note === "string" ? redactRuntimeMessage(data.note) : undefined, evidence: data, icon: UserSearch };
}

function outreachCheck(data: Json): Check {
  const sendReady = truthy(data.ready_to_send) && truthy(data.gmail_verified);
  const draftReady = truthy(data.ready_to_generate);
  return { id: "outreach", title: "AI outreach & Gmail", state: sendReady ? "ready" : draftReady ? "partial" : "blocked", summary: sendReady ? "AI drafts and authenticated Gmail delivery are ready." : draftReady ? "AI drafting is ready; Gmail identity or delivery still needs verification." : "Outreach database or AI runtime is not ready.", detail: typeof data.gmail_error === "string" ? redactRuntimeMessage(data.gmail_error) : typeof data.note === "string" ? redactRuntimeMessage(data.note) : undefined, evidence: data, icon: Mail };
}

function socialCheck(data: Json): Check {
  const channels = isObject(data.channels) ? data.channels : {};
  const capable = Object.entries(channels).filter(([, value]) => isObject(value) && value.publish_capable === true).map(([name]) => name);
  const generateReady = truthy(data.ready_to_generate);
  return { id: "social", title: "Social calendar", state: generateReady && capable.length ? "ready" : generateReady ? "partial" : "blocked", summary: generateReady && capable.length ? `AI calendar ready; verified delivery available for ${capable.join(", ")}.` : generateReady ? "AI calendar is ready, but no platform is verified as publish-capable." : "Social calendar database or AI runtime is not ready.", detail: isObject(data.scheduling) && typeof data.scheduling.note === "string" ? redactRuntimeMessage(data.scheduling.note) : undefined, evidence: data, icon: Share2 };
}

function seoCheck(data: Json): Check {
  const ready = truthy(data.ready_to_generate);
  const active = Number(data.active_locale_count || 0);
  const published = Number(data.published_page_count || 0);
  return { id: "seo", title: "Multilingual SEO", state: ready ? "ready" : "blocked", summary: ready ? `${active} active locale${active === 1 ? "" : "s"}; ${published} reviewed page${published === 1 ? "" : "s"} published.` : "Localized SEO database or AI runtime is not ready.", detail: typeof data.note === "string" ? redactRuntimeMessage(data.note) : undefined, evidence: data, icon: Search };
}

export default function ProductionHealthPanel() {
  const [checks, setChecks] = useState<Check[]>(PLACEHOLDERS);
  const [loading, setLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const run = useCallback(async () => {
    setLoading(true);
    setChecks(PLACEHOLDERS);
    const tasks: Promise<Check>[] = [
      checkRuntime(),
      checkAuth(),
      checkPublic(),
      checkGateway(),
      checkCrm(),
      invokeHealth("lead-research").then(leadCheck),
      invokeHealth("outreach-engine").then(outreachCheck),
      invokeHealth("social-calendar").then(socialCheck),
      invokeHealth("multilingual-seo").then(seoCheck),
    ];
    const settled = await Promise.allSettled(tasks);
    setChecks(settled.map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      const placeholder = PLACEHOLDERS[index];
      const deferred = DEFERRED_BACKEND_IDS.has(placeholder.id) && isDeferredBackendError(result.reason);
      return {
        ...placeholder,
        state: deferred ? "pending" : "blocked",
        summary: deferred ? "Backend activation is intentionally deferred to the final one-time migration and deployment window." : "Runtime check failed.",
        detail: deferred ? "Frontend workflow is prepared. Required tables, functions and runtime bindings will be activated once on the permanent backend." : messageOf(result.reason),
        evidence: deferred ? { backend_activation: "deferred", destructive_write: false } : undefined,
      };
    }));
    setLastChecked(new Date());
    setLoading(false);
  }, []);

  useEffect(() => { void run(); }, [run]);

  const totals = useMemo(() => ({
    ready: checks.filter((check) => check.state === "ready").length,
    pending: checks.filter((check) => check.state === "pending").length,
    partial: checks.filter((check) => check.state === "partial").length,
    blocked: checks.filter((check) => check.state === "blocked").length,
  }), [checks]);

  return (
    <div className="space-y-6">
      <section className="border border-gold/40 bg-gradient-to-br from-gold/10 via-card/40 to-background p-5 sm:p-6 md:p-8">
        <div className="flex items-start justify-between gap-5 flex-wrap">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.24em] sm:tracking-[0.28em] text-gold mb-3"><Activity size={15} /> System Health Center</div>
            <h2 className="font-display text-3xl md:text-4xl">Exact runtime status, not configuration guesses.</h2>
            <p className="text-sm text-foreground/70 mt-3 leading-relaxed">Read-only checks verify runtime identity, owner authorization, public routes, secure lead gateway, Buyer CRM and automation engines. Pending means code is prepared while final backend activation remains deliberately postponed.</p>
          </div>
          <button type="button" onClick={() => void run()} disabled={loading} className="inline-flex min-h-11 items-center gap-2 border border-gold/60 text-gold px-4 py-2.5 text-[10px] uppercase tracking-[0.18em] sm:tracking-[0.2em] hover:bg-gold hover:text-background disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Run checks
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Metric label="Ready" value={totals.ready} tone="ready" />
        <Metric label="Pending" value={totals.pending} tone="pending" />
        <Metric label="Partial" value={totals.partial} tone="partial" />
        <Metric label="Blocked" value={totals.blocked} tone="blocked" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">{checks.map((check) => <HealthCard key={check.id} check={check} />)}</div>

      <div className="border border-border/60 bg-card/25 px-4 py-3 text-xs text-foreground/55 flex items-center justify-between gap-4 flex-wrap">
        <span>No buyer lead, email, post, localized page, payment or file is created by these checks.</span>
        <span>{lastChecked ? `Last checked ${lastChecked.toLocaleString()}` : "Checks have not completed yet."}</span>
      </div>
    </div>
  );
}

function HealthCard({ check }: { check: Check }) {
  const Icon = check.icon;
  const view = {
    checking: { label: "Checking", classes: "border-border/60 text-muted-foreground", icon: Loader2 },
    ready: { label: "Ready", classes: "border-emerald-500/40 text-emerald-300 bg-emerald-500/10", icon: CheckCircle2 },
    pending: { label: "Pending", classes: "border-sky-500/40 text-sky-300 bg-sky-500/10", icon: Clock3 },
    partial: { label: "Partial", classes: "border-amber-500/40 text-amber-300 bg-amber-500/10", icon: AlertTriangle },
    blocked: { label: "Blocked", classes: "border-red-500/40 text-red-300 bg-red-500/10", icon: XCircle },
  }[check.state];
  const StateIcon = view.icon;
  return (
    <article className="border border-border/60 bg-card/30 p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3 sm:gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="border border-border/60 p-2.5 text-gold shrink-0"><Icon size={18} /></div>
          <div className="min-w-0"><h3 className="font-display text-lg sm:text-xl">{check.title}</h3><p className="text-sm text-foreground/70 mt-2 leading-relaxed">{check.summary}</p></div>
        </div>
        <span className={`inline-flex items-center gap-1.5 border px-2 py-1 text-[9px] uppercase tracking-[0.12em] sm:tracking-[0.14em] shrink-0 ${view.classes}`}><StateIcon size={11} className={check.state === "checking" ? "animate-spin" : ""} /> {view.label}</span>
      </div>
      {check.detail && <p className="text-xs text-foreground/50 mt-4 leading-relaxed break-words">{check.detail}</p>}
      {check.evidence && <details className="mt-4 border-t border-border/40 pt-3"><summary className="cursor-pointer text-[9px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-gold/80">Technical evidence</summary><pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap break-words border border-border/50 bg-background/40 p-3 text-[10px] text-foreground/60">{JSON.stringify(check.evidence, null, 2)}</pre></details>}
    </article>
  );
}

function Metric({ label, value, tone }: { label: string; value: number; tone: "ready" | "pending" | "partial" | "blocked" }) {
  const classes = tone === "ready" ? "text-emerald-300" : tone === "pending" ? "text-sky-300" : tone === "partial" ? "text-amber-300" : "text-red-300";
  return <div className="border border-border/60 bg-card/30 p-4"><p className="text-[9px] uppercase tracking-[0.16em] sm:tracking-[0.18em] text-muted-foreground">{label}</p><p className={`font-display text-3xl mt-1 ${classes}`}>{value}</p></div>;
}
