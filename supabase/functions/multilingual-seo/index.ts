// Irha Multilingual SEO Engine v1
// Admin-only keyword/page generation with quality review and explicit publish approval.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

function irhaLovableRuntimeKey(): string | undefined {
  if (Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true") return undefined;
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SITE_URL = "https://www.irhaapparels.com";
const MIN_PUBLISH_SCORE = 80;
const MAX_KEYWORD_CLUSTERS = 8;

type DbClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;

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
    const { data: roleRow } = await auth
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";
    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "health") return await health(service);
    if (action === "generate_keywords") return await generateKeywords(service, user.id, body);
    if (action === "generate_page") return await generatePage(service, user.id, body);
    if (action === "review_page") return await reviewPage(service, user.id, body);
    if (action === "update_page") return await updatePage(service, body);
    if (action === "approve_page") return await approvePage(service, user.id, body);
    if (action === "publish_page") return await publishPage(service, user.id, body);
    if (action === "set_locale") return await setLocale(service, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("multilingual-seo error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const checks = await Promise.all(
    ["seo_locales", "seo_keyword_clusters", "seo_localized_pages"].map(async (table) => {
      const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
      // seo_locales uses locale as its PK, but PostgREST accepts this head query only for tables with id.
      if (table === "seo_locales" && error) {
        const retry = await service.from(table).select("locale", { head: true, count: "exact" }).limit(1);
        return { table, ready: !retry.error, error: retry.error?.message };
      }
      return { table, ready: !error, error: error?.message };
    }),
  );
  const [{ count: localeCount }, { count: activeCount }, { count: publishedCount }] = await Promise.all([
    service.from("seo_locales").select("locale", { head: true, count: "exact" }),
    service.from("seo_locales").select("locale", { head: true, count: "exact" }).eq("status", "active"),
    service.from("seo_localized_pages").select("id", { head: true, count: "exact" }).eq("status", "published").eq("noindex", false),
  ]);
  const databaseReady = checks.every((item) => item.ready);
  return json({
    ok: true,
    database_ready: databaseReady,
    tables: checks,
    ai_gateway_configured: Boolean(irhaLovableRuntimeKey()),
    ready_to_generate: Boolean(databaseReady && irhaLovableRuntimeKey()),
    locale_count: localeCount ?? 0,
    active_locale_count: activeCount ?? 0,
    published_page_count: publishedCount ?? 0,
    publish_score_required: MIN_PUBLISH_SCORE,
    search_volume_source: "not_connected",
    note: "Keyword clusters are semantic drafts without invented search-volume numbers. Only approved published pages enter hreflang/sitemap.",
  });
}

async function generateKeywords(service: DbClient, userId: string, body: JsonRecord) {
  const locale = cleanText(body.locale, 30);
  const market = cleanText(body.market, 160);
  const productFocus = stringArray(body.product_focus).slice(0, 20);
  const seeds = stringArray(body.seed_keywords).slice(0, 30);
  const clusterCount = clampNumber(body.cluster_count, 1, MAX_KEYWORD_CLUSTERS, 4);
  if (!locale || productFocus.length === 0) return json({ error: "locale and product_focus[] are required" }, 400);
  const localeRow = await getLocale(service, locale);
  if (!localeRow) return json({ error: "Locale not found" }, 404);

  const prompt = `Create semantic B2B apparel SEO keyword clusters in ${localeRow.language_name} (${locale}).

TARGET MARKET: ${market || localeRow.target_markets?.join(", ") || "International"}
PRODUCT FOCUS: ${productFocus.join(", ")}
SEED TERMS: ${seeds.join(", ") || "none supplied"}
CLUSTERS REQUIRED: ${clusterCount}

Strict rules:
- Write keyword phrases and buyer questions in the target language.
- Focus on wholesalers, importers, distributors, retailers, sourcing teams and private-label brands.
- Include commercial and useful informational intent.
- Do not create hidden keyword stuffing, doorway pages, irrelevant city permutations or duplicate synonyms presented as separate strategy.
- Do not invent search volume, CPC, ranking difficulty or trend numbers.
- Negative keywords should reduce consumer/retail intent where appropriate.

Return strict JSON:
{"clusters":[{"cluster_name":"","search_intent":"commercial|transactional|informational|navigational","primary_keywords":[""],"supporting_keywords":[""],"questions":[""],"negative_keywords":[""],"strategy_note":""}]}`;
  const result = await aiJson(prompt);
  const clusters = Array.isArray(result.clusters) ? result.clusters.slice(0, clusterCount) : [];
  const rows = clusters.flatMap((value) => {
    if (!isRecord(value)) return [];
    const name = cleanText(value.cluster_name, 240);
    const intent = typeof value.search_intent === "string" && ["commercial", "transactional", "informational", "navigational"].includes(value.search_intent)
      ? value.search_intent
      : "commercial";
    const primary = stringArray(value.primary_keywords).slice(0, 30);
    if (!name || primary.length === 0) return [];
    return [{
      locale,
      cluster_name: name,
      search_intent: intent,
      market: market || null,
      product_focus: productFocus,
      seed_keywords: seeds,
      primary_keywords: primary,
      supporting_keywords: stringArray(value.supporting_keywords).slice(0, 60),
      questions: stringArray(value.questions).slice(0, 30),
      negative_keywords: stringArray(value.negative_keywords).slice(0, 30),
      source_notes: {
        generated_by: "Lovable AI semantic planning",
        strategy_note: cleanText(value.strategy_note, 1500),
        metrics: "No search volume/CPC/difficulty values were generated.",
      },
      status: "draft",
      created_by: userId,
    }];
  });
  if (rows.length === 0) return json({ error: "AI returned no usable keyword clusters" }, 422);
  const { data, error } = await service.from("seo_keyword_clusters").insert(rows).select("*");
  if (error) throw new Error(error.message);
  return json({ ok: true, created: data?.length ?? 0, clusters: data, note: "Internal drafts only; no public page or meta keyword stuffing was created." });
}

async function generatePage(service: DbClient, userId: string, body: JsonRecord) {
  const locale = cleanText(body.locale, 30);
  const baseRoute = normalizeBaseRoute(body.base_route);
  const pageType = typeof body.page_type === "string" && ["commercial_landing", "capability", "category", "buyer_guide", "country_landing"].includes(body.page_type)
    ? body.page_type
    : "commercial_landing";
  const sourceTitle = cleanText(body.source_title, 300);
  const sourceSummary = cleanMultiline(body.source_summary, 8000);
  const productFocus = stringArray(body.product_focus).slice(0, 20);
  const clusterIds = stringArray(body.keyword_cluster_ids).slice(0, 20);
  const preferredSlug = slugify(cleanText(body.slug, 180));
  if (!locale || !baseRoute || !sourceTitle || !sourceSummary) {
    return json({ error: "locale, base_route, source_title and source_summary are required" }, 400);
  }
  const localeRow = await getLocale(service, locale);
  if (!localeRow) return json({ error: "Locale not found" }, 404);

  const { data: clusters } = clusterIds.length > 0
    ? await service.from("seo_keyword_clusters").select("id,cluster_name,search_intent,primary_keywords,supporting_keywords,questions").in("id", clusterIds).eq("locale", locale)
    : { data: [] as JsonRecord[] };
  const slug = preferredSlug || `${slugify(sourceTitle)}-${locale.toLowerCase()}`;
  const path = `/intl/${locale.toLowerCase()}/${slug}`;

  const prompt = `Write a unique, useful localized B2B landing page in ${localeRow.language_name} (${locale}).

IRHA APPARELS FACTS:
- Experienced apparel manufacturer in Sialkot, Pakistan; website is newly built.
- Factory view is available by live video call.
- OEM, ODM, private-label and custom manufacturing.
- No public prices. MOQ, timeline, documentation and shipping are confirmed after requirement review.
- Audience is wholesalers, importers, distributors, retailers and private-label brands.

PAGE TYPE: ${pageType}
BASE ENGLISH ROUTE: ${baseRoute}
SOURCE TITLE: ${sourceTitle}
SOURCE SUMMARY / VERIFIED FACTS:
${sourceSummary}
PRODUCT FOCUS: ${productFocus.join(", ")}
APPROVED/SELECTED KEYWORD CLUSTERS:
${JSON.stringify(clusters ?? [])}

Strict rules:
- The entire user-facing page must be in the target language.
- Create genuinely useful localized content, not a literal thin translation or doorway page.
- Use natural terminology for the target market and B2B buyers.
- Never invent prices, MOQ, lead time, certifications, buyers, order counts, reviews, materials or shipping promises.
- Do not keyword-stuff headings, paragraphs, FAQs or hidden metadata.
- Include practical sections on capabilities, customization, buyer workflow, sampling/QC where supported by source facts, and how to request a quote.
- Include 4-7 sections and 4-8 FAQs.
- Internal links must point only to supplied valid routes or safe core routes.

Return strict JSON:
{"seo_title":"","seo_description":"","h1":"","eyebrow":"","intro":"","sections":[{"heading":"","body":"","bullets":[]}],"faqs":[{"question":"","answer":""}],"cta":{"title":"","body":"","primary_label":"","primary_href":"/inquiry?intent=rfq","secondary_label":"","secondary_href":"/contact"},"internal_links":[{"label":"","href":"/products"}]}`;
  const generated = await aiJson(prompt);
  const normalized = normalizePageOutput(generated);
  if (!normalized) return json({ error: "AI returned incomplete localized page content" }, 422);
  const jsonLd = buildJsonLd(locale, path, normalized, pageType);

  const { data, error } = await service.from("seo_localized_pages").insert({
    locale,
    base_route: baseRoute,
    slug,
    path,
    page_type: pageType,
    status: "draft",
    source_title: sourceTitle,
    source_summary: sourceSummary,
    seo_title: normalized.seo_title,
    seo_description: normalized.seo_description,
    h1: normalized.h1,
    eyebrow: normalized.eyebrow,
    intro: normalized.intro,
    sections: normalized.sections,
    faqs: normalized.faqs,
    cta: normalized.cta,
    keyword_cluster_ids: clusterIds,
    internal_links: normalized.internal_links,
    json_ld: jsonLd,
    quality_score: 0,
    quality_report: { status: "review_required" },
    native_review_status: localeRow.requires_native_review ? "required" : "not_required",
    noindex: true,
  }).select("*").single();
  if (error || !data) throw new Error(error?.message || "Could not save localized page");
  return json({ ok: true, page: data, note: "Draft saved with noindex. Run AI review, then explicit native/admin approval before publishing." });
}

async function reviewPage(service: DbClient, userId: string, body: JsonRecord) {
  const pageId = cleanText(body.page_id, 80);
  if (!pageId) return json({ error: "page_id required" }, 400);
  const { data: page, error } = await service.from("seo_localized_pages").select("*,seo_locales(language_name,native_name,direction)").eq("id", pageId).maybeSingle();
  if (error || !page) return json({ error: "Localized page not found" }, 404);

  const prompt = `Audit a localized B2B SEO page for quality and truth.
TARGET LOCALE: ${page.locale}
TARGET LANGUAGE: ${page.seo_locales?.language_name}
BASE ROUTE: ${page.base_route}

Audit criteria:
- language correctness and consistency
- natural B2B terminology
- usefulness and market localization
- no keyword stuffing or doorway-page pattern
- title under about 60 characters where practical
- description roughly 120-165 characters where practical
- headings, sections and FAQs are complete
- no invented price, MOQ, delivery, certification, buyer, review or material claims
- internal links are valid site paths
- content is meaningfully unique rather than repetitive boilerplate

Return strict JSON:
{"quality_score":0,"language_score":0,"usefulness_score":0,"seo_score":0,"truth_score":0,"pass":false,"issues":[],"recommended_changes":[],"detected_language":"","claim_risks":[],"keyword_stuffing_risk":"low|medium|high"}

PAGE:
${JSON.stringify({ seo_title: page.seo_title, seo_description: page.seo_description, h1: page.h1, intro: page.intro, sections: page.sections, faqs: page.faqs, cta: page.cta, internal_links: page.internal_links })}`;
  const report = await aiJson(prompt);
  const score = clampNumber(report.quality_score, 0, 100, 0);
  const pass = report.pass === true && score >= MIN_PUBLISH_SCORE;
  const { data: saved, error: saveError } = await service.from("seo_localized_pages").update({
    status: "ai_reviewed",
    quality_score: score,
    quality_report: { ...report, pass, reviewed_at: new Date().toISOString() },
    reviewed_by: userId,
    reviewed_at: new Date().toISOString(),
    noindex: true,
    approved_by: null,
    approved_at: null,
    published_at: null,
  }).eq("id", pageId).select("*").single();
  if (saveError || !saved) throw new Error(saveError?.message || "Review could not be saved");
  return json({ ok: true, page: saved, pass, quality_score: score, note: "AI review never publishes a page. Native/admin approval is still required." });
}

async function updatePage(service: DbClient, body: JsonRecord) {
  const pageId = cleanText(body.page_id, 80);
  if (!pageId) return json({ error: "page_id required" }, 400);
  const { data: page, error } = await service.from("seo_localized_pages").select("*").eq("id", pageId).maybeSingle();
  if (error || !page) return json({ error: "Localized page not found" }, 404);
  if (page.status === "published") return json({ error: "Unpublish/archive before editing a published page" }, 409);

  const update: JsonRecord = {
    seo_title: typeof body.seo_title === "string" ? cleanText(body.seo_title, 300) : page.seo_title,
    seo_description: typeof body.seo_description === "string" ? cleanText(body.seo_description, 500) : page.seo_description,
    h1: typeof body.h1 === "string" ? cleanText(body.h1, 300) : page.h1,
    eyebrow: typeof body.eyebrow === "string" ? cleanText(body.eyebrow, 180) : page.eyebrow,
    intro: typeof body.intro === "string" ? cleanMultiline(body.intro, 5000) : page.intro,
    sections: Array.isArray(body.sections) ? body.sections : page.sections,
    faqs: Array.isArray(body.faqs) ? body.faqs : page.faqs,
    cta: isRecord(body.cta) ? body.cta : page.cta,
    internal_links: Array.isArray(body.internal_links) ? body.internal_links : page.internal_links,
    status: "draft",
    quality_score: 0,
    quality_report: { status: "review_required_after_edit" },
    noindex: true,
    reviewed_by: null,
    reviewed_at: null,
    approved_by: null,
    approved_at: null,
    published_at: null,
    native_review_status: page.native_review_status === "not_required" ? "not_required" : "pending",
  };
  const { data: saved, error: saveError } = await service.from("seo_localized_pages").update(update).eq("id", pageId).select("*").single();
  if (saveError || !saved) throw new Error(saveError?.message || "Page update failed");
  return json({ ok: true, page: saved, note: "Content edit reset review and approval." });
}

async function approvePage(service: DbClient, userId: string, body: JsonRecord) {
  const pageId = cleanText(body.page_id, 80);
  if (!pageId) return json({ error: "page_id required" }, 400);
  const { data: page, error } = await service.from("seo_localized_pages").select("*").eq("id", pageId).maybeSingle();
  if (error || !page) return json({ error: "Localized page not found" }, 404);
  if (page.status !== "ai_reviewed" || Number(page.quality_score) < MIN_PUBLISH_SCORE) {
    return json({ error: `AI review score ${MIN_PUBLISH_SCORE}+ is required before approval` }, 409);
  }
  if (page.quality_report?.pass !== true) return json({ error: "AI quality report did not pass" }, 409);
  const nativeApproved = body.native_review_approved === true;
  if (page.native_review_status !== "not_required" && !nativeApproved) {
    return json({ error: "Confirm native-language review before approval" }, 409);
  }
  const { data: saved, error: saveError } = await service.from("seo_localized_pages").update({
    status: "approved",
    native_review_status: page.native_review_status === "not_required" ? "not_required" : "approved",
    approved_by: userId,
    approved_at: new Date().toISOString(),
    noindex: true,
  }).eq("id", pageId).select("*").single();
  if (saveError || !saved) throw new Error(saveError?.message || "Page approval failed");
  return json({ ok: true, page: saved, note: "Approved but still noindex until the separate publish action." });
}

async function publishPage(service: DbClient, userId: string, body: JsonRecord) {
  const pageId = cleanText(body.page_id, 80);
  if (!pageId) return json({ error: "page_id required" }, 400);
  const { data: page, error } = await service.from("seo_localized_pages").select("*,seo_locales(status)").eq("id", pageId).maybeSingle();
  if (error || !page) return json({ error: "Localized page not found" }, 404);
  if (page.status !== "approved" || !page.approved_at || Number(page.quality_score) < MIN_PUBLISH_SCORE) {
    return json({ error: "Approved page with passing quality score required" }, 409);
  }
  if (page.native_review_status === "required" || page.native_review_status === "pending" || page.native_review_status === "rejected") {
    return json({ error: "Native-language review is not approved" }, 409);
  }
  if (page.seo_locales?.status !== "active") return json({ error: "Locale must be active before publishing" }, 409);
  const publishedAt = new Date().toISOString();
  const { data: saved, error: saveError } = await service.from("seo_localized_pages").update({
    status: "published",
    noindex: false,
    published_at: publishedAt,
    approved_by: page.approved_by || userId,
  }).eq("id", pageId).select("*").single();
  if (saveError || !saved) throw new Error(saveError?.message || "Page publish failed");
  return json({ ok: true, page: saved, public_url: `${SITE_URL}${saved.path}`, note: "Published page can enter hreflang and sitemap on the next build." });
}

async function setLocale(service: DbClient, body: JsonRecord) {
  const locale = cleanText(body.locale, 30);
  const status = typeof body.status === "string" && ["planned", "active", "paused", "retired"].includes(body.status) ? body.status : null;
  if (!locale || !status) return json({ error: "locale and valid status required" }, 400);
  const { data, error } = await service.from("seo_locales").update({ status, notes: typeof body.notes === "string" ? cleanText(body.notes, 2000) : undefined }).eq("locale", locale).select("*").single();
  if (error || !data) return json({ error: error?.message || "Locale not found" }, 404);
  return json({ ok: true, locale: data });
}

async function getLocale(service: DbClient, locale: string) {
  const { data } = await service.from("seo_locales").select("*").eq("locale", locale).maybeSingle();
  return data as JsonRecord | null;
}

function normalizePageOutput(value: JsonRecord) {
  const seoTitle = cleanText(value.seo_title, 300);
  const seoDescription = cleanText(value.seo_description, 500);
  const h1 = cleanText(value.h1, 300);
  const intro = cleanMultiline(value.intro, 5000);
  const sections = Array.isArray(value.sections)
    ? value.sections.filter(isRecord).slice(0, 10).map((section) => ({
      heading: cleanText(section.heading, 300),
      body: cleanMultiline(section.body, 8000),
      bullets: stringArray(section.bullets).slice(0, 20),
    })).filter((section) => section.heading && section.body)
    : [];
  const faqs = Array.isArray(value.faqs)
    ? value.faqs.filter(isRecord).slice(0, 12).map((faq) => ({
      question: cleanText(faq.question, 500),
      answer: cleanMultiline(faq.answer, 3000),
    })).filter((faq) => faq.question && faq.answer)
    : [];
  if (!seoTitle || !seoDescription || !h1 || !intro || sections.length < 3 || faqs.length < 3) return null;
  return {
    seo_title: seoTitle,
    seo_description: seoDescription,
    h1,
    eyebrow: cleanText(value.eyebrow, 180),
    intro,
    sections,
    faqs,
    cta: normalizeCta(value.cta),
    internal_links: normalizeLinks(value.internal_links),
  };
}

function normalizeCta(value: unknown) {
  const cta = isRecord(value) ? value : {};
  return {
    title: cleanText(cta.title, 300),
    body: cleanMultiline(cta.body, 2000),
    primary_label: cleanText(cta.primary_label, 120) || "Request a Quote",
    primary_href: safePath(cta.primary_href) || "/inquiry?intent=rfq",
    secondary_label: cleanText(cta.secondary_label, 120) || "Contact Irha Apparels",
    secondary_href: safePath(cta.secondary_href) || "/contact",
  };
}

function normalizeLinks(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter(isRecord).slice(0, 20).flatMap((link) => {
    const label = cleanText(link.label, 180);
    const href = safePath(link.href);
    return label && href ? [{ label, href }] : [];
  });
}

function buildJsonLd(locale: string, path: string, page: ReturnType<typeof normalizePageOutput>, pageType: string) {
  if (!page) return {};
  const url = `${SITE_URL}${path}`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": pageType === "buyer_guide" ? "Article" : "Service",
        "@id": `${url}#main`,
        url,
        name: page.h1,
        description: page.seo_description,
        inLanguage: locale,
        provider: { "@type": "Organization", name: "Irha Apparels", url: SITE_URL },
      },
      {
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      },
    ],
  };
}

async function aiJson(prompt: string): Promise<JsonRecord> {
  const key = irhaLovableRuntimeKey();
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("MULTILINGUAL_SEO_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You create and audit evidence-based multilingual B2B SEO content. Never invent metrics or business claims. Return strict JSON only." },
        { role: "user", content: prompt },
      ],
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `AI gateway returned ${response.status}`));
  const choices = isRecord(payload) && Array.isArray(payload.choices) ? payload.choices as JsonRecord[] : [];
  const message = choices.length > 0 && isRecord(choices[0].message) ? choices[0].message : {};
  if (typeof message.content !== "string") throw new Error("AI returned no JSON content");
  return parseJsonObject(message.content);
}

function normalizeBaseRoute(value: unknown) {
  const route = safePath(value);
  return route && !route.startsWith("/intl/") ? route.split("?")[0] : null;
}

function safePath(value: unknown) {
  if (typeof value !== "string" || !value.trim().startsWith("/") || value.trim().startsWith("//")) return null;
  return value.trim().slice(0, 500);
}

function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 160);
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

function stringArray(value: unknown) {
  if (Array.isArray(value)) return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  if (typeof value === "string") return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
  return [];
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanMultiline(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try { return JSON.parse(text); } catch { return text.slice(0, 2000); }
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
