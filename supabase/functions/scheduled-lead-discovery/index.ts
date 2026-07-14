import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Row = Record<string, any>;
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });
const UA = "Mozilla/5.0 (compatible; IrhaBuyerDiscovery/2.0; +https://www.irhaapparels.com)";
const blockedHosts = ["bing.com","google.com","facebook.com","instagram.com","linkedin.com","youtube.com","amazon.com","ebay.com","etsy.com","alibaba.com","wikipedia.org"];

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!supabaseUrl || !serviceKey) return json({ error: "runtime_not_configured" }, 500);
  const db = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await req.json().catch(() => ({})) as Row;
  const token = req.headers.get("x-irha-ops-token") || "";
  const now = new Date().toISOString();
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "unauthorized" }, 401);
  const claim = await db.from("operations_call_tokens").update({ consumed_at: now }).eq("id", token).eq("action", "lead_discovery").is("consumed_at", null).gt("expires_at", now).select("id").maybeSingle();
  if (!claim.data) return json({ error: "invalid_or_consumed_token" }, 401);
  const control = await db.from("operations_control").select("enabled,lead_discovery_enabled").eq("id", "default").maybeSingle();
  if (!control.data?.enabled || control.data.lead_discovery_enabled === false) return json({ ok: true, skipped: true, reason: "lead_discovery_disabled" });

  const triggerSource = body.trigger_source === "manual" ? "manual" : "cron";
  const run = await db.from("operations_runs").insert({ action: "lead_discovery", trigger_source: triggerSource, status: "running" }).select("id").single();
  if (!run.data) return json({ error: run.error?.message || "run_create_failed" }, 500);
  const started = Date.now();

  try {
    const [settingsResult, adminResult] = await Promise.all([
      db.from("automation_settings").select("lead_markets,lead_product_focus,lead_buyer_types,daily_lead_candidate_limit").eq("id", "default").maybeSingle(),
      db.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle(),
    ]);
    const settings = settingsResult.data || {};
    const local = new Date(Date.now() + 5 * 60 * 60_000);
    const day = dayOfYear(local) - 1;
    const markets = stringList(settings.lead_markets);
    const products = stringList(settings.lead_product_focus);
    const buyers = stringList(settings.lead_buyer_types);
    const market = clean(body.market, 100) || markets[day % Math.max(1, markets.length)] || "Germany";
    const product = clean(body.product, 140) || products[day % Math.max(1, products.length)] || "Bavarian & Trachten";
    const target = Math.max(5, Math.min(20, Number(body.target || settings.daily_lead_candidate_limit || 10)));
    const dateKey = local.toISOString().slice(0, 10);
    const campaignName = `Automated Buyer Discovery · ${dateKey} · ${market} · ${product}`;

    const existing = await db.from("lead_campaigns").select("*").eq("name", campaignName).maybeSingle();
    if (existing.data && Number(existing.data.discovered_count || 0) > 0) {
      const result = { ok: true, skipped: true, reason: "already_created_today", campaign_id: existing.data.id, discovered_count: existing.data.discovered_count };
      await finish(db, run.data.id, started, "skipped", result, null);
      return json({ run_id: run.data.id, ...result });
    }

    const terms = productTerms(product);
    const buyerTerms = buyers.length ? buyers.slice(0, 3) : ["retailer", "importer", "distributor"];
    const queries = buildQueries(market, terms, buyerTerms);
    let campaign = existing.data;
    if (campaign) {
      await db.from("lead_campaigns").update({ status: "running", search_queries: queries, source_providers: ["bing_rss","public_search_no_api_key"], last_run_at: now, error: null }).eq("id", campaign.id);
    } else {
      const created = await db.from("lead_campaigns").insert({
        name: campaignName,
        market,
        product_focus: [product],
        buyer_types: buyerTerms,
        search_queries: queries,
        source_providers: ["bing_rss","public_search_no_api_key"],
        target_count: target,
        status: "running",
        last_run_at: now,
        requested_by: adminResult.data?.user_id || null,
      }).select("*").single();
      if (!created.data) throw new Error(created.error?.message || "campaign_create_failed");
      campaign = created.data;
    }

    const found: Row[] = [];
    const failures: string[] = [];
    for (const query of queries) {
      const searchRun = await db.from("lead_search_runs").insert({ campaign_id: campaign.id, query, provider: "bing_rss", status: "running", response_meta: { external_credits_used: 0 } }).select("id").single();
      try {
        const rows = await bing(query, 12);
        found.push(...rows);
        if (searchRun.data?.id) await db.from("lead_search_runs").update({ status: "completed", result_count: rows.length, response_meta: { external_credits_used: 0 }, completed_at: new Date().toISOString() }).eq("id", searchRun.data.id);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        failures.push(`${query}: ${message}`);
        if (searchRun.data?.id) await db.from("lead_search_runs").update({ status: "failed", error: message.slice(0, 1000), completed_at: new Date().toISOString() }).eq("id", searchRun.data.id);
      }
      await delay(250);
    }

    const [candidateResult, crmResult] = await Promise.all([
      db.from("lead_candidates").select("website_domain,email").limit(5000),
      db.from("b2b_leads").select("website_domain,email").limit(5000),
    ]);
    const knownDomains = new Set<string>();
    const knownEmails = new Set<string>();
    for (const row of [...(candidateResult.data || []), ...(crmResult.data || [])]) {
      if (row.website_domain) knownDomains.add(String(row.website_domain).toLowerCase());
      if (row.email) knownEmails.add(String(row.email).toLowerCase());
    }

    const candidates: Row[] = [];
    const seen = new Set<string>();
    for (const item of dedupe(found)) {
      const website = safeUrl(item.url);
      const domain = website ? hostname(website) : null;
      if (!website || !domain || seen.has(domain) || knownDomains.has(domain) || isBlocked(domain)) continue;
      const evidence = `${item.title} ${item.description}`.toLowerCase();
      const productSignal = terms.some((term) => evidence.includes(term.toLowerCase()));
      const buyerSignal = buyerWords().some((term) => evidence.includes(term));
      const makerSignal = ["manufacturer","factory","producer","hersteller","fabrik"].some((term) => evidence.includes(term));
      if (!productSignal || (makerSignal && !buyerSignal)) continue;
      const email = firstEmail(evidence);
      if (email && knownEmails.has(email)) continue;
      seen.add(domain);
      const score = Math.min(70, 36 + (buyerSignal ? 18 : 0) + (email ? 8 : 0));
      candidates.push({
        campaign_id: campaign.id,
        company_name: companyName(item.title, domain),
        website,
        website_domain: domain,
        country: countryFrom(domain, market),
        email,
        buyer_type: buyerType(evidence),
        product_fit: [product],
        source_url: item.url,
        source_title: clean(item.title, 300),
        source_query: item.query,
        source_provider: "bing_rss",
        source_excerpt: clean(item.description, 1800),
        evidence: { stage: "scheduled_discovery_v2", product_signal: true, buyer_signal: buyerSignal, manufacturer_signal: makerSignal, external_credits_used: 0 },
        raw_data: { scheduled_worker: "v2" },
        verification_status: "needs_review",
        verification_score: score,
      });
      if (candidates.length >= target) break;
    }

    if (candidates.length) {
      const inserted = await db.from("lead_candidates").insert(candidates);
      if (inserted.error) throw new Error(inserted.error.message);
    }
    const status = candidates.length ? (failures.length ? "paused" : "completed") : "paused";
    const error = candidates.length ? (failures.length ? failures.join(" | ").slice(0, 4000) : null) : "No new unique candidates passed review filters; campaign preserved for retry.";
    await db.from("lead_campaigns").update({ status, discovered_count: candidates.length, reviewed_count: candidates.length, verified_count: 0, error }).eq("id", campaign.id);
    const result = { ok: candidates.length > 0, campaign_id: campaign.id, market, product, queries, searched_results: found.length, inserted: candidates.length, failures, external_credits_used: 0, crm_imported: 0, outreach_sent: 0, owner_review_required: true };
    await finish(db, run.data.id, started, candidates.length ? (failures.length ? "partial" : "completed") : "partial", result, candidates.length ? null : error);
    return json({ run_id: run.data.id, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finish(db, run.data.id, started, "failed", {}, message);
    return json({ ok: false, run_id: run.data.id, error: message }, 500);
  }
});

