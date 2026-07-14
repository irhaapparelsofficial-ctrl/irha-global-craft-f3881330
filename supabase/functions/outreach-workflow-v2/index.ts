import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_GENERATE = 50;
const MAX_EMAIL_ATTACHMENT_BYTES = 12 * 1024 * 1024;
const MAX_WHATSAPP_ATTACHMENTS = 0;
const ELIGIBLE_CRM = new Set(["qualified", "contacted", "replied", "sample_requested", "quote_requested", "quotation_sent", "negotiation", "follow_up"]);
const EDITABLE = new Set(["draft", "approved", "failed", "manual_required", "rejected"]);
const IMMUTABLE = new Set(["sent", "replied", "unsubscribed", "suppressed"]);

type JsonRecord = Record<string, unknown>;
type Db = ReturnType<typeof createClient>;
type Channel = "email" | "whatsapp";
type Draft = { index: number; language: string; subject: string; body_text: string; evidence: string[]; risk_flags: string[] };

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
    const action = clean(body.action, 50) || "health";
    if (action === "health") return await health(service);
    if (action === "generate") return await generate(service, user.id, body);
    if (action === "update") return await updateDraft(service, user.id, body);
    if (action === "set_attachments") return await setAttachments(service, user.id, body);
    if (action === "approve") return await approve(service, user.id, body);
    if (action === "finalize_whatsapp") return await finalizeWhatsApp(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("outreach-workflow-v2", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(service: Db) {
  const tableNames = ["outreach_campaigns", "outreach_messages", "outreach_events", "outreach_message_attachments", "crm_files", "whatsapp_contacts", "whatsapp_conversations", "whatsapp_messages"];
  const tables = await Promise.all(tableNames.map(async (table) => {
    const result = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message || null };
  }));
  const databaseReady = tables.every((item) => item.ready);
  const gmailKeys = Boolean(Deno.env.get("LOVABLE_API_KEY") && Deno.env.get("GOOGLE_MAIL_API_KEY"));
  const whatsappKeys = Boolean(
    Deno.env.get("WHATSAPP_ACCESS_TOKEN")
    && Deno.env.get("WHATSAPP_PHONE_NUMBER_ID")
    && Deno.env.get("META_GRAPH_API_VERSION")
    && validWindowHours() !== null
  );
  return json({
    ok: true,
    database_ready: databaseReady,
    ai_ready: Boolean(Deno.env.get("LOVABLE_API_KEY")) && databaseReady,
    gmail_ready: gmailKeys && databaseReady,
    whatsapp_ready: whatsappKeys && databaseReady,
    tables,
    limits: {
      generate: MAX_GENERATE,
      email_attachment_bytes: MAX_EMAIL_ATTACHMENT_BYTES,
      whatsapp_attachments: MAX_WHATSAPP_ATTACHMENTS,
    },
    approval_policy: "One owner approval prepares exactly one provider dispatch. The provider sender is invoked separately by the same button flow.",
    sends_external_messages: false,
  });
}

async function generate(service: Db, userId: string, body: JsonRecord) {
  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "AI gateway is not configured" }, 503);
  const leadIds = stringArray(body.lead_ids).slice(0, MAX_GENERATE);
  if (!leadIds.length) return json({ error: "lead_ids[] required" }, 400);
  const campaignInput = record(body.campaign);
  const objective = clean(campaignInput.objective, 1000);
  if (!objective) return json({ error: "campaign.objective is required" }, 400);
  const preferred = normalizePreferred(body.preferred_channel);

  const leadsResult = await service.from("b2b_leads")
    .select("id,company_name,country,email,phone,whatsapp,website,apparel_segment,notes,crm_status,buyer_type,verification_score,verification_evidence,outreach_opt_out")
    .in("id", leadIds);
  if (leadsResult.error) throw leadsResult.error;

  const eligible: any[] = [];
  const skipped: JsonRecord[] = [];
  for (const lead of leadsResult.data || []) {
    const email = validEmail(lead.email);
    const whatsapp = normalizePhone(lead.whatsapp || lead.phone);
    if (lead.outreach_opt_out === true) { skipped.push({ lead_id: lead.id, reason: "Lead opted out" }); continue; }
    if (!eligibleLead(lead)) { skipped.push({ lead_id: lead.id, reason: "Lead requires verification score 70+ or qualified CRM status" }); continue; }
    const channel = chooseChannel(preferred, email, whatsapp);
    if (!channel) { skipped.push({ lead_id: lead.id, reason: "No valid email or WhatsApp route" }); continue; }
    eligible.push({ ...lead, normalized_email: email, normalized_whatsapp: whatsapp, selected_channel: channel });
  }
  if (!eligible.length) return json({ error: "No eligible leads with a usable contact route", skipped }, 422);

  const campaign = await service.from("outreach_campaigns").insert({
    name: clean(campaignInput.name, 240) || `${clean(campaignInput.target_market, 200) || "Buyer"} outreach`,
    product_focus: stringArray(campaignInput.product_focus).slice(0, 20),
    target_market: clean(campaignInput.target_market, 200) || null,
    objective,
    language_mode: clean(campaignInput.language_mode, 80) || "auto",
    call_to_action: clean(campaignInput.call_to_action, 500) || "Reply with your product requirements or request a live factory video call.",
    status: "generating",
    selected_lead_count: eligible.length,
    requested_by: userId,
  }).select("*").single();
  if (campaign.error || !campaign.data) throw campaign.error || new Error("Outreach campaign could not be created");

  const drafts: Draft[] = [];
  const failures: JsonRecord[] = [];
  for (let offset = 0; offset < eligible.length; offset += 8) {
    const batch = eligible.slice(offset, offset + 8);
    try {
      const generated = await aiDraftBatch(batch, campaign.data);
      drafts.push(...generated.map((draft) => ({ ...draft, index: draft.index + offset })));
    } catch (error) {
      failures.push({ lead_ids: batch.map((lead) => lead.id), error: errorText(error) });
    }
  }

  const draftByIndex = new Map(drafts.map((draft) => [draft.index, draft]));
  const rows: JsonRecord[] = [];
  eligible.forEach((lead, index) => {
    const draft = draftByIndex.get(index);
    if (!draft) { failures.push({ lead_id: lead.id, error: "AI returned no draft" }); return; }
    rows.push({
      campaign_id: campaign.data.id,
      lead_id: lead.id,
      sequence_number: 0,
      channel: lead.selected_channel,
      recipient_email: lead.selected_channel === "email" ? lead.normalized_email : null,
      recipient_whatsapp: lead.selected_channel === "whatsapp" ? lead.normalized_whatsapp : null,
      recipient_company: lead.company_name,
      language: draft.language,
      subject: draft.subject || (lead.selected_channel === "whatsapp" ? "WhatsApp introduction" : "Irha Apparels introduction"),
      body_text: draft.body_text,
      personalization_evidence: {
        evidence: draft.evidence,
        risk_flags: draft.risk_flags,
        generated_channel: lead.selected_channel,
        generated_from: {
          country: lead.country,
          website: lead.website,
          buyer_type: lead.buyer_type,
          apparel_segment: lead.apparel_segment,
        },
      },
      status: "draft",
      idempotency_key: `outreach-v2-${campaign.data.id}-${lead.id}-0`,
      error: null,
      manual_reason: null,
    });
  });

  let inserted: any[] = [];
  if (rows.length) {
    const saved = await service.from("outreach_messages").insert(rows).select("id,campaign_id,lead_id,channel,status");
    if (saved.error) throw saved.error;
    inserted = saved.data || [];
    await service.from("outreach_events").insert(inserted.map((message) => ({
      campaign_id: message.campaign_id,
      message_id: message.id,
      lead_id: message.lead_id,
      event_type: "draft_generated",
      detail: { channel: message.channel, workflow: "outreach-v2" },
      actor: userId,
    })));
  }
  await refreshCampaign(service, campaign.data.id);
  await service.from("outreach_campaigns").update({
    status: inserted.length ? "ready" : "failed",
    error: failures.length ? JSON.stringify(failures).slice(0, 4000) : null,
  }).eq("id", campaign.data.id);
  return json({ ok: inserted.length > 0, campaign_id: campaign.data.id, created: inserted.length, skipped, failures, sent: false }, inserted.length ? 200 : 422);
}

