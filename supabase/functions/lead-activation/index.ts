import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_BATCH = 50;
const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "yahoo.com", "yahoo.co.uk", "outlook.com", "hotmail.com",
  "live.com", "icloud.com", "me.com", "aol.com", "gmx.com", "gmx.de", "web.de", "proton.me", "protonmail.com",
]);
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "10minutemail.com", "tempmail.com", "yopmail.com", "trashmail.com",
]);

type EmailReadiness = {
  email: string | null;
  domain: string | null;
  valid_format: boolean;
  business_domain: boolean;
  disposable: boolean;
  mx_exists: boolean;
  website_aligned: boolean;
  ready: boolean;
  checked_at: string;
  reasons: string[];
};

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (request.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const url = Deno.env.get("SUPABASE_URL") || "";
    const anon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
    if (!url || !anon || !service) return json({ error: "Supabase runtime is not configured" }, 500);

    const authorization = request.headers.get("Authorization") || "";
    const auth = createClient(url, anon, { global: { headers: { Authorization: authorization } } });
    const { data: userResult } = await auth.auth.getUser();
    const user = userResult.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const body = await request.json().catch(() => ({}));
    const db = createClient(url, service);
    const action = clean(body.action, 40) || "health";
    if (action === "health") return health(db);
    if (action === "update_candidate") return updateCandidate(db, user.id, body);
    if (action === "validate") return validateCandidates(db, user.id, body);
    if (action === "activate") return activateCandidates(db, user.id, body);
    if (action === "rollback") return rollbackBatch(db, user.id, body);
    if (action === "schedule_visit") return scheduleVisit(db, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("lead-activation", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(db: any) {
  const tables = await Promise.all([
    "lead_candidates", "b2b_leads", "lead_activation_batches", "lead_activation_events", "crm_tasks", "crm_communications",
  ].map(async (table) => {
    const result = await db.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message || null, count: result.count ?? null };
  }));
  return json({
    ok: true,
    ready: tables.every((item) => item.ready),
    tables,
    max_batch: MAX_BATCH,
    sends_external_messages: false,
    rollback_policy: "untouched_imports_only",
  });
}

async function updateCandidate(db: any, userId: string, body: Record<string, unknown>) {
  const id = clean(body.candidate_id, 80);
  if (!id) return json({ error: "candidate_id required" }, 400);
  const current = await db.from("lead_candidates").select("*").eq("id", id).maybeSingle();
  if (current.error || !current.data) return json({ error: "Candidate not found" }, 404);
  if (current.data.imported_lead_id) return json({ error: "Imported candidates cannot be edited here" }, 409);

  const website = safeUrl(body.website) || safeUrl(current.data.website);
  const sourceUrl = safeUrl(body.source_url) || safeUrl(current.data.source_url) || website;
  const email = validEmail(body.email);
  const productFit = list(body.product_fit, 20, 160);
  const now = new Date().toISOString();
  const evidence = {
    ...(isObject(current.data.evidence) ? current.data.evidence : {}),
    manual_review: { edited_at: now, edited_by: userId, previous_status: current.data.verification_status },
  };
  const update = {
    company_name: clean(body.company_name, 240) || current.data.company_name,
    country: nullable(body.country, 100),
    city: nullable(body.city, 160),
    email,
    phone: nullable(body.phone, 180),
    whatsapp: nullable(body.whatsapp, 180),
    website,
    website_domain: domain(website || sourceUrl),
    buyer_type: nullable(body.buyer_type, 240),
    product_fit: productFit,
    source_url: sourceUrl,
    evidence,
    verification_status: "needs_review",
    reviewed_by: userId,
    reviewed_at: now,
  };
  if (!update.company_name || !update.source_url) return json({ error: "Company and public source URL are required" }, 400);
  const saved = await db.from("lead_candidates").update(update).eq("id", id).select("*").single();
  if (saved.error) throw saved.error;
  return json({ ok: true, candidate: saved.data, sends_external_messages: false });
}

async function validateCandidates(db: any, userId: string, body: Record<string, unknown>) {
  const ids = idsFrom(body.candidate_ids);
  if (!ids.length) return json({ error: "candidate_ids[] required" }, 400);
  const result = await db.from("lead_candidates").select("*").in("id", ids).is("imported_lead_id", null);
  if (result.error) throw result.error;
  const batch = await createBatch(db, userId, ids, "validation");
  const mxCache = new Map<string, boolean>();
  const outcomes: any[] = [];

  for (const candidate of result.data || []) {
    const readiness = await emailReadiness(candidate.email, candidate.website_domain || domain(candidate.website), mxCache);
    const blockers = strictBlockers(candidate, readiness);
    const status = blockers.length === 0 ? "verified" : "needs_review";
    const evidence = {
      ...(isObject(candidate.evidence) ? candidate.evidence : {}),
      email_readiness: readiness,
      activation_review: { checked_at: readiness.checked_at, blockers, actor: userId },
    };
    const score = adjustedScore(candidate.verification_score, readiness, candidate);
    const update = await db.from("lead_candidates").update({
      evidence,
      verification_score: score,
      verification_status: status,
      reviewed_by: userId,
      reviewed_at: readiness.checked_at,
    }).eq("id", candidate.id);
    if (update.error) {
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "failed", error: update.error.message });
      await event(db, batch.id, candidate.id, null, "failed", { phase: "validation", error: update.error.message }, userId);
      continue;
    }
    outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status, score, readiness, blockers });
    await event(db, batch.id, candidate.id, null, blockers.length ? "blocked" : "validated", { readiness, blockers, score }, userId);
  }

  const summary = summarize(outcomes);
  await finishBatch(db, batch.id, {
    status: summary.failed ? "partial" : "completed",
    strict_ready_count: Number(summary.verified || 0),
    failed_count: Number(summary.failed || 0),
    summary: { mode: "validation", ...summary },
    errors: outcomes.filter((item) => item.error),
  });
  return json({ ok: true, batch_id: batch.id, outcomes, summary, sends_external_messages: false });
}

