import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://irhaapparels.com";
const MAX_BODY_BYTES = 20_000;
const MAX_MESSAGE_CHARS = 2_000;
const SESSION_PATTERN = /^[A-Za-z0-9:_-]{8,100}$/;
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{20,200}$/;

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

const hits = new Map<string, { writes: number; polls: number; reset: number }>();
function rateLimited(ip: string, action: string) {
  const now = Date.now();
  const current = hits.get(ip);
  const entry = !current || current.reset < now
    ? { writes: 0, polls: 0, reset: now + 60_000 }
    : current;

  if (action === "poll") entry.polls += 1;
  else entry.writes += 1;
  hits.set(ip, entry);

  return action === "poll" ? entry.polls > 30 : entry.writes > 10;
}

function cleanText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().replace(/\s+/g, " ").slice(0, max);
  return cleaned || null;
}

function cleanMessage(value: unknown) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, MAX_MESSAGE_CHARS);
  return cleaned || null;
}

function validEmail(value: string | null) {
  return !value || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function hashToken(token: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(token));
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

async function getSession(sessionId: string) {
  const { data, error } = await service()
    .from("live_chat_sessions")
    .select("session_id,visitor_token_hash,status,unread_visitor,visitor_name,visitor_email,visitor_whatsapp,company_name,country,page_path,page_title,last_message_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function verifySession(sessionId: string, visitorToken: string) {
  const session = await getSession(sessionId);
  if (!session) return { ok: false as const, reason: "session_not_found" };
  const tokenHash = await hashToken(visitorToken);
  if (session.visitor_token_hash !== tokenHash) return { ok: false as const, reason: "session_forbidden" };
  return { ok: true as const, session };
}

async function loadMessages(sessionId: string) {
  const { data, error } = await service()
    .from("chat_messages")
    .select("id,role,message,channel,client_message_id,created_at")
    .eq("session_id", sessionId)
    .eq("channel", "human")
    .in("role", ["user", "admin"])
    .order("created_at", { ascending: true })
    .limit(100);
  if (error) throw error;
  return data ?? [];
}

async function insertVisitorMessage(sessionId: string, message: string, clientMessageId: string | null) {
  const { error } = await service().from("chat_messages").insert({
    session_id: sessionId,
    role: "user",
    message,
    channel: "human",
    client_message_id: clientMessageId,
  });

  if (error && error.code !== "23505") throw error;
}

async function notifyAdmin(sessionId: string, name: string | null, message: string, pagePath: string | null) {
  const body = `${name || "Website visitor"}: ${message.slice(0, 220)}${pagePath ? ` · ${pagePath}` : ""}`;
  const { error } = await service().from("crm_notifications").upsert({
    notification_type: "system",
    source_type: "system",
    source_id: null,
    title: "Live chat waiting",
    body,
    severity: "attention",
    status: "unread",
    dedupe_key: `live_chat:${sessionId}`,
    metadata: { session_id: sessionId, page_path: pagePath, channel: "human_live_chat" },
    read_at: null,
    archived_at: null,
    updated_at: new Date().toISOString(),
  }, { onConflict: "dedupe_key" });
  if (error) console.error("live chat notification failed", error.message);
}

type RequestBody = {
  action?: unknown;
  sessionId?: unknown;
  visitorToken?: unknown;
  clientMessageId?: unknown;
  message?: unknown;
  visitor?: {
    name?: unknown;
    email?: unknown;
    whatsapp?: unknown;
    company?: unknown;
    country?: unknown;
  };
  context?: {
    path?: unknown;
    title?: unknown;
  };
};

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
    const body = JSON.parse(raw) as RequestBody;
    const action = body.action === "start" || body.action === "message" || body.action === "poll"
      ? body.action
      : null;
    if (!action) return json({ error: "invalid_action" }, 400, headers);

    const sessionId = typeof body.sessionId === "string" ? body.sessionId.trim() : "";
    const visitorToken = typeof body.visitorToken === "string" ? body.visitorToken.trim() : "";
    if (!SESSION_PATTERN.test(sessionId) || !TOKEN_PATTERN.test(visitorToken)) {
      return json({ error: "invalid_session" }, 400, headers);
    }

    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (rateLimited(ip, action)) return json({ error: "rate_limited" }, 429, headers);

    if (action === "poll") {
      const verification = await verifySession(sessionId, visitorToken);
      if (!verification.ok) return json({ error: verification.reason }, verification.reason === "session_not_found" ? 404 : 403, headers);

      const messages = await loadMessages(sessionId);
      await service().from("live_chat_sessions").update({
        unread_visitor: 0,
        updated_at: new Date().toISOString(),
      }).eq("session_id", sessionId);

      return json({
        ok: true,
        status: verification.session.status,
        messages,
        lastMessageAt: verification.session.last_message_at,
      }, 200, headers);
    }

    const message = cleanMessage(body.message);
    if (!message) return json({ error: "message_required" }, 400, headers);
    const clientMessageId = cleanText(body.clientMessageId, 120);
    const now = new Date().toISOString();

    if (action === "start") {
      const name = cleanText(body.visitor?.name, 120);
      const email = cleanText(body.visitor?.email, 254)?.toLowerCase() ?? null;
      const whatsapp = cleanText(body.visitor?.whatsapp, 80);
      const company = cleanText(body.visitor?.company, 180);
      const country = cleanText(body.visitor?.country, 120);
      const pagePath = cleanText(body.context?.path, 600);
      const pageTitle = cleanText(body.context?.title, 300);

      if (!name) return json({ error: "name_required" }, 400, headers);
      if (!email && !whatsapp) return json({ error: "contact_required" }, 400, headers);
      if (!validEmail(email)) return json({ error: "invalid_email" }, 400, headers);

      const tokenHash = await hashToken(visitorToken);
      const existing = await getSession(sessionId);
      if (existing && existing.visitor_token_hash !== tokenHash) {
        return json({ error: "session_forbidden" }, 403, headers);
      }

      if (!existing) {
        const { error } = await service().from("live_chat_sessions").insert({
          session_id: sessionId,
          visitor_token_hash: tokenHash,
          visitor_name: name,
          visitor_email: email,
          visitor_whatsapp: whatsapp,
          company_name: company,
          country,
          page_path: pagePath,
          page_title: pageTitle,
          status: "pending",
          unread_admin: 1,
          unread_visitor: 0,
          last_message_at: now,
          last_user_message_at: now,
          created_at: now,
          updated_at: now,
        });
        if (error) throw error;
      } else {
        const { error } = await service().from("live_chat_sessions").update({
          visitor_name: name,
          visitor_email: email,
          visitor_whatsapp: whatsapp,
          company_name: company,
          country,
          page_path: pagePath,
          page_title: pageTitle,
          status: existing.status === "closed" || existing.status === "resolved" ? "pending" : existing.status,
          unread_admin: 1,
          last_message_at: now,
          last_user_message_at: now,
          updated_at: now,
        }).eq("session_id", sessionId);
        if (error) throw error;
      }

      await insertVisitorMessage(sessionId, message, clientMessageId);
      await notifyAdmin(sessionId, name, message, pagePath);
      return json({ ok: true, status: "pending", messages: await loadMessages(sessionId) }, 200, headers);
    }

    const verification = await verifySession(sessionId, visitorToken);
    if (!verification.ok) return json({ error: verification.reason }, verification.reason === "session_not_found" ? 404 : 403, headers);

    await insertVisitorMessage(sessionId, message, clientMessageId);
    const { error: updateError } = await service().from("live_chat_sessions").update({
      status: verification.session.status === "closed" || verification.session.status === "resolved" ? "pending" : verification.session.status,
      unread_admin: Number(verification.session.unread_admin || 0) + 1,
      last_message_at: now,
      last_user_message_at: now,
      updated_at: now,
    }).eq("session_id", sessionId);
    if (updateError) throw updateError;

    await notifyAdmin(sessionId, verification.session.visitor_name, message, verification.session.page_path);
    return json({ ok: true, status: "pending", messages: await loadMessages(sessionId) }, 200, headers);
  } catch (error) {
    console.error("live chat gateway error", error);
    return json({ error: "live_chat_unavailable" }, 503, headers);
  }
});