async function updateDraft(service: Db, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  if (!messageId) return json({ error: "message_id required" }, 400);
  const current = await service.from("outreach_messages").select("*,b2b_leads(email,phone,whatsapp,outreach_opt_out)").eq("id", messageId).maybeSingle();
  if (current.error || !current.data) return json({ error: "Message not found" }, 404);
  if (IMMUTABLE.has(current.data.status)) return json({ error: `Message cannot be edited from status ${current.data.status}` }, 409);

  const channel = normalizeChannel(body.channel || current.data.channel);
  const lead = current.data.b2b_leads || {};
  const recipientEmail = validEmail(lead.email);
  const recipientWhatsapp = normalizePhone(lead.whatsapp || lead.phone);
  if (channel === "email" && !recipientEmail) return json({ error: "Lead has no valid email" }, 422);
  if (channel === "whatsapp" && !recipientWhatsapp) return json({ error: "Lead has no valid WhatsApp number" }, 422);
  const subject = clean(body.subject, 300) || current.data.subject;
  const bodyText = cleanLines(body.body_text, 12000) || current.data.body_text;
  if (!subject || !bodyText) return json({ error: "Subject and message body are required" }, 400);

  const updated = await service.from("outreach_messages").update({
    channel,
    recipient_email: channel === "email" ? recipientEmail : null,
    recipient_whatsapp: channel === "whatsapp" ? recipientWhatsapp : null,
    subject,
    body_text: bodyText,
    language: clean(body.language, 80) || current.data.language,
    status: "draft",
    approved_by: null,
    approved_at: null,
    dispatched_by: null,
    whatsapp_message_id: null,
    manual_reason: null,
    error: null,
  }).eq("id", messageId).select("*").single();
  if (updated.error || !updated.data) throw updated.error || new Error("Draft update failed");
  await service.from("outreach_message_attachments").update({ channel }).eq("message_id", messageId).neq("status", "removed");
  await event(service, updated.data, "status_sync", { action: "draft_updated", channel }, userId);
  await refreshCampaign(service, updated.data.campaign_id);
  return json({ ok: true, message: updated.data, sent: false });
}

