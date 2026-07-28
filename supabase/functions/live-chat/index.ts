// Secure public gateway for human website live chat.
// Public callers authenticate with a random per-session visitor token; only its
// SHA-256 hash is stored. Admin replies are written directly under admin RLS.
// Coarse edge location is retained for owner context. Raw visitor IP addresses
// and forwarding headers are not used as rate-limit identity and are never persisted.
import { createClient } from "npm:@supabase/supabase-js@2";
import {
  authorizeDurableRateLimit,
  DurableRateLimitUnavailableError,
  policyForLiveChatAction,
  type RateLimitRpcClient,
} from "../_shared/durable-rate-limit.ts";

const SITE_URL = "https://irhaapparels.com";
const MAX_BODY_BYTES = 16_000;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_PROFILE_CHARS = 160;
const POLL_MESSAGE_LIMIT = 200;

const securityHeaders = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
};

function isAllowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    return url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...securityHeaders,
  };
}

function json(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string>,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders,
    },
  });
}

let serviceClient: ReturnType<typeof createClient> | null = null;
function service() {
  if (!serviceClient) {
    serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return serviceClient;
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{8,100}$/.test(value);
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{32,200}$/.test(value);
}

function cleanText(value: unknown, max = MAX_PROFILE_CHARS) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanEmail(value: unknown) {
  const email = cleanText(value, 254).toLowerCase();
  if (!email) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

// Sanitize an optional WhatsApp/phone. Allowed characters: +, digits, spaces,
// parentheses, hyphen, dot. Max 50 chars. Returns { ok, value } — value is
// null when the field was omitted/empty.
function cleanPhone(value: unknown): { ok: boolean; value: string | null } {
  if (value === null || value === undefined) return { ok: true, value: null };
  if (typeof value !== "string") return { ok: false, value: null };
  const trimmed = value.trim();
  if (!trimmed) return { ok: true, value: null };
  if (trimmed.length > 50) return { ok: false, value: null };
  if (!/^[+0-9()\-.\s]{3,50}$/.test(trimmed)) return { ok: false, value: null };
  if (!/[0-9]/.test(trimmed)) return { ok: false, value: null };
  return { ok: true, value: trimmed };
}

function cleanRequirement(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, 500);
  return trimmed || null;
}

function cleanCountryCode(value: unknown) {
  const code = cleanText(value, 8).toUpperCase();
  return /^[A-Z]{2}$/.test(code) && code !== "XX" ? code : null;
}

function firstHeader(req: Request, names: string[]) {
  for (const name of names) {
    const value = cleanText(req.headers.get(name));
    if (value) return value;
  }
  return "";
}

function countryName(code: string | null, supplied: unknown) {
  const suppliedName = cleanText(supplied, 120);
  if (suppliedName) return suppliedName;
  if (!code) return null;
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
}

function cleanPath(value: unknown) {
  const path = cleanText(value, 500);
  if (!path || !path.startsWith("/")) return null;
  return path;
}

function referrerHost(value: unknown) {
  const referrer = cleanText(value, 1_000);
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.slice(0, 255) || null;
  } catch {
    return null;
  }
}

type GeoContext = {
  countryCode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  timezone: string | null;
  language: string | null;
  entryPath: string | null;
  referrerHost: string | null;
  source: string;
};

function readGeoContext(req: Request, body: Record<string, unknown>): GeoContext {
  const headerCountry = firstHeader(req, [
    "cf-ipcountry",
    "x-country-code",
    "x-vercel-ip-country",
    "cloudfront-viewer-country",
  ]);
  const countryCode = cleanCountryCode(headerCountry) || cleanCountryCode(body.visitorCountryCode);
  const headerRegion = firstHeader(req, ["cf-region", "x-vercel-ip-country-region"]);
  const headerCity = firstHeader(req, ["cf-ipcity", "x-vercel-ip-city"]);
  const headerTimezone = firstHeader(req, ["cf-timezone", "x-vercel-ip-timezone"]);

  return {
    countryCode,
    country: countryName(countryCode, body.visitorCountry),
    region: cleanText(headerRegion || body.visitorRegion, 160) || null,
    city: cleanText(headerCity || body.visitorCity, 160) || null,
    timezone: cleanText(headerTimezone || body.visitorTimezone, 100) || null,
    language: cleanText(body.visitorLanguage, 40) || null,
    entryPath: cleanPath(body.entryPath),
    referrerHost: referrerHost(body.referrer),
    source: headerCountry || headerRegion || headerCity ? "supabase-edge" : "cloudflare-page-context",
  };
}

