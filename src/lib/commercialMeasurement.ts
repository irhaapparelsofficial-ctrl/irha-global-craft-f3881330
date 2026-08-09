import { supabasePublishableKey, supabaseRuntimeUrl } from "@/integrations/supabase/client";

export const VISITOR_SESSION_KEY = "irha:site-visitor-session";
export const VISITOR_RATE_TOKEN_KEY = "irha:site-visitor-rate-token";
const ATTRIBUTION_KEY = "irha:measurement-attribution-v1";
const CONSENT_KEY = "irha_cookie_consent_v1";

export type CommercialEventName =
  | "page_view"
  | "manufacturing_resource_view"
  | "inquiry_cta_click"
  | "whatsapp_click"
  | "email_click"
  | "sample_cta_click"
  | "quote_cta_click"
  | "rfq_start"
  | "rfq_submit"
  | "general_inquiry_submit"
  | "product_inquiry_submit";

type Attribution = {
  source: string;
  medium: string;
  campaign: string | null;
  content: string | null;
  term: string | null;
  landingPath: string;
  referrerHost: string | null;
};

const SEARCH_HOSTS = ["google.", "bing.com", "duckduckgo.com", "yahoo.", "ecosia.org", "yandex."];
const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "fb.com", "linkedin.com", "t.co", "twitter.com", "x.com", "pinterest.com", "tumblr.com", "youtube.com"];

export function normalizeCanonicalPath(value: string): string {
  const raw = (value || "/").split("?")[0].split("#")[0];
  if (!raw || raw === "/") return "/";
  const normalized = raw.replace(/\/{2,}/g, "/").replace(/\/$/, "");
  return normalized.startsWith("/") ? normalized : `/${normalized}`;
}

export function sanitizeAttributionValue(value: string | null | undefined, max = 160): string | null {
  const cleaned = (value || "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
  if (!cleaned) return null;
  if (/@/.test(cleaned)) return null;
  if (/(?:\+?\d[\d\s().-]{6,}\d)/.test(cleaned)) return null;
  return cleaned;
}

export function classifyAcquisition(referrerHost: string | null, utmSource: string | null, utmMedium: string | null) {
  if (utmSource || utmMedium) {
    return {
      source: sanitizeAttributionValue(utmSource, 120) || "campaign",
      medium: sanitizeAttributionValue(utmMedium, 80) || "campaign",
    };
  }
  const host = (referrerHost || "").toLowerCase();
  if (!host) return { source: "direct", medium: "none" };
  if (SEARCH_HOSTS.some((needle) => host.includes(needle))) return { source: host, medium: "organic" };
  if (SOCIAL_HOSTS.some((needle) => host === needle || host.endsWith(`.${needle}`))) return { source: host, medium: "social" };
  return { source: host, medium: "referral" };
}

export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = localStorage.getItem(CONSENT_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { categories?: { analytics?: boolean } };
    return parsed.categories?.analytics === true;
  } catch {
    return false;
  }
}

function sessionId() {
  try {
    const existing = sessionStorage.getItem(VISITOR_SESSION_KEY);
    if (existing) return existing;
    const created = `site-${crypto.randomUUID()}`;
    sessionStorage.setItem(VISITOR_SESSION_KEY, created);
    return created;
  } catch {
    return `site-${crypto.randomUUID()}`;
  }
}

function referrerHost() {
  if (typeof document === "undefined" || !document.referrer) return null;
  try { return new URL(document.referrer).hostname.toLowerCase() || null; } catch { return null; }
}

function readRateToken() {
  try { return sessionStorage.getItem(VISITOR_RATE_TOKEN_KEY); } catch { return null; }
}

function writeRateToken(value: unknown) {
  if (typeof value !== "string" || value.length > 2_000) return;
  try { sessionStorage.setItem(VISITOR_RATE_TOKEN_KEY, value); } catch { /* non-fatal */ }
}