async function activateCandidates(db: any, userId: string, body: Record<string, unknown>) {
  const ids = idsFrom(body.candidate_ids);
  if (!ids.length) return json({ error: "candidate_ids[] required" }, 400);
  if (body.owner_confirmed !== true) return json({ error: "Explicit owner confirmation is required" }, 400);

  const result = await db.from("lead_candidates").select("*").in("id", ids);
  if (result.error) throw result.error;
  const batch = await createBatch(db, userId, ids, "activation");
  const known = await knownCrm(db);
  const mxCache = new Map<string, boolean>();
  const outcomes: any[] = [];
  const importedLeadIds: string[] = [];

  for (const candidate of result.data || []) {
    if (candidate.imported_lead_id) {
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "duplicate", lead_id: candidate.imported_lead_id, reason: "Already imported" });
      await event(db, batch.id, candidate.id, candidate.imported_lead_id, "duplicate", { reason: "Already imported" }, userId);
      continue;
    }

    const readiness = await emailReadiness(candidate.email, candidate.website_domain || domain(candidate.website), mxCache);
    const blockers = strictBlockers(candidate, readiness);
    if (blockers.length) {
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "blocked", blockers, readiness });
      await event(db, batch.id, candidate.id, null, "blocked", { blockers, readiness }, userId);
      continue;
    }

    const d = domain(candidate.website_domain || candidate.website || candidate.source_url);
    const email = validEmail(candidate.email);
    const companyKey = companyCountryKey(candidate.company_name, candidate.country);
    const existing = (d && known.domains.get(d)) || (email && known.emails.get(email)) || known.companies.get(companyKey);
    if (existing) {
      await db.from("lead_candidates").update({
        verification_status: "duplicate",
        duplicate_reason: "Already exists in Buyer CRM",
        imported_lead_id: existing,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "duplicate", lead_id: existing, reason: "Already exists in Buyer CRM" });
      await event(db, batch.id, candidate.id, existing, "duplicate", { reason: "Already exists in Buyer CRM" }, userId);
      continue;
    }

    const now = new Date().toISOString();
    const history = [{
      event: "candidate_imported",
      at: now,
      batch_id: batch.id,
      candidate_id: candidate.id,
      actor: userId,
      source: candidate.source_url,
    }];
    const lead = await db.from("b2b_leads").insert({
      company_name: candidate.company_name,
      country: candidate.country,
      email,
      phone: candidate.phone || candidate.whatsapp,
      whatsapp: candidate.whatsapp,
      website: safeUrl(candidate.website || candidate.source_url),
      website_domain: d,
      apparel_segment: Array.isArray(candidate.product_fit) ? candidate.product_fit.join(", ") : null,
      lead_status: "New",
      crm_status: "new",
      priority: Number(candidate.verification_score || 0) >= 85 ? "high" : "normal",
      notes: `Owner-approved candidate activation\nSource: ${candidate.source_url}\nVerification: ${candidate.verification_score}/100\nBatch: ${batch.id}`,
      crm_history: history,
      lead_campaign_id: candidate.campaign_id,
      buyer_type: candidate.buyer_type,
      linkedin_url: candidate.linkedin_url,
      instagram_url: candidate.instagram_url,
      facebook_url: candidate.facebook_url,
      source_url: candidate.source_url,
      source_provider: candidate.source_provider,
      verification_score: candidate.verification_score,
      verification_evidence: {
        ...(isObject(candidate.evidence) ? candidate.evidence : {}),
        activation_batch_id: batch.id,
        activated_at: now,
        activated_by: userId,
        email_readiness: readiness,
      },
    }).select("id").single();

    if (lead.error || !lead.data) {
      const message = lead.error?.message || "CRM insert failed";
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "failed", error: message });
      await event(db, batch.id, candidate.id, null, "failed", { phase: "activation", error: message }, userId);
      continue;
    }

    const candidateUpdate = await db.from("lead_candidates").update({
      verification_status: "imported",
      imported_lead_id: lead.data.id,
      reviewed_by: userId,
      reviewed_at: now,
      evidence: {
        ...(isObject(candidate.evidence) ? candidate.evidence : {}),
        email_readiness: readiness,
        activation: { batch_id: batch.id, lead_id: lead.data.id, at: now, actor: userId },
      },
    }).eq("id", candidate.id);

    if (candidateUpdate.error) {
      await db.from("b2b_leads").delete().eq("id", lead.data.id);
      const message = `Candidate link failed; CRM insert rolled back: ${candidateUpdate.error.message}`;
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "failed", error: message });
      await event(db, batch.id, candidate.id, null, "failed", { phase: "candidate_link", error: message }, userId);
      continue;
    }

    importedLeadIds.push(lead.data.id);
    knownAdd(known, d, email, companyKey, lead.data.id);
    outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "imported", lead_id: lead.data.id });
    await event(db, batch.id, candidate.id, lead.data.id, "imported", { email_readiness: readiness }, userId);
  }

  const summary = summarize(outcomes);
  const failed = Number(summary.failed || 0);
  const imported = Number(summary.imported || 0);
  const skipped = outcomes.length - imported - failed;
  await finishBatch(db, batch.id, {
    status: failed ? (imported ? "partial" : "failed") : "completed",
    imported_lead_ids: importedLeadIds,
    strict_ready_count: imported + Number(summary.duplicate || 0),
    imported_count: imported,
    skipped_count: skipped,
    failed_count: failed,
    summary: { mode: "activation", ...summary },
    errors: outcomes.filter((item) => item.error),
  });
  return json({ ok: true, batch_id: batch.id, outcomes, summary, imported_count: imported, skipped_count: skipped, failed_count: failed, sends_external_messages: false });
}

