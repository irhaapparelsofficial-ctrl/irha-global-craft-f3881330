import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const PROVIDER = "owner_spreadsheet_upload";
const MAX_ROWS = 100;

type InputRow = Record<string, unknown>;
type NormalizedRow = {
  sourceRow: number;
  companyName: string;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  websiteDomain: string | null;
  buyerType: string | null;
  productFit: string[];
  sourceUrl: string;
  sourceTitle: string;
  sourceConfidence: string | null;
  emailVerification: string | null;
  linkedinUrl: string | null;
  instagramUrl: string | null;
  facebookUrl: string | null;
  priority: string | null;
  notes: string | null;
  fingerprint: string;
  score: number;
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
    if (action === "stage") return stage(db, user.id, body);
    if (action === "finalize") return finalize(db, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("lead-bulk-stage", errorText(error));
    return json({ error: errorText(error) }, 500);
  }
});

async function health(db: any) {
  const tables = await Promise.all(["lead_campaigns", "lead_candidates", "b2b_leads"].map(async (table) => {
    const result = await db.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message || null };
  }));
  return json({ ok: true, ready: tables.every((item) => item.ready), tables, max_rows_per_request: MAX_ROWS, sends_external_messages: false });
}

async function stage(db: any, userId: string, body: Record<string, any>) {
  if (!Array.isArray(body.rows) || body.rows.length === 0) return json({ error: "rows[] required" }, 400);
  if (body.rows.length > MAX_ROWS) return json({ error: `Maximum ${MAX_ROWS} rows per request` }, 413);

  const sourceFile = clean(body.source_file, 240) || "Owner spreadsheet";
  const sourceSheet = clean(body.source_sheet, 160) || "Lead table";
  const batchTotal = clamp(body.batch_total, 1, 100000, body.rows.length);
  const normalized = body.rows.map(normalizeRow);
  const inputFingerprints = new Set<string>();
  const blocked: any[] = [];
  const candidates: NormalizedRow[] = [];

  for (const row of normalized) {
    if (!row.companyName) { blocked.push({ source_row: row.sourceRow, reason: "Company name missing" }); continue; }
    if (!row.sourceUrl) { blocked.push({ source_row: row.sourceRow, company: row.companyName, reason: "Public website/source URL missing" }); continue; }
    if (!row.email && !row.whatsapp) { blocked.push({ source_row: row.sourceRow, company: row.companyName, reason: "Business email or WhatsApp missing" }); continue; }
    if (inputFingerprints.has(row.fingerprint)) { blocked.push({ source_row: row.sourceRow, company: row.companyName, reason: "Duplicate inside uploaded file" }); continue; }
    inputFingerprints.add(row.fingerprint);
    candidates.push(row);
  }

  const campaign = await resolveCampaign(db, userId, body.campaign_id, sourceFile, sourceSheet, batchTotal, candidates);
  const known = await knownRecords(db, campaign.id);
  const inserts: any[] = [];
  const duplicates: any[] = [];

  for (const row of candidates) {
    const sameCampaign = known.currentFingerprints.get(row.fingerprint);
    if (sameCampaign) {
      duplicates.push({ source_row: row.sourceRow, company: row.companyName, reason: "Already staged in this campaign", existing_id: sameCampaign, retry_safe: true });
      continue;
    }

    const existingCandidate = (row.websiteDomain && known.candidateDomains.get(row.websiteDomain))
      || (row.email && known.candidateEmails.get(row.email))
      || (row.whatsapp && known.candidateWhatsapps.get(phoneKey(row.whatsapp)))
      || known.candidateCompanies.get(companyCountryKey(row.companyName, row.country));
    const existingLead = (row.websiteDomain && known.crmDomains.get(row.websiteDomain))
      || (row.email && known.crmEmails.get(row.email))
      || (row.whatsapp && known.crmWhatsapps.get(phoneKey(row.whatsapp)))
      || known.crmCompanies.get(companyCountryKey(row.companyName, row.country));
    if (existingCandidate || existingLead) {
      duplicates.push({
        source_row: row.sourceRow,
        company: row.companyName,
        reason: existingLead ? "Already exists in Buyer CRM" : "Already exists in candidate review queue",
        existing_id: existingLead || existingCandidate,
      });
      continue;
    }

    inserts.push({
      campaign_id: campaign.id,
      import_fingerprint: row.fingerprint,
      company_name: row.companyName,
      website: row.website,
      website_domain: row.websiteDomain,
      country: row.country,
      city: row.city,
      email: row.email,
      phone: row.phone,
      whatsapp: row.whatsapp,
      linkedin_url: row.linkedinUrl,
      instagram_url: row.instagramUrl,
      facebook_url: row.facebookUrl,
      buyer_type: row.buyerType,
      product_fit: row.productFit,
      source_url: row.sourceUrl,
      source_title: row.sourceTitle,
      source_query: `${sourceFile} · ${sourceSheet} · row ${row.sourceRow}`,
      source_provider: PROVIDER,
      source_excerpt: row.notes,
      evidence: {
        method: PROVIDER,
        source_file: sourceFile,
        source_sheet: sourceSheet,
        source_row: row.sourceRow,
        source_confidence: row.sourceConfidence,
        email_verification: row.emailVerification,
        contact_routes: [row.email ? "email" : null, row.whatsapp ? "whatsapp" : null].filter(Boolean),
        owner_uploaded: true,
        external_messages_sent: false,
      },
      raw_data: { fingerprint: row.fingerprint, priority: row.priority, notes: row.notes },
      verification_status: "needs_review",
      verification_score: row.score,
      reviewed_by: null,
      reviewed_at: null,
    });
  }

  let staged: any[] = [];
  if (inserts.length) {
    const result = await db.from("lead_candidates")
      .upsert(inserts, { onConflict: "campaign_id,import_fingerprint", ignoreDuplicates: true })
      .select("id,company_name,verification_score,import_fingerprint");
    if (result.error) throw result.error;
    staged = result.data || [];
  }

  await refreshCampaign(db, campaign.id, false);
  return json({
    ok: true,
    campaign_id: campaign.id,
    received_count: body.rows.length,
    staged_count: staged.length,
    duplicate_count: duplicates.length,
    blocked_count: blocked.length,
    staged,
    duplicates,
    blocked,
    sends_external_messages: false,
  });
}

