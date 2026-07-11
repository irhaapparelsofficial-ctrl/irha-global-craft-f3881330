// Irha Lead Acquisition Engine v1
// Admin-only discovery, evidence-based enrichment, deduplication and CRM import.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const FIRECRAWL_BASE = "https://api.firecrawl.dev/v1";
const MAX_DISCOVERY_QUERIES = 8;
const MAX_ENRICH_BATCH = 20;
const MAX_IMPORT_BATCH = 100;

type DbClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;

type CampaignInput = {
  name?: unknown;
  market?: unknown;
  product_focus?: unknown;
  buyer_types?: unknown;
  target_count?: unknown;
  search_queries?: unknown;
};

type SearchResult = {
  url: string;
  title: string;
  description: string;
  markdown: string;
  query: string;
};

type CandidateDraft = {
  source_url: string;
  source_title: string;
  source_query: string;
  source_excerpt: string;
  company_name: string;
  website: string | null;
  website_domain: string | null;
  country: string | null;
  city: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  buyer_type: string | null;
  product_fit: string[];
  verification_score: number;
  verification_status: "unverified" | "needs_review" | "verified" | "rejected" | "duplicate";
  evidence: JsonRecord;
  raw_data: JsonRecord;
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
    const { data: roleRow } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "health") return await health(service);
    if (action === "discover") return await discover(service, user.id, body);
    if (action === "enrich") return await enrich(service, user.id, body);
    if (action === "review") return await reviewCandidate(service, user.id, body);
    if (action === "import") return await importCandidates(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("lead-research error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const firecrawlKey = getFirecrawlKey();
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const checks = await Promise.all(["lead_campaigns", "lead_search_runs", "lead_candidates"].map(async (table) => {
    const { error } = await service.from(table).select("id", { count: "exact", head: true }).limit(1);
    return { table, ready: !error, error: error?.message };
  }));
  return json({
    ok: true,
    checked_at: new Date().toISOString(),
    database_ready: checks.every((item) => item.ready),
    tables: checks,
    firecrawl_configured: Boolean(firecrawlKey),
    ai_gateway_configured: Boolean(lovableKey),
    discovery_ready: Boolean(firecrawlKey && lovableKey && checks.every((item) => item.ready)),
    note: firecrawlKey
      ? "Firecrawl runtime credential detected. A successful search call is still required before treating discovery as operational."
      : "The workspace Firecrawl connection exists, but this Edge Function cannot see a FIRECRAWL_API_KEY-compatible runtime credential yet. Link the project/connection or provide a backend Firecrawl key.",
  });
}

async function discover(service: DbClient, userId: string, body: JsonRecord) {
  const firecrawlKey = getFirecrawlKey();
  if (!firecrawlKey) return json({ error: "Firecrawl runtime credential is not available to the Lead Engine.", code: "FIRECRAWL_NOT_CONFIGURED" }, 503);
  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured.", code: "AI_NOT_CONFIGURED" }, 503);

  const campaignIdInput = typeof body.campaign_id === "string" ? body.campaign_id : null;
  let campaign: JsonRecord | null = null;
  if (campaignIdInput) {
    const { data, error } = await service.from("lead_campaigns").select("*").eq("id", campaignIdInput).maybeSingle();
    if (error || !data) return json({ error: "Campaign not found" }, 404);
    campaign = data as JsonRecord;
  } else {
    const input = (body.campaign && typeof body.campaign === "object" ? body.campaign : body) as CampaignInput;
    const normalized = normalizeCampaign(input);
    if (!normalized.market || normalized.product_focus.length === 0 || normalized.buyer_types.length === 0) {
      return json({ error: "market, product_focus[] and buyer_types[] are required" }, 400);
    }
    const { data, error } = await service.from("lead_campaigns").insert({
      ...normalized,
      requested_by: userId,
      status: "draft",
    }).select("*").single();
    if (error || !data) throw new Error(error?.message || "Could not create campaign");
    campaign = data as JsonRecord;
  }

  const campaignId = String(campaign.id);
  const targetCount = clampNumber(campaign.target_count, 1, 100, 25);
  const queries = normalizeStringArray(campaign.search_queries).length > 0
    ? normalizeStringArray(campaign.search_queries).slice(0, MAX_DISCOVERY_QUERIES)
    : buildSearchQueries(
      String(campaign.market || ""),
      normalizeStringArray(campaign.product_focus),
      normalizeStringArray(campaign.buyer_types),
    );

  await service.from("lead_campaigns").update({
    status: "running",
    search_queries: queries,
    last_run_at: new Date().toISOString(),
    error: null,
  }).eq("id", campaignId);

  const perQuery = Math.max(3, Math.min(10, Math.ceil(targetCount / Math.max(1, queries.length))));
  const allResults: SearchResult[] = [];
  const failures: string[] = [];

  for (const query of queries) {
    const { data: run, error: runError } = await service.from("lead_search_runs").insert({
      campaign_id: campaignId,
      query,
      provider: "firecrawl",
      status: "running",
    }).select("id").single();
    if (runError || !run) throw new Error(runError?.message || "Could not create search run");

    try {
      const result = await firecrawlSearch(firecrawlKey, query, perQuery);
      allResults.push(...result);
      await service.from("lead_search_runs").update({
        status: "completed",
        result_count: result.length,
        response_meta: { requested_limit: perQuery },
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed";
      failures.push(`${query}: ${message}`);
      await service.from("lead_search_runs").update({
        status: "failed",
        error: message.slice(0, 1200),
        completed_at: new Date().toISOString(),
      }).eq("id", run.id);
    }
  }

  const uniqueResults = dedupeSearchResults(allResults).slice(0, Math.max(targetCount * 2, targetCount));
  if (uniqueResults.length === 0) {
    await service.from("lead_campaigns").update({ status: "failed", error: failures.join(" | ").slice(0, 4000) || "No search results returned." }).eq("id", campaignId);
    return json({ error: "No usable search results returned.", campaign_id: campaignId, failures }, 422);
  }

  const classified = await classifySearchResults(uniqueResults, campaign);
  const duplicateIndex = await loadDuplicateIndex(service, campaignId);
  const rows = classified.map((candidate) => {
    const duplicate = findDuplicate(candidate, duplicateIndex);
    return {
      campaign_id: campaignId,
      company_name: candidate.company_name,
      website: candidate.website,
      website_domain: candidate.website_domain,
      country: candidate.country,
      city: candidate.city,
      email: candidate.email,
      phone: candidate.phone,
      whatsapp: candidate.whatsapp,
      linkedin_url: candidate.linkedin_url,
      instagram_url: candidate.instagram_url,
      facebook_url: candidate.facebook_url,
      buyer_type: candidate.buyer_type,
      product_fit: candidate.product_fit,
      source_url: candidate.source_url,
      source_title: candidate.source_title,
      source_query: candidate.source_query,
      source_provider: "firecrawl",
      source_excerpt: candidate.source_excerpt,
      evidence: candidate.evidence,
      raw_data: candidate.raw_data,
      verification_status: duplicate ? "duplicate" : candidate.verification_status,
      verification_score: candidate.verification_score,
      duplicate_reason: duplicate?.reason || null,
      duplicate_of: duplicate?.candidateId || null,
    };
  });

  const { data: inserted, error: insertError } = await service.from("lead_candidates").insert(rows).select("id,verification_status,verification_score");
  if (insertError) throw new Error(insertError.message);

  const counts = countStatuses(inserted ?? []);
  const discoveredCount = (inserted ?? []).length;
  await service.from("lead_campaigns").update({
    status: failures.length > 0 ? "paused" : "completed",
    discovered_count: discoveredCount,
    reviewed_count: counts.needs_review + counts.verified + counts.rejected,
    verified_count: counts.verified,
    error: failures.length > 0 ? failures.join(" | ").slice(0, 4000) : null,
  }).eq("id", campaignId);

  return json({
    ok: true,
    campaign_id: campaignId,
    queries,
    search_results: uniqueResults.length,
    inserted: discoveredCount,
    counts,
    failures,
    note: "Discovery results are candidates, not verified leads. Use Enrich & Verify before CRM import.",
  });
}

async function enrich(service: DbClient, userId: string, body: JsonRecord) {
  const firecrawlKey = getFirecrawlKey();
  if (!firecrawlKey) return json({ error: "Firecrawl runtime credential is not available.", code: "FIRECRAWL_NOT_CONFIGURED" }, 503);
  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured." }, 503);

  const ids = normalizeStringArray(body.candidate_ids).slice(0, MAX_ENRICH_BATCH);
  if (ids.length === 0) return json({ error: "candidate_ids[] required" }, 400);
  const { data: candidates, error } = await service.from("lead_candidates").select("*").in("id", ids);
  if (error) throw new Error(error.message);

  const duplicateIndex = await loadDuplicateIndex(service, null);
  const outcomes: JsonRecord[] = [];
  for (const candidate of candidates ?? []) {
    if (["duplicate", "imported"].includes(candidate.verification_status)) {
      outcomes.push({ id: candidate.id, status: "skipped", reason: candidate.verification_status });
      continue;
    }
    try {
      const website = normalizeUrl(candidate.website || candidate.source_url);
      if (!website) throw new Error("Candidate has no valid website URL");
      const pages = await scrapeLeadPages(firecrawlKey, website);
      const enrichment = await extractLeadEvidence(candidate as JsonRecord, pages);
      const merged = mergeEnrichment(candidate as JsonRecord, enrichment, pages);
      const duplicate = findDuplicate(merged, duplicateIndex, String(candidate.id));
      const status = duplicate
        ? "duplicate"
        : merged.is_relevant_buyer === false
          ? "rejected"
          : merged.verification_score >= 70 && Boolean(merged.website_domain) && Boolean(merged.email || merged.phone || merged.whatsapp)
            ? "verified"
            : "needs_review";

      const { error: updateError } = await service.from("lead_candidates").update({
        company_name: merged.company_name,
        website: merged.website,
        website_domain: merged.website_domain,
        country: merged.country,
        city: merged.city,
        email: merged.email,
        phone: merged.phone,
        whatsapp: merged.whatsapp,
        linkedin_url: merged.linkedin_url,
        instagram_url: merged.instagram_url,
        facebook_url: merged.facebook_url,
        buyer_type: merged.buyer_type,
        product_fit: merged.product_fit,
        evidence: merged.evidence,
        raw_data: { ...(isRecord(candidate.raw_data) ? candidate.raw_data : {}), enrichment },
        verification_score: merged.verification_score,
        verification_status: status,
        duplicate_reason: duplicate?.reason || null,
        duplicate_of: duplicate?.candidateId || null,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      if (updateError) throw new Error(updateError.message);
      outcomes.push({ id: candidate.id, status, score: merged.verification_score });
    } catch (err) {
      outcomes.push({ id: candidate.id, status: "failed", error: err instanceof Error ? err.message : "Enrichment failed" });
    }
  }

  const campaignIds = [...new Set((candidates ?? []).map((item) => item.campaign_id))];
  for (const campaignId of campaignIds) await refreshCampaignCounts(service, campaignId);
  return json({ ok: true, outcomes, summary: summarizeOutcomes(outcomes) });
}

async function reviewCandidate(service: DbClient, userId: string, body: JsonRecord) {
  const id = typeof body.candidate_id === "string" ? body.candidate_id : "";
  const status = typeof body.status === "string" ? body.status : "";
  if (!id || !["verified", "rejected", "needs_review"].includes(status)) return json({ error: "candidate_id and valid status required" }, 400);
  const score = clampNumber(body.verification_score, 0, 100, status === "verified" ? 70 : 0);
  const { data, error } = await service.from("lead_candidates").update({
    verification_status: status,
    verification_score: score,
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
  }).eq("id", id).select("campaign_id").single();
  if (error || !data) return json({ error: error?.message || "Candidate not found" }, 404);
  await refreshCampaignCounts(service, data.campaign_id);
  return json({ ok: true, candidate_id: id, status, verification_score: score });
}

async function importCandidates(service: DbClient, userId: string, body: JsonRecord) {
  const ids = normalizeStringArray(body.candidate_ids).slice(0, MAX_IMPORT_BATCH);
  const allowNeedsReview = body.allow_needs_review === true;
  if (ids.length === 0) return json({ error: "candidate_ids[] required" }, 400);
  const statuses = allowNeedsReview ? ["verified", "needs_review"] : ["verified"];
  const { data: candidates, error } = await service.from("lead_candidates").select("*").in("id", ids).in("verification_status", statuses);
  if (error) throw new Error(error.message);

  const imported: JsonRecord[] = [];
  const skipped: JsonRecord[] = [];
  for (const candidate of candidates ?? []) {
    const duplicate = await findExistingCrmLead(service, candidate.website_domain, candidate.email);
    if (duplicate) {
      await service.from("lead_candidates").update({
        verification_status: "duplicate",
        duplicate_reason: duplicate.reason,
        imported_lead_id: duplicate.id,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      }).eq("id", candidate.id);
      skipped.push({ candidate_id: candidate.id, reason: duplicate.reason, existing_lead_id: duplicate.id });
      continue;
    }

    const history = [{
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      type: "update",
      summary: `Imported from Lead Acquisition Engine · ${candidate.source_provider} · verification ${candidate.verification_score}/100`,
      actor: "ai-lead-engine",
    }];
    const notes = [
      `Lead Acquisition Engine candidate ${candidate.id}`,
      `Source: ${candidate.source_url}`,
      `Verification score: ${candidate.verification_score}/100`,
      candidate.evidence ? `Evidence: ${JSON.stringify(candidate.evidence).slice(0, 2000)}` : null,
    ].filter(Boolean).join("\n");

    const { data: lead, error: insertError } = await service.from("b2b_leads").insert({
      company_name: candidate.company_name,
      country: candidate.country || "Unknown",
      email: candidate.email,
      phone: candidate.phone || candidate.whatsapp,
      website: candidate.website,
      apparel_segment: Array.isArray(candidate.product_fit) ? candidate.product_fit.join(", ") : null,
      lead_status: "New",
      notes,
      crm_status: "new",
      priority: candidate.verification_score >= 85 ? "high" : "normal",
      crm_history: history,
      lead_campaign_id: candidate.campaign_id,
      buyer_type: candidate.buyer_type,
      website_domain: candidate.website_domain,
      whatsapp: candidate.whatsapp,
      linkedin_url: candidate.linkedin_url,
      instagram_url: candidate.instagram_url,
      facebook_url: candidate.facebook_url,
      source_url: candidate.source_url,
      source_provider: candidate.source_provider,
      verification_score: candidate.verification_score,
      verification_evidence: candidate.evidence || {},
    }).select("id").single();
    if (insertError || !lead) {
      skipped.push({ candidate_id: candidate.id, reason: insertError?.message || "CRM insert failed" });
      continue;
    }
    await service.from("lead_candidates").update({
      verification_status: "imported",
      imported_lead_id: lead.id,
      reviewed_by: userId,
      reviewed_at: new Date().toISOString(),
    }).eq("id", candidate.id);
    imported.push({ candidate_id: candidate.id, lead_id: lead.id });
  }

  const campaignIds = [...new Set((candidates ?? []).map((item) => item.campaign_id))];
  for (const campaignId of campaignIds) await refreshCampaignCounts(service, campaignId);
  return json({ ok: true, imported, skipped, imported_count: imported.length, skipped_count: skipped.length });
}

async function firecrawlSearch(apiKey: string, query: string, limit: number): Promise<SearchResult[]> {
  const response = await fetch(`${FIRECRAWL_BASE}/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      query,
      limit,
      scrapeOptions: { formats: ["markdown"], onlyMainContent: true },
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `Firecrawl search returned ${response.status}`));
  const data = Array.isArray((payload as JsonRecord)?.data) ? (payload as JsonRecord).data as JsonRecord[] : [];
  return data.flatMap((item) => {
    const url = normalizeUrl(item.url);
    if (!url) return [];
    return [{
      url,
      title: cleanText(item.title, 300) || domainFromUrl(url) || url,
      description: cleanText(item.description, 800),
      markdown: cleanText(item.markdown, 7000),
      query,
    }];
  });
}

async function scrapeLeadPages(apiKey: string, website: string) {
  const urls = candidatePageUrls(website).slice(0, 3);
  const pages: Array<{ url: string; markdown: string; metadata: JsonRecord }> = [];
  for (const url of urls) {
    try {
      const response = await fetch(`${FIRECRAWL_BASE}/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true, timeout: 30000 }),
      });
      const payload = await safeJson(response);
      if (!response.ok) continue;
      const data = isRecord((payload as JsonRecord)?.data) ? (payload as JsonRecord).data as JsonRecord : {};
      const markdown = cleanText(data.markdown, 18000);
      if (markdown) pages.push({ url, markdown, metadata: isRecord(data.metadata) ? data.metadata : {} });
    } catch {
      // Keep trying the remaining public pages.
    }
  }
  if (pages.length === 0) throw new Error("Firecrawl could not return readable public pages for this website");
  return pages;
}

