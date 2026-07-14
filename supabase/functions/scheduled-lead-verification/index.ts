import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Row = Record<string, any>;
const ACTION = "lead_verification";
const MARKETPLACES = /(^|\.)(amazon\.|ebay\.|etsy\.|alibaba\.|aliexpress\.|carousell\.|pinterest\.|facebook\.|instagram\.|linkedin\.|youtube\.)/i;
const BUYER = /\b(retail|retailer|shop|store|boutique|webshop|online[- ]?shop|modehaus|h[aä]ndler|haendler|einzelhandel|gro[ßs]handel|wholesale|wholesaler|importer|importeur|distributor|vertrieb|stockist|reseller|department store|warenhaus|teamwear|teamsport|club|verein|b2b portal|group order)\b/i;
const MAKER = /\b(manufacturer|manufacturing|factory|fabrik|producer|exporter|supplier|hersteller|produktion|custom maker|private label manufacturer)\b/i;
const PRODUCT = /\b(lederhosen|lederhose|dirndl|trachten|bavarian|oktoberfest|sportswear|teamwear|football|soccer|tracksuit|nightwear|sleepwear|pyjama|pajama|loungewear|leather jacket|streetwear|activewear)\b/i;
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !key) return json({ error: "runtime_not_configured" }, 500);
  const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const token = req.headers.get("x-irha-ops-token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "unauthorized" }, 401);
  const now = new Date().toISOString();
  const { data: claimed } = await db.from("operations_call_tokens").update({ consumed_at: now }).eq("id", token).eq("action", ACTION).is("consumed_at", null).gt("expires_at", now).select("id").maybeSingle();
  if (!claimed) return json({ error: "invalid_or_consumed_token" }, 401);
  const { data: control } = await db.from("operations_control").select("enabled,lead_discovery_enabled").eq("id", "default").maybeSingle();
  if (!control?.enabled || control.lead_discovery_enabled === false) return json({ ok: true, skipped: true, reason: "lead_research_disabled" });

  const body = await req.json().catch(() => ({})) as Row;
  const limit = Math.max(1, Math.min(5, Number(body.limit || 5)));
  const ids = Array.isArray(body.candidate_ids) ? body.candidate_ids.filter((x: unknown) => typeof x === "string").slice(0, limit) : [];
  const trigger = body.trigger_source === "manual" ? "manual" : "cron";
  const { data: run, error: runError } = await db.from("operations_runs").insert({ action: ACTION, trigger_source: trigger, status: "running" }).select("id").single();
  if (runError || !run) return json({ error: runError?.message || "run_create_failed" }, 500);
  const started = Date.now();

  try {
    let query = db.from("lead_candidates").select("id,campaign_id,company_name,website,website_domain,email,phone,whatsapp,buyer_type,product_fit,source_url,source_title,source_excerpt,verification_score,verification_status,evidence,raw_data").in("verification_status", ["needs_review", "unverified"]).order("verification_score", { ascending: false }).limit(limit);
    if (ids.length) query = db.from("lead_candidates").select("id,campaign_id,company_name,website,website_domain,email,phone,whatsapp,buyer_type,product_fit,source_url,source_title,source_excerpt,verification_score,verification_status,evidence,raw_data").in("id", ids).in("verification_status", ["needs_review", "unverified"]).limit(limit);
    const { data: candidates, error: candidateError } = await query;
    if (candidateError) throw candidateError;
    if (!candidates?.length) {
      const result = { ok: true, skipped: true, reason: "no_pending_candidates", processed: 0 };
      await finish(db, run.id, started, "skipped", result, null);
      return json({ run_id: run.id, ...result });
    }

    const { data: crm } = await db.from("b2b_leads").select("id,website_domain,website,email").limit(5000);
    const crmDomains = new Map<string, string>(), crmEmails = new Map<string, string>();
    for (const lead of crm || []) {
      const d = domain(lead.website_domain || lead.website); if (d) crmDomains.set(d, lead.id);
      const e = validEmail(lead.email); if (e) crmEmails.set(e, lead.id);
    }

    const outcomes: Row[] = [];
    for (const candidate of candidates) outcomes.push(await verifyOne(db, candidate, crmDomains, crmEmails));
    const campaignIds = [...new Set(candidates.map((x: Row) => String(x.campaign_id)).filter(Boolean))];
    for (const campaignId of campaignIds) await refreshCampaign(db, campaignId);
    const summary = outcomes.reduce((acc: Row, item: Row) => ({ ...acc, [item.status]: (acc[item.status] || 0) + 1 }), {});
    const result = { ok: true, processed: outcomes.length, summary, outcomes, external_credits_used: 0, crm_imported: 0, messages_sent: 0 };
    await finish(db, run.id, started, "completed", result, null);
    return json({ run_id: run.id, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finish(db, run.id, started, "failed", {}, message);
    return json({ ok: false, run_id: run.id, error: message }, 500);
  }
});

async function verifyOne(db: any, candidate: Row, crmDomains: Map<string, string>, crmEmails: Map<string, string>) {
  const website = normalizeUrl(candidate.website || candidate.source_url);
  if (!website) return update(db, candidate, "rejected", 0, { reason: "invalid_public_website" });
  const d = domain(website)!;
  if (MARKETPLACES.test(d)) return update(db, candidate, "rejected", 5, { reason: "marketplace_or_social_platform", website_domain: d });
  const duplicateId = crmDomains.get(d) || (validEmail(candidate.email) ? crmEmails.get(validEmail(candidate.email)!) : null);
  if (duplicateId) return update(db, candidate, "duplicate", Number(candidate.verification_score || 0), { reason: "already_exists_in_crm", duplicate_of: duplicateId, website_domain: d });

  try {
    const pages = await fetchPages(website);
    const text = pages.map((x) => x.text).join(" ").slice(0, 180000);
    const html = pages.map((x) => x.html).join(" ").slice(0, 500000);
    const titleText = `${candidate.company_name || ""} ${candidate.source_title || ""} ${candidate.source_excerpt || ""}`;
    const buyerSignal = BUYER.test(text) || BUYER.test(titleText);
    const makerSignal = MAKER.test(text);
    const productSignal = PRODUCT.test(text) || (Array.isArray(candidate.product_fit) && candidate.product_fit.length > 0);
    const path = new URL(website).pathname.toLowerCase();
    const articleOnly = /\/(blog|journal|news|what-is|history|guide|magazine)\b/.test(path) && !/\b(shop|store|buy|collection|products?)\b/i.test(text.slice(0, 30000));
    const email = emailFrom(text, d) || validEmail(candidate.email);
    const phone = phoneFrom(text) || clean(candidate.phone, 100) || null;
    const whatsapp = whatsappFrom(html, text) || clean(candidate.whatsapp, 100) || null;
    const contact = Boolean(email || phone || whatsapp);
    let score = 20 + (buyerSignal ? 30 : 0) + (productSignal ? 20 : 0) + (email ? (email.endsWith(`@${d}`) ? 20 : 10) : 0) + (phone || whatsapp ? 10 : 0) + (pages.length > 1 ? 5 : 0);
    if (makerSignal && !buyerSignal) score -= 45;
    if (articleOnly) score -= 50;
    score = Math.max(0, Math.min(100, score));
    const status = articleOnly || (makerSignal && !buyerSignal) || !productSignal ? "rejected" : buyerSignal && productSignal && contact && score >= 70 ? "verified" : "needs_review";
    return update(db, candidate, status, score, { website, website_domain: d, email, phone, whatsapp, pages_checked: pages.map((x) => x.url), buyer_signal: buyerSignal, manufacturer_signal: makerSignal, product_signal: productSignal, article_only: articleOnly, public_contact_found: contact });
  } catch (error) {
    return update(db, candidate, "needs_review", Number(candidate.verification_score || 0), { website, website_domain: d, verification_error: error instanceof Error ? error.message : "verification_failed" });
  }
}

async function update(db: any, candidate: Row, status: string, score: number, evidence: Row) {
  const patch: Row = {
    verification_status: status,
    verification_score: score,
    reviewed_at: new Date().toISOString(),
    evidence: { ...(candidate.evidence || {}), automated_verification: { method: "scheduled_public_website_verifier_v1", checked_at: new Date().toISOString(), external_credits_used: 0, ...evidence } },
  };
  if (evidence.website) patch.website = evidence.website;
  if (evidence.website_domain) patch.website_domain = evidence.website_domain;
  if (evidence.email !== undefined) patch.email = evidence.email;
  if (evidence.phone !== undefined) patch.phone = evidence.phone;
  if (evidence.whatsapp !== undefined) patch.whatsapp = evidence.whatsapp;
  if (status === "duplicate") { patch.duplicate_reason = evidence.reason || "Duplicate"; patch.duplicate_of = evidence.duplicate_of || null; }
  else { patch.duplicate_reason = null; patch.duplicate_of = null; }
  const { error } = await db.from("lead_candidates").update(patch).eq("id", candidate.id);
  if (error) return { id: candidate.id, status: "failed", error: error.message };
  return { id: candidate.id, company: candidate.company_name, status, score, pages_checked: Array.isArray(evidence.pages_checked) ? evidence.pages_checked.length : 0, reason: evidence.reason || evidence.verification_error || null };
}

async function refreshCampaign(db: any, id: string) {
  const { data } = await db.from("lead_candidates").select("verification_status").eq("campaign_id", id).limit(5000);
  const rows = data || [], count = (s: string) => rows.filter((x: Row) => x.verification_status === s).length;
  await db.from("lead_campaigns").update({ discovered_count: rows.length, reviewed_count: count("needs_review") + count("verified") + count("rejected") + count("duplicate") + count("imported"), verified_count: count("verified") + count("imported"), imported_count: count("imported") }).eq("id", id);
}

async function fetchPages(value: string) {
  const first = await publicUrl(value), origin = first.origin;
  const targets = [first.toString(), new URL("/contact", origin).toString(), new URL("/kontakt", origin).toString(), new URL("/impressum", origin).toString(), new URL("/about-us", origin).toString()];
  const pages: Row[] = [];
  for (const target of targets) {
    if (pages.length >= 3) break;
    try {
      const response = await fetchSafe(target);
      if (!response.ok || !/text\/html|text\/plain|xhtml/i.test(response.headers.get("content-type") || "")) continue;
      const finalUrl = await publicUrl(response.url);
      const html = (await response.text()).slice(0, 350000);
      if (!pages.some((x) => x.url === finalUrl.toString())) pages.push({ url: finalUrl.toString(), html, text: strip(html).slice(0, 70000) });
    } catch {}
  }
  if (!pages.length) throw new Error("no_readable_public_pages");
  return pages;
}

async function fetchSafe(value: string) {
  let current = await publicUrl(value);
  for (let hop = 0; hop < 3; hop++) {
    const controller = new AbortController(), timer = setTimeout(() => controller.abort(), 9000);
    try {
      const response = await fetch(current, { redirect: "manual", signal: controller.signal, headers: { "user-agent": "IrhaLeadVerifier/1.0", accept: "text/html,text/plain;q=0.9", "accept-language": "en,de,nl;q=0.8" } });
      if (response.status < 300 || response.status >= 400) return response;
      const location = response.headers.get("location"); if (!location) return response;
      current = await publicUrl(new URL(location, current).toString());
    } finally { clearTimeout(timer); }
  }
  throw new Error("redirect_limit");
}

async function publicUrl(value: string) {
  const normalized = normalizeUrl(value); if (!normalized) throw new Error("invalid_url");
  const url = new URL(normalized), host = url.hostname.toLowerCase();
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal") || !host.includes(".")) throw new Error("unsafe_host");
  const results = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
  const addresses = results.flatMap((x) => x.status === "fulfilled" ? x.value : []);
  if (!addresses.length || addresses.some(privateAddress)) throw new Error("private_or_unresolved_destination");
  return url;
}

function privateAddress(ip: string) {
  if (ip.includes(":")) return ip === "::1" || /^(fc|fd|fe[89ab]|ff|2001:db8)/i.test(ip);
  const p = ip.split(".").map(Number); if (p.length !== 4) return false;
  return p[0] === 0 || p[0] === 10 || p[0] === 127 || p[0] >= 224 || (p[0] === 169 && p[1] === 254) || (p[0] === 172 && p[1] >= 16 && p[1] <= 31) || (p[0] === 192 && p[1] === 168);
}
function normalizeUrl(value: unknown) { if (typeof value !== "string" || !value.trim()) return null; try { const u = new URL(/^https?:\/\//i.test(value.trim()) ? value.trim() : `https://${value.trim()}`); if (!["http:", "https:"].includes(u.protocol) || u.username || u.password || (u.port && !["80", "443"].includes(u.port))) return null; u.hash = ""; return u.toString(); } catch { return null; } }
function domain(value: unknown) { const u = normalizeUrl(value); if (!u) return null; return new URL(u).hostname.toLowerCase().replace(/^www\./, ""); }
function validEmail(value: unknown) { if (typeof value !== "string") return null; const e = value.toLowerCase().trim(); return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) ? e : null; }
function emailFrom(text: string, d: string) { const list = [...new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((x) => x.toLowerCase().replace(/[.,;:]+$/, "")))]; return list.find((x) => x.endsWith(`@${d}`)) || list.find((x) => /^(info|sales|contact|office|shop|service|einkauf|orders)@/i.test(x)) || list[0] || null; }
function phoneFrom(text: string) { return (text.match(/(?:\+|00)?\d[\d\s().\/-]{7,}\d/g) || []).find((x) => { const n = x.replace(/\D/g, "").length; return n >= 8 && n <= 16; })?.trim() || null; }
function whatsappFrom(html: string, text: string) { const m = html.match(/(?:wa\.me\/|phone=)([0-9+%]{8,20})/i); if (m) { const n = decodeURIComponent(m[1]).replace(/\D/g, ""); if (n.length >= 8) return `+${n}`; } return text.match(/whats\s*app[^+\d]{0,30}((?:\+|00)?\d[\d\s().\/-]{7,}\d)/i)?.[1]?.trim() || null; }
function strip(html: string) { return html.replace(/<(script|style|svg|noscript)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/&nbsp;|&amp;|&quot;|&#39;/g, " ").replace(/\s+/g, " ").trim(); }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""; }
async function finish(db: any, id: string, started: number, status: string, summary: unknown, error: string | null) { await db.from("operations_runs").update({ status, completed_at: new Date().toISOString(), duration_ms: Date.now() - started, summary, error }).eq("id", id); }
