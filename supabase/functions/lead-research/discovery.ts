import { BUYER, MAKER, PROVIDER, clamp, clean, domain, emailFrom, inferBuyer, list, phoneFrom, productFit, publicSearch, response, safeUrl, unique } from "./utils.ts";

export async function health(db: any) {
  const tables = await Promise.all(["lead_campaigns", "lead_search_runs", "lead_candidates", "b2b_leads"].map(async (table) => ({ table, ready: !(await db.from(table).select("id", { head: true }).limit(1)).error })));
  const ready = tables.every((x) => x.ready);
  return response({ ok: true, database_ready: ready, tables, firecrawl_configured: true, ai_gateway_configured: true, discovery_ready: ready, search_provider: PROVIDER, billing_mode: "no_external_credits", note: ready ? "Zero-credit buyer discovery is active." : "Lead database tables are not ready." });
}

export async function connectionTest() {
  try { const results = await publicSearch("Trachten Großhandel Deutschland", 2); return response({ ok: true, provider_mode: PROVIDER, result_count: results.length, billing_mode: "no_external_credits" }); }
  catch (error) { return response({ ok: false, provider_mode: PROVIDER, error: error instanceof Error ? error.message : "Search failed", billing_mode: "no_external_credits" }); }
}

function queries(market: string, products: string[], buyers: string[]) {
  const out: string[] = [];
  for (const product of products.slice(0, 4)) for (const buyer of buyers.slice(0, 2)) out.push(`${product} ${buyer} ${market}`);
  if (/germany|austria|switzerland|deutschland|österreich|schweiz/i.test(market)) for (const product of products.slice(0, 3)) out.push(`${product} Großhandel Händler ${market}`, `${product} Shop Händler ${market}`);
  return unique(out).slice(0, 8);
}

async function known(db: any) {
  const [a, b] = await Promise.all([db.from("lead_candidates").select("id,website_domain,email,source_url").limit(5000), db.from("b2b_leads").select("id,website_domain,email,website").limit(5000)]);
  const domains = new Map<string, string>(), emails = new Map<string, string>();
  for (const row of [...(a.data || []), ...(b.data || [])]) { const d = domain(row.website_domain || row.website || row.source_url); if (d) domains.set(d, row.id); if (row.email) emails.set(String(row.email).toLowerCase(), row.id); }
  return { domains, emails };
}

export async function discover(db: any, userId: string, body: Record<string, any>) {
  const result = await db.from("lead_campaigns").select("*").eq("id", body.campaign_id).maybeSingle();
  if (result.error || !result.data) return response({ error: "Campaign not found" }, 404);
  const campaign = result.data, id = String(campaign.id), target = clamp(campaign.target_count, 1, 100, 25), products = list(campaign.product_focus), buyers = list(campaign.buyer_types);
  const searchQueries = (list(campaign.search_queries).length ? list(campaign.search_queries) : queries(String(campaign.market || ""), products, buyers)).slice(0, 8);
  await db.from("lead_campaigns").update({ status: "running", search_queries: searchQueries, source_providers: [PROVIDER, "direct_website"], last_run_at: new Date().toISOString(), error: null }).eq("id", id);
  const found: any[] = [], failures: string[] = [];
  for (const query of searchQueries) {
    const run = await db.from("lead_search_runs").insert({ campaign_id: id, query, provider: PROVIDER, status: "running" }).select("id").single();
    try { const rows = await publicSearch(query, Math.max(5, Math.ceil(target / searchQueries.length) + 4)); found.push(...rows); await db.from("lead_search_runs").update({ status: "completed", result_count: rows.length, response_meta: { external_credits_used: 0 }, completed_at: new Date().toISOString() }).eq("id", run.data.id); }
    catch (error) { const message = error instanceof Error ? error.message : "Search failed"; failures.push(`${query}: ${message}`); await db.from("lead_search_runs").update({ status: "failed", error: message, completed_at: new Date().toISOString() }).eq("id", run.data.id); }
  }
  const existing = await known(db), seen = new Set<string>(), candidates: any[] = [];
  for (const item of found) {
    const website = safeUrl(item.url), d = domain(website);
    if (!website || !d || seen.has(d)) continue;
    seen.add(d);
    const text = `${item.title} ${item.description} ${item.url} ${item.query}`;
    const buyerSignal = BUYER.test(text), makerSignal = MAKER.test(text), fit = productFit(text, products), buyerType = inferBuyer(text) || inferBuyer(item.query), email = emailFrom(text), phone = phoneFrom(text);
    let score = 15 + (buyerSignal ? 15 : 0) + (buyerType ? 10 : 0) + (fit.length ? 10 : 0) + (email || phone ? 5 : 0); if (makerSignal && !buyerSignal) score = Math.max(8, score - 10);
    const duplicate = existing.domains.get(d) || (email ? existing.emails.get(email) : null);
    candidates.push({ campaign_id: id, company_name: clean(item.title, 180) || d, website, website_domain: d, email, phone, buyer_type: buyerType, product_fit: fit.length ? fit : products.slice(0, 3), source_url: item.url, source_title: clean(item.title, 300), source_query: item.query, source_provider: PROVIDER, source_excerpt: clean(item.description, 1800), evidence: { stage: "discovery", buyer_signal: buyerSignal, manufacturer_signal: makerSignal, product_fit: fit, search_provider: item.provider, external_credits_used: 0 }, raw_data: { search_result: item }, verification_status: duplicate ? "duplicate" : buyerSignal || buyerType || fit.length ? "needs_review" : "unverified", verification_score: Math.min(55, score), duplicate_reason: duplicate ? "Website domain or email already exists" : null, duplicate_of: duplicate || null });
    if (candidates.length >= target) break;
  }
  if (!candidates.length) { const message = found.length ? "Search completed, but no usable company websites were found. Try simpler queries." : "Public search returned no results. Try again later."; await db.from("lead_campaigns").update({ status: "failed", error: message }).eq("id", id); return response({ ok: false, error: message, searched_results: found.length, failures, external_credits_used: 0 }); }
  const inserted = await db.from("lead_candidates").insert(candidates).select("verification_status");
  if (inserted.error) throw inserted.error;
  await db.from("lead_campaigns").update({ status: failures.length ? "paused" : "completed", discovered_count: inserted.data.length, error: failures.length ? failures.join(" | ").slice(0, 4000) : null }).eq("id", id);
  return response({ ok: true, campaign_id: id, inserted: inserted.data.length, failures, provider: PROVIDER, external_credits_used: 0, note: "Candidates are real public-web results but remain unverified until Enrich & Verify." });
}