async function classifySearchResults(results: SearchResult[], campaign: JsonRecord): Promise<CandidateDraft[]> {
  const compact = results.map((item, index) => ({
    index,
    url: item.url,
    title: item.title,
    description: item.description,
    markdown_excerpt: item.markdown.slice(0, 3500),
    query: item.query,
  }));
  const prompt = `Classify public web search results for a B2B apparel buyer lead campaign.

TARGET MARKET: ${String(campaign.market || "")}
PRODUCT FOCUS: ${normalizeStringArray(campaign.product_focus).join(", ")}
BUYER TYPES: ${normalizeStringArray(campaign.buyer_types).join(", ")}

Strict rules:
- Use only supplied public text. Never invent contacts, country, buyer type, products, company name or social URLs.
- A relevant buyer is a wholesaler, importer, distributor, retailer, boutique chain, sourcing company, private-label brand or ecommerce seller that could buy apparel in bulk.
- Exclude manufacturers, factories, news pages, generic directories without a clear company, consumers and irrelevant businesses.
- Null/empty values are required when evidence is absent.
- relevance_score is 0-55 at discovery stage; verification requires a separate website enrichment.
- Return one result for every input index.

Return strict JSON:
{"results":[{"index":0,"company_name":"","country":null,"city":null,"buyer_type":null,"product_fit":[],"email":null,"phone":null,"whatsapp":null,"linkedin_url":null,"instagram_url":null,"facebook_url":null,"is_relevant_buyer":true,"relevance_score":35,"reason":"","evidence_points":[]}]}

RESULTS:
${JSON.stringify(compact)}`;
  const parsed = await aiJson(prompt);
  const values = Array.isArray(parsed.results) ? parsed.results as JsonRecord[] : [];
  const byIndex = new Map<number, JsonRecord>();
  for (const value of values) {
    const index = Number(value.index);
    if (Number.isInteger(index)) byIndex.set(index, value);
  }

  return results.map((item, index) => {
    const value = byIndex.get(index) || {};
    const website = normalizeUrl(item.url);
    const relevant = value.is_relevant_buyer !== false;
    const score = relevant ? clampNumber(value.relevance_score, 0, 55, 20) : 0;
    const companyName = cleanText(value.company_name, 250) || item.title || domainFromUrl(item.url) || "Unknown company";
    return {
      source_url: item.url,
      source_title: item.title,
      source_query: item.query,
      source_excerpt: [item.description, item.markdown.slice(0, 1200)].filter(Boolean).join("\n").slice(0, 1800),
      company_name: companyName,
      website,
      website_domain: domainFromUrl(website),
      country: nullableText(value.country, 120),
      city: nullableText(value.city, 120),
      email: normalizeEmail(value.email),
      phone: nullableText(value.phone, 100),
      whatsapp: nullableText(value.whatsapp, 100),
      linkedin_url: normalizeUrl(value.linkedin_url),
      instagram_url: normalizeUrl(value.instagram_url),
      facebook_url: normalizeUrl(value.facebook_url),
      buyer_type: nullableText(value.buyer_type, 160),
      product_fit: normalizeStringArray(value.product_fit).slice(0, 20),
      verification_score: score,
      verification_status: relevant && score >= 25 ? "needs_review" : relevant ? "unverified" : "rejected",
      evidence: {
        discovery_reason: cleanText(value.reason, 1000),
        evidence_points: normalizeStringArray(value.evidence_points).slice(0, 12),
        source_url: item.url,
      },
      raw_data: { search_result: item, ai_classification: value },
    };
  });
}

