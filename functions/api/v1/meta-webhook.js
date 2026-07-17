const MAX_BODY_BYTES = 1024 * 1024;

function response(body, status = 200, contentType = "application/json; charset=utf-8") {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), {
    status,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store, max-age=0",
      "x-content-type-options": "nosniff",
      "referrer-policy": "no-referrer",
    },
  });
}

function timingSafeEqual(left, right) {
  if (left.length !== right.length) return false;
  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return mismatch === 0;
}

function toHex(buffer) {
  return Array.from(new Uint8Array(buffer), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function validSignature(rawBody, signatureHeader, secret) {
  if (!signatureHeader?.startsWith("sha256=") || !secret) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const digest = await crypto.subtle.sign("HMAC", key, rawBody);
  return timingSafeEqual(signatureHeader.slice(7).toLowerCase(), toHex(digest));
}

function eventIdentity(payload) {
  const entry = Array.isArray(payload?.entry) ? payload.entry[0] : null;
  const change = Array.isArray(entry?.changes) ? entry.changes[0] : null;
  const messaging = Array.isArray(entry?.messaging) ? entry.messaging[0] : null;
  const eventType = String(change?.field || payload?.object || "unknown").slice(0, 120);
  const candidate = messaging?.message?.mid || messaging?.postback?.mid || change?.value?.leadgen_id || change?.value?.form_id || null;
  const externalId = candidate ? String(candidate).slice(0, 240) : null;
  return { eventType, externalId };
}

async function persistEvent(env, payload, identity) {
  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const serviceKey = String(env.SUPABASE_SERVICE_ROLE_KEY || "");
  if (!supabaseUrl || !serviceKey) throw new Error("Supabase webhook storage is not configured");

  const result = await fetch(`${supabaseUrl}/rest/v1/webhook_events`, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      authorization: `Bearer ${serviceKey}`,
      "content-type": "application/json",
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      provider: "meta",
      event_type: identity.eventType,
      external_id: identity.externalId,
      payload,
      signature_valid: true,
      processing_status: "received",
    }),
  });

  if (result.ok || result.status === 409) return;
  const detail = (await result.text()).slice(0, 500);
  throw new Error(`Webhook persistence failed (${result.status}): ${detail}`);
}

export async function onRequest(context) {
  const { request, env } = context;
  const url = new URL(request.url);

  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token") || "";
    const challenge = url.searchParams.get("hub.challenge") || "";
    const expected = String(env.META_WEBHOOK_VERIFY_TOKEN || "");
    if (mode === "subscribe" && expected && timingSafeEqual(token, expected) && challenge) {
      return response(challenge, 200, "text/plain; charset=utf-8");
    }
    return response({ error: "Webhook verification failed" }, 403);
  }

  if (request.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_BODY_BYTES) return response({ error: "Payload too large" }, 413);

  const rawBody = await request.arrayBuffer();
  if (rawBody.byteLength > MAX_BODY_BYTES) return response({ error: "Payload too large" }, 413);

  const signature = request.headers.get("x-hub-signature-256");
  const secret = String(env.META_APP_SECRET || "");
  if (!(await validSignature(rawBody, signature, secret))) return response({ error: "Invalid signature" }, 401);

  let payload;
  try {
    payload = JSON.parse(new TextDecoder().decode(rawBody));
  } catch {
    return response({ error: "Invalid JSON" }, 400);
  }

  try {
    await persistEvent(env, payload, eventIdentity(payload));
    return response({ received: true }, 200);
  } catch (error) {
    console.error("meta-webhook", error instanceof Error ? error.message : error);
    return response({ error: "Webhook could not be stored" }, 503);
  }
}
