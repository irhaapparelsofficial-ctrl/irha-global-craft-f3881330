import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const MAX_BATCH = 25;

type JsonRecord = Record<string, unknown>;

type Known = {
  domains: Map<string, string>;
  emails: Map<string, string>;
  whatsapps: Map<string, string>;
  companies: Map<string, string>;
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
    const service = createClient(url, serviceKey);
    const body = await request.json().catch(() => ({})) as JsonRecord;
    const action = clean(body.action, 40) || "health";
    if (action === "health") return await health(service);
    if (action === "activate") return await activate(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("lead-activation-channel-v2", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(service: any) {
  const tables = await Promise.all(["lead_candidates", "b2b_leads", "lead_activation_batches", "lead_activation_events", "lead_import_files", "lead_source_file_links"].map(async (table) => {
    const result = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message || null };
  }));
  return json({ ok: true, ready: tables.every((table) => table.ready), tables, max_batch: MAX_BATCH, accepted_routes: ["email", "whatsapp"], sends_external_messages: false });
}

async function activate(service: any, userId: string, body: JsonRecord) {
  const ids = stringArray(body.candidate_ids).slice(0, MAX_BATCH);
  if (!ids.length) return json({ error: "candidate_ids[] required" }, 400);
  if (body.owner_confirmed !== true) return json({ error: "Explicit owner confirmation is required" }, 400);

  const batch = await service.from("lead_activation_batches").insert({
    status: "running",
    requested_by: userId,
    candidate_ids: ids,
    strict_ready_count: 0,
    summary: { mode: "channel_activation_v2", started_at: new Date().toISOString(), sends_external_messages: false, max_batch: MAX_BATCH },
  }).select("*").single();
  if (batch.error || !batch.data) throw batch.error || new Error("Activation batch could not be created");

  const claimToken = crypto.randomUUID();
  const candidateResult = await service.rpc("claim_lead_candidates_for_activation", {
    p_candidate_ids: ids,
    p_claim_token: claimToken,
    p_limit: MAX_BATCH,
  });
  if (candidateResult.error) {
    await service.from("lead_activation_batches").update({
      status: "failed",
      failed_count: ids.length,
      errors: [{ phase: "candidate_claim", error: candidateResult.error.message }],
      completed_at: new Date().toISOString(),
    }).eq("id", batch.data.id);
    throw candidateResult.error;
  }

  const claimedCandidates = candidateResult.data || [];
  const claimedIds = new Set(claimedCandidates.map((candidate: any) => candidate.id));
  const outcomes: JsonRecord[] = ids
    .filter((id) => !claimedIds.has(id))
    .map((id) => ({
      candidate_id: id,
      status: "busy",
      reason: "Candidate is already imported, no longer eligible, or locked by another activation run",
    }));
  const importedLeadIds: string[] = [];

  try {
    const known = await loadKnown(service);

    for (const candidate of claimedCandidates) {
      if (candidate.imported_lead_id) {
        outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "duplicate", lead_id: candidate.imported_lead_id, reason: "Already imported" });
        await audit(service, batch.data.id, candidate.id, candidate.imported_lead_id, "duplicate", { reason: "Already imported" }, userId);
        continue;
      }
      const email = validEmail(candidate.email);
      const whatsapp = normalizePhone(candidate.whatsapp || candidate.phone);
      const blockers = candidateBlockers(candidate, email, whatsapp);
      if (blockers.length) {
        outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "blocked", blockers });
        await service.from("lead_candidates").update({ verification_status: "needs_review", reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", candidate.id).eq("activation_claim_token", claimToken);
        await audit(service, batch.data.id, candidate.id, null, "blocked", { blockers }, userId);
        continue;
      }

      const website = safeUrl(candidate.website || candidate.source_url);
      const websiteDomain = domain(candidate.website_domain || website);
      const companyKey = companyCountryKey(candidate.company_name, candidate.country);
      const existing = (websiteDomain && known.domains.get(websiteDomain))
        || (email && known.emails.get(email))
        || (whatsapp && known.whatsapps.get(phoneKey(whatsapp)))
        || known.companies.get(companyKey);
      if (existing) {
        await service.from("lead_candidates").update({
          verification_status: "duplicate",
          duplicate_reason: "Already exists in Buyer CRM",
          imported_lead_id: existing,
          reviewed_by: userId,
          reviewed_at: new Date().toISOString(),
        }).eq("id", candidate.id).eq("activation_claim_token", claimToken);
        outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "duplicate", lead_id: existing, reason: "Already exists in Buyer CRM" });
        await audit(service, batch.data.id, candidate.id, existing, "duplicate", { reason: "Already exists in Buyer CRM" }, userId);
        continue;
      }

      const now = new Date().toISOString();
      const leadResult = await service.from("b2b_leads").insert({
        company_name: clean(candidate.company_name, 240),
        country: clean(candidate.country, 100),
        email,
        phone: normalizePhone(candidate.phone || candidate.whatsapp),
        whatsapp,
        website,
        website_domain: websiteDomain,
        apparel_segment: Array.isArray(candidate.product_fit) ? candidate.product_fit.join(", ") : null,
        lead_status: "New",
        crm_status: "new",
        priority: Number(candidate.verification_score || 0) >= 85 ? "high" : "normal",
        notes: `Owner-approved candidate activation\nSource: ${candidate.source_url}\nVerification: ${candidate.verification_score}/100\nContact route: ${email ? "email" : "WhatsApp"}\nBatch: ${batch.data.id}`,
        crm_history: [{ event: "candidate_imported", at: now, batch_id: batch.data.id, candidate_id: candidate.id, actor: userId, source: candidate.source_url, contact_route: email ? "email" : "whatsapp" }],
        lead_campaign_id: candidate.campaign_id,
        buyer_type: candidate.buyer_type,
        linkedin_url: candidate.linkedin_url,
        instagram_url: candidate.instagram_url,
        facebook_url: candidate.facebook_url,
        source_url: candidate.source_url,
        source_provider: candidate.source_provider,
        verification_score: candidate.verification_score,
        verification_evidence: {
          ...(isRecord(candidate.evidence) ? candidate.evidence : {}),
          activation_batch_id: batch.data.id,
          activated_at: now,
          activated_by: userId,
          accepted_contact_route: email ? "email" : "whatsapp",
          automatic_message_sent: false,
        },
      }).select("id").single();
      if (leadResult.error || !leadResult.data) {
        const reason = leadResult.error?.message || "CRM insert failed";
        outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "failed", error: reason });
        await audit(service, batch.data.id, candidate.id, null, "failed", { phase: "crm_insert", error: reason }, userId);
        continue;
      }

      const candidateSaved = await service.from("lead_candidates").update({
        verification_status: "imported",
        imported_lead_id: leadResult.data.id,
        reviewed_by: userId,
        reviewed_at: now,
        activation_claim_token: null,
        activation_claimed_at: null,
        evidence: {
          ...(isRecord(candidate.evidence) ? candidate.evidence : {}),
          activation: { batch_id: batch.data.id, lead_id: leadResult.data.id, at: now, actor: userId, contact_route: email ? "email" : "whatsapp" },
        },
      }).eq("id", candidate.id).eq("activation_claim_token", claimToken).select("id").maybeSingle();
      if (candidateSaved.error || !candidateSaved.data) {
        await service.from("b2b_leads").delete().eq("id", leadResult.data.id);
        const reason = `Candidate link failed; CRM insert rolled back: ${candidateSaved.error?.message || "activation claim was lost"}`;
        outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "failed", error: reason });
        await audit(service, batch.data.id, candidate.id, null, "failed", { phase: "candidate_link", error: reason }, userId);
        continue;
      }

      const sourceFiles = await service.from("lead_import_files").select("id").eq("campaign_id", candidate.campaign_id).in("status", ["uploaded", "staged", "failed"]);
      if (!sourceFiles.error && sourceFiles.data?.length) {
        await service.from("lead_source_file_links").upsert(sourceFiles.data.map((file: any) => ({ import_file_id: file.id, lead_id: leadResult.data.id, candidate_id: candidate.id, created_by: userId })), { onConflict: "import_file_id,lead_id", ignoreDuplicates: true });
      }

      importedLeadIds.push(leadResult.data.id);
      if (websiteDomain) known.domains.set(websiteDomain, leadResult.data.id);
      if (email) known.emails.set(email, leadResult.data.id);
      if (whatsapp) known.whatsapps.set(phoneKey(whatsapp), leadResult.data.id);
      known.companies.set(companyKey, leadResult.data.id);
      outcomes.push({ candidate_id: candidate.id, company: candidate.company_name, status: "imported", lead_id: leadResult.data.id, contact_route: email ? "email" : "whatsapp" });
      await audit(service, batch.data.id, candidate.id, leadResult.data.id, "imported", { contact_route: email ? "email" : "whatsapp", automatic_message_sent: false }, userId);
    }

    const summary = summarize(outcomes);
    const imported = Number(summary.imported || 0);
    const failed = Number(summary.failed || 0);
    const skipped = outcomes.length - imported - failed;
    await service.from("lead_activation_batches").update({
      status: failed ? (imported ? "partial" : "failed") : "completed",
      imported_lead_ids: importedLeadIds,
      strict_ready_count: imported + Number(summary.duplicate || 0),
      imported_count: imported,
      skipped_count: skipped,
      failed_count: failed,
      summary: { mode: "channel_activation_v2", ...summary, sends_external_messages: false, claim_token: claimToken, max_batch: MAX_BATCH },
      errors: outcomes.filter((item) => item.error),
      completed_at: new Date().toISOString(),
    }).eq("id", batch.data.id);
    return json({ ok: true, batch_id: batch.data.id, outcomes, summary, imported_lead_ids: importedLeadIds, sends_external_messages: false });
  } catch (error) {
    const reason = errorText(error);
    const failedBatch = await service.from("lead_activation_batches").update({
      status: importedLeadIds.length ? "partial" : "failed",
      imported_lead_ids: importedLeadIds,
      imported_count: importedLeadIds.length,
      skipped_count: Math.max(0, outcomes.length - importedLeadIds.length),
      failed_count: Math.max(1, outcomes.filter((item) => item.status === "failed").length),
      summary: { mode: "channel_activation_v2", recovery: "unexpected_error", sends_external_messages: false, claim_token: claimToken, max_batch: MAX_BATCH },
      errors: [...outcomes.filter((item) => item.error), { phase: "activation", error: reason }].slice(0, MAX_BATCH + 1),
      completed_at: new Date().toISOString(),
    }).eq("id", batch.data.id);
    if (failedBatch.error) console.error("lead activation batch failure checkpoint failed", failedBatch.error.message);
    throw error;
  } finally {
    const release = await service.from("lead_candidates").update({
      activation_claim_token: null,
      activation_claimed_at: null,
    }).eq("activation_claim_token", claimToken);
    if (release.error) console.error("lead activation claim release failed", release.error.message);
  }
}