async function setAttachments(service: Db, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  const fileIds = stringArray(body.file_ids).slice(0, 10);
  if (!messageId) return json({ error: "message_id required" }, 400);
  const message = await service.from("outreach_messages").select("id,campaign_id,lead_id,channel,status").eq("id", messageId).maybeSingle();
  if (message.error || !message.data) return json({ error: "Message not found" }, 404);
  if (!EDITABLE.has(message.data.status)) return json({ error: `Attachments cannot be changed from status ${message.data.status}` }, 409);

  let files: any[] = [];
  if (fileIds.length) {
    const result = await service.from("crm_files").select("*").in("id", fileIds).eq("source_type", "prospect").eq("source_id", message.data.lead_id);
    if (result.error) throw result.error;
    files = result.data || [];
    if (files.length !== fileIds.length) return json({ error: "One or more files do not belong to this buyer" }, 422);
  }
  const total = files.reduce((sum, file) => sum + Number(file.size_bytes || 0), 0);
  if (message.data.channel === "email" && total > MAX_EMAIL_ATTACHMENT_BYTES) return json({ error: "Email attachments exceed the safe 12 MB raw limit" }, 413);
  if (message.data.channel === "whatsapp" && files.length > 0) {
    return json({ error: "WhatsApp one-click dispatch is text-only. Remove selected files or switch this draft to email." }, 422);
  }

  await service.from("outreach_message_attachments").update({ status: "removed" }).eq("message_id", messageId).neq("status", "sent");
  if (files.length) {
    const rows = files.map((file) => ({
      message_id: messageId,
      crm_file_id: file.id,
      channel: message.data.channel,
      status: "selected",
      error: null,
      metadata: { file_name: file.file_name, mime_type: file.mime_type, size_bytes: file.size_bytes },
      created_by: userId,
    }));
    const saved = await service.from("outreach_message_attachments").upsert(rows, { onConflict: "message_id,crm_file_id" });
    if (saved.error) throw saved.error;
  }
  await event(service, message.data, "status_sync", { action: "attachments_updated", file_ids: fileIds, count: files.length, total_bytes: total }, userId);
  return json({ ok: true, message_id: messageId, selected_count: files.length, total_bytes: total, sent: false });
}

