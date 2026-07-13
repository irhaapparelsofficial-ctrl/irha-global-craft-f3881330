import {
  CLASSIFIER, DOWNSTREAM_BUYER, MAKER, PROVIDER, WHOLESALE_BUYER,
  clamp, clean, companyName, domain, emailFrom, inferBuyer, inferCountry, knownRecords,
  list, openStreetMapSearch, phoneFrom, productFit, publicSearch, refreshCampaign,
  response, safeUrl, sleep, unique,
} from "./utils.ts";

const MAX_QUERIES = 8;

export async function health(db: any) {
  const tables = await Promise.all(["lead_campaigns", "lead_search_runs", "lead_candidates", "b2b_leads"].map(async (table) => {
    const result = await db.from(table).select("id", { head: true, count: "exact" }).limit(1);
    return { table, ready: !result.error, error: result.error?.message };
  }));
  const ready = tables.every((x) => x.ready);
  return response({
    ok: true,
    checked_at: new Date().toISOString(),
    database_ready: ready,
    tables,
    discovery_ready: ready,
    search_provider: PROVIDER,
    search_sources: ["duckduckgo_lite", "bing_rss", "openstreetmap_nominatim"],
    classification_provider: CLASSIFIER,
    billing_mode: "no_external_credits",
    external_api_keys_required: false,
    firecrawl_configured: false,
    ai_gateway_configured: false,
    note: ready ? "Zero-credit buyer discovery is active. Public no-key sources and deterministic verification are used." : "Lead database tables are not ready.",
  });
}

export async function connectionTest() {
  try {
    const results = await publicSearch("Trachten shop Germany -manufacturer -factory -supplier", 3);
    return response({ ok: true, provider_mode: PROVIDER, result_count: results.length, providers: unique(results.map((x) => x.provider)), billing_mode: "no_external_credits", external_api_keys_required: false });
  } catch (error) {
    return response({ ok: false, provider_mode: PROVIDER, error: error instanceof Error ? error.message : "Search failed", billing_mode: "no_external_credits" });
  }
}

function queries(market: string, products: string[], buyers: string[]) {
  const out: string[] = [];
  const priorityBuyers = [...buyers].sort((a, b) => buyerPriority(a) - buyerPriority(b));
  for (const product of products.slice(0, 4)) {
    for (const buyer of priorityBuyers.slice(0, 3)) out.push(`"${product}" ${buyer} ${market} -manufacturer -factory -supplier -exporter`);
  }
  if (/germany|austria|switzerland|deutschland|österreich|schweiz|dach/i.test(market)) {
    for (const product of products.slice(0, 3)) out.push(`${product} Händler Shop Modehaus ${market} -Hersteller -Fabrik`);
  }
  return unique(out).slice(0, MAX_QUERIES);
}

function buyerPriority(value: string) {
  if (/retail|shop|händler|boutique|modehaus/i.test(value)) return 0;
  if (/import/i.test(value)) return 1;
  if (/distribut/i.test(value)) return 2;
  if (/wholesale|großhandel/i.test(value)) return 3;
  return 4;
}

function classify(text: string, products: string[], osm = false) {
  const fit = productFit(text, products);
  const downstream = DOWNSTREAM_BUYER.test(text) || osm;
  const wholesale = WHOLESALE_BUYER.test(text) && !MAKER.test(text);
  const maker = MAKER.test(text);
  const buyerSignal = downstream || wholesale;
  return { fit, downstream, wholesale, maker, buyerSignal, accepted: fit.length > 0 && buyerSignal && !(maker && !downstream) };
}