async function finalize(db: any, body: Record<string, any>) {
  const campaignId = clean(body.campaign_id, 80);
  if (!campaignId) return json({ error: "campaign_id required" }, 400);
  const result = await refreshCampaign(db, campaignId, true);
  return json({ ok: true, campaign: result, sends_external_messages: false });
}

async function resolveCampaign(db: any, userId: string, campaignId: unknown, sourceFile: string, sourceSheet: string, batchTotal: number, rows: NormalizedRow[]) {
  const id = clean(campaignId, 80);
  if (id) {
    const existing = await db.from("lead_campaigns").select("*").eq("id", id).maybeSingle();
    if (existing.error || !existing.data) throw new Error("Bulk import campaign not found");
    return existing.data;
  }

  const countries = unique(rows.map((row) => row.country || "")).slice(0, 8);
  const products = unique(rows.flatMap((row) => row.productFit)).slice(0, 20);
  const buyerTypes = unique(rows.map((row) => row.buyerType || "")).slice(0, 20);
  const inserted = await db.from("lead_campaigns").insert({
    name: `Spreadsheet · ${sourceFile}`.slice(0, 240),
    market: countries.join(", ").slice(0, 200) || "Owner spreadsheet import",
    product_focus: products,
    buyer_types: buyerTypes,
    search_queries: [],
    source_providers: [PROVIDER],
    target_count: batchTotal,
    status: "running",
    requested_by: userId,
    last_run_at: new Date().toISOString(),
    error: null,
  }).select("*").single();
  if (inserted.error || !inserted.data) throw inserted.error || new Error("Bulk import campaign could not be created");
  return inserted.data;
}

async function knownRecords(db: any, campaignId: string) {
  const [candidateResult, crmResult] = await Promise.all([
    db.from("lead_candidates").select("id,campaign_id,import_fingerprint,company_name,country,email,whatsapp,website_domain").limit(20000),
    db.from("b2b_leads").select("id,company_name,country,email,whatsapp,website_domain").limit(20000),
  ]);
  if (candidateResult.error) throw candidateResult.error;
  if (crmResult.error) throw crmResult.error;

  const currentFingerprints = new Map<string, string>();
  const candidateDomains = new Map<string, string>();
  const candidateEmails = new Map<string, string>();
  const candidateWhatsapps = new Map<string, string>();
  const candidateCompanies = new Map<string, string>();
  const crmDomains = new Map<string, string>();
  const crmEmails = new Map<string, string>();
  const crmWhatsapps = new Map<string, string>();
  const crmCompanies = new Map<string, string>();

  for (const row of candidateResult.data || []) {
    if (row.campaign_id === campaignId && row.import_fingerprint) {
      currentFingerprints.set(String(row.import_fingerprint), row.id);
    }
    if (row.website_domain) candidateDomains.set(String(row.website_domain).toLowerCase(), row.id);
    const email = validEmail(row.email); if (email) candidateEmails.set(email, row.id);
    const whatsapp = phoneKey(row.whatsapp); if (whatsapp) candidateWhatsapps.set(whatsapp, row.id);
    candidateCompanies.set(companyCountryKey(row.company_name, row.country), row.id);
  }
  for (const row of crmResult.data || []) {
    if (row.website_domain) crmDomains.set(String(row.website_domain).toLowerCase(), row.id);
    const email = validEmail(row.email); if (email) crmEmails.set(email, row.id);
    const whatsapp = phoneKey(row.whatsapp); if (whatsapp) crmWhatsapps.set(whatsapp, row.id);
    crmCompanies.set(companyCountryKey(row.company_name, row.country), row.id);
  }
  return { currentFingerprints, candidateDomains, candidateEmails, candidateWhatsapps, candidateCompanies, crmDomains, crmEmails, crmWhatsapps, crmCompanies };
}

