// Irha AI Outreach Engine v1
// Admin-only AI drafting, explicit approval, Gmail delivery and reply sync.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev";
const GMAIL_BASE = `${GATEWAY}/google-mail/gmail/v1/users/me`;
const MAX_GENERATE = 50;
const MAX_SEND = 10;
const MAX_SYNC = 30;
const MAX_FOLLOW_UP = 20;
const ELIGIBLE_CRM_STATUSES = new Set([
  "qualified",
  "contacted",
  "replied",
  "sample_requested",
  "quote_requested",
  "quotation_sent",
  "negotiation",
  "follow_up",
]);

type DbClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;
type OutreachDraft = {
  index: number;
  language: string;
  subject: string;
  body_text: string;
  personalization_evidence: string[];
  risk_flags: string[];
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await auth.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await auth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "health") return await health(service);
    if (action === "generate") return await generateDrafts(service, user.id, body);
    if (action === "update") return await updateDraft(service, user.id, body);
    if (action === "send") return await sendMessages(service, user.id, body);
    if (action === "sync_replies") return await syncReplies(service, user.id, body);
    if (action === "generate_followups") return await generateFollowUps(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("outreach-engine error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const gmailKey = Deno.env.get("GOOGLE_MAIL_API_KEY") || "";
  const tables = await Promise.all(
    ["outreach_campaigns", "outreach_messages", "outreach_events"].map(async (table) => {
      const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
      return { table, ready: !error, error: error?.message };
    }),
  );

  let gmailVerified = false;
  let gmailProfile: JsonRecord | null = null;
  let gmailError: string | null = null;
  if (lovableKey && gmailKey) {
    try {
      const response = await gmailFetch("/profile", { method: "GET" });
      const payload = await safeJson(response);
      gmailVerified = response.ok;
      if (response.ok && isRecord(payload)) {
        gmailProfile = {
          emailAddress: payload.emailAddress ?? null,
          messagesTotal: payload.messagesTotal ?? null,
          threadsTotal: payload.threadsTotal ?? null,
        };
      } else {
        gmailError = readApiError(payload, `Gmail profile returned ${response.status}`);
      }
    } catch (error) {
      gmailError = error instanceof Error ? error.message : "Gmail verification failed";
    }
  }

  const databaseReady = tables.every((item) => item.ready);
  return json({
    ok: true,
    database_ready: databaseReady,
    tables,
    ai_gateway_configured: Boolean(lovableKey),
    gmail_configured: Boolean(lovableKey && gmailKey),
    gmail_verified: gmailVerified,
    gmail_profile: gmailProfile,
    gmail_error: gmailError,
    ready_to_generate: Boolean(lovableKey && databaseReady),
    ready_to_send: Boolean(lovableKey && gmailKey && gmailVerified && databaseReady),
    limits: {
      generate_per_request: MAX_GENERATE,
      send_per_request: MAX_SEND,
      reply_sync_per_request: MAX_SYNC,
    },
    approval_policy: "Only explicitly approved messages, or previously approved failed retries, may be sent.",
  });
}

async function generateDrafts(service: DbClient, userId: string, body: JsonRecord) {
  if (!Deno.env.get("LOVABLE_API_KEY")) {
    return json({ error: "Lovable AI gateway is not configured" }, 503);
  }
  const leadIds = stringArray(body.lead_ids).slice(0, MAX_GENERATE);
  if (leadIds.length === 0) return json({ error: "lead_ids[] required" }, 400);

  const campaignInput = isRecord(body.campaign) ? body.campaign : {};
  const campaignIdInput = typeof body.campaign_id === "string" ? body.campaign_id : null;
  let campaign: JsonRecord;
  if (campaignIdInput) {
    const { data, error } = await service
      .from("outreach_campaigns")
      .select("*")
      .eq("id", campaignIdInput)
      .maybeSingle();
    if (error || !data) return json({ error: "Outreach campaign not found" }, 404);
    campaign = data as JsonRecord;
  } else {
    const normalized = normalizeCampaign(campaignInput, leadIds.length, userId);
    if (!normalized.objective) return json({ error: "campaign.objective is required" }, 400);
    const { data, error } = await service.from("outreach_campaigns").insert(normalized).select("*").single();
    if (error || !data) throw new Error(error?.message || "Could not create outreach campaign");
    campaign = data as JsonRecord;
  }

  const campaignId = String(campaign.id);
  await service.from("outreach_campaigns").update({
    status: "generating",
    error: null,
    selected_lead_count: leadIds.length,
  }).eq("id", campaignId);

  const { data: leads, error: leadsError } = await service
    .from("b2b_leads")
    .select("id,company_name,country,email,phone,website,apparel_segment,notes,crm_status,buyer_type,verification_score,verification_evidence,outreach_opt_out,last_outreach_at,last_outreach_status")
    .in("id", leadIds);
  if (leadsError) throw new Error(leadsError.message);

  const { data: existingRows } = await service
    .from("outreach_messages")
    .select("lead_id")
    .eq("campaign_id", campaignId)
    .eq("sequence_number", 0);
  const existingLeadIds = new Set((existingRows ?? []).map((row) => row.lead_id));

  const eligibilityFailures: JsonRecord[] = [];
  const candidates = (leads ?? []).filter((lead) => {
    if (existingLeadIds.has(lead.id)) {
      eligibilityFailures.push({ lead_id: lead.id, error: "Initial outreach draft already exists in this campaign" });
      return false;
    }
    if (!normalizeEmail(lead.email)) {
      eligibilityFailures.push({ lead_id: lead.id, error: "No valid business email" });
      return false;
    }
    if (lead.outreach_opt_out === true) {
      eligibilityFailures.push({ lead_id: lead.id, error: "Lead opted out" });
      return false;
    }
    if (!isEligibleLead(lead)) {
      eligibilityFailures.push({
        lead_id: lead.id,
        error: "Lead must have verification score 70+ or a qualified CRM status before outreach",
      });
      return false;
    }
    return true;
  });

  const emails = candidates
    .map((lead) => normalizeEmail(lead.email))
    .filter((email): email is string => Boolean(email));
  const { data: suppressedRows } = emails.length > 0
    ? await service.from("suppressed_emails").select("email,reason").in("email", emails)
    : { data: [] as Array<{ email: string; reason: string }> };
  const suppressed = new Map((suppressedRows ?? []).map((row) => [row.email.toLowerCase(), row.reason]));

  const generated: OutreachDraft[] = [];
  const failures: JsonRecord[] = [...eligibilityFailures];
  for (let offset = 0; offset < candidates.length; offset += 8) {
    const batch = candidates.slice(offset, offset + 8);
    try {
      const values = await generateBatch(batch, campaign);
      generated.push(...values.map((value) => ({ ...value, index: value.index + offset })));
    } catch (error) {
      failures.push({
        lead_ids: batch.map((lead) => lead.id),
        error: error instanceof Error ? error.message : "AI generation failed",
      });
    }
  }

  const byIndex = new Map(generated.map((draft) => [draft.index, draft]));
  const rows: JsonRecord[] = [];
  candidates.forEach((lead, index) => {
    const email = normalizeEmail(lead.email);
    if (!email) return;
    const draft = byIndex.get(index);
    if (!draft) {
      failures.push({ lead_id: lead.id, error: "AI returned no draft for this lead" });
      return;
    }
    const suppressionReason = suppressed.get(email);
    const status = suppressionReason ? "suppressed" : "draft";
    rows.push({
      campaign_id: campaignId,
      lead_id: lead.id,
      sequence_number: 0,
      recipient_email: email,
      recipient_company: lead.company_name,
      language: draft.language,
      subject: draft.subject,
      body_text: draft.body_text,
      personalization_evidence: {
        evidence: draft.personalization_evidence,
        risk_flags: draft.risk_flags,
        lead_verification_score: lead.verification_score ?? null,
        lead_crm_status: lead.crm_status ?? null,
        generated_from: {
          country: lead.country,
          website: lead.website,
          buyer_type: lead.buyer_type,
          apparel_segment: lead.apparel_segment,
        },
      },
      status,
      idempotency_key: `outreach-${campaignId}-${lead.id}-0`,
      error: suppressionReason ? `Suppressed: ${suppressionReason}` : null,
    });
  });

  let inserted: JsonRecord[] = [];
  if (rows.length > 0) {
    const { data, error } = await service
      .from("outreach_messages")
      .insert(rows)
      .select("id,lead_id,status");
    if (error) throw new Error(error.message);
    inserted = (data ?? []) as JsonRecord[];
    const events = inserted.map((row) => ({
      campaign_id: campaignId,
      message_id: row.id,
      lead_id: row.lead_id,
      event_type: row.status === "suppressed" ? "suppressed" : "draft_generated",
      detail: { sequence_number: 0 },
      actor: userId,
    }));
    if (events.length > 0) await service.from("outreach_events").insert(events);
  }

  await refreshCampaignCounts(service, campaignId);
  await service.from("outreach_campaigns").update({
    status: inserted.length > 0 ? "ready" : "failed",
    error: failures.length > 0 ? JSON.stringify(failures).slice(0, 4000) : null,
  }).eq("id", campaignId);

  return json({
    ok: inserted.length > 0,
    campaign_id: campaignId,
    created: inserted.length,
    suppressed: inserted.filter((row) => row.status === "suppressed").length,
    skipped: eligibilityFailures.length,
    failures,
    note: "Messages are drafts only. Nothing was approved or sent.",
  }, inserted.length > 0 ? 200 : 422);
}

async function updateDraft(service: DbClient, userId: string, body: JsonRecord) {
  const messageId = typeof body.message_id === "string" ? body.message_id : "";
  if (!messageId) return json({ error: "message_id required" }, 400);
  const { data: current, error } = await service
    .from("outreach_messages")
    .select("*")
    .eq("id", messageId)
    .maybeSingle();
  if (error || !current) return json({ error: "Message not found" }, 404);
  if (["sent", "replied", "unsubscribed", "suppressed"].includes(current.status)) {
    return json({ error: `Message cannot be edited from status ${current.status}` }, 409);
  }

  const nextStatus = typeof body.status === "string" && ["draft", "approved", "rejected"].includes(body.status)
    ? body.status
    : current.status;
  const subject = typeof body.subject === "string" ? cleanText(body.subject, 300) : current.subject;
  const bodyText = typeof body.body_text === "string"
    ? cleanTextPreserveLines(body.body_text, 12000)
    : current.body_text;
  const language = typeof body.language === "string" ? cleanText(body.language, 80) : current.language;
  if (!subject || !bodyText) return json({ error: "subject and body_text are required" }, 400);

  const update: JsonRecord = {
    subject,
    body_text: bodyText,
    language,
    status: nextStatus,
    error: null,
  };
  if (nextStatus === "approved") {
    update.approved_by = userId;
    update.approved_at = new Date().toISOString();
  } else {
    update.approved_by = null;
    update.approved_at = null;
  }

  const { data, error: updateError } = await service
    .from("outreach_messages")
    .update(update)
    .eq("id", messageId)
    .select("campaign_id,lead_id,status")
    .single();
  if (updateError || !data) throw new Error(updateError?.message || "Draft update failed");

  await service.from("outreach_events").insert({
    campaign_id: data.campaign_id,
    message_id: messageId,
    lead_id: data.lead_id,
    event_type: nextStatus === "rejected" ? "rejected" : nextStatus === "approved" ? "approved" : "status_sync",
    detail: { edited: true, status: nextStatus },
    actor: userId,
  });
  await refreshCampaignCounts(service, data.campaign_id);
  return json({ ok: true, message_id: messageId, status: nextStatus });
}

async function sendMessages(service: DbClient, userId: string, body: JsonRecord) {
  const ids = stringArray(body.message_ids).slice(0, MAX_SEND);
  if (ids.length === 0) return json({ error: "message_ids[] required" }, 400);
  const healthResult = await verifyGmail();
  if (!healthResult.ok) {
    return json({ error: healthResult.error || "Gmail is not ready", code: "GMAIL_NOT_READY" }, 503);
  }

  const { data: messages, error } = await service
    .from("outreach_messages")
    .select("*,b2b_leads(id,outreach_opt_out,crm_status,verification_score)")
    .in("id", ids);
  if (error) throw new Error(error.message);
  const outcomes: JsonRecord[] = [];

  for (const message of messages ?? []) {
    const isApproved = message.status === "approved" && Boolean(message.approved_at && message.approved_by);
    const isApprovedRetry = message.status === "failed" && Boolean(message.approved_at && message.approved_by);
    if (!isApproved && !isApprovedRetry) {
      outcomes.push({
        id: message.id,
        status: "skipped",
        reason: "Explicit approval is required before sending",
      });
      continue;
    }
    if (!isEligibleLead(message.b2b_leads ?? {})) {
      outcomes.push({ id: message.id, status: "skipped", reason: "Lead is no longer verified or qualified" });
      continue;
    }

    const email = normalizeEmail(message.recipient_email);
    if (!email) {
      await markFailed(service, message, userId, "Invalid recipient email");
      outcomes.push({ id: message.id, status: "failed", error: "Invalid recipient email" });
      continue;
    }

    const { data: suppressed } = await service
      .from("suppressed_emails")
      .select("reason")
      .ilike("email", email)
      .maybeSingle();
    const leadOptOut = message.b2b_leads?.outreach_opt_out === true;
    if (suppressed || leadOptOut) {
      const reason = leadOptOut ? "Lead opted out" : `Suppressed: ${suppressed?.reason}`;
      await service.from("outreach_messages").update({ status: "suppressed", error: reason }).eq("id", message.id);
      await event(service, message, "suppressed", { reason }, userId);
      outcomes.push({ id: message.id, status: "suppressed", reason });
      continue;
    }

    const deterministicMessageId = `<irha-outreach-${message.id}@irhaapparels.com>`;
    const recovered = await findByMessageId(deterministicMessageId);
    if (recovered) {
      await markSent(service, message, userId, recovered, true);
      outcomes.push({
        id: message.id,
        status: "sent",
        recovered: true,
        gmail_message_id: recovered.id,
        gmail_thread_id: recovered.threadId,
      });
      continue;
    }

    await service.from("outreach_messages").update({
      status: "sending",
      error: null,
    }).eq("id", message.id);
    await event(service, message, "send_started", {}, userId);

    try {
      const unsubscribeUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/outreach-unsubscribe?token=${encodeURIComponent(message.unsubscribe_token)}`;
      const raw = buildMimeMessage({
        to: email,
        subject: message.subject,
        body: appendFooter(message.body_text, unsubscribeUrl),
        messageId: deterministicMessageId,
        unsubscribeUrl,
      });
      const response = await gmailFetch("/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ raw }),
      });
      const payload = await safeJson(response);
      if (!response.ok || !isRecord(payload) || typeof payload.id !== "string") {
        throw new Error(readApiError(payload, `Gmail send returned ${response.status}`));
      }
      await markSent(service, message, userId, payload, false);
      outcomes.push({
        id: message.id,
        status: "sent",
        gmail_message_id: payload.id,
        gmail_thread_id: payload.threadId ?? null,
      });
    } catch (sendError) {
      const reason = sendError instanceof Error ? sendError.message : "Gmail send failed";
      await markFailed(service, message, userId, reason);
      outcomes.push({ id: message.id, status: "failed", error: reason });
    }
  }

  const campaignIds = [...new Set((messages ?? []).map((message) => message.campaign_id))];
  for (const campaignId of campaignIds) await refreshCampaignCounts(service, campaignId);
  return json({
    ok: outcomes.some((item) => item.status === "sent"),
    outcomes,
    summary: summarize(outcomes),
  });
}

async function syncReplies(service: DbClient, userId: string, body: JsonRecord) {
  const healthResult = await verifyGmail();
  if (!healthResult.ok) {
    return json({ error: healthResult.error || "Gmail is not ready", code: "GMAIL_NOT_READY" }, 503);
  }
  const campaignId = typeof body.campaign_id === "string" ? body.campaign_id : null;
  let query = service
    .from("outreach_messages")
    .select("*")
    .eq("status", "sent")
    .not("gmail_thread_id", "is", null)
    .order("sent_at", { ascending: false })
    .limit(MAX_SYNC);
  if (campaignId) query = query.eq("campaign_id", campaignId);
  const { data: messages, error } = await query;
  if (error) throw new Error(error.message);

  const outcomes: JsonRecord[] = [];
  for (const message of messages ?? []) {
    try {
      const response = await gmailFetch(
        `/threads/${encodeURIComponent(message.gmail_thread_id)}?format=metadata&metadataHeaders=From&metadataHeaders=Date`,
        { method: "GET" },
      );
      const payload = await safeJson(response);
      if (!response.ok || !isRecord(payload)) {
        throw new Error(readApiError(payload, `Gmail thread returned ${response.status}`));
      }
      const threadMessages = Array.isArray(payload.messages) ? payload.messages as JsonRecord[] : [];
      const reply = threadMessages.find((item) => {
        const headers = isRecord(item.payload) && Array.isArray(item.payload.headers)
          ? item.payload.headers as JsonRecord[]
          : [];
        const from = headers.find((header) => String(header.name || "").toLowerCase() === "from");
        return typeof from?.value === "string"
          && from.value.toLowerCase().includes(message.recipient_email.toLowerCase())
          && item.id !== message.gmail_message_id;
      });
      if (!reply) {
        outcomes.push({ id: message.id, status: "no_reply" });
        continue;
      }
      const repliedAt = new Date().toISOString();
      await service.from("outreach_messages").update({
        status: "replied",
        replied_at: repliedAt,
        connector_response: {
          ...safeRecord(message.connector_response),
          reply_message_id: reply.id,
          reply_thread_id: reply.threadId,
        },
      }).eq("id", message.id);
      await service.from("b2b_leads").update({
        crm_status: "replied",
        lead_status: "Replied",
        last_reply_at: repliedAt,
        last_outreach_status: "replied",
      }).eq("id", message.lead_id);
      await event(service, message, "reply_detected", {
        gmail_message_id: reply.id,
        gmail_thread_id: reply.threadId,
      }, userId);
      outcomes.push({ id: message.id, status: "replied", reply_message_id: reply.id });
    } catch (syncError) {
      outcomes.push({
        id: message.id,
        status: "failed",
        error: syncError instanceof Error ? syncError.message : "Reply sync failed",
      });
    }
  }

  const campaignIds = [...new Set((messages ?? []).map((message) => message.campaign_id))];
  for (const id of campaignIds) await refreshCampaignCounts(service, id);
  return json({ ok: true, outcomes, summary: summarize(outcomes) });
}

async function generateFollowUps(service: DbClient, userId: string, body: JsonRecord) {
  if (!Deno.env.get("LOVABLE_API_KEY")) {
    return json({ error: "Lovable AI gateway is not configured" }, 503);
  }
  const campaignId = typeof body.campaign_id === "string" ? body.campaign_id : "";
  const minimumDays = clampNumber(body.minimum_days, 1, 30, 5);
  if (!campaignId) return json({ error: "campaign_id required" }, 400);

  const cutoff = new Date(Date.now() - minimumDays * 86400000).toISOString();
  const { data: parents, error } = await service
    .from("outreach_messages")
    .select("*,b2b_leads(company_name,country,website,buyer_type,apparel_segment,notes,outreach_opt_out,crm_status,verification_score)")
    .eq("campaign_id", campaignId)
    .eq("sequence_number", 0)
    .eq("status", "sent")
    .lt("sent_at", cutoff)
    .order("sent_at", { ascending: true })
    .limit(MAX_FOLLOW_UP);
  if (error) throw new Error(error.message);

  const { data: existing } = await service
    .from("outreach_messages")
    .select("lead_id")
    .eq("campaign_id", campaignId)
    .eq("sequence_number", 1);
  const existingLeadIds = new Set((existing ?? []).map((item) => item.lead_id));
  const eligible = (parents ?? []).filter((item) =>
    !existingLeadIds.has(item.lead_id)
    && item.b2b_leads?.outreach_opt_out !== true
    && isEligibleLead(item.b2b_leads ?? {})
  );
  if (eligible.length === 0) {
    return json({ ok: true, created: 0, note: "No sent messages are due for a first follow-up." });
  }

  const prompt = `Create concise first follow-up emails for B2B apparel buyer outreach.
Rules:
- Return strict JSON only.
- Do not invent facts, orders, prior interest, certifications, pricing or urgency.
- Clearly refer to the earlier email without claiming it was read.
- Mention Irha Apparels is an experienced manufacturer in Sialkot and the website is newly built only where natural.
- Offer a live factory video call as a trust option.
- No public price. Ask for requirements for a custom quote.
- Keep each body under 110 words.

Return {"drafts":[{"index":0,"subject":"","body_text":"","language":"English","personalization_evidence":[]}]}

MESSAGES:
${JSON.stringify(eligible.map((item, index) => ({
  index,
  company: item.recipient_company,
  email: item.recipient_email,
  country: item.b2b_leads?.country,
  buyer_type: item.b2b_leads?.buyer_type,
  product_fit: item.b2b_leads?.apparel_segment,
  previous_subject: item.subject,
  previous_body: item.body_text,
})))}`;
  const result = await aiJson(prompt);
  const drafts = Array.isArray(result.drafts) ? result.drafts as JsonRecord[] : [];
  const byIndex = new Map(drafts.map((draft) => [Number(draft.index), draft]));
  const rows = eligible.flatMap((parent, index) => {
    const draft = byIndex.get(index);
    if (!draft) return [];
    const subject = cleanText(draft.subject, 300);
    const bodyText = cleanTextPreserveLines(draft.body_text, 12000);
    if (!subject || !bodyText) return [];
    return [{
      campaign_id: campaignId,
      lead_id: parent.lead_id,
      sequence_number: 1,
      parent_message_id: parent.id,
      recipient_email: parent.recipient_email,
      recipient_company: parent.recipient_company,
      language: cleanText(draft.language, 80) || parent.language,
      subject,
      body_text: bodyText,
      personalization_evidence: {
        evidence: stringArray(draft.personalization_evidence),
        parent_message_id: parent.id,
      },
      status: "draft",
      idempotency_key: `outreach-${campaignId}-${parent.lead_id}-1`,
    }];
  });
  if (rows.length === 0) return json({ error: "AI returned no usable follow-up drafts" }, 422);

  const { data: inserted, error: insertError } = await service
    .from("outreach_messages")
    .insert(rows)
    .select("id,lead_id");
  if (insertError) throw new Error(insertError.message);
  await service.from("outreach_events").insert((inserted ?? []).map((item) => ({
    campaign_id: campaignId,
    message_id: item.id,
    lead_id: item.lead_id,
    event_type: "draft_generated",
    detail: { sequence_number: 1, follow_up_after_days: minimumDays },
    actor: userId,
  })));
  await refreshCampaignCounts(service, campaignId);
  return json({ ok: true, created: inserted?.length ?? 0, note: "Follow-ups are drafts only. Nothing was approved or sent." });
}

async function generateBatch(leads: JsonRecord[], campaign: JsonRecord): Promise<OutreachDraft[]> {
  const prompt = `Write personalized one-to-one B2B apparel outreach email drafts.

IRHA APPARELS FACTS:
- Experienced apparel manufacturer in Sialkot, Pakistan.
- Website is newly built; do not describe the company as new.
- Factory view can be shown on a live video call.
- Services include OEM, ODM, private label and custom manufacturing.
- No public pricing. Ask the buyer to share product requirements for a tailored quote.

CAMPAIGN:
${JSON.stringify({
  product_focus: campaign.product_focus,
  target_market: campaign.target_market,
  objective: campaign.objective,
  language_mode: campaign.language_mode,
  call_to_action: campaign.call_to_action,
})}

STRICT RULES:
- Use only supplied lead facts for personalization.
- Never invent a person's name, buying activity, stock level, customer list, certification, order history, product interest or compliment.
- Do not claim you reviewed a product/category unless supplied evidence supports it.
- Avoid spam language, exaggerated claims and fixed response/delivery promises.
- Mention one relevant product fit when supported.
- Keep subject under 65 characters and body 90-160 words.
- Same language as the buyer market when language_mode is auto and confidence is high; otherwise English.
- Include a simple reply CTA or live factory video-call option.
- Do not include an unsubscribe footer; the sender adds it automatically.

Return strict JSON:
{"drafts":[{"index":0,"language":"English","subject":"","body_text":"","personalization_evidence":[],"risk_flags":[]}]}

LEADS:
${JSON.stringify(leads.map((lead, index) => ({
  index,
  company_name: lead.company_name,
  country: lead.country,
  website: lead.website,
  apparel_segment: lead.apparel_segment,
  buyer_type: lead.buyer_type,
  verification_score: lead.verification_score,
  verification_evidence: lead.verification_evidence,
  notes: typeof lead.notes === "string" ? lead.notes.slice(0, 1800) : null,
  last_outreach_at: lead.last_outreach_at,
  last_outreach_status: lead.last_outreach_status,
})))}`;

  const result = await aiJson(prompt);
  const drafts = Array.isArray(result.drafts) ? result.drafts : [];
  return drafts.flatMap((value): OutreachDraft[] => {
    if (!isRecord(value)) return [];
    const index = Number(value.index);
    const subject = cleanText(value.subject, 300);
    const bodyText = cleanTextPreserveLines(value.body_text, 12000);
    if (!Number.isInteger(index) || index < 0 || index >= leads.length || !subject || !bodyText) return [];
    return [{
      index,
      language: cleanText(value.language, 80) || "English",
      subject,
      body_text: bodyText,
      personalization_evidence: stringArray(value.personalization_evidence).slice(0, 12),
      risk_flags: stringArray(value.risk_flags).slice(0, 12),
    }];
  });
}

async function markSent(
  service: DbClient,
  message: JsonRecord,
  userId: string,
  payload: JsonRecord,
  recovered: boolean,
) {
  const sentAt = new Date().toISOString();
  await service.from("outreach_messages").update({
    status: "sent",
    gmail_message_id: payload.id ?? null,
    gmail_thread_id: payload.threadId ?? null,
    gmail_history_id: payload.historyId ?? null,
    connector_response: { ...safeRecord(payload), recovered_by_message_id: recovered },
    sent_at: sentAt,
    error: null,
  }).eq("id", message.id);
  await service.from("b2b_leads").update({
    crm_status: "contacted",
    lead_status: "Pitched",
    last_outreach_at: sentAt,
    last_outreach_status: "sent",
    last_gmail_thread_id: payload.threadId ?? null,
  }).eq("id", message.lead_id);
  await event(service, message, "sent", {
    gmail_message_id: payload.id,
    gmail_thread_id: payload.threadId,
    recovered,
  }, userId);
}

async function markFailed(service: DbClient, message: JsonRecord, userId: string, reason: string) {
  await service.from("outreach_messages").update({
    status: "failed",
    error: reason.slice(0, 2000),
  }).eq("id", message.id);
  await service.from("b2b_leads").update({ last_outreach_status: "failed" }).eq("id", message.lead_id);
  await event(service, message, "send_failed", { error: reason.slice(0, 2000) }, userId);
}

async function event(
  service: DbClient,
  message: JsonRecord,
  eventType: string,
  detail: JsonRecord,
  actor: string | null,
) {
  await service.from("outreach_events").insert({
    campaign_id: message.campaign_id,
    message_id: message.id,
    lead_id: message.lead_id,
    event_type: eventType,
    detail,
    actor,
  });
}

async function refreshCampaignCounts(service: DbClient, campaignId: string) {
  const { data } = await service.from("outreach_messages").select("status").eq("campaign_id", campaignId);
  const statuses = (data ?? []).map((item) => item.status);
  const values = {
    draft_count: statuses.filter((status) => status === "draft").length,
    approved_count: statuses.filter((status) => status === "approved").length,
    sent_count: statuses.filter((status) => ["sent", "replied"].includes(status)).length,
    replied_count: statuses.filter((status) => status === "replied").length,
    failed_count: statuses.filter((status) => status === "failed").length,
  };
  let status = "ready";
  if (statuses.length === 0) status = "draft";
  else if (statuses.some((value) => value === "sending")) status = "sending";
  else if (statuses.every((value) => ["sent", "replied", "suppressed", "rejected", "unsubscribed"].includes(value))) {
    status = "completed";
  } else if (statuses.some((value) => ["sent", "replied"].includes(value))) {
    status = "active";
  }
  await service.from("outreach_campaigns").update({ ...values, status }).eq("id", campaignId);
}

function isEligibleLead(lead: JsonRecord) {
  const score = Number(lead.verification_score);
  const crmStatus = typeof lead.crm_status === "string" ? lead.crm_status : "";
  return (Number.isFinite(score) && score >= 70) || ELIGIBLE_CRM_STATUSES.has(crmStatus);
}

async function verifyGmail(): Promise<{ ok: boolean; error?: string }> {
  if (!Deno.env.get("LOVABLE_API_KEY") || !Deno.env.get("GOOGLE_MAIL_API_KEY")) {
    return { ok: false, error: "Gmail connector runtime keys are missing" };
  }
  try {
    const response = await gmailFetch("/profile", { method: "GET" });
    if (!response.ok) {
      return {
        ok: false,
        error: readApiError(await safeJson(response), `Gmail profile returned ${response.status}`),
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Gmail verification failed" };
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

async function findByMessageId(messageId: string): Promise<JsonRecord | null> {
  try {
    const query = encodeURIComponent(`rfc822msgid:${messageId}`);
    const response = await gmailFetch(`/messages?q=${query}&maxResults=1`, { method: "GET" });
    const payload = await safeJson(response);
    if (!response.ok || !isRecord(payload) || !Array.isArray(payload.messages) || payload.messages.length === 0) {
      return null;
    }
    return isRecord(payload.messages[0]) ? payload.messages[0] : null;
  } catch {
    return null;
  }
}

function buildMimeMessage(input: {
  to: string;
  subject: string;
  body: string;
  messageId: string;
  unsubscribeUrl: string;
}) {
  const lines = [
    `To: ${input.to}`,
    `Subject: ${encodeHeader(input.subject)}`,
    `Message-ID: ${input.messageId}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    `List-Unsubscribe: <${input.unsubscribeUrl}>`,
    "List-Unsubscribe-Post: List-Unsubscribe=One-Click",
    "X-Irha-Outreach: 1",
    "",
    input.body,
  ];
  return base64UrlEncode(new TextEncoder().encode(lines.join("\r\n")));
}

function appendFooter(body: string, unsubscribeUrl: string) {
  return `${body.trim()}\n\n—\nIrha Apparels · Sialkot, Pakistan\nExperienced B2B apparel manufacturer · irhaapparels.com\nNot relevant to your business? Opt out: ${unsubscribeUrl}`;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, Math.min(index + chunkSize, bytes.length)));
  }
  return btoa(binary);
}

