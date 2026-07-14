// Secure public gateway for human website live chat.
// Public callers authenticate with a random per-session visitor token; only its
// SHA-256 hash is stored. Admin replies are written directly under admin RLS.
import { createClient } from "npm:@supabase/supabase-js@2";

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

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...headers,
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
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

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 90;
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
    .select("session_id, visitor_token_hash, status")
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
    const action = cleanText(body.action, 20);
    const sessionId = body.sessionId;
    const visitorToken = body.visitorToken;

    if (!validSessionId(sessionId) || !validToken(visitorToken)) {
      return json({ error: "invalid_session_credentials" }, 400, headers);
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
          human_requested_at: now,
          last_message_at: now,
          updated_at: now,
        });
        if (error) throw error;
      } else {
        const updates: Record<string, unknown> = {
          visitor_name: visitorName,
          visitor_company: visitorCompany,
          visitor_email: visitorEmail,
          updated_at: now,
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
        const clientMessageId = cleanText(body.clientMessageId, 100) || null;
        await insertVisitorMessage(sessionId, message, clientMessageId);
        const { error } = await service().from("chat_sessions").update({
          status: "waiting",
          last_message_at: now,
          last_user_message_at: now,
          updated_at: now,
          closed_at: null,
        }).eq("session_id", sessionId);
        if (error) throw error;
      }

      const messages = await readConversation(sessionId);
      return json({ ok: true, status: "waiting", messages }, 200, headers);
    }

    const authenticated = await authenticateSession(sessionId, visitorToken);
    if (!authenticated.ok) {
      return json({ error: authenticated.reason === "not_found" ? "session_not_found" : "invalid_session_token" }, authenticated.reason === "not_found" ? 404 : 403, headers);
    }

    if (action === "poll") {
      const messages = await readConversation(sessionId);
      return json({ ok: true, status: authenticated.session.status, messages }, 200, headers);
    }

    if (action === "send") {
      if (authenticated.session.status === "closed") {
        return json({ error: "conversation_closed" }, 409, headers);
      }
      const message = cleanText(body.message, MAX_MESSAGE_CHARS);
      if (!message) return json({ error: "message_required" }, 400, headers);
      const clientMessageId = cleanText(body.clientMessageId, 100) || null;
      await insertVisitorMessage(sessionId, message, clientMessageId);
      const now = new Date().toISOString();
      const { error } = await service().from("chat_sessions").update({
        status: "waiting",
        last_message_at: now,
        last_user_message_at: now,
        updated_at: now,
      }).eq("session_id", sessionId);
      if (error) throw error;
      const messages = await readConversation(sessionId);
      return json({ ok: true, status: "waiting", messages }, 200, headers);
    }

    return json({ error: "invalid_action" }, 400, headers);
  } catch (error) {
    console.error("live-chat error", error);
    return json({ error: "live_chat_unavailable" }, 503, headers);
  }
});