function geoUpdates(geo: GeoContext) {
  const values: Record<string, unknown> = {
    visitor_country_code: geo.countryCode,
    visitor_country: geo.country,
    visitor_region: geo.region,
    visitor_city: geo.city,
    visitor_timezone: geo.timezone,
    visitor_language: geo.language,
    entry_path: geo.entryPath,
    referrer_host: geo.referrerHost,
  };
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== null && value !== ""));
}

function locationLabel(geo: GeoContext) {
  const parts = [geo.city, geo.region, geo.country || geo.countryCode]
    .filter((value): value is string => Boolean(value));
  return Array.from(new Set(parts)).join(", ");
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function authenticateSession(sessionId: string, visitorToken: string) {
  const { data, error } = await service()
    .from("chat_sessions")
    .select("session_id, visitor_token_hash, status, presence_alerted_at")
    .eq("session_id", sessionId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return { ok: false as const, reason: "not_found" as const };
  const suppliedHash = await sha256(visitorToken);
  if (!constantTimeEqual(data.visitor_token_hash, suppliedHash)) {
    return { ok: false as const, reason: "invalid_token" as const };
  }
  return { ok: true as const, session: data };
}

async function insertVisitorMessage(sessionId: string, message: string, clientMessageId: string | null) {
  const payload = {
    session_id: sessionId,
    role: "user",
    message: message.slice(0, MAX_MESSAGE_CHARS),
    channel: "human",
    client_message_id: clientMessageId,
  };

  const { error } = await service().from("chat_messages").insert(payload);
  if (error && error.code !== "23505") throw error;
}

async function readConversation(sessionId: string) {
  const { data, error } = await service()
    .from("chat_messages")
    .select("id, role, message, created_at, client_message_id")
    .eq("session_id", sessionId)
    .eq("channel", "human")
    .order("created_at", { ascending: true })
    .limit(POLL_MESSAGE_LIMIT);
  if (error) throw error;
  return data ?? [];
}

async function alertOwnerOfPresence(sessionId: string, geo: GeoContext, now: string) {
  const location = locationLabel(geo);
  const route = geo.entryPath ? `Page ${geo.entryPath}` : "Website live chat";
  const body = location
    ? `${location} · ${route}`
    : `Website visitor · ${route}`;

  const { error } = await service().from("crm_notifications").upsert({
    notification_type: "system",
    source_type: "system",
    source_id: null,
    title: "Visitor opened Live Chat",
    body,
    severity: "attention",
    status: "unread",
    dedupe_key: `live_chat:${sessionId}`,
    metadata: {
      session_id: sessionId,
      channel: "human_live_chat",
      event: "presence",
      presence_event_id: sessionId,
      country_code: geo.countryCode,
      country: geo.country,
      region: geo.region,
      city: geo.city,
      timezone: geo.timezone,
      entry_path: geo.entryPath,
      referrer_host: geo.referrerHost,
      geo_source: geo.source,
      presence_seen_at: now,
    },
    read_at: null,
    archived_at: null,
    created_at: now,
    updated_at: now,
  }, { onConflict: "dedupe_key" });
  if (error) throw error;
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403, headers);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413, headers);
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, headers);

    const body = JSON.parse(raw) as Record<string, unknown>;
    const action = cleanText(body.action, 20);
    const sessionId = body.sessionId;
    const visitorToken = body.visitorToken;

    if (!validSessionId(sessionId) || !validToken(visitorToken)) {
      return json({ error: "invalid_session_credentials" }, 400, headers);
    }

    const policyKey = policyForLiveChatAction(action);
    if (!policyKey) return json({ error: "invalid_action" }, 400, headers);
    const clientMessageId = cleanText(body.clientMessageId, 100) || null;
    const normalizedMessage = cleanText(body.message, MAX_MESSAGE_CHARS);
    const duplicateValue = action === "poll"
      ? null
      : action === "presence"
      ? { action, sessionId }
      : clientMessageId || {
        action,
        sessionId,
        message: normalizedMessage,
        visitorName: cleanText(body.visitorName),
        visitorCompany: cleanText(body.visitorCompany),
        visitorEmail: cleanText(body.visitorEmail, 254).toLowerCase(),
      };

    let limiter;
    try {
      limiter = await authorizeDurableRateLimit({
        client: service() as unknown as RateLimitRpcClient,
        request: req,
        secret: Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        endpoint: "live-chat",
        policyKey,
        clientSessionId: sessionId,
        rateLimitToken: cleanText(body.rateLimitToken, 2_000) || null,
        secondarySubjectValue: visitorToken,
        resourceValue: { action, sessionId },
        duplicateValue,
      });
    } catch (error) {
      if (error instanceof DurableRateLimitUnavailableError) {
        return json({ error: "live_chat_unavailable" }, 503, headers);
      }
      throw error;
    }

    if (!limiter.allowed) {
      return json(
        { error: "too_many_requests" },
        429,
        headers,
        { "Retry-After": String(limiter.retryAfterSeconds) },
      );
    }

    if (limiter.duplicateSuppressed) {
      if (action === "presence") {
        return json({ ok: true, presenceRecorded: true, duplicateSuppressed: true, rateLimitToken: limiter.rateLimitToken }, 200, headers);
      }
      const duplicateSession = await authenticateSession(sessionId, visitorToken);
      if (!duplicateSession.ok) {
        return json({ error: duplicateSession.reason === "not_found" ? "session_not_found" : "invalid_session_token" }, duplicateSession.reason === "not_found" ? 404 : 403, headers);
      }
      const messages = await readConversation(sessionId);
      return json({
        ok: true,
        status: duplicateSession.session.status,
        messages,
        duplicateSuppressed: true,
        rateLimitToken: limiter.rateLimitToken,
      }, 200, headers);
    }

    const geo = readGeoContext(req, body);

    if (action === "presence") {
      const tokenHash = await sha256(visitorToken);
      let existing = await authenticateSession(sessionId, visitorToken);
      const now = new Date().toISOString();

      if (!existing.ok && existing.reason === "invalid_token") {
        return json({ error: "invalid_session_token" }, 403, headers);
      }

      let shouldAlert = false;
      let sessionStatus: "waiting" | "active" | "closed" = "waiting";

      if (!existing.ok) {
        const { error } = await service().from("chat_sessions").insert({
          session_id: sessionId,
          visitor_token_hash: tokenHash,
          status: "waiting",
          human_requested_at: now,
          last_message_at: now,
          first_seen_at: now,
          last_seen_at: now,
          updated_at: now,
          ...geoUpdates(geo),
        });

        if (error?.code === "23505") {
          existing = await authenticateSession(sessionId, visitorToken);
          if (!existing.ok) return json({ error: "invalid_session_token" }, 403, headers);
        } else if (error) {
          throw error;
        } else {
          shouldAlert = true;
        }
      }

      if (existing.ok) {
        sessionStatus = existing.session.status;
        shouldAlert = !existing.session.presence_alerted_at;
        const { error } = await service().from("chat_sessions").update({
          last_seen_at: now,
          updated_at: now,
          ...geoUpdates(geo),
        }).eq("session_id", sessionId);
        if (error) throw error;
      }

      if (shouldAlert) {
        await alertOwnerOfPresence(sessionId, geo, now);
        const { error } = await service().from("chat_sessions").update({
          presence_alerted_at: now,
          updated_at: now,
        }).eq("session_id", sessionId);
        if (error) throw error;
      }

      return json({ ok: true, status: sessionStatus, presenceRecorded: true, rateLimitToken: limiter.rateLimitToken }, 200, headers);
    }

    if (action === "connect") {
      const tokenHash = await sha256(visitorToken);
      const existing = await authenticateSession(sessionId, visitorToken);
      const now = new Date().toISOString();
      const visitorName = cleanText(body.visitorName) || null;
      const visitorCompany = cleanText(body.visitorCompany) || null;
      const suppliedEmail = cleanText(body.visitorEmail, 254);
      const visitorEmail = cleanEmail(body.visitorEmail);
      if (suppliedEmail && !visitorEmail) return json({ error: "invalid_email" }, 400, headers);
      const phone = cleanPhone(body.visitorWhatsApp);
      if (!phone.ok) return json({ error: "invalid_phone" }, 400, headers);
      const visitorWhatsapp = phone.value;
      const visitorRequirement = cleanRequirement(body.visitorRequirement);

      if (!existing.ok && existing.reason === "invalid_token") {
        return json({ error: "invalid_session_token" }, 403, headers);
      }

      if (!existing.ok) {
        const { error } = await service().from("chat_sessions").insert({
          session_id: sessionId,
          visitor_token_hash: tokenHash,
          status: "waiting",
          visitor_name: visitorName,
          visitor_company: visitorCompany,
          visitor_email: visitorEmail,
          visitor_whatsapp: visitorWhatsapp,
          visitor_requirement: visitorRequirement,
          human_requested_at: now,
          last_message_at: now,
          first_seen_at: now,
          last_seen_at: now,
          updated_at: now,
          ...geoUpdates(geo),
        });
        if (error) throw error;
      } else {
        const updates: Record<string, unknown> = {
          visitor_name: visitorName,
          visitor_company: visitorCompany,
          visitor_email: visitorEmail,
          visitor_whatsapp: visitorWhatsapp,
          visitor_requirement: visitorRequirement,
          last_seen_at: now,
          updated_at: now,
          ...geoUpdates(geo),
        };
        if (existing.session.status === "closed") {
          updates.status = "waiting";
          updates.closed_at = null;
          updates.human_requested_at = now;
        }
        const { error } = await service().from("chat_sessions").update(updates).eq("session_id", sessionId);
        if (error) throw error;
      }

      const message = cleanText(body.message, MAX_MESSAGE_CHARS);
      if (message) {
        await insertVisitorMessage(sessionId, message, clientMessageId);
        const { error } = await service().from("chat_sessions").update({
          status: "waiting",
          last_message_at: now,
          last_user_message_at: now,
          last_seen_at: now,
          updated_at: now,
          closed_at: null,
        }).eq("session_id", sessionId);
        if (error) throw error;
      }

      const messages = await readConversation(sessionId);
      return json({ ok: true, status: "waiting", messages, rateLimitToken: limiter.rateLimitToken }, 200, headers);
    }

    const authenticated = await authenticateSession(sessionId, visitorToken);
    if (!authenticated.ok) {
      return json({ error: authenticated.reason === "not_found" ? "session_not_found" : "invalid_session_token" }, authenticated.reason === "not_found" ? 404 : 403, headers);
    }

    if (action === "poll") {
      const messages = await readConversation(sessionId);
      return json({ ok: true, status: authenticated.session.status, messages, rateLimitToken: limiter.rateLimitToken }, 200, headers);
    }

    if (action === "send") {
      if (authenticated.session.status === "closed") {
        return json({ error: "conversation_closed" }, 409, headers);
      }
      const message = cleanText(body.message, MAX_MESSAGE_CHARS);
      if (!message) return json({ error: "message_required" }, 400, headers);
      await insertVisitorMessage(sessionId, message, clientMessageId);
      const now = new Date().toISOString();
      const { error } = await service().from("chat_sessions").update({
        status: "waiting",
        last_message_at: now,
        last_user_message_at: now,
        last_seen_at: now,
        updated_at: now,
      }).eq("session_id", sessionId);
      if (error) throw error;
      const messages = await readConversation(sessionId);
      return json({ ok: true, status: "waiting", messages, rateLimitToken: limiter.rateLimitToken }, 200, headers);
    }

    return json({ error: "invalid_action" }, 400, headers);
  } catch (error) {
    console.error("live-chat error", error instanceof Error ? error.message : "unknown_error");
    return json({ error: "live_chat_unavailable" }, 503, headers);
  }
});
