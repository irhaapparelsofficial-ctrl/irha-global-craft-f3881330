import { createClient } from "npm:@supabase/supabase-js@2.49.4";

const MAX_BODY_BYTES = 1024 * 1024;
const encoder = new TextEncoder();

Deno.serve(async (request) => {
  const url = new URL(request.url);

  if (request.method === "GET") {
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    const expectedToken = Deno.env.get("META_WEBHOOK_VERIFY_TOKEN") || "";

    if (mode === "subscribe" && challenge && expectedToken && constantTimeText(token || "", expectedToken)) {
      return new Response(challenge, {
        status: 200,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
        },
      });
    }
    return json({ error: "Verification failed" }, 403);
  }

  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (declaredLength > MAX_BODY_BYTES) return json({ error: "Payload too large" }, 413);

  const body = new Uint8Array(await request.arrayBuffer());
  if (body.byteLength < 2 || body.byteLength > MAX_BODY_BYTES) {
    return json({ error: "Invalid payload size" }, 400);
  }

  const appSecret = Deno.env.get("META_APP_SECRET") || "";
  const signature = request.headers.get("x-hub-signature-256") || "";
  if (!appSecret || !(await validSignature(body, signature, appSecret))) {
    return json({ error: "Invalid signature" }, 401);
  }

  let payload: unknown;
  try {
    payload = JSON.parse(new TextDecoder().decode(body));
  } catch {
    return json({ error: "Invalid JSON" }, 400);
  }
  if (!payload || typeof payload !== "object") return json({ error: "Invalid event" }, 400);

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const details = eventDetails(payload);
  const { error } = await service.from("webhook_events").upsert({
    provider: "meta",
    event_type: details.eventType,
    external_id: details.externalId,
    payload,
    signature_valid: true,
    processing_status: "received",
  }, {
    onConflict: "provider,external_id",
    ignoreDuplicates: true,
  });

  if (error) {
    console.error("meta-webhook persistence failed", error.message);
    return json({ error: "Event could not be recorded" }, 500);
  }

  return json({ received: true }, 200);
});

function eventDetails(payload: unknown) {
  const root = asRecord(payload);
  const entries = Array.isArray(payload) ? payload : Array.isArray(root.entry) ? root.entry : [];
  const firstEntry = asRecord(entries[0]);
  const changes = Array.isArray(firstEntry.changes) ? firstEntry.changes : [];
  const firstChange = asRecord(changes[0]);
  const value = asRecord(firstChange.value);
  const leadgenId = safeText(value.leadgen_id, 180);
  const entryId = safeText(firstEntry.id, 180);
  const field = safeText(firstChange.field, 120);
  const object = safeText(root.object, 120) || "page";
  const eventType = field || (leadgenId ? "leadgen" : object);
  const externalId = leadgenId || (entryId
    ? `${entryId}:${safeText(firstEntry.time, 40) || crypto.randomUUID()}`
    : crypto.randomUUID());
  return { eventType, externalId };
}

async function validSignature(body: Uint8Array, signature: string, secret: string) {
  if (!signature.startsWith("sha256=")) return false;
  const supplied = signature.slice(7).toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(supplied)) return false;

  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = await crypto.subtle.sign("HMAC", key, body);
  const expected = Array.from(new Uint8Array(signed))
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
  return constantTimeText(supplied, expected);
}

function constantTimeText(left: string, right: string) {
  const leftBytes = encoder.encode(left);
  const rightBytes = encoder.encode(right);
  let diff = leftBytes.length ^ rightBytes.length;
  const length = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < length; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return diff === 0;
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function safeText(value: unknown, max: number) {
  if (typeof value === "number" && Number.isFinite(value)) return String(value).slice(0, max);
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max)
    : "";
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff",
    },
  });
}