async function rollbackBatch(db: any, userId: string, body: Record<string, unknown>) {
  const batchId = clean(body.batch_id, 80);
  if (!batchId) return json({ error: "batch_id required" }, 400);
  if (body.owner_confirmed !== true) return json({ error: "Explicit owner confirmation is required" }, 400);
  const batchResult = await db.from("lead_activation_batches").select("*").eq("id", batchId).maybeSingle();
  if (batchResult.error || !batchResult.data) return json({ error: "Activation batch not found" }, 404);
  const batch = batchResult.data;
  if (!["completed", "partial", "rollback_partial"].includes(batch.status)) return json({ error: `Batch status ${batch.status} cannot be rolled back` }, 409);

  const outcomes: any[] = [];
  for (const leadId of Array.isArray(batch.imported_lead_ids) ? batch.imported_lead_ids.slice(0, MAX_BATCH) : []) {
    const leadResult = await db.from("b2b_leads").select("*").eq("id", leadId).maybeSingle();
    const lead = leadResult.data;
    if (!lead) {
      outcomes.push({ lead_id: leadId, status: "already_missing" });
      continue;
    }
    const [outreach, communications, tasks] = await Promise.all([
      db.from("outreach_messages").select("id", { head: true, count: "exact" }).eq("lead_id", leadId),
      db.from("crm_communications").select("id", { head: true, count: "exact" }).eq("source_id", leadId),
      db.from("crm_tasks").select("id", { head: true, count: "exact" }).eq("source_id", leadId),
    ]);
    const blockers = rollbackBlockers(lead, outreach.count || 0, communications.count || 0, tasks.count || 0);
    const candidateResult = await db.from("lead_candidates").select("id").eq("imported_lead_id", leadId).maybeSingle();
    const candidateId = candidateResult.data?.id || null;
    if (blockers.length) {
      outcomes.push({ lead_id: leadId, candidate_id: candidateId, company: lead.company_name, status: "skipped", blockers });
      await event(db, batchId, candidateId, leadId, "rollback_skipped", { blockers }, userId);
      continue;
    }

    const deleted = await db.from("b2b_leads").delete().eq("id", leadId);
    if (deleted.error) {
      outcomes.push({ lead_id: leadId, candidate_id: candidateId, company: lead.company_name, status: "failed", error: deleted.error.message });
      await event(db, batchId, candidateId, leadId, "failed", { phase: "rollback", error: deleted.error.message }, userId);
      continue;
    }
    if (candidateId) {
      await db.from("lead_candidates").update({
        verification_status: "verified",
        imported_lead_id: null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        duplicate_reason: null,
      }).eq("id", candidateId);
    }
    outcomes.push({ lead_id: leadId, candidate_id: candidateId, company: lead.company_name, status: "rolled_back" });
    await event(db, batchId, candidateId, leadId, "rolled_back", {}, userId);
  }

  const summary = summarize(outcomes);
  const skipped = Number(summary.skipped || 0) + Number(summary.failed || 0);
  await db.from("lead_activation_batches").update({
    status: skipped ? "rollback_partial" : "rolled_back",
    rolled_back_at: new Date().toISOString(),
    summary: { ...(isObject(batch.summary) ? batch.summary : {}), rollback: summary },
  }).eq("id", batchId);
  return json({ ok: true, batch_id: batchId, outcomes, summary, sends_external_messages: false });
}

