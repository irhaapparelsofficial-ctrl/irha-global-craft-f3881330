// WhatsApp Business Cloud webhook.
// Public endpoint for Meta verification/inbound events; every POST requires a valid app-secret signature.
// Inbound messages are recorded and linked to an unverified CRM lead. This function never sends a reply.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

Deno.serve(async (req) => {
  if (req.method === "GET") return verifyWebhook(req);
  if (req.method !== "POST") return response({ error: "Method not allowed" }, 405);

  const appSecret = Deno.env.get("META_WHATSAPP_APP_SECRET") || "";
  if (!appSecret) return response({ error: "WhatsApp webhook secret is not configured" }, 503);

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256") || "";
  if (!(await verifySignature(rawBody, signature, appSecret))) {
    return response({ error: "Invalid webhook signature" }, 403);
  }

  let payload: Record<string, unknown>;
  try {
    payload = JSON.parse(rawBody) as Record<string, unknown>;
  } catch {
    return response({ error: "Invalid JSON" }, 400);
  }

  if (payload.object !== "whatsapp_business_account") {
    return response({ received: true, ignored: true });
  }

  const service = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const eventKey = await sha256(rawBody);

  const { error: eventInsertError } = await service.from("whatsapp_webhook_events").insert({
    event_key: eventKey,
    event_type: "whatsapp_business_account",
    status: "received",
    payload,
  });
  if (eventInsertError?.code === "23505") return response({ received: true, duplicate: true });
  if (eventInsertError) return response({ error: eventInsertError.message }, 500);

  try {
    const result = await processPayload(service, payload);
    await service.from("whatsapp_webhook_events").update({
      status: result.processed > 0 ? "processed" : "ignored",
      processed_at: new Date().toISOString(),
    }).eq("event_key", eventKey);
    return response({ received: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook processing failed";
    await service.from("whatsapp_webhook_events").update({
      status: "failed",
      error: message.slice(0, 2000),
      processed_at: new Date().toISOString(),
    }).eq("event_key", eventKey);
    console.error("whatsapp-webhook processing error", error);
    return response({ error: "Webhook processing failed" }, 500);
  }
});

function verifyWebhook(req: Request) {
  const url = new URL(req.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge") || "";
  const expected = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "";
  if (mode === "subscribe" && expected && token === expected) {
    return new Response(challenge, { status: 200, headers: { "Content-Type": "text/plain" } });
  }
  return new Response("Forbidden", { status: 403, headers: { "Content-Type": "text/plain" } });
}

async function processPayload(service: ReturnType<typeof createClient>, payload: Record<string, unknown>) {
  let processed = 0;
  let messages = 0;
  let statuses = 0;
  const entries = Array.isArray(payload.entry) ? payload.entry : [];

  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const changes = Array.isArray(entry.changes) ? entry.changes : [];
    for (const change of changes) {
      if (!isRecord(change) || change.field !== "messages" || !isRecord(change.value)) continue;
      const value = change.value;
      const profileNames = contactProfileMap(value.contacts);

      for (const rawMessage of Array.isArray(value.messages) ? value.messages : []) {
        if (!isRecord(rawMessage)) continue;
        await processInboundMessage(service, rawMessage, profileNames);
        messages += 1;
        processed += 1;
      }

      for (const rawStatus of Array.isArray(value.statuses) ? value.statuses : []) {
        if (!isRecord(rawStatus)) continue;
        await processMessageStatus(service, rawStatus);
        statuses += 1;
        processed += 1;
      }
    }
  }
  return { processed, messages, statuses };
}

async function processInboundMessage(
  service: ReturnType<typeof createClient>,
  message: Record<string, unknown>,
  profileNames: Map<string, string>,
) {
  const waMessageId = cleanString(message.id, 300);
  const waId = digitsOnly(message.from);
  if (!waMessageId || !waId) return;

  const profileName = profileNames.get(waId) || null;
  const receivedAt = timestampFromSeconds(message.timestamp) || new Date().toISOString();
  const leadId = await ensureCrmLead(service, waId, profileName, receivedAt);
  const contact = await upsertContact(service, waId, profileName, leadId, receivedAt);
  const conversation = await activeConversation(service, contact.id, receivedAt);
  const parsed = parseMessage(message);
  const context = isRecord(message.context) ? message.context : {};

  const { error: messageError } = await service.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    contact_id: contact.id,
    wa_message_id: waMessageId,
    direction: "inbound",
    message_type: parsed.type,
    body: parsed.body,
    media_id: parsed.mediaId,
    media_mime_type: parsed.mediaMimeType,
    reply_to_wa_message_id: cleanString(context.id, 300) || null,
    status: "received",
    received_at: receivedAt,
    raw_payload: message,
  });
  if (messageError?.code !== "23505" && messageError) throw new Error(messageError.message);
  if (messageError?.code === "23505") return;

  await service.from("whatsapp_conversations").update({
    unread_count: Number(conversation.unread_count || 0) + 1,
    status: conversation.status === "closed" ? "open" : conversation.status,
    last_message_at: receivedAt,
  }).eq("id", conversation.id);
}

async function ensureCrmLead(
  service: ReturnType<typeof createClient>,
  waId: string,
  profileName: string | null,
  receivedAt: string,
) {
  const { data: existing } = await service
    .from("b2b_leads")
    .select("id")
    .or(`whatsapp.eq.${waId},phone.eq.${waId}`)
    .limit(1)
    .maybeSingle();
  if (existing?.id) return existing.id as string;

  const companyName = profileName || `WhatsApp buyer ${waId.slice(-4)}`;
  const { data, error } = await service.from("b2b_leads").insert({
    company_name: companyName,
    contact_name: profileName,
    phone: waId,
    whatsapp: waId,
    source: "WhatsApp inbound",
    lead_status: "New",
    crm_status: "new",
    priority: "normal",
    priority_score: 0,
    verification_score: 10,
    notes: "Created automatically from a signed inbound WhatsApp webhook. Company and buyer details require admin verification.",
    crm_history: [{ at: receivedAt, event: "whatsapp_inbound_created", evidence: "signed_webhook" }],
  }).select("id").single();
  if (error || !data?.id) throw new Error(error?.message || "Could not create WhatsApp CRM lead");
  return data.id as string;
}