function candidateBlockers(candidate: any, email: string | null, whatsapp: string | null) {
  const blockers: string[] = [];
  if (!clean(candidate.company_name, 240)) blockers.push("company name");
  if (!clean(candidate.country, 100)) blockers.push("country");
  if (!safeUrl(candidate.website || candidate.source_url)) blockers.push("public website/source");
  if (!clean(candidate.buyer_type, 240)) blockers.push("buyer type");
  if (!Array.isArray(candidate.product_fit) || !candidate.product_fit.length) blockers.push("product fit");
  if (!isRecord(candidate.evidence) || !Object.keys(candidate.evidence).length) blockers.push("verification evidence");
  if (Number(candidate.verification_score || 0) < 70) blockers.push("score below 70");
  if (!email && !whatsapp) blockers.push("valid business email or WhatsApp");
  return blockers;
}

async function loadKnown(service: any): Promise<Known> {
  const result = await service.from("b2b_leads").select("id,company_name,country,email,whatsapp,phone,website_domain,website").limit(20000);
  if (result.error) throw result.error;
  const known: Known = { domains: new Map(), emails: new Map(), whatsapps: new Map(), companies: new Map() };
  for (const row of result.data || []) {
    const d = domain(row.website_domain || row.website);
    const email = validEmail(row.email);
    const whatsapp = normalizePhone(row.whatsapp || row.phone);
    if (d) known.domains.set(d, row.id);
    if (email) known.emails.set(email, row.id);
    if (whatsapp) known.whatsapps.set(phoneKey(whatsapp), row.id);
    known.companies.set(companyCountryKey(row.company_name, row.country), row.id);
  }
  return known;
}