async function scheduleVisit(db: any, userId: string, body: Record<string, unknown>) {
  const leadId = clean(body.lead_id, 80);
  const meetingAt = isoDate(body.meeting_at);
  const mode = ["meeting", "walk_in", "call"].includes(clean(body.mode, 30)) ? clean(body.mode, 30) : "meeting";
  if (!leadId || !meetingAt) return json({ error: "lead_id and valid meeting_at are required" }, 400);
  const leadResult = await db.from("b2b_leads").select("*").eq("id", leadId).maybeSingle();
  if (leadResult.error || !leadResult.data) return json({ error: "Buyer CRM record not found" }, 404);
  const lead = leadResult.data;
  const location = clean(body.location, 300);
  const notes = clean(body.notes, 2000);
  const priority = ["high", "normal", "low"].includes(clean(body.priority, 20)) ? clean(body.priority, 20) : "high";
  const title = `${mode === "walk_in" ? "Walk-in visit" : mode === "call" ? "Buyer call" : "Buyer meeting"}: ${lead.company_name}`;
  const task = await db.from("crm_tasks").insert({
    source_type: "prospect",
    source_id: leadId,
    title,
    notes: [location ? `Location: ${location}` : "", notes].filter(Boolean).join("\n") || null,
    priority,
    status: "open",
    due_at: meetingAt,
    assigned_to: "Daim Ali",
    created_by: userId,
    updated_by: userId,
  }).select("*").single();
  if (task.error || !task.data) throw task.error || new Error("Visit task could not be created");

  const history = Array.isArray(lead.crm_history) ? lead.crm_history : [];
  await db.from("b2b_leads").update({
    follow_up_at: meetingAt,
    priority,
    crm_history: [...history, { event: "visit_scheduled", at: new Date().toISOString(), meeting_at: meetingAt, mode, location, notes, task_id: task.data.id, actor: userId }].slice(-200),
  }).eq("id", leadId);
  return json({ ok: true, task: task.data, sends_external_messages: false });
}