async function upsertContact(
  service: ReturnType<typeof createClient>,
  waId: string,
  profileName: string | null,
  leadId: string,
  receivedAt: string,
) {
  const { data: existing } = await service.from("whatsapp_contacts").select("*").eq("wa_id", waId).maybeSingle();
  const values = {
    wa_id: waId,
    phone_e164: `+${waId}`,
    profile_name: profileName || existing?.profile_name || null,
    crm_lead_id: leadId,
    opt_in_status: existing?.opt_in_status === "opted_out" ? "opted_out" : "inbound_contact",
    last_inbound_at: receivedAt,
    metadata: isRecord(existing?.metadata) ? existing.metadata : {},
  };
  const { data, error } = await service.from("whatsapp_contacts").upsert(values, { onConflict: "wa_id" }).select("*").single();
  if (error || !data) throw new Error(error?.message || "Could not upsert WhatsApp contact");
  return data;
}

async function activeConversation(service: ReturnType<typeof createClient>, contactId: string, receivedAt: string) {
  const { data: existing, error } = await service
    .from("whatsapp_conversations")
    .select("*")
    .eq("contact_id", contactId)
    .in("status", ["open", "pending_review", "human_required"])
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (existing) return existing;

  const { data, error: insertError } = await service.from("whatsapp_conversations").insert({
    contact_id: contactId,
    status: "open",
    unread_count: 0,
    qualification_status: "unreviewed",
    last_message_at: receivedAt,
  }).select("*").single();
  if (insertError || !data) throw new Error(insertError?.message || "Could not create WhatsApp conversation");
  return data;
}

async function processMessageStatus(service: ReturnType<typeof createClient>, value: Record<string, unknown>) {
  const waMessageId = cleanString(value.id, 300);
  if (!waMessageId) return;
  const status = cleanString(value.status, 40);
  const allowed = new Set(["sent", "delivered", "read", "failed"]);
  if (!allowed.has(status)) return;
  const errors = Array.isArray(value.errors) ? value.errors : [];
  const errorText = errors.length ? JSON.stringify(errors).slice(0, 2000) : null;
  await service.from("whatsapp_messages").update({
    status,
    error: errorText,
  }).eq("wa_message_id", waMessageId);
}

function contactProfileMap(value: unknown) {
  const map = new Map<string, string>();
  if (!Array.isArray(value)) return map;
  for (const contact of value) {
    if (!isRecord(contact)) continue;
    const waId = digitsOnly(contact.wa_id);
    const profile = isRecord(contact.profile) ? cleanString(contact.profile.name, 200) : "";
    if (waId && profile) map.set(waId, profile);
  }
  return map;
}

function parseMessage(message: Record<string, unknown>) {
  const type = cleanString(message.type, 30) || "unsupported";
  if (type === "text" && isRecord(message.text)) {
    return { type: "text", body: cleanString(message.text.body, 8000) || null, mediaId: null, mediaMimeType: null };
  }
  if (["image", "document", "audio", "video"].includes(type) && isRecord(message[type])) {
    const media = message[type] as Record<string, unknown>;
    const caption = cleanString(media.caption, 8000);
    const filename = cleanString(media.filename, 500);
    return {
      type,
      body: caption || filename || `[${type} received]`,
      mediaId: cleanString(media.id, 300) || null,
      mediaMimeType: cleanString(media.mime_type, 200) || null,
    };
  }
  if (type === "interactive" && isRecord(message.interactive)) {
    const interactive = message.interactive;
    const reply = isRecord(interactive.button_reply) ? interactive.button_reply : isRecord(interactive.list_reply) ? interactive.list_reply : {};
    return { type, body: cleanString(reply.title, 2000) || cleanString(reply.id, 500) || "[Interactive reply]", mediaId: null, mediaMimeType: null };
  }
  if (type === "location" && isRecord(message.location)) {
    const location = message.location;
    return { type, body: `Location: ${String(location.latitude || "")}, ${String(location.longitude || "")}`, mediaId: null, mediaMimeType: null };
  }
  return { type: "unsupported", body: `[${type || "unsupported"} message received]`, mediaId: null, mediaMimeType: null };
}

async function verifySignature(body: string, signatureHeader: string, secret: string) {
  if (!signatureHeader.startsWith("sha256=")) return false;
  const signature = hexToBytes(signatureHeader.slice(7));
  if (!signature) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["verify"],
  );
  return crypto.subtle.verify("HMAC", key, signature, new TextEncoder().encode(body));
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function hexToBytes(value: string) {
  if (!/^[a-f0-9]{64}$/i.test(value)) return null;
  return new Uint8Array(value.match(/.{2}/g)!.map((byte) => Number.parseInt(byte, 16)));
}

function timestampFromSeconds(value: unknown) {
  const numeric = typeof value === "string" ? Number(value) : typeof value === "number" ? value : NaN;
  return Number.isFinite(numeric) ? new Date(numeric * 1000).toISOString() : null;
}

function digitsOnly(value: unknown) {
  return typeof value === "string" ? value.replace(/\D/g, "").slice(0, 30) : "";
}

function cleanString(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function response(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
