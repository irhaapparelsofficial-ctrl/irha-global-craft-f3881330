import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import {
  authorizeDurableRateLimit,
  DurableRateLimitUnavailableError,
  hashRateLimitValue,
  policyForSiteVisitorAction,
} from "../_shared/durable-rate-limit.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_URL = "https://irhaapparels.com";
const MAX_BODY_BYTES = 12_000;
const COMMERCIAL_EVENTS = new Set([
  "page_view",
  "manufacturing_resource_view",
  "inquiry_cta_click",
  "whatsapp_click",
  "email_click",
  "sample_cta_click",
  "quote_cta_click",
  "rfq_start",
]);
const SOCIAL_HOSTS = ["instagram.com", "facebook.com", "fb.com", "linkedin.com", "t.co", "twitter.com", "x.com", "pinterest.com", "tumblr.com", "youtube.com"];

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function cleanText(value: unknown, max = 500) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function allowedOrigin(origin: string | null) {
  if (!origin) return SITE_URL;
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return SITE_URL;
    if (
      url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".lovable.app") ||
      url.hostname === "irha-apparels.pages.dev" ||
      url.hostname.endsWith(".irha-apparels.pages.dev")
    ) return origin;
  } catch {
    // Fall through to canonical origin.
  }
  return SITE_URL;
}

function corsHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": allowedOrigin(origin),
    "Access-Control-Allow-Headers": "authorization,apikey,content-type,x-client-info",
    "Access-Control-Allow-Methods": "POST,OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Vary": "Origin",
  };
}

function json(payload: unknown, status: number, origin: string | null, extraHeaders: Record<string, string> = {}) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders(origin), ...extraHeaders } });
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^site-[0-9a-f-]{36}$/i.test(value);
}

function cleanCountryCode(value: unknown) {
  const code = cleanText(value, 8).toUpperCase();
  return /^[A-Z]{2}$/.test(code) && !["XX", "T1"].includes(code) ? code : null;
}

function header(req: Request, names: string[]) {
  for (const name of names) {
    const value = cleanText(req.headers.get(name), 200);
    if (value) return value;
  }
  return "";
}

function countryName(code: string | null, supplied: unknown) {
  const suppliedName = cleanText(supplied, 120);
  if (suppliedName) return suppliedName;
  if (!code) return null;
  try { return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code; } catch { return code; }
}

function cleanPath(value: unknown) {
  const candidate = cleanText(value, 500).split("?")[0].split("#")[0] || "/";
  if (!candidate.startsWith("/")) return "/";
  if (candidate === "/") return "/";
  return candidate.replace(/\/{2,}/g, "/").replace(/\/$/, "") || "/";
}

function cleanHost(value: unknown) {
  const host = cleanText(value, 255).toLowerCase();
  return /^[a-z0-9.-]+$/.test(host) ? host : null;
}

function cleanAttribution(value: unknown, max = 160) {
  const cleaned = cleanText(value, max).replace(/\s+/g, " ");
  if (!cleaned || /@/.test(cleaned) || /(?:\+?\d[\d\s().-]{6,}\d)/.test(cleaned)) return null;
  return cleaned;
}

function device(value: unknown) {
  const normalized = cleanText(value, 20).toLowerCase();
  return ["mobile", "tablet", "desktop"].includes(normalized) ? normalized : "unknown";
}

function flag(code: string | null) {
  if (!code) return "";
  return String.fromCodePoint(...code.split("").map((letter) => 127397 + letter.charCodeAt(0)));
}

function isLikelyBot(userAgent: string) {
  return /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|facebookexternalhit|whatsapp|preview/i.test(userAgent);
}

function isSocialSource(source: string | null, medium: string | null) {
  if (medium === "social") return true;
  const host = (source || "").toLowerCase();
  return SOCIAL_HOSTS.some((needle) => host === needle || host.endsWith(`.${needle}`));
}

function safeEvidence(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const source = value as Record<string, unknown>;
  return {
    cta_location: cleanPath(source.cta_location),
    link_kind: cleanAttribution(source.link_kind, 40),
    link_host: cleanHost(source.link_host),
  };
}

async function dispatchNow() {
  try {
    const { error } = await service.rpc("notification_dispatch_tick");
    if (error) console.error("site-visitor immediate dispatch failed", error.message);
  } catch (error) {
    console.error("site-visitor immediate dispatch failed", error);
  }
}