async function emailReadiness(rawEmail: unknown, websiteDomain: string | null, cache: Map<string, boolean>): Promise<EmailReadiness> {
  const checkedAt = new Date().toISOString();
  const email = validEmail(rawEmail);
  const emailDomain = email?.split("@")[1] || null;
  const reasons: string[] = [];
  if (!email) reasons.push("valid business email missing");
  const disposable = Boolean(emailDomain && DISPOSABLE_DOMAINS.has(emailDomain));
  const business = Boolean(emailDomain && !FREE_EMAIL_DOMAINS.has(emailDomain) && !disposable);
  if (emailDomain && !business) reasons.push(disposable ? "disposable email domain" : "free personal email domain");
  let mxExists = false;
  if (emailDomain) {
    if (cache.has(emailDomain)) mxExists = cache.get(emailDomain)!;
    else {
      try { mxExists = (await Deno.resolveDns(emailDomain, "MX")).length > 0; } catch { mxExists = false; }
      cache.set(emailDomain, mxExists);
    }
    if (!mxExists) reasons.push("email domain has no MX record");
  }
  const aligned = Boolean(emailDomain && websiteDomain && domainsAligned(emailDomain, websiteDomain));
  if (emailDomain && websiteDomain && !aligned) reasons.push("email domain does not match company website");
  const ready = Boolean(email && business && mxExists && aligned);
  return { email, domain: emailDomain, valid_format: Boolean(email), business_domain: business, disposable, mx_exists: mxExists, website_aligned: aligned, ready, checked_at: checkedAt, reasons };
}

function strictBlockers(candidate: any, readiness: EmailReadiness) {
  const blockers: string[] = [];
  if (!clean(candidate.company_name, 240)) blockers.push("company name");
  if (!clean(candidate.country, 100)) blockers.push("country");
  if (!safeUrl(candidate.website || candidate.source_url)) blockers.push("public website/source");
  if (!clean(candidate.buyer_type, 240)) blockers.push("buyer type");
  if (!Array.isArray(candidate.product_fit) || !candidate.product_fit.length) blockers.push("product fit");
  if (!isObject(candidate.evidence) || !Object.keys(candidate.evidence).length) blockers.push("verification evidence");
  if (Number(candidate.verification_score || 0) < 70) blockers.push("score below 70");
  if (!readiness.ready) blockers.push(...readiness.reasons);
  return [...new Set(blockers)];
}

function adjustedScore(current: unknown, readiness: EmailReadiness, candidate: any) {
  let score = Number.isFinite(Number(current)) ? Number(current) : 0;
  if (candidate.company_name) score = Math.max(score, 15);
  if (candidate.country) score += 5;
  if (candidate.buyer_type) score += 10;
  if (Array.isArray(candidate.product_fit) && candidate.product_fit.length) score += 10;
  if (safeUrl(candidate.website || candidate.source_url)) score += 10;
  if (readiness.ready) score += 25;
  else if (readiness.valid_format && readiness.mx_exists) score += 8;
  return Math.max(0, Math.min(100, Math.round(score)));
}

async function knownCrm(db: any) {
  const result = await db.from("b2b_leads").select("id,company_name,country,email,website_domain,website").limit(10000);
  if (result.error) throw result.error;
  const domains = new Map<string, string>();
  const emails = new Map<string, string>();
  const companies = new Map<string, string>();
  for (const row of result.data || []) {
    const d = domain(row.website_domain || row.website);
    const email = validEmail(row.email);
    if (d) domains.set(d, row.id);
    if (email) emails.set(email, row.id);
    companies.set(companyCountryKey(row.company_name, row.country), row.id);
  }
  return { domains, emails, companies };
}

