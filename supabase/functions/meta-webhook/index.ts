import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const encoder = new TextEncoder();

Deno.serve(async (req) => {
  const headers = {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  };

  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    const expectedToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";

    if (!expectedToken || mode !== "subscribe" || !constantTimeEqual(token, expectedToken)) {
      return new Response(JSON.stringify({ error: "Verification failed" }), { status: 403, headers });
    }

    return new Response(challenge, {
      status: 200,
      headers: { ...headers, "Content-Type": "text/plain; charset=utf-8" },
    });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers });
  }

  const appSecret = Deno.env.get("META_APP_SECRET") || "";
  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!appSecret || !signature.startsWith("sha256=")) {
    return new Response(JSON.stringify({ error: "Signature required" }), { status: 401, headers });
  }

  const raw = new Uint8Array(await req.arrayBuffer());
  const expectedSignature = await hmacHex(appSecret, raw);
  const suppliedSignature = signature.slice("sha256=".length).toLowerCase();
  if (!constantTimeEqual(suppliedSignature, expectedSignature)) {
    return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401, headers });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(raw));
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), { status: 400, headers });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  const digest = await sha256Hex(raw);
  const eventType = isRecord(payload) ? text(payload.object, 120) : null;

  const { error } = await service.from("webhook_events").insert({
    provider: "meta",
    event_type: eventType,
    external_id: digest,
    payload,
    signature_valid: true,
    processing_status: "received",
  });

  if (error && error.code !== "23505") {
    console.error("meta-webhook storage error", error.message);
    return new Response(JSON.stringify({ error: "Event could not be stored" }), { status: 500, headers });
  }

  return new Response(JSON.stringify({ received: true }), { status: 200, headers });
});

async function hmacHex(secret: string, value: Uint8Array) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, value);
  return toHex(new Uint8Array(signature));
}

async function sha256Hex(value: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", value);
  return toHex(new Uint8Array(digest));
}

function toHex(value: Uint8Array) {
  return Array.from(value).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : null;
}