async function bing(query: string, limit: number) {
  const response = await fetch(`https://www.bing.com/search?format=rss&q=${encodeURIComponent(query)}`, { headers: { "user-agent": UA, accept: "application/rss+xml,application/xml" }, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`bing_${response.status}`);
  const xml = await response.text();
  const out: Row[] = [];
  for (const item of xml.match(/<item\b[\s\S]*?<\/item>/gi) || []) {
    const url = safeUrl(tag(item, "link"));
    if (!url) continue;
    out.push({ url, title: strip(tag(item, "title")), description: strip(tag(item, "description")), query });
    if (out.length >= limit) break;
  }
  if (!out.length) throw new Error("bing_no_results");
  return out;
}
function buildQueries(market: string, terms: string[], buyers: string[]) { const out = [`\"${terms[0]}\" shop ${market} -manufacturer -factory`, `\"${terms[1] || terms[0]}\" retailer ${market} -manufacturer`, `\"${terms[0]}\" importer ${market}`, `${terms[0]} Händler Modehaus ${market} -Hersteller -Fabrik`]; if (buyers[0]) out.push(`\"${terms[0]}\" ${buyers[0]} ${market}`); return [...new Set(out)].slice(0,5); }
function productTerms(product: string) { const value = product.toLowerCase(); if (value.includes("bavarian") || value.includes("trachten")) return ["lederhosen","dirndl","trachten"]; if (value.includes("leather")) return ["leather jacket","leatherwear","biker jacket"]; if (value.includes("sportswear")) return ["sportswear","teamwear","football kit"]; if (value.includes("streetwear") || value.includes("activewear")) return ["streetwear","activewear","hoodie"]; if (value.includes("nightwear") || value.includes("leisurewear")) return ["sleepwear","nightwear","loungewear"]; return [product,"apparel","clothing"]; }
function buyerWords() { return ["retailer","shop","store","boutique","modehaus","händler","importer","distributor","wholesale","wholesaler","stockist","reseller"]; }
function buyerType(text: string) { if (text.includes("importer")) return "importer"; if (text.includes("distributor")) return "distributor"; if (text.includes("wholesale")) return "wholesaler"; return "retailer"; }
function countryFrom(domain: string, fallback: string) { if (domain.endsWith(".de")) return "Germany"; if (domain.endsWith(".at")) return "Austria"; if (domain.endsWith(".ch")) return "Switzerland"; if (domain.endsWith(".nl")) return "Netherlands"; return fallback; }
function safeUrl(value: unknown) { if (typeof value !== "string") return null; try { const url = new URL(value.trim()); if (!["http:","https:"].includes(url.protocol) || url.username || url.password) return null; url.hash = ""; return url.toString(); } catch { return null; } }
function hostname(url: string) { try { return new URL(url).hostname.toLowerCase().replace(/^www\./,""); } catch { return null; } }
function isBlocked(domain: string) { return blockedHosts.some((host) => domain === host || domain.endsWith(`.${host}`)) || domain === "irhaapparels.com" || domain.endsWith(".irhaapparels.com"); }
function dedupe(rows: Row[]) { const seen = new Set<string>(); return rows.filter((row) => { const domain = row.url ? hostname(row.url) : null; if (!domain || seen.has(domain)) return false; seen.add(domain); return true; }); }
function companyName(title: string, domain: string) { return clean(strip(title).split(/\s+[|–—]\s+/)[0] || domain.split(".")[0].replace(/[-_]+/g," "),160); }
function firstEmail(text: string) { return text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i)?.[0]?.toLowerCase() || null; }
function tag(source: string, name: string) { return source.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)<\\/${name}>`,"i"))?.[1] || ""; }
function strip(value: string) { return value.replace(/<[^>]+>/g," ").replace(/&amp;/g,"&").replace(/&quot;/g,"\"").replace(/&#39;|&apos;/g,"'").replace(/\s+/g," ").trim(); }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.replace(/\s+/g," ").trim().slice(0,max) : ""; }
function stringList(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()) : []; }
function dayOfYear(date: Date) { return Math.floor((date.getTime() - Date.UTC(date.getUTCFullYear(),0,0)) / 86400000); }
function delay(ms: number) { return new Promise((resolve) => setTimeout(resolve, ms)); }
async function finish(db: any, id: string, started: number, status: string, summary: unknown, error: string | null) { await db.from("operations_runs").update({ status, completed_at: new Date().toISOString(), duration_ms: Date.now()-started, summary, error }).eq("id", id); }