function readOrCreateAttribution(): Attribution {
  try {
    const existing = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (existing) {
      const parsed = JSON.parse(existing) as Partial<Attribution>;
      if (typeof parsed.source === "string" && typeof parsed.medium === "string" && typeof parsed.landingPath === "string") {
        return {
          source: parsed.source.slice(0, 120),
          medium: parsed.medium.slice(0, 80),
          campaign: sanitizeAttributionValue(parsed.campaign, 160),
          content: sanitizeAttributionValue(parsed.content, 160),
          term: sanitizeAttributionValue(parsed.term, 160),
          landingPath: normalizeCanonicalPath(parsed.landingPath),
          referrerHost: sanitizeAttributionValue(parsed.referrerHost, 255),
        };
      }
    }
  } catch {
    // Rebuild a bounded first-touch record below.
  }

  const params = new URLSearchParams(typeof window === "undefined" ? "" : window.location.search);
  const host = referrerHost();
  const utmSource = sanitizeAttributionValue(params.get("utm_source"), 120);
  const utmMedium = sanitizeAttributionValue(params.get("utm_medium"), 80);
  const classified = classifyAcquisition(host, utmSource, utmMedium);
  const attribution: Attribution = {
    source: classified.source,
    medium: classified.medium,
    campaign: sanitizeAttributionValue(params.get("utm_campaign"), 160),
    content: sanitizeAttributionValue(params.get("utm_content"), 160),
    term: sanitizeAttributionValue(params.get("utm_term"), 160),
    landingPath: normalizeCanonicalPath(typeof window === "undefined" ? "/" : window.location.pathname),
    referrerHost: host,
  };
  try { sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(attribution)); } catch { /* non-fatal */ }
  return attribution;
}

export function measurementContext() {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return null;
  const attribution = readOrCreateAttribution();
  return {
    visitor_session_id: sessionId(),
    current_path: normalizeCanonicalPath(window.location.pathname),
    landing_path: attribution.landingPath,
    source: attribution.source,
    medium: attribution.medium,
    campaign: attribution.campaign,
    content: attribution.content,
    term: attribution.term,
    referrer_host: attribution.referrerHost,
  };
}

export async function trackCommercialEvent(
  eventName: CommercialEventName,
  evidence: { cta_location?: string | null; link_kind?: string | null; link_host?: string | null } = {},
): Promise<boolean> {
  if (typeof window === "undefined" || !hasAnalyticsConsent()) return false;
  const context = measurementContext();
  if (!context) return false;

  const safeEvidence = {
    cta_location: evidence.cta_location ? normalizeCanonicalPath(evidence.cta_location) : null,
    link_kind: sanitizeAttributionValue(evidence.link_kind, 40),
    link_host: sanitizeAttributionValue(evidence.link_host, 160),
  };

  try {
    const response = await fetch(`${supabaseRuntimeUrl}/functions/v1/site-visitor`, {
      method: "POST",
      keepalive: true,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${supabasePublishableKey}`,
        apikey: supabasePublishableKey,
      },
      body: JSON.stringify({
        action: "event",
        eventName,
        visitorSessionId: context.visitor_session_id,
        rateLimitToken: readRateToken(),
        currentPath: context.current_path,
        landingPath: context.landing_path,
        source: context.source,
        medium: context.medium,
        campaign: context.campaign,
        content: context.content,
        term: context.term,
        referrerHost: context.referrer_host,
        isLanding: context.current_path === context.landing_path,
        deviceType: /ipad|tablet|playbook|silk/i.test(navigator.userAgent)
          ? "tablet"
          : /mobi|android|iphone|ipod/i.test(navigator.userAgent) ? "mobile" : "desktop",
        evidence: safeEvidence,
      }),
    });
    if (!response.ok) return false;
    const body = await response.json().catch(() => ({})) as { rateLimitToken?: unknown };
    writeRateToken(body.rateLimitToken);
    return true;
  } catch {
    return false;
  }
}