async function extractLeadEvidence(candidate: JsonRecord, pages: Array<{ url: string; markdown: string; metadata: JsonRecord }>) {
  const prompt = `Extract and verify a B2B apparel buyer profile from public company website pages.

Strict rules:
- Use only supplied pages. Never invent or infer missing email, phone, WhatsApp, address, social profile, buyer type, products or country.
- Return null/empty when evidence is absent.
- is_relevant_buyer must be false for manufacturers/factories, consumers, unrelated companies or generic directories.
- An importer, wholesaler, distributor, retailer, boutique, ecommerce seller, sourcing company or private-label brand can be relevant.
- evidence_points must cite the page URL and a short paraphrase of the supporting fact. Do not quote long passages.

Return strict JSON:
{"company_name":"","country":null,"city":null,"buyer_type":null,"product_fit":[],"email":null,"phone":null,"whatsapp":null,"linkedin_url":null,"instagram_url":null,"facebook_url":null,"is_relevant_buyer":true,"fit_reason":"","evidence_points":[]}

CURRENT CANDIDATE:
${JSON.stringify({ company_name: candidate.company_name, website: candidate.website, buyer_type: candidate.buyer_type, product_fit: candidate.product_fit })}

PUBLIC PAGES:
${JSON.stringify(pages.map((page) => ({ url: page.url, markdown: page.markdown.slice(0, 16000), metadata: page.metadata })))}`;
  return await aiJson(prompt);
}