async function recordCommercialEvent(
  visitorSessionId: string,
  eventName: string,
  currentPath: string,
  body: Record<string, unknown>,
  req: Request,
) {
  if (!COMMERCIAL_EVENTS.has(eventName)) throw new Error("invalid_commercial_event");
  const sessionHash = await hashRateLimitValue(SERVICE_ROLE_KEY, "measurement-session", visitorSessionId);
  const landingPath = cleanPath(body.landingPath);
  const source = cleanAttribution(body.source, 120);
  const medium = cleanAttribution(body.medium, 80);
  const campaign = cleanAttribution(body.campaign, 160);
  const content = cleanAttribution(body.content, 160);
  const term = cleanAttribution(body.term, 160);
  const referrerHost = cleanHost(body.referrerHost);
  const headerCountry = header(req, ["cf-ipcountry", "x-country-code", "x-vercel-ip-country", "cloudfront-viewer-country"]);
  const countryCode = cleanCountryCode(headerCountry) || cleanCountryCode(body.countryCode);
  const deviceType = device(body.deviceType);
  const evidence = safeEvidence(body.evidence);

  const { data: product } = await service
    .from("products")
    .select("id,reference_code,main_category,audience_group,product_type,canonical_path")
    .eq("canonical_path", currentPath)
    .eq("is_published", true)
    .eq("publish_state", "published")
    .maybeSingle();

  const rows: Record<string, unknown>[] = [];
  const add = (name: string) => rows.push({
    event_name: name,
    anonymous_session_hash: sessionHash,
    canonical_path: currentPath,
    landing_path: landingPath,
    referrer_host: referrerHost,
    source,
    medium,
    campaign,
    content,
    term,
    product_id: product?.id || null,
    reference_code: product?.reference_code || null,
    main_category: product?.main_category || null,
    audience_group: product?.audience_group || null,
    product_type: product?.product_type || null,
    country_code: countryCode,
    device_type: deviceType,
    evidence,
  });

  add(eventName);
  if (eventName === "page_view") {
    if (product?.id) add("product_view");
    else if (currentPath.startsWith("/products/")) {
      const depth = currentPath.split("/").filter(Boolean).length;
      add(depth >= 4 ? "product_type_view" : "category_view");
    }
    if (body.isLanding === true && medium === "organic") add("organic_landing");
    if (body.isLanding === true && (campaign || (medium && medium !== "none" && medium !== "organic"))) add("campaign_landing");
  }

  const { error: insertError } = await service.from("commercial_measurement_events").insert(rows);
  if (insertError) throw insertError;

  if (eventName === "page_view" && body.isLanding === true && isSocialSource(source, medium)) {
    const { error: socialError } = await service.from("social_attribution_events").insert({
      anonymous_session_hash: sessionHash,
      event_type: "landing",
      destination_path: currentPath,
      item_id: null,
      lead_source_id: null,
      lead_source_type: null,
      utm_source: source,
      utm_medium: medium,
      utm_campaign: campaign,
      utm_content: content,
      evidence: { landing_path: landingPath, referrer_host: referrerHost },
    });
    if (socialError) console.error("site-visitor social attribution insert failed", socialError.message);
  }
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(origin) });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (origin && allowedOrigin(origin) !== origin) return json({ error: "origin_not_allowed" }, 403, origin);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, origin);

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, origin);
    const body = JSON.parse(raw) as Record<string, unknown>;
    const action = cleanText(body.action, 20);
    const visitorSessionId = body.visitorSessionId;
    if (!validSessionId(visitorSessionId)) return json({ error: "invalid_visitor_session" }, 400, origin);
    const policyKey = policyForSiteVisitorAction(action);
    if (!policyKey) return json({ error: "invalid_action" }, 400, origin);

    const currentPath = cleanPath(body.currentPath);
    const eventName = action === "event" ? cleanText(body.eventName, 80) : "";
    if (action === "event" && !COMMERCIAL_EVENTS.has(eventName)) return json({ error: "invalid_event" }, 400, origin);

    let limiter;
    try {
      limiter = await authorizeDurableRateLimit({
        client: service,
        request: req,
        secret: SERVICE_ROLE_KEY,
        endpoint: "site-visitor",
        policyKey,
        clientSessionId: visitorSessionId,
        rateLimitToken: cleanText(body.rateLimitToken, 2_000) || null,
        resourceValue: { action, eventName, currentPath },
        duplicateValue: { visitorSessionId, action, eventName, currentPath },
      });
    } catch (error) {
      if (error instanceof DurableRateLimitUnavailableError) return json({ ok: true, dropped: "limiter_unavailable" }, 200, origin);
      throw error;
    }

    if (!limiter.allowed) {
      return json({ error: "too_many_requests" }, 429, origin, { "Retry-After": String(limiter.retryAfterSeconds) });
    }
    if (limiter.duplicateSuppressed) return json({ ok: true, dropped: "duplicate", rateLimitToken: limiter.rateLimitToken }, 200, origin);

    const userAgent = cleanText(req.headers.get("user-agent"), 1000);
    if (isLikelyBot(userAgent)) return json({ ok: true, ignored: "automated_client", rateLimitToken: limiter.rateLimitToken }, 200, origin);

    if (action === "event") {
      await recordCommercialEvent(visitorSessionId, eventName, currentPath, body, req);
      return json({ ok: true, rateLimitToken: limiter.rateLimitToken }, 200, origin);
    }

    const headerCountry = header(req, ["cf-ipcountry", "x-country-code", "x-vercel-ip-country", "cloudfront-viewer-country"]);
    const countryCode = cleanCountryCode(headerCountry) || cleanCountryCode(body.countryCode);
    const country = countryName(countryCode, body.country);
    const region = cleanText(header(req, ["cf-region", "x-vercel-ip-country-region"]) || body.region, 160) || null;
    const city = cleanText(header(req, ["cf-ipcity", "x-vercel-ip-city"]) || body.city, 160) || null;
    const timezone = cleanText(header(req, ["cf-timezone", "x-vercel-ip-timezone"]) || body.timezone, 100) || null;
    const language = cleanText(body.language, 40) || null;
    const entryPath = cleanPath(body.entryPath);
    const referrerHost = cleanHost(body.referrerHost);
    const deviceType = device(body.deviceType);
    const viewportWidth = Math.max(0, Math.min(20_000, Number(body.viewportWidth) || 0)) || null;
    const now = new Date().toISOString();

    const { data: existing, error: readError } = await service
      .from("site_visitors")
      .select("visitor_session_id,first_seen_at,page_view_count,alerted_at,chat_opened_at")
      .eq("visitor_session_id", visitorSessionId)
      .maybeSingle();
    if (readError) throw readError;

    const isNew = !existing;
    const payload = {
      visitor_session_id: visitorSessionId,
      country_code: countryCode,
      country,
      region,
      city,
      timezone,
      language,
      entry_path: existing?.first_seen_at ? undefined : entryPath,
      current_path: currentPath,
      referrer_host: referrerHost,
      device_type: deviceType,
      viewport_width: viewportWidth,
      user_agent: userAgent || null,
      first_seen_at: existing?.first_seen_at || now,
      last_seen_at: now,
      page_view_count: Math.max(1, Number(existing?.page_view_count || 0) + (action === "heartbeat" ? 1 : 0)),
      chat_opened_at: action === "chat_open" ? now : existing?.chat_opened_at || null,
      updated_at: now,
    };

    const sanitizedPayload = Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
    const { error: upsertError } = await service.from("site_visitors").upsert(sanitizedPayload, { onConflict: "visitor_session_id" });
    if (upsertError) throw upsertError;

    let alerted = false;
    if (action === "arrive" && (!existing || !existing.alerted_at)) {
      const location = [city, region, country || countryCode].filter(Boolean).join(", ");
      const visitorFlag = flag(countryCode);
      const bodyText = [
        `${visitorFlag ? `${visitorFlag} ` : ""}${location || "Country unavailable"}`,
        deviceType === "unknown" ? null : deviceType[0].toUpperCase() + deviceType.slice(1),
        `Opened ${entryPath}`,
        referrerHost ? `From ${referrerHost}` : "Direct visit",
      ].filter(Boolean).join(" · ");

      const { error: notificationError } = await service.from("crm_notifications").upsert({
        notification_type: "system",
        source_type: "system",
        source_id: null,
        title: "New website visitor",
        body: bodyText,
        severity: "info",
        status: "unread",
        dedupe_key: `site_visitor:${visitorSessionId}`,
        metadata: {
          channel: "site_visitor",
          event: "arrival",
          visitor_session_id: visitorSessionId,
          country_code: countryCode,
          country,
          region,
          city,
          timezone,
          language,
          entry_path: entryPath,
          current_path: currentPath,
          referrer_host: referrerHost,
          device_type: deviceType,
          geo_source: headerCountry ? "supabase_edge" : "cloudflare_page_context",
          first_seen_at: now,
        },
        read_at: null,
        archived_at: null,
        created_at: now,
        updated_at: now,
      }, { onConflict: "dedupe_key" });
      if (notificationError) throw notificationError;

      const { error: alertUpdateError } = await service.from("site_visitors")
        .update({ alerted_at: now, updated_at: now })
        .eq("visitor_session_id", visitorSessionId);
      if (alertUpdateError) throw alertUpdateError;
      alerted = true;
      await dispatchNow();
    }

    return json({ ok: true, isNew, alerted, countryCode, country, region, city, rateLimitToken: limiter.rateLimitToken }, 200, origin);
  } catch (error) {
    console.error("site-visitor error", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "visitor_presence_unavailable" }, 503, origin);
  }
});
