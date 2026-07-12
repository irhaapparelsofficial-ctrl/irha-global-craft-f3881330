// Admin-only WhatsApp Business operations.
// Supports health, draft creation, read-state updates and explicit owner-approved sends.
// Does not auto-reply to inbound messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  containsCommercialCommitment,
  loadAiBusinessRules,
  rulesReference,
} from "../_shared/ai-business-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: adminRole } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!adminRole) return json({ error: "Admin only" }, 403);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";

    if (action === "health") return json(await health(service));
    if (action === "create_draft") return json(await createDraft(service, body, user.id));
    if (action === "mark_read") return json(await markRead(service, body));
    if (action === "send_approved") {
      const result = await sendApproved(service, body, user.id);
      return json(result, result.ok === true ? 200 : 422);
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("whatsapp-admin error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: ReturnType<typeof createClient>) {
  const env = {
    access_token: Boolean(Deno.env.get("WHATSAPP_ACCESS_TOKEN")),
    phone_number_id: Boolean(Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")),
    graph_api_version: Boolean(Deno.env.get("META_GRAPH_API_VERSION")),
    customer_service_window_hours: validWindowHours() !== null,
    app_secret: Boolean(Deno.env.get("META_WHATSAPP_APP_SECRET")),
    verify_token: Boolean(Deno.env.get("WHATSAPP_VERIFY_TOKEN")),
  };
  const tableNames = ["whatsapp_contacts", "whatsapp_conversations", "whatsapp_messages", "whatsapp_webhook_events"];
  const tables: Record<string, boolean> = {};
  const errors: string[] = [];
  for (const table of tableNames) {
    const { error } = await service.from(table).select("*", { head: true, count: "exact" }).limit(1);
    tables[table] = !error;
    if (error) errors.push(`${table}: ${error.message}`);
  }
  const ready = Object.values(env).every(Boolean) && Object.values(tables).every(Boolean);
  return {
    ok: true,
    ready,
    state: ready ? "ready" : Object.values(tables).some(Boolean) ? "partial" : "blocked",
    configuration: env,
    tables,
    errors,
    notes: [
      "Secret values are never returned.",
      "Health does not send a message.",
      "Public webhook POSTs require Meta app-secret signature verification.",
    ],
  };
}

async function createDraft(service: ReturnType<typeof createClient>, body: Record<string, unknown>, userId: string) {
  const conversationId = clean(body.conversation_id, 100);
  const messageBody = clean(body.body, 8000);
  const messageType = body.message_type === "template" ? "template" : "text";
  const templateName = clean(body.template_name, 300) || null;
  const templateLanguage = clean(body.template_language, 30) || null;
  if (!conversationId) return { ok: false, error: "conversation_id is required" };
  if (messageType === "text" && !messageBody) return { ok: false, error: "body is required" };
  if (messageType === "template" && (!templateName || !templateLanguage)) {
    return { ok: false, error: "template_name and template_language are required" };
  }

  const { data: conversation, error: conversationError } = await service
    .from("whatsapp_conversations")
    .select("id,contact_id,status")
    .eq("id", conversationId)
    .maybeSingle();
  if (conversationError || !conversation) return { ok: false, error: "Conversation not found" };
  if (conversation.status === "blocked") return { ok: false, error: "Conversation is blocked" };

  const commercialCommitment = containsCommercialCommitment({ body: messageBody, templateName });
  const { data, error } = await service.from("whatsapp_messages").insert({
    conversation_id: conversation.id,
    contact_id: conversation.contact_id,
    direction: "outbound",
    message_type: messageType,
    body: messageBody || null,
    template_name: templateName,
    template_language: templateLanguage,
    status: "draft",
    requires_owner_approval: true,
    created_by: userId,
    raw_payload: { commercial_commitment_detected: commercialCommitment, external_execution: false },
  }).select("*").single();
  if (error) return { ok: false, error: error.message };
  return {
    ok: true,
    draft: data,
    commercial_commitment_detected: commercialCommitment,
    sent: false,
  };
}

async function markRead(service: ReturnType<typeof createClient>, body: Record<string, unknown>) {
  const conversationId = clean(body.conversation_id, 100);
  if (!conversationId) return { ok: false, error: "conversation_id is required" };
  const { error } = await service.from("whatsapp_conversations").update({ unread_count: 0 }).eq("id", conversationId);
  return error ? { ok: false, error: error.message } : { ok: true, conversation_id: conversationId };
}

async function sendApproved(service: ReturnType<typeof createClient>, body: Record<string, unknown>, userId: string) {
  const messageId = clean(body.message_id, 100);
  if (!messageId) return { ok: false, error: "message_id is required" };

  const rulesState = await loadAiBusinessRules(service);
  if (!rulesState.approved) {
    return { ok: false, error: "Approved Business Rules are required", rules_reference: rulesReference(rulesState) };
  }

  const { data: message, error: messageError } = await service
    .from("whatsapp_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (messageError || !message) return { ok: false, error: "Message draft not found" };
  if (message.direction !== "outbound" || !["draft", "approved", "failed"].includes(message.status)) {
    return { ok: false, error: `Message cannot be sent from status ${message.status}` };
  }
  if (containsCommercialCommitment({ body: message.body, template_name: message.template_name })) {
    return {
      ok: false,
      error: "Commercial commitment detected. Final price, terms and delivery commitments cannot be sent through automated WhatsApp execution.",
      rules_reference: rulesReference(rulesState),
    };
  }

  const { data: contact, error: contactError } = await service
    .from("whatsapp_contacts")
    .select("*")
    .eq("id", message.contact_id)
    .maybeSingle();
  if (contactError || !contact) return { ok: false, error: "WhatsApp contact not found" };
  if (["opted_out", "blocked"].includes(contact.opt_in_status)) {
    return { ok: false, error: `Contact is ${contact.opt_in_status}` };
  }

  const token = Deno.env.get("WHATSAPP_ACCESS_TOKEN") || "";
  const phoneNumberId = Deno.env.get("WHATSAPP_PHONE_NUMBER_ID") || "";
  const graphVersion = Deno.env.get("META_GRAPH_API_VERSION") || "";
  if (!token || !phoneNumberId || !graphVersion) {
    return { ok: false, error: "WhatsApp Cloud API runtime configuration is incomplete" };
  }

  const outbound = buildOutboundPayload(message, contact.wa_id, contact.last_inbound_at);
  if (!outbound.ok) return { ...outbound, rules_reference: rulesReference(rulesState) };

  const approvedAt = new Date().toISOString();
  await service.from("whatsapp_messages").update({
    status: "queued",
    approved_by: userId,
    approved_at: approvedAt,
    error: null,
  }).eq("id", message.id);

  const endpoint = `https://graph.facebook.com/${encodeURIComponent(graphVersion)}/${encodeURIComponent(phoneNumberId)}/messages`;
  const apiResponse = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(outbound.payload),
  });
  const raw = await apiResponse.text();
  let data: Record<string, unknown> = {};
  try { data = JSON.parse(raw) as Record<string, unknown>; } catch { data = { raw: raw.slice(0, 1000) }; }

  if (!apiResponse.ok) {
    const errorText = JSON.stringify(data).slice(0, 2000);
    await service.from("whatsapp_messages").update({ status: "failed", error: errorText }).eq("id", message.id);
    return { ok: false, error: `WhatsApp API returned ${apiResponse.status}`, response: data, rules_reference: rulesReference(rulesState) };
  }

  const sentId = Array.isArray(data.messages) && isRecord(data.messages[0]) ? clean(data.messages[0].id, 300) : "";
  const sentAt = new Date().toISOString();
  await service.from("whatsapp_messages").update({
    status: "sent",
    wa_message_id: sentId || message.wa_message_id,
    sent_at: sentAt,
    error: null,
    raw_payload: { response: data, rules_reference: rulesReference(rulesState) },
  }).eq("id", message.id);
  await service.from("whatsapp_contacts").update({ last_outbound_at: sentAt }).eq("id", contact.id);
  await service.from("whatsapp_conversations").update({ last_message_at: sentAt }).eq("id", message.conversation_id);

  return {
    ok: true,
    sent: true,
    message_id: message.id,
    wa_message_id: sentId || null,
    message_type: message.message_type,
    rules_reference: rulesReference(rulesState),
  };
}

function buildOutboundPayload(message: Record<string, any>, waId: string, lastInboundAt: string | null) {
  const windowHours = validWindowHours();
  if (windowHours === null) return { ok: false, error: "WHATSAPP_CUSTOMER_SERVICE_WINDOW_HOURS is not configured", payload: null };
  const withinWindow = lastInboundAt
    ? Date.now() - new Date(lastInboundAt).getTime() <= windowHours * 3_600_000
    : false;

  if (message.message_type === "template") {
    if (!message.template_name || !message.template_language) {
      return { ok: false, error: "Approved template name/language are required", payload: null };
    }
    return {
      ok: true,
      payload: {
        messaging_product: "whatsapp",
        to: waId,
        type: "template",
        template: {
          name: message.template_name,
          language: { code: message.template_language },
        },
      },
    };
  }

  if (!withinWindow) {
    return { ok: false, error: "Customer-service window is closed; use an approved WhatsApp template", template_required: true, payload: null };
  }
  if (!message.body) return { ok: false, error: "Text message body is empty", payload: null };
  return {
    ok: true,
    payload: {
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to: waId,
      type: "text",
      text: { preview_url: false, body: message.body },
    },
  };
}

function validWindowHours() {
  const value = Number(Deno.env.get("WHATSAPP_CUSTOMER_SERVICE_WINDOW_HOURS"));
  return Number.isFinite(value) && value > 0 && value <= 168 ? value : null;
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Record<string, any> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
