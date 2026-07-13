import {
  CLASSIFIER, DOWNSTREAM_BUYER, MAKER, PROVIDER, WHOLESALE_BUYER,
  clamp, domain, emailFrom, fetchPages, inferBuyer, knownRecords, list,
  phoneFrom, productFit, refreshCampaign, response, safeUrl, unique, whatsappFrom,
} from "./utils.ts";

export async function enrich(db: any, userId: string, body: any) {
  const ids = list(body.candidate_ids).slice(0, 20);
  if (!ids.length) return response({ error: "candidate_ids[] required" }, 400);
  const result = await db.from("lead_candidates").select("*").in("id", ids);
  if (result.error) throw result.error;
  const existing = await knownRecords(db), outcomes: any[] = [];

  for (const candidate of result.data || []) {
    if (["duplicate", "imported"].includes(candidate.verification_status)) { outcomes.push({ id: candidate.id, status: "skipped" }); continue; }
    try {
      const website = safeUrl(candidate.website || candidate.source_url); if (!website) throw new Error("Invalid public website");
      const pages = await fetchPages(website), text = pages.map((x) => x.text).join("\n"), html = pages.map((x) => x.html).join("\n"), d = domain(website);
      const email = emailFrom(text, d) || candidate.email || null, phone = phoneFrom(text) || candidate.phone || null, whatsapp = whatsappFrom(html, text) || candidate.whatsapp || null;
      const fit = unique([...list(candidate.product_fit), ...productFit(text, [])]), buyerType = inferBuyer(text) || candidate.buyer_type || null;
      const downstream = DOWNSTREAM_BUYER.test(text), wholesale = WHOLESALE_BUYER.test(text) && !MAKER.test(text), maker = MAKER.test(text), buyerSignal = downstream || wholesale;
      let score = 15 + (candidate.company_name ? 10 : 0) + (downstream ? 25 : wholesale ? 12 : 0) + (fit.length ? 18 : 0) + (email ? (d && email.endsWith(`@${d}`) ? 20 : 10) : 0) + (phone || whatsapp ? 10 : 0) + (candidate.country || candidate.city ? 5 : 0);
      if (maker && !downstream) score -= 45; if (!buyerSignal) score = Math.min(score, 30); score = Math.max(0, Math.min(100, score));
      const duplicate = d && existing.domains.has(d) && existing.domains.get(d) !== candidate.id ? { id: existing.domains.get(d), reason: "Website domain already exists" } : email && existing.emails.has(email) && existing.emails.get(email) !== candidate.id ? { id: existing.emails.get(email), reason: "Email already exists" } : null;
      const status = duplicate ? "duplicate" : maker && !downstream ? "rejected" : buyerSignal && fit.length ? score >= 70 && (email || phone || whatsapp) ? "verified" : "needs_review" : "rejected";
      const update = await db.from("lead_candidates").update({
        website, website_domain: d, email, phone, whatsapp, buyer_type: buyerType, product_fit: fit, verification_score: score, verification_status: status,
        duplicate_reason: duplicate?.reason || null, duplicate_of: duplicate?.id || null, reviewed_by: userId, reviewed_at: new Date().toISOString(),
        evidence: { method: CLASSIFIER, pages_checked: pages.map((x) => x.url), downstream_buyer_signal: downstream, wholesale_signal: wholesale, manufacturer_signal: maker, product_fit: fit, public_email: email, public_phone: phone, public_whatsapp: whatsapp, external_credits_used: 0 },
        raw_data: { ...(candidate.raw_data || {}), enrichment: { pages: pages.map((x) => ({ url: x.url, title: x.title })) } },
      }).eq("id", candidate.id);
      if (update.error) throw update.error;
      outcomes.push({ id: candidate.id, status, score, pages_checked: pages.length, external_credits_used: 0 });
    } catch (error) { outcomes.push({ id: candidate.id, status: "failed", error: error instanceof Error ? error.message : "Enrichment failed" }); }
  }

  for (const id of unique((result.data || []).map((x: any) => String(x.campaign_id)))) await refreshCampaign(db, id);
  return response({ ok: true, outcomes, summary: outcomes.reduce((a, x) => ({ ...a, [x.status]: (a[x.status] || 0) + 1 }), {}), external_credits_used: 0 });
}

export async function review(db: any, userId: string, body: any) {
  if (!body.candidate_id || !["verified", "rejected", "needs_review"].includes(body.status)) return response({ error: "Invalid review" }, 400);
  const result = await db.from("lead_candidates").update({ verification_status: body.status, verification_score: clamp(body.verification_score, 0, 100, body.status === "verified" ? 70 : 0), reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", body.candidate_id).select("campaign_id").single();
  if (result.error) return response({ error: result.error.message }, 404);
  await refreshCampaign(db, String(result.data.campaign_id));
  return response({ ok: true });
}

export async function importVerified(db: any, userId: string, body: any) {
  const ids = list(body.candidate_ids).slice(0, 100); if (!ids.length) return response({ error: "candidate_ids[] required" }, 400);
  const result = await db.from("lead_candidates").select("*").in("id", ids).eq("verification_status", "verified");
  if (result.error) throw result.error;
  const imported: any[] = [], skipped: any[] = [];
  for (const candidate of result.data || []) {
    let existing: any = null;
    if (candidate.website_domain) existing = (await db.from("b2b_leads").select("id").eq("website_domain", candidate.website_domain).limit(1).maybeSingle()).data;
    if (!existing && candidate.email) existing = (await db.from("b2b_leads").select("id").ilike("email", candidate.email).limit(1).maybeSingle()).data;
    if (existing) {
      await db.from("lead_candidates").update({ verification_status: "duplicate", duplicate_reason: "Already exists in CRM", imported_lead_id: existing.id, reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", candidate.id);
      skipped.push({ candidate_id: candidate.id, reason: "Already exists in CRM" }); continue;
    }
    const lead = await db.from("b2b_leads").insert({
      company_name: candidate.company_name, country: candidate.country || "Unknown", email: candidate.email, phone: candidate.phone || candidate.whatsapp, website: candidate.website,
      apparel_segment: Array.isArray(candidate.product_fit) ? candidate.product_fit.join(", ") : null, lead_status: "New", crm_status: "new", priority: candidate.verification_score >= 85 ? "high" : "normal",
      notes: `Zero-credit Lead Engine\nSource: ${candidate.source_url}\nVerification: ${candidate.verification_score}/100`, lead_campaign_id: candidate.campaign_id, buyer_type: candidate.buyer_type,
      website_domain: candidate.website_domain, whatsapp: candidate.whatsapp, linkedin_url: candidate.linkedin_url, instagram_url: candidate.instagram_url, facebook_url: candidate.facebook_url,
      source_url: candidate.source_url, source_provider: candidate.source_provider || PROVIDER, verification_score: candidate.verification_score, verification_evidence: candidate.evidence || {},
    }).select("id").single();
    if (lead.error) { skipped.push({ candidate_id: candidate.id, reason: lead.error.message }); continue; }
    await db.from("lead_candidates").update({ verification_status: "imported", imported_lead_id: lead.data.id, reviewed_by: userId, reviewed_at: new Date().toISOString() }).eq("id", candidate.id);
    imported.push({ candidate_id: candidate.id, lead_id: lead.data.id });
  }
  for (const id of unique((result.data || []).map((x: any) => String(x.campaign_id)))) await refreshCampaign(db, id);
  return response({ ok: true, imported_count: imported.length, skipped_count: skipped.length, imported, skipped });
}
