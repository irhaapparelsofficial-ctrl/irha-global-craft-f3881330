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
type ChannelDraft = {
  index: number;
  whatsapp_text: string;
  recommended_channel: string;
  send_window: string;
  personalization_evidence: string[];
  risk_flags: string[];
};

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
    database_ready: databaseReady,
    ai_gateway_configured: Boolean(Deno.env.get("LOVABLE_API_KEY")),
    ready: databaseReady && Boolean(Deno.env.get("LOVABLE_API_KEY")),
    max_prepare_per_request: MAX_PREPARE,
    capabilities: ["prepare_whatsapp_copy", "edit_whatsapp_copy", "recommend_channel"],
    send_capability: false,
    tables,
  });
}

async function prepare(service: DbClient, userId: string, body: JsonRecord) {
  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured" }, 503);
  const ids = stringArray(body.message_ids).slice(0, MAX_PREPARE);
  const campaignId = clean(body.campaign_id, 80);
  if (!ids.length && !campaignId) return json({ error: "message_ids[] or campaign_id required" }, 400);
  const force = body.force === true;

  let query = service
    .from("outreach_messages")
    .select("id,campaign_id,lead_id,recipient_email,recipient_company,language,subject,body_text,personalization_evidence,status,b2b_leads(id,company_name,country,email,phone,whatsapp,website,buyer_type,apparel_segment,notes,verification_score,verification_evidence,outreach_opt_out,crm_status)")
    .in("status", [...EDITABLE_STATUSES])
    .order("created_at", { ascending: true })
    .limit(MAX_PREPARE);
  if (ids.length) query = query.in("id", ids);
  else query = query.eq("campaign_id", campaignId);
  const { data, error } = await query;
  if (error) throw error;

  const skipped: JsonRecord[] = [];
  const candidates = (data || []).filter((message: any) => {
    const evidence = safeRecord(message.personalization_evidence);
    const existing = safeRecord(evidence.channel_copilot);
    if (!force && clean(existing.whatsapp_text, 1800)) {
      skipped.push({ message_id: message.id, reason: "WhatsApp draft already prepared" });
      return false;
    }
    if (message.b2b_leads?.outreach_opt_out === true) {
      skipped.push({ message_id: message.id, reason: "Lead opted out" });
      return false;
    }
    return true;
  });

  const drafts: ChannelDraft[] = [];
  const failures: JsonRecord[] = [];
  for (let offset = 0; offset < candidates.length; offset += 8) {
    const batch = candidates.slice(offset, offset + 8);
    try {
      const generated = await generateBatch(batch);
      drafts.push(...generated.map((draft) => ({ ...draft, index: draft.index + offset })));
    } catch (error) {
      failures.push({ message_ids: batch.map((message: any) => message.id), error: errorText(error) });
    }
  }

  const draftByIndex = new Map(drafts.map((draft) => [draft.index, draft]));
  const outcomes: JsonRecord[] = [];
  for (let index = 0; index < candidates.length; index += 1) {
    const message: any = candidates[index];
    const draft = draftByIndex.get(index);
    if (!draft) {
      failures.push({ message_id: message.id, error: "AI returned no channel draft" });
      continue;
    }
    const deterministicRisk = detectHighRiskTerms(draft.whatsapp_text);
    const riskFlags = unique([...draft.risk_flags, ...deterministicRisk]);
    if (riskFlags.length) {
      failures.push({ message_id: message.id, error: "Channel draft contained restricted business commitments", risk_flags: riskFlags });
      continue;
    }

    const lead = message.b2b_leads || {};
    const currentEvidence = safeRecord(message.personalization_evidence);
    const channelCopilot = {
      whatsapp_text: draft.whatsapp_text,
      whatsapp_number: normalizePhone(lead.whatsapp),
      phone_reference: normalizePhone(lead.phone),
      recommended_channel: normalizeChannel(draft.recommended_channel, Boolean(normalizePhone(lead.whatsapp))),
      send_window: draft.send_window || "Buyer local business hours",
      personalization_evidence: draft.personalization_evidence,
      risk_flags: [],
      source_email_subject: message.subject,
      prepared_at: new Date().toISOString(),
      prepared_by: userId,
      send_capability: false,
    };
    const nextEvidence = { ...currentEvidence, channel_copilot: channelCopilot };
    const updated = await service.from("outreach_messages").update({ personalization_evidence: nextEvidence }).eq("id", message.id).select("id,campaign_id,lead_id").single();
    if (updated.error || !updated.data) {
      failures.push({ message_id: message.id, error: updated.error?.message || "Channel draft update failed" });
      continue;
    }
    await service.from("outreach_events").insert({
      campaign_id: updated.data.campaign_id,
      message_id: updated.data.id,
      lead_id: updated.data.lead_id,
      event_type: "channel_draft_prepared",
      detail: { channel: channelCopilot.recommended_channel, whatsapp_available: Boolean(channelCopilot.whatsapp_number), send_capability: false },
      actor: userId,
    });
    outcomes.push({ message_id: message.id, status: "prepared", recommended_channel: channelCopilot.recommended_channel, whatsapp_available: Boolean(channelCopilot.whatsapp_number) });
  }

  return json({
    ok: outcomes.length > 0 || candidates.length === 0,
    prepared_count: outcomes.length,
    skipped_count: skipped.length,
    failed_count: failures.length,
    outcomes,
    skipped,
    failures,
    send_capability: false,
  }, outcomes.length > 0 || candidates.length === 0 ? 200 : 422);
}