function mergeEnrichment(candidate: JsonRecord, enrichment: JsonRecord, pages: Array<{ url: string; markdown: string; metadata: JsonRecord }>) {
  const website = normalizeUrl(candidate.website || candidate.source_url);
  const email = normalizeEmail(enrichment.email) || normalizeEmail(candidate.email);
  const phone = nullableText(enrichment.phone, 100) || nullableText(candidate.phone, 100);
  const whatsapp = nullableText(enrichment.whatsapp, 100) || nullableText(candidate.whatsapp, 100);
  const buyerType = nullableText(enrichment.buyer_type, 160) || nullableText(candidate.buyer_type, 160);
  const productFit = uniqueStrings([...normalizeStringArray(candidate.product_fit), ...normalizeStringArray(enrichment.product_fit)]).slice(0, 20);
  const isRelevant = enrichment.is_relevant_buyer !== false;
  let score = 0;
  if (website) score += 15;
  if (cleanText(enrichment.company_name, 250) || cleanText(candidate.company_name, 250)) score += 10;
  if (isRelevant && buyerType) score += 20;
  if (productFit.length > 0) score += 15;
  if (email) score += emailDomainMatches(email, website) ? 20 : 10;
  if (phone || whatsapp) score += 10;
  if (nullableText(enrichment.country, 120) || nullableText(candidate.country, 120)) score += 5;
  if (normalizeUrl(enrichment.linkedin_url) || normalizeUrl(enrichment.instagram_url) || normalizeUrl(enrichment.facebook_url)) score += 5;
  if (!isRelevant) score = Math.min(score, 25);

  return {
    source_url: String(candidate.source_url || website || ""),
    source_title: String(candidate.source_title || ""),
    source_query: String(candidate.source_query || ""),
    source_excerpt: String(candidate.source_excerpt || ""),
    company_name: cleanText(enrichment.company_name, 250) || cleanText(candidate.company_name, 250) || domainFromUrl(website) || "Unknown company",
    website,
    website_domain: domainFromUrl(website),
    country: nullableText(enrichment.country, 120) || nullableText(candidate.country, 120),
    city: nullableText(enrichment.city, 120) || nullableText(candidate.city, 120),
    email,
    phone,
    whatsapp,
    linkedin_url: normalizeUrl(enrichment.linkedin_url) || normalizeUrl(candidate.linkedin_url),
    instagram_url: normalizeUrl(enrichment.instagram_url) || normalizeUrl(candidate.instagram_url),
    facebook_url: normalizeUrl(enrichment.facebook_url) || normalizeUrl(candidate.facebook_url),
    buyer_type: buyerType,
    product_fit: productFit,
    verification_score: Math.min(100, score),
    is_relevant_buyer: isRelevant,
    evidence: {
      discovery: isRecord(candidate.evidence) ? candidate.evidence : {},
      fit_reason: cleanText(enrichment.fit_reason, 1200),
      evidence_points: normalizeStringArray(enrichment.evidence_points).slice(0, 20),
      pages_checked: pages.map((page) => page.url),
      verified_at: new Date().toISOString(),
    },
  };
}