function base64UrlEncode(bytes: Uint8Array) {
  return bytesToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodeHeader(value: string) {
  if (/^[\x20-\x7E]+$/.test(value)) return value;
  return `=?UTF-8?B?${bytesToBase64(new TextEncoder().encode(value))}?=`;
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
        {
          role: "system",
          content: "You write evidence-based B2B outreach. Never invent buyer facts or company claims. Return strict JSON only.",
        },
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `AI gateway returned ${response.status}`));
  const choices = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices as JsonRecord[] : [];
  const message = choices.length > 0 && isRecord(choices[0].message)
    ? choices[0].message as JsonRecord
    : {};
  if (typeof message.content !== "string") throw new Error("AI returned no JSON content");
  return parseJsonObject(message.content);
}

function normalizeCampaign(input: JsonRecord, selectedLeadCount: number, userId: string) {
  const products = stringArray(input.product_focus).slice(0, 20);
  const market = cleanText(input.target_market, 200);
  const objective = cleanText(input.objective, 1000);
  return {
    name: cleanText(input.name, 240)
      || `${market || "Buyer"} outreach · ${products.slice(0, 2).join(" + ") || "Irha Apparels"}`,
    product_focus: products,
    target_market: market || null,
    objective,
    language_mode: cleanText(input.language_mode, 80) || "auto",
    call_to_action: cleanText(input.call_to_action, 500)
      || "Reply with your product requirements or request a live factory video call.",
    status: "draft",
    selected_lead_count: selectedLeadCount,
    requested_by: userId,
  };
}

function parseJsonObject(text: string): JsonRecord {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("AI returned invalid JSON");
  }
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) {
    return [...new Set(
      value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean),
    )];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
  }
  return [];
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanTextPreserveLines(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max)
    : "";
}

function safeRecord(value: unknown): JsonRecord {
  return isRecord(value) ? value : {};
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function summarize(outcomes: JsonRecord[]) {
  const counts: Record<string, number> = {};
  for (const outcome of outcomes) {
    const status = typeof outcome.status === "string" ? outcome.status : "unknown";
    counts[status] = (counts[status] || 0) + 1;
  }
  return counts;
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 2000);
  }
}

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload) return `${fallback}: ${payload}`;
  if (isRecord(payload)) {
    for (const key of ["error", "message", "detail"]) {
      if (typeof payload[key] === "string") return `${fallback}: ${payload[key]}`;
    }
  }
  return fallback;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
