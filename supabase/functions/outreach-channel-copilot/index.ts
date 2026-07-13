import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_PREPARE = 50;
const IMMUTABLE_STATUSES = new Set(["sent", "replied", "unsubscribed", "suppressed"]);
const EDITABLE_STATUSES = new Set(["draft", "approved", "failed", "rejected"]);

type DbClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !anon || !serviceKey) return json({ error: "Supabase runtime is not configured" }, 500);

    const authorization = request.headers.get("Authorization") || "";
    const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: userResult } = await auth.auth.getUser();
    const user = userResult.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const body = await request.json().catch(() => ({}));
    const action = clean(body.action, 50) || "health";
    const service = createClient(url, serviceKey);
    if (action === "health") return health(service);
    if (action === "prepare") return prepare(service, user.id, body);
    if (action === "update") return updateChannelDraft(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("outreach-channel-copilot", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(service: DbClient) {
  const tables = await Promise.all(["outreach_messages", "outreach_events", "b2b_leads"].map(async (table) => {
    const result = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message || null };
  }));
  const databaseReady = tables.every((table) => table.ready);
  return json({
    ok: true,
    ready: databaseReady,
    database_ready: databaseReady,
    derivation_mode: "existing_ai_email_no_new_claims",
    max_prepare_per_request: MAX_PREPARE,
    capabilities: ["derive_whatsapp_copy", "edit_whatsapp_copy", "recommend_channel"],
    send_capability: false,
    tables,
  });
}

async function prepare(service: DbClient, userId: string, body: JsonRecord) {
  const ids = stringArray(body.message_ids).slice(0, MAX_PREPARE);
  const campaignId = clean(body.campaign_id, 80);
  if (!ids.length && !campaignId) return json({ error: "message_ids[] or campaign_id required" }, 400);
  const force = body.force === true;

  let query = service
    .from("outreach_messages")
    .select("id,campaign_id,lead_id,recipient_company,language,subject,body_text,personalization_evidence,status,b2b_leads(phone,whatsapp,outreach_opt_out)")
    .in("status", [...EDITABLE_STATUSES])
    .order("created_at", { ascending: true })
    .limit(MAX_PREPARE);
  if (ids.length) query = query.in("id", ids);
  else query = query.eq("campaign_id", campaignId);
  const { data, error } = await query;
  if (error) throw error;

  const outcomes: JsonRecord[] = [];
  const skipped: JsonRecord[] = [];
  const failures: JsonRecord[] = [];

  for (const message of data || []) {
    const evidence = safeRecord(message.personalization_evidence);
    const existing = safeRecord(evidence.channel_copilot);
    if (!force && clean(existing.whatsapp_text, 1800)) {
      skipped.push({ message_id: message.id, reason: "WhatsApp draft already prepared" });
      continue;
    }
    if (message.b2b_leads?.outreach_opt_out === true) {
      skipped.push({ message_id: message.id, reason: "Lead opted out" });
      continue;
    }

    const whatsappText = deriveWhatsAppCopy(message.body_text);
    if (whatsappText.length < 15) {
      failures.push({ message_id: message.id, error: "Email body was too short to derive safe WhatsApp copy" });
      continue;
    }
    const riskFlags = detectHighRiskTerms(whatsappText);
    if (riskFlags.length) {
      failures.push({ message_id: message.id, error: "Source draft contains restricted commercial commitments", risk_flags: riskFlags });
      continue;
    }

    const whatsappNumber = normalizePhone(message.b2b_leads?.whatsapp);
    const phoneReference = normalizePhone(message.b2b_leads?.phone);
    const channelCopilot = {
      whatsapp_text: whatsappText,
      whatsapp_number: whatsappNumber,
      phone_reference: phoneReference,
      recommended_channel: whatsappNumber ? "WhatsApp" : "Email",
      send_window: "Buyer local business hours",
      personalization_evidence: ["Derived from the existing personalized AI email draft", "No new buyer facts or commercial claims added"],
      risk_flags: [],
      source_email_subject: message.subject,
      source_email_language: message.language,
      derivation_mode: "existing_ai_email_no_new_claims",
      prepared_at: new Date().toISOString(),
      prepared_by: userId,
      send_capability: false,
    };
    const updated = await service
      .from("outreach_messages")
      .update({ personalization_evidence: { ...evidence, channel_copilot: channelCopilot } })
      .eq("id", message.id)
      .select("id,campaign_id,lead_id")
      .single();
    if (updated.error || !updated.data) {
      failures.push({ message_id: message.id, error: updated.error?.message || "Channel draft update failed" });
      continue;
    }
    await service.from("outreach_events").insert({
      campaign_id: updated.data.campaign_id,
      message_id: updated.data.id,
      lead_id: updated.data.lead_id,
      event_type: "channel_draft_prepared",
      detail: { derivation_mode: channelCopilot.derivation_mode, recommended_channel: channelCopilot.recommended_channel, whatsapp_available: Boolean(whatsappNumber), send_capability: false },
      actor: userId,
    });
    outcomes.push({ message_id: message.id, status: "prepared", recommended_channel: channelCopilot.recommended_channel, whatsapp_available: Boolean(whatsappNumber) });
  }

  return json({
    ok: outcomes.length > 0 || (data || []).length === 0 || skipped.length > 0,
    prepared_count: outcomes.length,
    skipped_count: skipped.length,
    failed_count: failures.length,
    outcomes,
    skipped,
    failures,
    derivation_mode: "existing_ai_email_no_new_claims",
    send_capability: false,
  }, outcomes.length > 0 || (data || []).length === 0 || skipped.length > 0 ? 200 : 422);
}

async function updateChannelDraft(service: DbClient, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  if (!messageId) return json({ error: "message_id required" }, 400);
  const whatsappText = cleanPreserveLines(body.whatsapp_text, 1800);
  if (whatsappText.length < 15) return json({ error: "WhatsApp draft must be at least 15 characters" }, 400);
  const riskFlags = detectHighRiskTerms(whatsappText);
  if (riskFlags.length) return json({ error: "Remove pricing, MOQ, certification or delivery commitments before saving", risk_flags: riskFlags }, 422);

  const current = await service
    .from("outreach_messages")
    .select("id,campaign_id,lead_id,status,personalization_evidence,b2b_leads(whatsapp,phone)")
    .eq("id", messageId)
    .maybeSingle();
  if (current.error || !current.data) return json({ error: "Message not found" }, 404);
  if (IMMUTABLE_STATUSES.has(current.data.status)) return json({ error: `Channel draft cannot be edited from status ${current.data.status}` }, 409);

  const evidence = safeRecord(current.data.personalization_evidence);
  const existing = safeRecord(evidence.channel_copilot);
  const lead = current.data.b2b_leads || {};
  const whatsappNumber = normalizePhone(lead.whatsapp) || clean(existing.whatsapp_number, 40) || null;
  const channelCopilot = {
    ...existing,
    whatsapp_text: whatsappText,
    whatsapp_number: whatsappNumber,
    phone_reference: normalizePhone(lead.phone) || clean(existing.phone_reference, 40) || null,
    recommended_channel: normalizeChannel(body.recommended_channel, Boolean(whatsappNumber)),
    edited_at: new Date().toISOString(),
    edited_by: userId,
    risk_flags: [],
    send_capability: false,
  };
  const updated = await service
    .from("outreach_messages")
    .update({ personalization_evidence: { ...evidence, channel_copilot: channelCopilot } })
    .eq("id", messageId)
    .select("id,campaign_id,lead_id")
    .single();
  if (updated.error || !updated.data) throw updated.error || new Error("Channel draft update failed");
  await service.from("outreach_events").insert({
    campaign_id: updated.data.campaign_id,
    message_id: updated.data.id,
    lead_id: updated.data.lead_id,
    event_type: "channel_draft_edited",
    detail: { recommended_channel: channelCopilot.recommended_channel, send_capability: false },
    actor: userId,
  });
  return json({ ok: true, message_id: messageId, send_capability: false });
}

function deriveWhatsAppCopy(emailBody: unknown) {
  const body = cleanPreserveLines(emailBody, 12000);
  if (!body) return "";
  const lines = body
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^subject\s*:/i.test(line))
    .filter((line) => !/^[-—]\s*$/.test(line))
    .filter((line) => !/^(kind regards|best regards|regards|sincerely|mit freundlichen grüßen|freundliche grüße|cordialement|saludos|cordiali saluti)[,!.]?$/i.test(line))
    .filter((line) => !/^(irha apparels|experienced b2b apparel manufacturer|not relevant to your business\?|opt out:)/i.test(line));
  const joined = lines.join("\n\n").trim();
  const words = joined.split(/\s+/).filter(Boolean);
  if (words.length <= 85) return joined;
  const shortened = words.slice(0, 80).join(" ");
  const lastSentence = Math.max(shortened.lastIndexOf("."), shortened.lastIndexOf("?"), shortened.lastIndexOf("!"));
  return (lastSentence >= 45 ? shortened.slice(0, lastSentence + 1) : `${shortened}…`).trim();
}