async function aiJson(prompt: string): Promise<JsonRecord> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("LEAD_RESEARCH_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You extract evidence-backed public B2B company data. Never invent missing fields. Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `AI gateway returned ${response.status}`));
  const content = (payload as JsonRecord)?.choices;
  const text = Array.isArray(content) && isRecord(content[0]) && isRecord(content[0].message) ? content[0].message.content : null;
  if (typeof text !== "string") throw new Error("AI gateway returned no JSON content");
  return parseJsonObject(text);
}

async function loadDuplicateIndex(service: DbClient, campaignId: string | null) {
  let candidateQuery = service.from("lead_candidates").select("id,website_domain,email,source_url").limit(5000);
  if (campaignId) candidateQuery = candidateQuery.eq("campaign_id", campaignId);
  const [candidateResult, leadResult] = await Promise.all([
    candidateQuery,
    service.from("b2b_leads").select("id,website,website_domain,email").limit(5000),
  ]);
  const domains = new Map<string, { type: "candidate" | "lead"; id: string }>();
  const emails = new Map<string, { type: "candidate" | "lead"; id: string }>();
  for (const item of candidateResult.data ?? []) {
    const domain = cleanDomain(item.website_domain) || domainFromUrl(item.source_url);
    const email = normalizeEmail(item.email);
    if (domain) domains.set(domain, { type: "candidate", id: item.id });
    if (email) emails.set(email, { type: "candidate", id: item.id });
  }
  for (const item of leadResult.data ?? []) {
    const domain = cleanDomain(item.website_domain) || domainFromUrl(item.website);
    const email = normalizeEmail(item.email);
    if (domain) domains.set(domain, { type: "lead", id: item.id });
    if (email) emails.set(email, { type: "lead", id: item.id });
  }
  return { domains, emails };
}