export async function discover(db: any, userId: string, body: Record<string, any>) {
  const result = await db.from("lead_campaigns").select("*").eq("id", body.campaign_id).maybeSingle();
  if (result.error || !result.data) return response({ error: "Campaign not found" }, 404);

  const campaign = result.data, id = String(campaign.id), target = clamp(campaign.target_count, 1, 100, 25);
  const products = list(campaign.product_focus), buyers = list(campaign.buyer_types);
  const searchQueries = (list(campaign.search_queries).length ? list(campaign.search_queries) : queries(String(campaign.market || ""), products, buyers)).slice(0, MAX_QUERIES);
  await db.from("lead_campaigns").update({ status: "running", search_queries: searchQueries, source_providers: [PROVIDER, "direct_website", "openstreetmap_nominatim"], last_run_at: new Date().toISOString(), error: null, requested_by: campaign.requested_by || userId }).eq("id", id);

  const found: any[] = [], failures: string[] = [];
  const perQuery = Math.max(5, Math.min(12, Math.ceil(target / Math.max(1, searchQueries.length)) + 4));
  for (const query of searchQueries) {
    const run = await db.from("lead_search_runs").insert({ campaign_id: id, query, provider: PROVIDER, status: "running", response_meta: { external_credits_used: 0 } }).select("id").single();
    if (run.error || !run.data) throw run.error || new Error("Search run could not be created");
    try {
      const rows = await publicSearch(query, perQuery); found.push(...rows);
      const providerBreakdown = rows.reduce((acc: Record<string, number>, row: any) => ({ ...acc, [row.provider]: (acc[row.provider] || 0) + 1 }), {});
      await db.from("lead_search_runs").update({ status: "completed", result_count: rows.length, response_meta: { external_credits_used: 0, provider_breakdown: providerBreakdown }, completed_at: new Date().toISOString() }).eq("id", run.data.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Search failed"; failures.push(`${query}: ${message}`);
      await db.from("lead_search_runs").update({ status: "failed", error: message, response_meta: { external_credits_used: 0 }, completed_at: new Date().toISOString() }).eq("id", run.data.id);
    }
    await sleep(250);
  }

  const relevantCount = found.filter((item) => classify(`${item.title} ${item.description} ${item.url}`, products).accepted).length;
  if (relevantCount < Math.min(5, target)) {
    try { found.push(...await openStreetMapSearch(String(campaign.market || ""), products, Math.min(15, target + 5))); }
    catch (error) { failures.push(`OpenStreetMap fallback: ${error instanceof Error ? error.message : "Search failed"}`); }
  }

  const existing = await knownRecords(db), seen = new Set<string>(), seenEmails = new Set<string>(), candidates: any[] = [];
  for (const item of found) {
    const website = safeUrl(item.url), d = domain(website);
    if (!website || !d || seen.has(d)) continue;
    seen.add(d);
    const text = `${item.title} ${item.description} ${item.url}`;
    const signals = classify(text, products, item.provider === "openstreetmap_nominatim");
    if (!signals.accepted) continue;
    const buyerType = inferBuyer(text) || (item.provider === "openstreetmap_nominatim" ? "retailer" : null);
    const email = item.email || emailFrom(text, d), phone = item.phone || phoneFrom(text);
    if (email && seenEmails.has(email)) continue;
    const duplicate = existing.domains.get(d) || (email ? existing.emails.get(email) : null);
    const score = Math.min(60, 12 + (signals.downstream ? 22 : signals.wholesale ? 12 : 0) + (signals.fit.length ? 16 : 0) + (email || phone ? 8 : 0) + (item.provider === "openstreetmap_nominatim" ? 6 : 0));
    candidates.push({
      campaign_id: id,
      company_name: companyName(item.title, d),
      website,
      website_domain: d,
      country: item.country || inferCountry(d, String(campaign.market || "")),
      city: item.city || null,
      email,
      phone,
      whatsapp: item.whatsapp || null,
      buyer_type: buyerType,
      product_fit: signals.fit,
      source_url: item.url,
      source_title: clean(item.title, 300),
      source_query: item.query,
      source_provider: item.provider,
      source_excerpt: clean(item.description, 1800),
      evidence: { stage: "discovery", buyer_signal: signals.buyerSignal, downstream_buyer_signal: signals.downstream, wholesale_signal: signals.wholesale, manufacturer_signal: signals.maker, product_fit: signals.fit, search_provider: item.provider, external_credits_used: 0 },
      raw_data: { search_result: item.raw || item },
      verification_status: duplicate ? "duplicate" : score >= 28 ? "needs_review" : "unverified",
      verification_score: score,
      duplicate_reason: duplicate ? "Website domain or email already exists" : null,
      duplicate_of: duplicate || null,
    });
    if (email) seenEmails.add(email);
    if (candidates.length >= target) break;
  }

  if (!candidates.length) {
    const message = found.length ? "Search completed, but no relevant buyer websites passed the buyer/manufacturer filters." : "Public search returned no results. Try again later.";
    await db.from("lead_campaigns").update({ status: "failed", error: failures.length ? `${message} ${failures.join(" | ")}`.slice(0, 4000) : message }).eq("id", id);
    return response({ ok: false, error: message, searched_results: found.length, failures, external_credits_used: 0 }, 422);
  }

  const inserted = await db.from("lead_candidates").insert(candidates).select("verification_status");
  if (inserted.error) throw inserted.error;
  await refreshCampaign(db, id);
  await db.from("lead_campaigns").update({ status: failures.length ? "paused" : "completed", error: failures.length ? failures.join(" | ").slice(0, 4000) : null }).eq("id", id);
  return response({ ok: true, campaign_id: id, inserted: inserted.data.length, failures, provider: PROVIDER, external_credits_used: 0, note: "Candidates are real public-web results and remain unverified until Enrich & Verify." });
}