async function approve(service: Db, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  if (!messageId) return json({ error: "message_id required" }, 400);
  const current = await service.from("outreach_messages")
    .select("*,b2b_leads(id,email,phone,whatsapp,outreach_opt_out,crm_status,verification_score)")
    .eq("id", messageId)
    .maybeSingle();
  if (current.error || !current.data) return json({ error: "Message not found" }, 404);
  const message = current.data;
  if (["sent", "replied"].includes(message.status)) {
    return json({ ok: true, status: message.status, already_dispatched: true, message_id: message.id });
  }
  if (!EDITABLE.has(message.status)) return json({ error: `Message cannot be approved from status ${message.status}` }, 409);
  if (message.b2b_leads?.outreach_opt_out === true) return await markManual(service, message, userId, "Lead opted out of outreach");
  if (!eligibleLead(message.b2b_leads || {})) return await markManual(service, message, userId, "Lead is no longer verified or qualified");
  if (commercialCommitment(message.body_text)) return await markManual(service, message, userId, "Draft contains pricing, MOQ, certification, guarantee or delivery commitments requiring manual review");

  const attachments = await selectedAttachments(service, message.id);
  if (message.channel === "email") {
    const email = validEmail(message.recipient_email);
    if (!email) return await markManual(service, message, userId, "Valid recipient email is missing");
    const total = attachments.reduce((sum, item) => sum + Number(item.file.size_bytes || 0), 0);
    if (total > MAX_EMAIL_ATTACHMENT_BYTES) return await markManual(service, message, userId, "Selected email attachments exceed the safe 12 MB raw limit");
    const approved = await saveApproval(service, message, userId, null);
    return json({
      ok: true,
      status: "approved",
      channel: "email",
      message_id: approved.id,
      dispatch_target: "outreach-email-dispatch-v2",
      attachment_count: attachments.length,
      sent: false,
    });
  }

  if (attachments.length > 0) {
    return await markManual(service, message, userId, "WhatsApp one-click dispatch is text-only. Remove selected files or switch this draft to email.");
  }
  const phone = normalizePhone(message.recipient_whatsapp);
  if (!phone) return await markManual(service, message, userId, "Valid WhatsApp number is missing");
  const waId = phone.replace(/\D/g, "");

  let contact = await service.from("whatsapp_contacts").select("*").eq("crm_lead_id", message.lead_id).maybeSingle();
  if (contact.error) throw contact.error;
  if (!contact.data) {
    const byWa = await service.from("whatsapp_contacts").select("*").eq("wa_id", waId).maybeSingle();
    if (byWa.error) throw byWa.error;
    contact = byWa;
  }
  if (!contact.data) return await markManual(service, message, userId, "WhatsApp contact is not opted in or linked to this CRM lead");
  if (["opted_out", "blocked"].includes(contact.data.opt_in_status)) {
    return await markManual(service, message, userId, `WhatsApp contact is ${contact.data.opt_in_status}`);
  }

  let conversation = await service.from("whatsapp_conversations")
    .select("*")
    .eq("contact_id", contact.data.id)
    .eq("status", "open")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (conversation.error) throw conversation.error;
  if (!conversation.data) {
    conversation = await service.from("whatsapp_conversations").insert({
      contact_id: contact.data.id,
      status: "open",
      qualification_status: "unreviewed",
      unread_count: 0,
    }).select("*").single();
    if (conversation.error || !conversation.data) throw conversation.error || new Error("WhatsApp conversation could not be created");
  }

  const waDraft = await service.from("whatsapp_messages").insert({
    conversation_id: conversation.data.id,
    contact_id: contact.data.id,
    direction: "outbound",
    message_type: "text",
    body: cleanLines(message.body_text, 8000),
    status: "draft",
    requires_owner_approval: true,
    created_by: userId,
    raw_payload: {
      outreach_message_id: message.id,
      owner_approved_in_outreach: true,
      external_execution: false,
    },
  }).select("*").single();
  if (waDraft.error || !waDraft.data) throw waDraft.error || new Error("WhatsApp audit draft could not be created");
  const approved = await saveApproval(service, message, userId, waDraft.data.id);
  await event(service, approved, "status_sync", { action: "whatsapp_prepared", whatsapp_message_id: waDraft.data.id }, userId);
  return json({
    ok: true,
    status: "approved",
    channel: "whatsapp",
    message_id: approved.id,
    whatsapp_message_id: waDraft.data.id,
    dispatch_target: "whatsapp-admin",
    sent: false,
  });
}

