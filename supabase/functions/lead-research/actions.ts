import { BUYER, MAKER, PROVIDER, clamp, domain, emailFrom, fetchPages, inferBuyer, list, phoneFrom, productFit, response, safeUrl, unique } from "./utils.ts";

async function refresh(db: any, id: string) { const r = await db.from("lead_candidates").select("verification_status").eq("campaign_id", id); const rows = r.data || []; const n = (s: string) => rows.filter((x: any) => x.verification_status === s).length; await db.from("lead_campaigns").update({ discovered_count: rows.length, reviewed_count: n("needs_review") + n("verified") + n("rejected") + n("imported"), verified_count: n("verified") + n("imported"), imported_count: n("imported") }).eq("id", id); }

export async function enrich(db: any, userId: string, body: any) {
  const ids = list(body.candidate_ids).slice(0, 20); if (!ids.length) return response({ error: "candidate_ids[] required" }, 400);
  const r = await db.from("lead_candidates").select("*").in("id", ids); if (r.error) throw r.error; const outcomes: any[] = [];
  for (const c of r.data || []) {
    try {
      const website = safeUrl(c.website || c.source_url); if (!website) throw new Error("Invalid public website");
      const pages = await fetchPages(website), text = pages.map((x) => x.text).join("\n"), d = domain(website), email = emailFrom(text) || c.email || null, phone = phoneFrom(text) || c.phone || null, fit = unique([...list(c.product_fit), ...productFit(text, [])]), buyerType = inferBuyer(text) || c.buyer_type || null;
      const buyerSignal = BUYER.test(text) || !!buyerType, makerOnly = MAKER.test(text) && !buyerSignal, relevant = !makerOnly && (buyerSignal || fit.length > 0);
      let score = 20 + (buyerType ? 15 : 0) + (BUYER.test(text) ? 15 : 0) + (fit.length ? 15 : 0) + (email ? 15 : 0) + (phone ? 10 : 0); if (!relevant) score = Math.min(score, 25); score = Math.min(100, score);
      const status = !relevant ? "rejected" : score >= 70 && (email || phone) ? "verified" : "needs_review";
      const up = await db.from("lead_candidates").update({ website, website_domain: d, email, phone, buyer_type: buyerType, product_fit: fit, verification_score: score, verification_status: status, reviewed_by: userId, reviewed_at: new Date().toISOString(), evidence: { method: "deterministic_rules", pages_checked: pages.map((x) => x.url), buyer_signal: buyerSignal, manufacturer_only: makerOnly, product_fit: fit, public_email: email, public_phone: phone, external_credits_used: 0 } }).eq("id", c.id); if (up.error) throw up.error;
      outcomes.push({ id: c.id, status, score, pages_checked: pages.length });
    } catch (error) { outcomes.push({ id: c.id, status: "failed", error: error instanceof Error ? error.message : "Enrichment failed" }); }
  }
  for (const id of unique((r.data || []).map((x: any) => String(x.campaign_id)))) await refresh(db, id);
  return response({ ok: true, outcomes, summary: outcomes.reduce((a, x) => ({ ...a, [x.status]: (a[x.status] || 0) + 1 }), {}), external_credits_used: 0 });
}

export async function review(db: any, userId: string, body: any) {
  if (!body.candidate_id || !["verified", "rejected", "needs_review"].includes(body.status)) return response({ error: "Invalid review" }, 400);
  const r = await db.from("lead_candidates").update({ verification_status: body.status, verification_score: clamp(body.verification_score, 0, 100, body.status === "verified" ? 70 : 0), reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", body.candidate_id).select("campaign_id").single(); if (r.error) return response({ error: r.error.message }, 404); await refresh(db, String(r.data.campaign_id)); return response({ ok: true });
}

export async function importVerified(db: any, userId: string, body: any) {
  const ids = list(body.candidate_ids).slice(0, 100); if (!ids.length) return response({ error: "candidate_ids[] required" }, 400);
  const r = await db.from("lead_candidates").select("*").in("id", ids).eq("verification_status", "verified"); if (r.error) throw r.error; const imported: any[] = [], skipped: any[] = [];
  for (const c of r.data || []) {
    const existing = c.website_domain ? (await db.from("b2b_leads").select("id").eq("website_domain", c.website_domain).limit(1).maybeSingle()).data : null;
    if (existing) { skipped.push({ candidate_id: c.id, reason: "Already exists in CRM" }); continue; }
    const lead = await db.from("b2b_leads").insert({ company_name: c.company_name, country: c.country || "Unknown", email: c.email, phone: c.phone || c.whatsapp, website: c.website, apparel_segment: Array.isArray(c.product_fit) ? c.product_fit.join(", ") : null, lead_status: "New", crm_status: "new", priority: c.verification_score >= 85 ? "high" : "normal", notes: `Zero-credit Lead Engine\nSource: ${c.source_url}\nVerification: ${c.verification_score}/100`, lead_campaign_id: c.campaign_id, buyer_type: c.buyer_type, website_domain: c.website_domain, source_url: c.source_url, source_provider: PROVIDER, verification_score: c.verification_score, verification_evidence: c.evidence || {} }).select("id").single();
    if (lead.error) { skipped.push({ candidate_id: c.id, reason: lead.error.message }); continue; }
    await db.from("lead_candidates").update({ verification_status: "imported", imported_lead_id: lead.data.id, reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", c.id); imported.push({ candidate_id: c.id, lead_id: lead.data.id });
  }
  for (const id of unique((r.data || []).map((x: any) => String(x.campaign_id)))) await refresh(db, id);
  return response({ ok: true, imported_count: imported.length, skipped_count: skipped.length, imported, skipped });
}