function findDuplicate(candidate: { website_domain?: unknown; email?: unknown }, index: Awaited<ReturnType<typeof loadDuplicateIndex>>, ignoreCandidateId?: string) {
  const domain = cleanDomain(candidate.website_domain);
  const email = normalizeEmail(candidate.email);
  if (domain) {
    const match = index.domains.get(domain);
    if (match && !(match.type === "candidate" && match.id === ignoreCandidateId)) return { reason: `Website domain already exists in ${match.type}`, candidateId: match.type === "candidate" ? match.id : null };
  }
  if (email) {
    const match = index.emails.get(email);
    if (match && !(match.type === "candidate" && match.id === ignoreCandidateId)) return { reason: `Email already exists in ${match.type}`, candidateId: match.type === "candidate" ? match.id : null };
  }
  return null;
}

async function findExistingCrmLead(service: DbClient, websiteDomain: unknown, emailValue: unknown) {
  const domain = cleanDomain(websiteDomain);
  const email = normalizeEmail(emailValue);
  if (domain) {
    const { data } = await service.from("b2b_leads").select("id").or(`website_domain.eq.${domain},website.ilike.%${domain}%`).limit(1).maybeSingle();
    if (data?.id) return { id: data.id, reason: "Website domain already exists in CRM" };
  }
  if (email) {
    const { data } = await service.from("b2b_leads").select("id").ilike("email", email).limit(1).maybeSingle();
    if (data?.id) return { id: data.id, reason: "Email already exists in CRM" };
  }
  return null;
}