async function finalizeWhatsApp(service: Db, userId: string, body: JsonRecord) {
  const messageId = clean(body.message_id, 80);
  if (!messageId) return json({ error: "message_id required" }, 400);
  const outreach = await service.from("outreach_messages").select("*").eq("id", messageId).maybeSingle();
  if (outreach.error || !outreach.data) return json({ error: "Outreach message not found" }, 404);
  const message = outreach.data;
  if (message.channel !== "whatsapp" || !message.whatsapp_message_id) return json({ error: "Prepared WhatsApp message is missing" }, 409);
  const provider = await service.from("whatsapp_messages").select("*").eq("id", message.whatsapp_message_id).maybeSingle();
  if (provider.error || !provider.data) return json({ error: "WhatsApp provider record not found" }, 404);

  if (provider.data.status === "sent") {
    const sentAt = provider.data.sent_at || new Date().toISOString();
    await service.from("outreach_messages").update({
      status: "sent",
      sent_at: sentAt,
      error: null,
      manual_reason: null,
      connector_response: {
        ...record(message.connector_response),
        provider: "meta_whatsapp",
        whatsapp_message_id: provider.data.id,
        wa_message_id: provider.data.wa_message_id || null,
      },
    }).eq("id", message.id);
    await service.from("b2b_leads").update({
      crm_status: "contacted",
      lead_status: "Pitched",
      last_outreach_at: sentAt,
      last_outreach_status: "sent:whatsapp",
    }).eq("id", message.lead_id);
    await event(service, message, "sent", { channel: "whatsapp", wa_message_id: provider.data.wa_message_id || null }, userId);
    await refreshCampaign(service, message.campaign_id);
    return json({ ok: true, status: "sent", channel: "whatsapp", message_id: message.id, wa_message_id: provider.data.wa_message_id || null });
  }

  const providerError = clean(body.provider_error, 4000) || provider.data.error || "WhatsApp provider did not accept the message";
  if (provider.data.status === "failed") {
    await service.from("outreach_messages").update({ status: "failed", error: providerError, manual_reason: null }).eq("id", message.id);
    await service.from("b2b_leads").update({ last_outreach_status: "failed:whatsapp" }).eq("id", message.lead_id);
    await event(service, message, "send_failed", { channel: "whatsapp", error: providerError.slice(0, 2000) }, userId);
    await refreshCampaign(service, message.campaign_id);
    return json({ ok: false, status: "failed", channel: "whatsapp", message_id: message.id, error: providerError }, 500);
  }

  return await markManual(service, message, userId, providerError);
}

async function saveApproval(service: Db, message: any, userId: string, whatsappMessageId: string | null) {
  const approvedAt = new Date().toISOString();
  const saved = await service.from("outreach_messages").update({
    status: "approved",
    approved_by: userId,
    approved_at: approvedAt,
    dispatched_by: userId,
    whatsapp_message_id: whatsappMessageId,
    manual_reason: null,
    error: null,
  }).eq("id", message.id).select("*").single();
  if (saved.error || !saved.data) throw saved.error || new Error("Message approval failed");
  await event(service, saved.data, "approved", { channel: saved.data.channel, provider_dispatch_pending: true }, userId);
  await refreshCampaign(service, saved.data.campaign_id);
  return saved.data;
}

