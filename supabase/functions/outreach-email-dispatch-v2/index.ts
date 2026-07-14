import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const GATEWAY = "https://connector-gateway.lovable.dev";
const GMAIL_BASE = `${GATEWAY}/google-mail/gmail/v1/users/me`;
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const ELIGIBLE_CRM = new Set(["qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up"]);

type JsonRecord = Record<string, unknown>;
type Db = ReturnType<typeof createClient>;
type MimeAttachment = { fileName: string; mimeType: string; bytes: Uint8Array };

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

    const service = createClient(url, serviceKey);
    const body = await request.json().catch(() => ({})) as JsonRecord;
    const action = clean(body.action, 40) || "health";
    if (action === "health") return await health(service);
    if (action === "send") return await sendOne(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("outreach-email-dispatch-v2", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(service: Db) {
  const tables = await Promise.all(["outreach_messages", "outreach_events", "outreach_message_attachments", "crm_files", "b2b_leads"].map(async (table) => {
    const result = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message || null };
  }));
  const gmail = await gmailHealth();
  return json({
    ok: true,
    ready: tables.every((item) => item.ready) && gmail.ok,
    gmail_ready: gmail.ok,
    gmail_error: gmail.error || null,
    tables,
    max_attachment_bytes: MAX_ATTACHMENT_BYTES,
    dispatch_scope: "exactly_one_approved_message",
  });
}

async function sendOne(service: Db, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  if (!messageId) return json({ error: "message_id required" }, 400);

  const result = await service.from("outreach_messages")
    .select("*,b2b_leads(id,email,outreach_opt_out,crm_status,verification_score)")
    .eq("id", messageId)
    .maybeSingle();
  if (result.error || !result.data) return json({ error: "Approved outreach message not found" }, 404);
  const message = result.data;

  if (["sent", "replied"].includes(message.status)) {
    return json({ ok: true, status: message.status, already_dispatched: true, message_id: message.id, gmail_message_id: message.gmail_message_id || null });
  }
  if (message.channel !== "email") return json({ error: "Message channel is not email" }, 409);
  if (message.status !== "approved" || !message.approved_at || !message.approved_by) {
    return json({ error: "Explicit owner approval is required before email dispatch" }, 409);
  }
  if (message.b2b_leads?.outreach_opt_out === true) return await markManual(service, message, userId, "Lead opted out of outreach");
  if (!eligibleLead(message.b2b_leads || {})) return await markManual(service, message, userId, "Lead is no longer verified or qualified");
  const email = validEmail(message.recipient_email);
  if (!email) return await markManual(service, message, userId, "Valid recipient email is missing");

  const gmail = await gmailHealth();
  if (!gmail.ok) return await markManual(service, message, userId, gmail.error || "Gmail connector is not ready");

  const deterministicMessageId = `<irha-outreach-v2-${message.id}@irhaapparels.com>`;
  const recovered = await findByMessageId(deterministicMessageId);
  if (recovered) {
    await markSent(service, message, userId, {
      gmail_message_id: recovered.id,
      gmail_thread_id: recovered.threadId || null,
      recovered: true,
      attachment_count: 0,
    });
    return json({ ok: true, status: "sent", message_id: message.id, recovered: true, gmail_message_id: recovered.id, gmail_thread_id: recovered.threadId || null });
  }

  const attachments = await loadAttachments(service, message.id, message.lead_id);
  const totalBytes = attachments.reduce((sum, item) => sum + Number(item.file.size_bytes || 0), 0);
  if (totalBytes > MAX_ATTACHMENT_BYTES) return await markManual(service, message, userId, "Selected email attachments exceed the safe 12 MB raw limit");

  await service.from("outreach_messages").update({ status: "sending", error: null, manual_reason: null }).eq("id", message.id);
  await event(service, message, "send_started", { channel: "email", attachment_count: attachments.length, total_bytes: totalBytes }, userId);

  try {
    const parts: MimeAttachment[] = [];
    for (const item of attachments) {
      await service.from("outreach_message_attachments").update({ status: "sending", error: null }).eq("id", item.link.id);
      const downloaded = await service.storage.from(item.file.bucket).download(item.file.object_path);
      if (downloaded.error || !downloaded.data) throw downloaded.error || new Error(`Could not read ${item.file.file_name}`);
      parts.push({
        fileName: item.file.file_name,
        mimeType: item.file.mime_type,
        bytes: new Uint8Array(await downloaded.data.arrayBuffer()),
      });
    }

    const unsubscribeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/outreach-unsubscribe?token=${encodeURIComponent(message.unsubscribe_token)}`;
    const raw = buildMimeMessage({
      to: email,
      subject: message.subject,
      body: appendFooter(message.body_text, unsubscribeUrl),
      messageId: deterministicMessageId,
      unsubscribeUrl,
      attachments: parts,
    });
    const response = await gmailFetch("/messages/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw }),
    });
    const payload = await safeJson(response);
    if (!response.ok || !isRecord(payload) || typeof payload.id !== "string") {
      throw new Error(apiError(payload, `Gmail send returned ${response.status}`));
    }

    await markSent(service, message, userId, {
      gmail_message_id: payload.id,
      gmail_thread_id: typeof payload.threadId === "string" ? payload.threadId : null,
      recovered: false,
      attachment_count: parts.length,
    });
    if (attachments.length) {
      for (const item of attachments) {
        await service.from("outreach_message_attachments").update({
          status: "sent",
          error: null,
          metadata: {
            ...record(item.link.metadata),
            provider: "gmail",
            attached_to_message: payload.id,
          },
        }).eq("id", item.link.id);
      }
    }
    return json({
      ok: true,
      status: "sent",
      channel: "email",
      message_id: message.id,
      gmail_message_id: payload.id,
      gmail_thread_id: payload.threadId || null,
      attachment_count: parts.length,
    });
  } catch (error) {
    const reason = errorText(error);
    await service.from("outreach_messages").update({ status: "failed", error: reason, manual_reason: null }).eq("id", message.id);
    await service.from("outreach_message_attachments").update({ status: "failed", error: reason }).eq("message_id", message.id).eq("status", "sending");
    await service.from("b2b_leads").update({ last_outreach_status: "failed:email" }).eq("id", message.lead_id);
    await event(service, message, "send_failed", { channel: "email", error: reason.slice(0, 2000) }, userId);
    await refreshCampaign(service, message.campaign_id);
    return json({ ok: false, status: "failed", channel: "email", message_id: message.id, error: reason }, 500);
  }
}

async function loadAttachments(service: Db, messageId: string, leadId: string) {
  const links = await service.from("outreach_message_attachments")
    .select("*")
    .eq("message_id", messageId)
    .eq("status", "selected")
    .order("created_at", { ascending: true });
  if (links.error) throw links.error;
  const fileIds = (links.data || []).map((item) => item.crm_file_id);
  if (!fileIds.length) return [] as Array<{ link: any; file: any }>;
  const files = await service.from("crm_files")
    .select("*")
    .in("id", fileIds)
    .eq("source_type", "prospect")
    .eq("source_id", leadId);
  if (files.error) throw files.error;
  if ((files.data || []).length !== fileIds.length) throw new Error("One or more selected files do not belong to this buyer");
  const fileMap = new Map((files.data || []).map((file) => [file.id, file]));
  return (links.data || []).map((link) => ({ link, file: fileMap.get(link.crm_file_id) })).filter((item) => Boolean(item.file));
}

async function markSent(service: Db, message: any, userId: string, provider: JsonRecord) {
  const sentAt = new Date().toISOString();
  await service.from("outreach_messages").update({
    status: "sent",
    sent_at: sentAt,
    gmail_message_id: provider.gmail_message_id,
    gmail_thread_id: provider.gmail_thread_id,
    connector_response: {
      ...record(message.connector_response),
      provider: "gmail",
      ...provider,
    },
    error: null,
    manual_reason: null,
  }).eq("id", message.id);
  await service.from("b2b_leads").update({
    crm_status: "contacted",
    lead_status: "Pitched",
    last_outreach_at: sentAt,
    last_outreach_status: "sent:email",
    last_gmail_thread_id: provider.gmail_thread_id || null,
  }).eq("id", message.lead_id);
  await event(service, message, "sent", { channel: "email", ...provider }, userId);
  await refreshCampaign(service, message.campaign_id);
}

async function markManual(service: Db, message: any, userId: string, reason: string) {
  await service.from("outreach_messages").update({
    status: "manual_required",
    manual_reason: reason.slice(0, 4000),
    error: null,
  }).eq("id", message.id);
  await service.from("b2b_leads").update({ last_outreach_status: "manual_required:email" }).eq("id", message.lead_id);
  await event(service, message, "status_sync", { action: "manual_required", channel: "email", reason: reason.slice(0, 2000) }, userId);
  await refreshCampaign(service, message.campaign_id);
  return json({ ok: false, status: "manual_required", channel: "email", message_id: message.id, reason }, 422);
}

async function event(service: Db, message: any, eventType: string, detail: JsonRecord, actor: string) {
  const saved = await service.from("outreach_events").insert({
    campaign_id: message.campaign_id,
    message_id: message.id,
    lead_id: message.lead_id,
    event_type: eventType,
    detail,
    actor,
  });
  if (saved.error) throw saved.error;
}

async function refreshCampaign(service: Db, campaignId: string) {
  const result = await service.from("outreach_messages").select("status").eq("campaign_id", campaignId);
  if (result.error) throw result.error;
  const statuses = (result.data || []).map((item) => item.status);
  let status = "ready";
  if (!statuses.length) status = "draft";
  else if (statuses.some((value) => value === "sending")) status = "sending";
  else if (statuses.every((value) => ["sent", "replied", "suppressed", "rejected", "unsubscribed", "manual_required"].includes(value))) status = "completed";
  else if (statuses.some((value) => ["sent", "replied"].includes(value))) status = "active";
  await service.from("outreach_campaigns").update({
    draft_count: statuses.filter((value) => value === "draft").length,
    approved_count: statuses.filter((value) => value === "approved").length,
    sent_count: statuses.filter((value) => ["sent", "replied"].includes(value)).length,
    replied_count: statuses.filter((value) => value === "replied").length,
    failed_count: statuses.filter((value) => ["failed", "manual_required"].includes(value)).length,
    status,
  }).eq("id", campaignId);
}

async function gmailHealth(): Promise<{ ok: boolean; error?: string }> {
  if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_MAIL_API_KEY")) {
    return { ok: false, error: "Gmail connector runtime keys are missing" };
  }
  try {
    const response = await gmailFetch("/profile", { method: "GET" });
    if (!response.ok) return { ok: false, error: apiError(await safeJson(response), `Gmail profile returned ${response.status}`) };
    return { ok: true };
  } catch (error) {
    return { ok: false, error: errorText(error) };
  }
}

async function gmailFetch(path: string, init: RequestInit) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY");
  if (!lovableKey || !gmailKey) throw new Error("Gmail connector runtime keys are missing");
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", `Bearer ${lovableKey}`);
  headers.set("X-Connection-Api-Key", gmailKey);
  return await fetch(`${GMAIL_BASE}${path}`, { ...init, headers });
}

async function findByMessageId(messageId: string): Promise<any | null> {
  try {
    const response = await gmailFetch(`/messages?q=${encodeURIComponent(`rfc822msgid:${messageId}`)}&maxResults=1`, { method: "GET" });
    const payload = await safeJson(response);
    return response.ok && isRecord(payload) && Array.isArray(payload.messages) && payload.messages.length ? payload.messages[0] : null;
  } catch {
    return null;
  }
}

function buildMimeMessage(input: { to: string; subject: string; body: string; messageId: string; unsubscribeUrl: string; attachments: MimeAttachment[] }) {
  const boundary = `irha-${crypto.randomUUID()}`;
  const lines = [
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Message-ID: ${input.messageId}`,
    "MIME-Version: 1.0",
    `List-Unsubscribe: <${input.unsubscribeUrl}>`,
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    "X-Irha-Outreach: 2",
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    "",
    `--${boundary}`,
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: base64",
    "",
    wrapBase64(bytesToBase64(new TextEncoder().encode(input.body))),
  ];
  for (const attachment of input.attachments) {
    const name = safeHeaderFileName(attachment.fileName);
    lines.push(
      `--${boundary}`,
      `Content-Type: ${attachment.mimeType || "application/octet-stream"}; name="${name}"`,
      "Content-Transfer-Encoding: base64",
      `Content-Disposition: attachment; filename="${name}"`,
      "",
      wrapBase64(bytesToBase64(attachment.bytes)),
    );
  }
  lines.push(`--${boundary}--`, "");
  return base64UrlEncode(new TextEncoder().encode(lines.join("\r\n")));
}

function appendFooter(body: string, unsubscribeUrl: string) {
  return `${body.trim()}\n\n—\nIrha Apparels · Sialkot, Pakistan\nExperienced B2B apparel manufacturer · irhaapparels.com\nNot relevant to your business? Opt out: ${unsubscribeUrl}`;
}
function eligibleLead(lead: any) {
  const score = Number(lead.verification_score);
  return (Number.isFinite(score) && score >= 70) || ELIGIBLE_CRM.has(clean(lead.crm_status, 80));
}
function validEmail(value: unknown) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + 0x8000, bytes.length)));
  }
  return btoa(binary);
}
function base64UrlEncode(bytes: Uint8Array) { return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""); }
function wrapBase64(value: string) { return value.match(/.{1,76}/g)?.join("\r\n") || ""; }
function encodeHeader(value: string) { return /^[\x20-\x7E]+$/.test(value) ? value : `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(value))}?=`; }
function safeHeaderFileName(value: string) { return clean(value, 180).replace(/["\\\r\n]/g, "_") || "attachment"; }
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function record(value: unknown): JsonRecord { return isRecord(value) ? value : {}; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
async function safeJson(response: Response): Promise<unknown> { const text = await response.text(); try { return JSON.parse(text); } catch { return text.slice(0, 2000); } }
function apiError(payload: unknown, fallback: string) { if (typeof payload === "string" && payload) return `${fallback}: ${payload}`; if (isRecord(payload)) for (const key of ["error", "message", "detail"]) if (typeof payload[key] === "string") return `${fallback}: ${payload[key]}`; return fallback; }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 4000) : typeof error === "string" ? error.slice(0, 4000) : "Internal error"; }
function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