function knownAdd(known: any, d: string | null, email: string | null, companyKey: string, id: string) {
  if (d) known.domains.set(d, id);
  if (email) known.emails.set(email, id);
  known.companies.set(companyKey, id);
}

async function createBatch(db: any, userId: string, candidateIds: string[], mode: string) {
  const result = await db.from("lead_activation_batches").insert({
    status: "running",
    requested_by: userId,
    candidate_ids: candidateIds,
    strict_ready_count: 0,
    summary: { mode, started_at: new Date().toISOString(), sends_external_messages: false },
  }).select("*").single();
  if (result.error || !result.data) throw result.error || new Error("Activation batch could not be created");
  return result.data;
}

async function finishBatch(db: any, batchId: string, patch: Record<string, unknown>) {
  const result = await db.from("lead_activation_batches").update({ ...patch, completed_at: new Date().toISOString() }).eq("id", batchId);
  if (result.error) throw result.error;
}

async function event(db: any, batchId: string, candidateId: string | null, leadId: string | null, eventType: string, detail: Record<string, unknown>, actor: string) {
  const result = await db.from("lead_activation_events").insert({ batch_id: batchId, candidate_id: candidateId, lead_id: leadId, event_type: eventType, detail, actor });
  if (result.error) throw result.error;
}

function rollbackBlockers(lead: any, outreachCount: number, communicationCount: number, taskCount: number) {
  const blockers: string[] = [];
  if (outreachCount > 0 || lead.last_outreach_at) blockers.push("outreach exists");
  if (communicationCount > 0) blockers.push("communication history exists");
  if (taskCount > 0) blockers.push("CRM task exists");
  if (lead.quotation_url || lead.pi_url) blockers.push("quotation or PI exists");
  if (lead.sample_status && lead.sample_status !== "not_requested") blockers.push("sample workflow started");
  if (lead.crm_status !== "new") blockers.push(`CRM status is ${lead.crm_status}`);
  if (String(lead.lead_status) !== "New") blockers.push(`lead status is ${lead.lead_status}`);
  const history = Array.isArray(lead.crm_history) ? lead.crm_history : [];
  if (history.some((item: any) => item?.event !== "candidate_imported")) blockers.push("buyer history changed");
  return blockers;
}

function idsFrom(value: unknown) {
  const source = Array.isArray(value) ? value : [];
  return [...new Set(source.map((item) => clean(item, 80)).filter(Boolean))].slice(0, MAX_BATCH);
}
function summarize(items: any[]) { return items.reduce((acc: Record<string, number>, item) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {}); }
function validEmail(value: unknown) { const email = clean(value, 320).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function safeUrl(value: unknown): string | null { const text = clean(value, 1600); if (!text) return null; try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null; const host = url.hostname.toLowerCase(); if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null; url.hash = ""; return url.toString(); } catch { return null; } }
function domain(value: unknown) { const url = safeUrl(value); if (!url) { const raw = clean(value, 300).toLowerCase().replace(/^www\./, ""); return raw.includes(".") && !raw.includes("/") ? raw : null; } try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } }
function domainsAligned(emailDomain: string, websiteDomain: string) { const a = emailDomain.toLowerCase().replace(/^www\./, ""); const b = websiteDomain.toLowerCase().replace(/^www\./, ""); return a === b || a.endsWith(`.${b}`) || b.endsWith(`.${a}`); }
function list(value: unknown, maxItems: number, maxLength: number) { const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[|;,]/) : []; return [...new Set(values.map((item) => clean(item, maxLength)).filter(Boolean))].slice(0, maxItems); }
function companyCountryKey(company: unknown, country: unknown) { return `${normalizeKey(company)}|${normalizeKey(country)}`; }
function normalizeKey(value: unknown) { return clean(value, 300).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function nullable(value: unknown, max: number) { return clean(value, max) || null; }
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function isoDate(value: unknown) { const text = clean(value, 100); const parsed = Date.parse(text); return Number.isFinite(parsed) ? new Date(parsed).toISOString() : null; }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 1600) : "Internal error"; }
function json(body: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