async function audit(service: any, batchId: string, candidateId: string | null, leadId: string | null, eventType: string, detail: JsonRecord, actor: string) {
  const result = await service.from("lead_activation_events").insert({ batch_id: batchId, candidate_id: candidateId, lead_id: leadId, event_type: eventType, detail, actor });
  if (result.error) throw result.error;
}

function summarize(items: JsonRecord[]) { return items.reduce((output: Record<string, number>, item) => { const status = clean(item.status, 40) || "unknown"; output[status] = (output[status] || 0) + 1; return output; }, {}); }
function stringArray(value: unknown) { return Array.isArray(value) ? [...new Set(value.map((item) => clean(item, 80)).filter(Boolean))] : []; }
function validEmail(value: unknown) { const email = clean(value, 320).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function normalizePhone(value: unknown) { const raw = clean(value, 180); const match = raw.match(/(?:\+|00)?\d[\d\s().\/-]{6,}\d/)?.[0] || ""; const digits = match.replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? match.trim() : null; }
function phoneKey(value: unknown) { const digits = clean(value, 180).replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? digits : ""; }
function safeUrl(value: unknown): string | null { const text = clean(value, 1600); if (!text) return null; try { const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`); if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null; const host = url.hostname.toLowerCase(); if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null; url.hash = ""; return url.toString(); } catch { return null; } }
function domain(value: unknown) { const url = safeUrl(value); if (!url) { const raw = clean(value, 300).toLowerCase().replace(/^www\./, ""); return raw.includes(".") && !raw.includes("/") ? raw : null; } try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } }
function companyCountryKey(company: unknown, country: unknown) { return `${normalizeKey(company)}|${normalizeKey(country)}`; }
function normalizeKey(value: unknown) { return clean(value, 300).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function isRecord(value: unknown): value is JsonRecord { return Boolean(value && typeof value === "object" && !Array.isArray(value)); }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 4000) : typeof error === "string" ? error.slice(0, 4000) : "Internal error"; }
function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
