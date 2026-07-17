// Secure typing-presence gateway for website human live chat.
// Public callers authenticate with the existing high-entropy per-session token.
// Only the live-chat composer preview is accepted; no other page input is read.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://irhaapparels.com";
const MAX_BODY_BYTES = 8_000;
const MAX_DRAFT_CHARS = 1_000;
const TYPING_FRESH_MS = 8_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 180;

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
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...securityHeaders,
  };
}

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
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

const ipHits = new Map<string, { count: number; reset: number }>();
function rateLimited(ip: string) {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.reset <= now) {
    ipHits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").slice(0, max) : "";
}

function validSessionId(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9:_-]{8,100}$/.test(value);
}

function validToken(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z0-9._~-]{32,200}$/.test(value);
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

async function authenticateSession(sessionId: string, visitorToken: string) {
  const { data, error } = await service()
    .from("chat_sessions")
    .select("session_id,visitor_token_hash,status,admin_typing_at,visitor_typing_at")
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

function fresh(value: string | null) {
  return Boolean(value && Date.now() - new Date(value).getTime() <= TYPING_FRESH_MS);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403, headers);

  const ip = req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) return json({ error: "too_many_requests" }, 429, headers);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413, headers);
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, headers);
    const body = JSON.parse(raw) as Record<string, unknown>;
    const action = cleanText(body.action, 32).trim();
    const sessionId = body.sessionId;
    const visitorToken = body.visitorToken;

    if (!validSessionId(sessionId) || !validToken(visitorToken)) {
      return json({ error: "invalid_session_credentials" }, 400, headers);
    }

    const authenticated = await authenticateSession(sessionId, visitorToken);
    if (!authenticated.ok) {
      const status = authenticated.reason === "not_found" ? 404 : 403;
      return json({ error: authenticated.reason === "not_found" ? "session_not_found" : "invalid_session_token" }, status, headers);
    }

    if (action === "poll") {
      const adminIsTyping = authenticated.session.status !== "closed" && fresh(authenticated.session.admin_typing_at);
      return json({
        ok: true,
        adminIsTyping,
        adminTypingAt: adminIsTyping ? authenticated.session.admin_typing_at : null,
        expiresInMs: TYPING_FRESH_MS,
      }, 200, headers);
    }

    if (action === "visitor_typing" || action === "visitor_clear") {
      if (authenticated.session.status === "closed") {
        return json({ error: "conversation_closed" }, 409, headers);
      }

      const draftPreview = cleanText(body.draftPreview, MAX_DRAFT_CHARS);
      const isTyping = action === "visitor_typing" && body.isTyping === true && draftPreview.trim().length > 0;
      const now = new Date().toISOString();
      const { error } = await service().from("chat_sessions").update({
        visitor_typing_preview: isTyping ? draftPreview : null,
        visitor_typing_at: isTyping ? now : null,
        last_seen_at: now,
        updated_at: now,
      }).eq("session_id", sessionId);
      if (error) throw error;

      return json({ ok: true, isTyping, expiresInMs: TYPING_FRESH_MS }, 200, headers);
    }

    return json({ error: "invalid_action" }, 400, headers);
  } catch (error) {
    console.error("live-chat-typing error", error);
    return json({ error: "typing_service_unavailable" }, 503, headers);
  }
});