function detectHighRiskTerms(value: string) {
  const rules: Array<[string, RegExp]> = [
    ["fixed price", /(?:[$€£]\s*\d|\b(?:USD|EUR|GBP|PKR)\s*\d)/i],
    ["MOQ commitment", /\b(?:MOQ|minimum order(?: quantity)?)\s*(?:is|of|:)?\s*\d+/i],
    ["delivery commitment", /\b(?:delivery|lead time|dispatch)\s*(?:in|within|is|:)?\s*\d+\s*(?:day|week)/i],
    ["certification claim", /\b(?:we are|we're|our factory is)\s+(?:ISO|CE|GOTS|OEKO|certified)/i],
    ["guarantee", /\bguarantee(?:d|s)?\b/i],
  ];
  return rules.filter(([, pattern]) => pattern.test(value)).map(([label]) => label);
}

function normalizeChannel(value: unknown, whatsappAvailable: boolean) {
  const channel = clean(value, 40).toLowerCase();
  return whatsappAvailable && channel === "whatsapp" ? "WhatsApp" : "Email";
}

function normalizePhone(value: unknown) {
  const raw = clean(value, 100);
  if (!raw) return null;
  const match = raw.match(/(?:\+|00)?\d[\d\s()./-]{6,}\d/)?.[0] || "";
  const digits = match.replace(/\D/g, "");
  return digits.length >= 8 && digits.length <= 16 ? match.trim() : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value) ? [...new Set(value.map((item) => clean(item, 500)).filter(Boolean))] : [];
}
function safeRecord(value: unknown): JsonRecord { return isRecord(value) ? value : {}; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function cleanPreserveLines(value: unknown, max = 1800) { return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : ""; }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 1200) : "Internal error"; }
function json(body: JsonRecord, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