async function selectedAttachments(service: Db, messageId: string) {
  const links = await service.from("outreach_message_attachments").select("*").eq("message_id", messageId).eq("status", "selected").order("created_at", { ascending: true });
  if (links.error) throw links.error;
  const ids = (links.data || []).map((item) => item.crm_file_id);
  if (!ids.length) return [] as Array<{ link: any; file: any }>;
  const files = await service.from("crm_files").select("*").in("id", ids);
  if (files.error) throw files.error;
  const map = new Map((files.data || []).map((file) => [file.id, file]));
  return (links.data || []).map((link) => ({ link, file: map.get(link.crm_file_id) })).filter((item) => Boolean(item.file));
}

async function markManual(service: Db, message: any, userId: string, reason: string): Promise<Response> {
  await service.from("outreach_messages").update({
    status: "manual_required",
    manual_reason: reason.slice(0, 4000),
    error: null,
    approved_by: userId,
    approved_at: new Date().toISOString(),
    dispatched_by: userId,
  }).eq("id", message.id);
  await service.from("b2b_leads").update({ last_outreach_status: `manual_required:${message.channel}` }).eq("id", message.lead_id);
  await event(service, message, "status_sync", { action: "manual_required", channel: message.channel, reason: reason.slice(0, 2000) }, userId);
  await refreshCampaign(service, message.campaign_id);
  return json({ ok: false, status: "manual_required", channel: message.channel, message_id: message.id, reason }, 422);
}

async function event(service: Db, message: any, eventType: string, detail: JsonRecord, actor: string) {
  const result = await service.from("outreach_events").insert({
    campaign_id: message.campaign_id,
    message_id: message.id,
    lead_id: message.lead_id,
    event_type: eventType,
    detail,
    actor,
  });
  if (result.error) throw result.error;
}

async function refreshCampaign(service: Db, campaignId: string) {
  const result = await service.from("outreach_messages").select("status").eq("campaign_id", campaignId);
  if (result.error) throw result.error;
  const statuses = (result.data || []).map((item) => item.status);
  await service.from("outreach_campaigns").update({
    draft_count: statuses.filter((status) => status === "draft").length,
    approved_count: statuses.filter((status) => status === "approved").length,
    sent_count: statuses.filter((status) => ["sent", "replied"].includes(status)).length,
    replied_count: statuses.filter((status) => status === "replied").length,
    failed_count: statuses.filter((status) => ["failed", "manual_required"].includes(status)).length,
    status: campaignStatus(statuses),
  }).eq("id", campaignId);
}

function campaignStatus(statuses: string[]) {
  if (!statuses.length) return "draft";
  if (statuses.some((status) => status === "sending")) return "sending";
  if (statuses.every((status) => ["sent", "replied", "suppressed", "rejected", "unsubscribed", "manual_required"].includes(status))) return "completed";
  if (statuses.some((status) => ["sent", "replied"].includes(status))) return "active";
  return "ready";
}

async function aiDraftBatch(leads: any[], campaign: any): Promise<Draft[]> {
  const prompt = `Write evidence-based one-to-one B2B apparel outreach drafts for Irha Apparels.
Return strict JSON only: {"drafts":[{"index":0,"language":"English","subject":"","body_text":"","evidence":[],"risk_flags":[]}]}
Rules:
- Use only supplied lead facts.
- Irha Apparels is an experienced B2B apparel manufacturer in Sialkot, Pakistan; the website is newly built.
- A scheduled live factory video call may be offered as a trust option.
- No prices, MOQ numbers, delivery promises, certifications, guarantees, buyer intent claims or fake prior relationship.
- Ask for product requirements for a custom quote.
- Email drafts: under 150 words. WhatsApp drafts: under 85 words, natural and concise.
- Use the selected channel and an appropriate market language when language mode is auto.

CAMPAIGN:
${JSON.stringify({ products: campaign.product_focus, market: campaign.target_market, objective: campaign.objective, language_mode: campaign.language_mode, cta: campaign.call_to_action })}

LEADS:
${JSON.stringify(leads.map((lead, index) => ({ index, channel: lead.selected_channel, company: lead.company_name, country: lead.country, website: lead.website, buyer_type: lead.buyer_type, product_fit: lead.apparel_segment, notes: lead.notes })))} `;
  const result = await aiJson(prompt);
  const source = Array.isArray(result.drafts) ? result.drafts : [];
  return source.map((item: any) => ({
    index: Number(item.index),
    language: clean(item.language, 80) || "English",
    subject: clean(item.subject, 300),
    body_text: cleanLines(item.body_text, 12000),
    evidence: stringArray(item.evidence).slice(0, 20),
    risk_flags: stringArray(item.risk_flags).slice(0, 20),
  })).filter((item: Draft) => Number.isInteger(item.index) && item.body_text.length >= 20 && !commercialCommitment(item.body_text));
}