async function updateChannelDraft(service: DbClient, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  if (!messageId) return json({ error: "message_id required" }, 400);
  const whatsappText = cleanPreserveLines(body.whatsapp_text, 1800);
  if (whatsappText.length < 15) return json({ error: "WhatsApp draft must be at least 15 characters" }, 400);
  const riskFlags = detectHighRiskTerms(whatsappText);
  if (riskFlags.length) return json({ error: "Remove pricing, MOQ, certification or delivery commitments before saving", risk_flags: riskFlags }, 422);

  const current = await service.from("outreach_messages").select("id,campaign_id,lead_id,status,personalization_evidence,b2b_leads(whatsapp,phone)").eq("id", messageId).maybeSingle();
  if (current.error || !current.data) return json({ error: "Message not found" }, 404);
  if (IMMUTABLE_STATUSES.has(current.data.status)) return json({ error: `Channel draft cannot be edited from status ${current.data.status}` }, 409);

  const evidence = safeRecord(current.data.personalization_evidence);
  const existing = safeRecord(evidence.channel_copilot);
  const lead: any = current.data.b2b_leads || {};
  const channelCopilot = {
    ...existing,
    whatsapp_text: whatsappText,
    whatsapp_number: normalizePhone(lead.whatsapp) || clean(existing.whatsapp_number, 40) || null,
    phone_reference: normalizePhone(lead.phone) || clean(existing.phone_reference, 40) || null,
    recommended_channel: normalizeChannel(body.recommended_channel, Boolean(normalizePhone(lead.whatsapp))),
    edited_at: new Date().toISOString(),
    edited_by: userId,
    risk_flags: [],
    send_capability: false,
  };
  const updated = await service.from("outreach_messages").update({ personalization_evidence: { ...evidence, channel_copilot: channelCopilot } }).eq("id", messageId).select("id,campaign_id,lead_id").single();
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

async function generateBatch(messages: any[]): Promise<ChannelDraft[]> {
  const prompt = `Create concise one-to-one WhatsApp outreach drafts that match existing B2B email drafts.

IRHA APPARELS FACTS:
- Irha Apparels is an experienced apparel manufacturer in Sialkot, Pakistan.
- The website is newly built; never describe the manufacturer as new.
- Factory view can be shown on a live video call.
- Services include OEM, ODM, private label and custom manufacturing.
- No public pricing. Ask for product requirements for a tailored quote.

STRICT RULES:
- Return strict JSON only.
- Use only supplied facts. Never invent a contact name, buying activity, order, certification, price, MOQ, lead time, stock level or prior interest.
- Keep each WhatsApp draft between 35 and 80 words.
- Use the same language as the existing email when practical.
- Write naturally for WhatsApp, not as an email with a subject line.
- Mention one relevant product fit only when supported.
- Include a simple reply CTA or live factory video-call option.
- Do not claim the message has been read.
- recommended_channel must be WhatsApp when a public WhatsApp number exists; otherwise Email.
- send_window should be a short non-exact recommendation such as Buyer local business hours.

Return:
{"drafts":[{"index":0,"whatsapp_text":"","recommended_channel":"Email","send_window":"Buyer local business hours","personalization_evidence":[],"risk_flags":[]}]}

MESSAGES:
${JSON.stringify(messages.map((message, index) => ({
  index,
  company_name: message.recipient_company,
  country: message.b2b_leads?.country,
  buyer_type: message.b2b_leads?.buyer_type,
  product_fit: message.b2b_leads?.apparel_segment,
  website: message.b2b_leads?.website,
  whatsapp_available: Boolean(normalizePhone(message.b2b_leads?.whatsapp)),
  phone_available: Boolean(normalizePhone(message.b2b_leads?.phone)),
  email_language: message.language,
  email_subject: message.subject,
  email_body: message.body_text,
  verification_score: message.b2b_leads?.verification_score,
  verification_evidence: message.b2b_leads?.verification_evidence,
  notes: typeof message.b2b_leads?.notes === "string" ? message.b2b_leads.notes.slice(0, 1200) : null,
})))}`;

  const result = await aiJson(prompt);
  const drafts = Array.isArray(result.drafts) ? result.drafts : [];
  return drafts.flatMap((value): ChannelDraft[] => {
    if (!isRecord(value)) return [];
    const index = Number(value.index);
    const whatsappText = cleanPreserveLines(value.whatsapp_text, 1800);
    if (!Number.isInteger(index) || index < 0 || index >= messages.length || whatsappText.length < 15) return [];
    return [{
      index,
      whatsapp_text: whatsappText,
      recommended_channel: clean(value.recommended_channel, 40) || "Email",
      send_window: clean(value.send_window, 120) || "Buyer local business hours",
      personalization_evidence: stringArray(value.personalization_evidence).slice(0, 12),
      risk_flags: stringArray(value.risk_flags).slice(0, 12),
    }];
  });
}

async function aiJson(prompt: string): Promise<JsonRecord> {
  const key = Deno.env.get("LOVABLE_API_KEY") || "";
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OUTREACH_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You prepare evidence-based B2B outreach copy. Never invent buyer facts or commercial commitments. Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `AI gateway returned ${response.status}`));
  const choices = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices as JsonRecord[] : [];
  const message = choices.length && isRecord(choices[0].message) ? choices[0].message as JsonRecord : {};
  if (typeof message.content !== "string") throw new Error("AI returned no JSON content");
  return parseJsonObject(message.content);
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
  if (whatsappAvailable && channel === "whatsapp") return "WhatsApp";
  return "Email";
}