async function refreshCampaign(db: any, campaignId: string, completed: boolean) {
  const result = await db.from("lead_candidates").select("verification_status").eq("campaign_id", campaignId);
  if (result.error) throw result.error;
  const rows = result.data || [];
  const count = (status: string) => rows.filter((row: any) => row.verification_status === status).length;
  const update = {
    status: completed ? "completed" : "running",
    discovered_count: rows.length,
    reviewed_count: count("needs_review") + count("verified") + count("rejected") + count("imported"),
    verified_count: count("verified") + count("imported"),
    imported_count: count("imported"),
    error: null,
  };
  const saved = await db.from("lead_campaigns").update(update).eq("id", campaignId).select("*").single();
  if (saved.error || !saved.data) throw saved.error || new Error("Campaign status could not be updated");
  return saved.data;
}

function normalizeRow(input: InputRow): NormalizedRow {
  const companyName = clean(input.companyName, 240);
  const country = nullable(input.country, 100);
  const website = safeUrl(input.website);
  const sourceUrl = safeUrl(input.sourceUrl) || website || "";
  const email = validEmail(input.email);
  const whatsapp = normalizePhone(input.whatsapp || input.phone);
  const phone = normalizePhone(input.phone || input.whatsapp);
  const buyerType = nullable(input.buyerType, 240);
  const productFit = list(input.productFit, 20, 160);
  const websiteDomain = domain(website || sourceUrl);
  const sourceConfidence = nullable(input.sourceConfidence, 80);
  const emailVerification = nullable(input.emailVerification, 120);
  let score = 10;
  if (websiteDomain) score += 15;
  if (email) score += 25;
  else if (whatsapp) score += 18;
  if (buyerType) score += 15;
  if (productFit.length) score += 15;
  if (sourceUrl) score += 10;
  if (/high/i.test(sourceConfidence || "")) score += 5;
  if (/valid|publicly listed|verified/i.test(emailVerification || "")) score += 5;
  if (country) score += 5;
  score = Math.max(0, Math.min(95, score));
  const fingerprint = clean(input.fingerprint, 500)
    || [email || phoneKey(whatsapp) || "", websiteDomain || "", normalizeKey(companyName), normalizeKey(country || "")].join("|");
  return {
    sourceRow: clamp(input.sourceRow, 1, 1_000_000, 1),
    companyName,
    country,
    city: nullable(input.city, 160),
    email,
    phone,
    whatsapp,
    website,
    websiteDomain,
    buyerType,
    productFit,
    sourceUrl,
    sourceTitle: clean(input.sourceTitle, 300) || companyName,
    sourceConfidence,
    emailVerification,
    linkedinUrl: safeUrl(input.linkedinUrl),
    instagramUrl: safeUrl(input.instagramUrl),
    facebookUrl: safeUrl(input.facebookUrl),
    priority: nullable(input.priority, 40),
    notes: nullable(input.notes, 1500),
    fingerprint,
    score,
  };
}

function safeUrl(value: unknown): string | null {
  const text = clean(value, 1600);
  if (!text) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
    if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) return null;
    const host = url.hostname.toLowerCase();
    if (!host.includes(".") || host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}
function domain(value: unknown) { const url = safeUrl(value); if (!url) return null; try { return new URL(url).hostname.toLowerCase().replace(/^www\./, ""); } catch { return null; } }
function validEmail(value: unknown) { const email = clean(value, 320).toLowerCase(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null; }
function normalizePhone(value: unknown) { const text = clean(value, 180); const match = text.match(/(?:\+|00)?\d[\d\s().\/-]{6,}\d/)?.[0] || ""; const digits = match.replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? match.trim() : null; }
function phoneKey(value: unknown) { const digits = clean(value, 180).replace(/\D/g, ""); return digits.length >= 7 && digits.length <= 16 ? digits : ""; }
function list(value: unknown, maxItems: number, maxLength: number) { const values = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[|;,]/) : []; return unique(values.map((item) => clean(item, maxLength))).slice(0, maxItems); }
function unique(values: string[]) { return [...new Set(values.filter(Boolean))]; }
function nullable(value: unknown, max: number) { return clean(value, max) || null; }
function normalizeKey(value: unknown) { return clean(value, 300).toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim(); }
function companyCountryKey(company: unknown, country: unknown) { return `${normalizeKey(company)}|${normalizeKey(country)}`; }
function clean(value: unknown, max = 500) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function clamp(value: unknown, min: number, max: number, fallback: number) { const number = Number(value); return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback; }
function errorText(error: unknown) { return error instanceof Error ? error.message.slice(0, 1200) : "Internal error"; }
function json(body: Record<string, unknown>, status = 200) { return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