async function refreshCampaignCounts(service: DbClient, campaignId: string) {
  const { data } = await service.from("lead_candidates").select("verification_status").eq("campaign_id", campaignId);
  const counts = countStatuses(data ?? []);
  await service.from("lead_campaigns").update({
    discovered_count: (data ?? []).length,
    reviewed_count: counts.needs_review + counts.verified + counts.rejected + counts.imported,
    verified_count: counts.verified + counts.imported,
    imported_count: counts.imported,
  }).eq("id", campaignId);
}

function normalizeCampaign(input: CampaignInput) {
  const market = cleanText(input.market, 160);
  const products = normalizeStringArray(input.product_focus).slice(0, 20);
  const buyerTypes = normalizeStringArray(input.buyer_types).slice(0, 20);
  return {
    name: cleanText(input.name, 240) || `${market || "Market"} · ${products.slice(0, 2).join(" + ") || "B2B buyers"}`,
    market,
    product_focus: products,
    buyer_types: buyerTypes,
    search_queries: normalizeStringArray(input.search_queries).slice(0, MAX_DISCOVERY_QUERIES),
    target_count: clampNumber(input.target_count, 1, 100, 25),
  };
}

function buildSearchQueries(market: string, products: string[], buyerTypes: string[]) {
  const productTerms = products.length > 0 ? products.slice(0, 4) : ["apparel"];
  const buyerTerms = buyerTypes.length > 0 ? buyerTypes.slice(0, 4) : ["wholesaler", "importer"];
  const queries: string[] = [];
  for (const product of productTerms) {
    for (const buyer of buyerTerms.slice(0, 2)) queries.push(`${product} ${buyer} ${market}`.trim());
  }
  if (/germany|austria|switzerland|deutschland|österreich|schweiz/i.test(market)) {
    for (const product of productTerms.slice(0, 3)) {
      queries.push(`${product} Großhandel Händler ${market}`.trim());
      queries.push(`${product} Importeur Trachtenmode ${market}`.trim());
    }
  }
  return uniqueStrings(queries).slice(0, MAX_DISCOVERY_QUERIES);
}