function normalizePhone(value: unknown) {
  const raw = clean(value, 100);
  if (!raw) return null;
  const match = raw.match(/(?:\+|00)?\d[\d\s()./-]{6,}\d/)?.[0] || "";
  const digits = match.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 16) return null;
  return match.trim();
}

function stringArray(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return unique(value.map((item) => clean(item, 500)).filter(Boolean));
}
function unique(values: string[]) { return [...new Set(values)]; }
function safeRecord(value: unknown): JsonRecord { return isRecord(value) ? value : {}; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function cleanPreserveLines(value: unknown, max = 1800) { return typeof value === "string" ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max) : ""; }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 1200) : "Internal error"; }
function json(body: JsonRecord, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
async function safeJson(response: Response): Promise<unknown> { try { return await response.json(); } catch { return null; } }
function readApiError(payload: unknown, fallback: string) { if (!isRecord(payload)) return fallback; const error = isRecord(payload.error) ? payload.error : {}; return clean(error.message, 1200) || clean(payload.message, 1200) || fallback; }
function parseJsonObject(value: string): JsonRecord { const cleaned = value.trim().replace(/^```(?:json)?/i, "").replace(/```$/, "").trim(); const parsed = JSON.parse(cleaned); if (!isRecord(parsed)) throw new Error("AI returned invalid JSON object"); return parsed; }