async function aiJson(prompt: string): Promise<JsonRecord> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("OUTREACH_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.25,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "Write truthful B2B outreach and return strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(apiError(payload, `AI gateway returned ${response.status}`));
  const choices = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices as JsonRecord[] : [];
  const message = choices.length && isRecord(choices[0].message) ? choices[0].message as JsonRecord : {};
  if (typeof message.content !== "string") throw new Error("AI returned no JSON content");
  const cleaned = message.content.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("AI returned invalid JSON");
  }
}

function commercialCommitment(value: unknown) {
  const text = cleanLines(value, 12000);
  return /(?:[$€£]\s*\d|\b(?:USD|EUR|GBP|PKR)\s*\d|\b(?:MOQ|minimum order(?: quantity)?)\s*(?:is|of|:)?\s*\d+|\b(?:delivery|lead time|dispatch)\s*(?:in|within|is|:)?\s*\d+\s*(?:day|week)|\b(?:we are|we're|our factory is)\s+(?:ISO|CE|GOTS|OEKO|certified)|\bguarantee(?:d|s)?\b)/i.test(text);
}
function eligibleLead(lead: any) {
  const score = Number(lead.verification_score);
  return (Number.isFinite(score) && score >= 70) || ELIGIBLE_CRM.has(clean(lead.crm_status, 80));
}
function chooseChannel(preferred: string, email: string | null, whatsapp: string | null): Channel | null {
  if (preferred === "whatsapp" && whatsapp) return "whatsapp";
  if (preferred === "email" && email) return "email";
  if (email) return "email";
  if (whatsapp) return "whatsapp";
  return null;
}
function normalizePreferred(value: unknown) {
  const channel = clean(value, 20).toLowerCase();
  return channel === "email" || channel === "whatsapp" ? channel : "auto";
}
function normalizeChannel(value: unknown): Channel {
  return clean(value, 20).toLowerCase() === "whatsapp" ? "whatsapp" : "email";
}
function validEmail(value: unknown) {
  const email = clean(value, 320).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
function normalizePhone(value: unknown) {
  const raw = clean(value, 180);
  const match = raw.match(/(?:\+|00)?\d[\d\s().\/-]{6,}\d/)?.[0] || "";
  const digits = match.replace(/\D/g, "");
  return digits.length >= 7 && digits.length <= 16 ? match.trim() : null;
}
function validWindowHours() {
  const value = Number(Deno.env.get("WHATSAPP_CUSTOMER_SERVICE_WINDOW_HOURS"));
  return Number.isFinite(value) && value > 0 && value <= 168 ? value : null;
}
function stringArray(value: unknown) {
  return Array.isArray(value)
    ? [...new Set(value.map((item) => clean(item, 500)).filter(Boolean))]
    : typeof value === "string"
      ? [...new Set(value.split(/[,\n]/).map((item) => clean(item, 500)).filter(Boolean))]
      : [];
}
function clean(value: unknown, max = 500) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max)
    : "";
}
function cleanLines(value: unknown, max = 12000) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim().slice(0, max)
    : "";
}
function record(value: unknown): JsonRecord { return isRecord(value) ? value : {}; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text.slice(0, 2000); }
}
function apiError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload) return `${fallback}: ${payload}`;
  if (isRecord(payload)) {
    for (const key of ["error", "message", "detail"]) {
      if (typeof payload[key] === "string") return `${fallback}: ${payload[key]}`;
    }
  }
  return fallback;
}
function errorText(error: unknown) {
  return error instanceof Error
    ? error.message.slice(0, 4000)
    : typeof error === "string"
      ? error.slice(0, 4000)
      : "Internal error";
}
function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