function candidatePageUrls(website: string) {
  try {
    const base = new URL(website);
    return uniqueStrings([
      base.origin,
      new URL("/contact", base.origin).toString(),
      new URL("/kontakt", base.origin).toString(),
      new URL("/impressum", base.origin).toString(),
      new URL("/about", base.origin).toString(),
    ]);
  } catch {
    return [website];
  }
}

function dedupeSearchResults(results: SearchResult[]) {
  const seen = new Set<string>();
  return results.filter((item) => {
    const domain = domainFromUrl(item.url);
    const key = domain || item.url.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function countStatuses(rows: Array<{ verification_status?: string }>) {
  const counts = { unverified: 0, needs_review: 0, verified: 0, rejected: 0, duplicate: 0, imported: 0 };
  for (const row of rows) {
    const status = row.verification_status as keyof typeof counts;
    if (status in counts) counts[status] += 1;
  }
  return counts;
}

function summarizeOutcomes(outcomes: JsonRecord[]) {
  const summary: Record<string, number> = {};
  for (const item of outcomes) {
    const status = typeof item.status === "string" ? item.status : "unknown";
    summary[status] = (summary[status] || 0) + 1;
  }
  return summary;
}

function getFirecrawlKey() {
  return Deno.env.get("FIRECRAWL_API_KEY")
    || Deno.env.get("LOVABLE_FIRECRAWL_API_KEY")
    || Deno.env.get("CONNECTOR_FIRECRAWL_API_KEY")
    || "";
}

function parseJsonObject(text: string): JsonRecord {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try { return JSON.parse(cleaned); } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("AI returned invalid JSON");
  }
}

function normalizeStringArray(value: unknown) {
  if (Array.isArray(value)) return uniqueStrings(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean));
  if (typeof value === "string") return uniqueStrings(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean));
  return [];
}

function uniqueStrings(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))];
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    url.hash = "";
    return url.toString();
  } catch { return null; }
}

function domainFromUrl(value: unknown): string | null {
  const url = normalizeUrl(value);
  if (!url) return null;
  try { return cleanDomain(new URL(url).hostname); } catch { return null; }
}

function cleanDomain(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().toLowerCase().replace(/^www\./, "").replace(/\.$/, "");
  return cleaned.includes(".") ? cleaned : null;
}

function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase().replace(/^mailto:/, "");
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

function emailDomainMatches(email: string, website: string | null) {
  const emailDomain = cleanDomain(email.split("@")[1]);
  const siteDomain = domainFromUrl(website);
  return Boolean(emailDomain && siteDomain && (emailDomain === siteDomain || emailDomain.endsWith(`.${siteDomain}`)));
}

function nullableText(value: unknown, max: number): string | null {
  const text = cleanText(value, max);
  return text || null;
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, max);
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.round(number)));
}

function isRecord(value: unknown): value is JsonRecord {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text.slice(0, 1500); }
}

function readApiError(payload: unknown, fallback: string) {
  if (typeof payload === "string" && payload) return `${fallback}: ${payload}`;
  if (isRecord(payload)) {
    for (const key of ["error", "message", "detail"]) if (typeof payload[key] === "string") return `${fallback}: ${payload[key]}`;
  }
  return fallback;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
