// Irha AI Command Center planner.
// Admin-only. Reads a limited business snapshot, returns structured actions,
// and stores every run/action for approval and audit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
import {
  actionGuard,
  loadAiBusinessRules,
  rulesPromptSnapshot,
  rulesReference,
} from "../_shared/ai-business-rules.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALLOWED_ACTION_TYPES = new Set([
  "social_content_pack",
  "social_publish",
  "lead_campaign_plan",
  "listing_task",
  "buyer_reply_draft",
  "seo_localization_plan",
  "weekly_growth_plan",
  "outreach_campaign_plan",
]);

const EXTERNAL_ACTION_TYPES = new Set(["social_publish", "listing_task"]);

type ProposedAction = {
  action_type?: unknown;
  title?: unknown;
  description?: unknown;
  risk_level?: unknown;
  requires_approval?: unknown;
  payload?: unknown;
};

type AgentOutput = {
  reply?: unknown;
  actions?: unknown;
};

type PlannerSource = "lovable_gateway" | "zero_credit_rules";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData } = await userClient.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: roleRow } = await userClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const command = typeof body?.command === "string" ? body.command.trim().slice(0, 6000) : "";
    const requestedMode = body?.mode === "operate" ? "operate" : "plan";
    if (!command) return json({ error: "command is required" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const rulesState = await loadAiBusinessRules(service);
    const effectiveMode = requestedMode === "operate" && rulesState.approved ? "operate" : "plan";
    const businessContext = await buildBusinessContext(service);
    const context = {
      ...businessContext,
      requested_mode: requestedMode,
      effective_mode: effectiveMode,
      business_rules: rulesPromptSnapshot(rulesState),
    };

    const { data: run, error: runError } = await service
      .from("ai_runs")
      .insert({
        command,
        mode: effectiveMode,
        status: "planning",
        requested_by: user.id,
        context_snapshot: context,
      })
      .select("*")
      .single();
    if (runError || !run) throw new Error(runError?.message || "Could not create AI run");

    let parsed: AgentOutput;
    let plannerSource: PlannerSource = "zero_credit_rules";
    const lovableKey = Deno.env.get("LOVABLE_API_KEY");

    if (lovableKey) {
      try {
        const prompt = buildSystemPrompt(context);
        const model = Deno.env.get("ADMIN_AGENT_MODEL") || "google/gemini-3-flash-preview";
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Lovable-API-Key": lovableKey,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            temperature: 0.25,
            response_format: { type: "json_object" },
            messages: [
              { role: "system", content: prompt },
              { role: "user", content: command },
            ],
          }),
        });

        if (upstream.ok) {
          const gatewayPayload = await upstream.json();
          const rawContent = gatewayPayload?.choices?.[0]?.message?.content;
          parsed = parseAgentOutput(rawContent);
          plannerSource = "lovable_gateway";
        } else {
          const details = (await upstream.text()).slice(0, 800);
          console.warn("admin-agent gateway unavailable; using zero-credit planner", upstream.status, details);
          parsed = buildZeroCreditPlan(command);
        }
      } catch (error) {
        console.warn("admin-agent gateway request failed; using zero-credit planner", error);
        parsed = buildZeroCreditPlan(command);
      }
    } else {
      parsed = buildZeroCreditPlan(command);
    }

    const reply = typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim().slice(0, 12000)
      : "Plan prepared. Review the actions below.";
    const actions = normalizeActions(parsed.actions);
    const rulesRef = rulesReference(rulesState);

    const rows = actions.map((action) => {
      const guard = actionGuard(action.action_type, action.payload, action.description, rulesState);
      const requiresApproval = guard.requiresApproval;
      const external = EXTERNAL_ACTION_TYPES.has(action.action_type);
      return {
        run_id: run.id,
        action_type: action.action_type,
        title: action.title,
        description: action.description,
        status: requiresApproval ? "proposed" : "completed",
        risk_level: requiresApproval && action.risk_level === "low" ? "medium" : action.risk_level,
        requires_approval: requiresApproval,
        payload: {
          ...action.payload,
          _planner_source: plannerSource,
          _rules_reference: rulesRef,
          _execution_guard: {
            external,
            executable: guard.executable,
            authority: guard.authority,
            reason: guard.reason,
          },
        },
        result: requiresApproval
          ? {}
          : {
              kind: "draft_or_plan",
              external_execution: false,
              planner_source: plannerSource,
              output: action.payload,
              rules_reference: rulesRef,
            },
        executed_at: requiresApproval ? null : new Date().toISOString(),
      };
    });

    let savedActions: unknown[] = [];
    if (rows.length > 0) {
      const { data, error } = await service.from("ai_actions").insert(rows).select("*");
      if (error) throw new Error(error.message);
      savedActions = data ?? [];
    }

    await service
      .from("ai_runs")
      .update({ status: "planned", reply })
      .eq("id", run.id);

    return json({
      ok: true,
      run: { ...run, mode: effectiveMode, status: "planned", reply },
      actions: savedActions,
      guardrails: {
        requested_mode: requestedMode,
        effective_mode: effectiveMode,
        operate_downgraded: requestedMode === "operate" && effectiveMode === "plan",
        business_rules: rulesRef,
        business_rules_missing: rulesState.missing,
        planner_source: plannerSource,
        zero_credit_fallback_used: plannerSource === "zero_credit_rules",
        external_actions_require_approval: Array.from(EXTERNAL_ACTION_TYPES),
        external_execution_claimed: false,
      },
    });
  } catch (error) {
    console.error("admin-agent error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function buildBusinessContext(service: ReturnType<typeof createClient>) {
  const [products, categories, inquiries, catalogueLeads, prospects, socialPosts, listings, outreachCampaigns] = await Promise.all([
    service.from("products").select("id,name,slug,description,is_published,category_id").eq("is_published", true).order("sort_order").limit(40),
    service.from("categories").select("id,name,slug,parent_id,is_published").eq("is_published", true).order("sort_order").limit(80),
    service.from("inquiries").select("id,name,company,country,category,status,source,message,created_at").order("created_at", { ascending: false }).limit(12),
    service.from("catalogue_leads").select("id,name,company_name,country,category_interest,status,source,created_at").order("created_at", { ascending: false }).limit(12),
    service.from("b2b_leads").select("id,company_name,country,email,apparel_segment,buyer_type,lead_status,crm_status,priority,verification_score,outreach_opt_out,last_outreach_at,last_outreach_status,updated_at").order("updated_at", { ascending: false }).limit(30),
    service.from("social_posts").select("id,channels,status,caption,error,created_at").order("created_at", { ascending: false }).limit(12),
    service.from("business_listings").select("id,platform,account_name,profile_url,status,verification_level,next_action,last_verified_at").order("updated_at", { ascending: false }).limit(40),
    service.from("outreach_campaigns").select("id,name,target_market,product_focus,status,selected_lead_count,draft_count,sent_count,replied_count,failed_count,created_at").order("created_at", { ascending: false }).limit(10),
  ]);

  const safe = <T>(result: { data: T | null; error: { message?: string } | null }, fallback: T): T => result.error ? fallback : (result.data ?? fallback);
  return {
    generated_at: new Date().toISOString(),
    brand: {
      name: "Irha Apparels",
      location: "Sialkot, Pakistan",
      business_model: "B2B custom apparel manufacturing",
      categories: ["Bavarian and Trachten wear", "sportswear", "leatherwear", "streetwear", "leisurewear", "nightwear"],
      positioning: "Experienced manufacturer; website is newly built. Factory view is available by live video call.",
      public_policy: "No public pricing. MOQ, timeline, documentation and shipping are confirmed after requirement review.",
    },
    products: safe(products, []).map((row: Record<string, unknown>) => ({
      id: row.id,
      name: row.name,
      slug: row.slug,
      category_id: row.category_id,
      description: typeof row.description === "string" ? row.description.slice(0, 350) : null,
    })),
    categories: safe(categories, []),
    recent_inquiries: safe(inquiries, []).map((row: Record<string, unknown>) => ({
      id: row.id,
      company: row.company || row.name,
      country: row.country,
      category: row.category,
      status: row.status,
      source: row.source,
      message: typeof row.message === "string" ? row.message.slice(0, 500) : null,
      created_at: row.created_at,
    })),
    recent_catalogue_requests: safe(catalogueLeads, []),
    recent_prospects: safe(prospects, []).map((row: Record<string, unknown>) => ({
      id: row.id,
      company_name: row.company_name,
      country: row.country,
      email_available: typeof row.email === "string" && row.email.length > 3,
      apparel_segment: row.apparel_segment,
      buyer_type: row.buyer_type,
      crm_status: row.crm_status,
      priority: row.priority,
      verification_score: row.verification_score,
      outreach_opt_out: row.outreach_opt_out,
      last_outreach_at: row.last_outreach_at,
      last_outreach_status: row.last_outreach_status,
    })),
    recent_social_results: safe(socialPosts, []).map((row: Record<string, unknown>) => ({
      channels: row.channels,
      status: row.status,
      error: row.error,
      created_at: row.created_at,
    })),
    listings: safe(listings, []),
    recent_outreach_campaigns: safe(outreachCampaigns, []),
  };
}

function buildSystemPrompt(context: unknown) {
  return `You are Irha Operations AI, the private command-center planner for the owner of Irha Apparels.

Your job is to turn the owner's natural-language command into an accurate business response and a small set of structured actions. You can plan and draft; you must never falsely claim that an external action was completed.

IRHA RULES:
- Irha Apparels is an experienced B2B apparel manufacturer in Sialkot, Pakistan; the website is newly built.
- Buyers may request a live factory view by video call.
- No public prices. Never invent MOQ, delivery dates, certifications, buyer counts, reviews, customers, platform metrics or successful posts.
- Public claims must be supported by the supplied context and approved Business Rules.
- If Business Rules are missing, incomplete or draft, stay plan-only and explicitly identify missing facts.
- Final price, quotation, discount, payment terms, production/delivery commitment, complaint settlement and shipment claims always remain owner-controlled.
- Write in the same language as the owner. If the owner uses Roman Urdu, reply in Roman Urdu.
- Social content must target wholesalers, importers, retailers, distributors and private-label brands, not retail consumers.
- For multilingual SEO, do not propose hidden keyword stuffing, machine-generated doorway pages or hreflang for untranslated pages. Propose useful localized pages, native-quality review and published-locale-only sitemaps.
- External writes require owner approval and a fresh server-side Business Rules check. Do not claim a post, message, listing or outreach was sent.
- A listing_task updates the internal listing registry only; it does not publish or edit an external platform profile.
- For outreach, propose a campaign brief only. The owner selects CRM leads and reviews drafts in Leads & Communication → Mailing before any Gmail send.

ALLOWED ACTION TYPES AND PAYLOADS:
1. social_content_pack
   payload: { platforms: string[], product_id?: string, product_name?: string, language: string, captions: object, hashtags: object, reel_script?: string, carousel_outline?: string[], cta: string }
2. social_publish
   payload: { productId: string, channels: ("facebook"|"instagram"|"linkedin"|"tiktok")[] }
   Only propose when a valid product ID exists in context. This always requires owner approval.
3. lead_campaign_plan
   payload: { market: string, buyer_types: string[], products: string[], target_count: number, sources: string[], outreach_languages: string[], qualification_rules: string[], follow_up_cadence: string[], csv_columns: string[] }
4. listing_task
   payload: { platform: string, profile_url?: string, account_name?: string, status: "not_started"|"in_progress"|"pending_verification"|"active"|"needs_attention"|"paused"|"rejected", next_action: string, notes?: string }
   This always requires owner approval and changes only the internal registry.
5. buyer_reply_draft
   payload: { lead_reference?: string, channel: string, language: string, subject?: string, body: string }
6. seo_localization_plan
   payload: { languages: string[], page_types: string[], keyword_clusters: object, hreflang_strategy: string, sitemap_strategy: string, quality_gates: string[] }
7. weekly_growth_plan
   payload: { focus: string, days: object[], targets: object, dependencies: string[] }
8. outreach_campaign_plan
   payload: { name: string, product_focus: string[], target_market: string, objective: string, language_mode: string, call_to_action: string, lead_selection_rules: string[], max_initial_batch: number, follow_up_after_days: number, compliance_checks: string[] }
   This is a plan/brief only. Never include invented lead IDs and never claim drafts or emails were created or sent.

Return strict JSON only:
{
  "reply": "concise practical answer",
  "actions": [
    {
      "action_type": "one allowed type",
      "title": "short action title",
      "description": "what will happen and what remains unexecuted",
      "risk_level": "low|medium|high",
      "payload": {}
    }
  ]
}

Keep actions focused: normally 1 to 6. If the command is only a question, actions may be empty.

CURRENT BUSINESS SNAPSHOT:
${JSON.stringify(context)}`;
}

function buildZeroCreditPlan(command: string): AgentOutput {
  const lower = command.toLowerCase();
  const romanUrdu = /\b(mujhe|mera|meri|ham|hum|karo|karna|chahiye|banao|bhejo|leads|sab|kaam|buyer)\b/i.test(command);
  const market = detectMarket(command);
  const products = detectProducts(command);
  const platforms = detectPlatforms(command);
  const actions: ProposedAction[] = [];

  if (/\b(lead|leads|prospect|prospects|buyer|buyers|importer|wholesaler|distributor|search|research)\b/i.test(command)) {
    actions.push({
      action_type: "lead_campaign_plan",
      title: `${market} buyer research plan`,
      description: "Creates a research brief only. Candidate discovery, verification and CRM import remain separate reviewed steps.",
      risk_level: "low",
      payload: {
        market,
        buyer_types: ["importers", "wholesalers", "private-label brands", "retail distributors"],
        products,
        target_count: extractSafeTarget(command),
        sources: ["official company websites", "public business directories", "public trade and retail sources"],
        outreach_languages: marketLanguages(market),
        qualification_rules: [
          "Evidence-backed company website or public business profile",
          "Clear wholesale, retail, import, distribution or private-label fit",
          "No duplicate domain or email",
          "No outreach opt-out or suppression flag",
        ],
        follow_up_cadence: "Owner-reviewed first contact, then follow-up after 3 to 5 working days",
        csv_columns: ["company_name", "website", "country", "city", "email", "phone", "whatsapp", "buyer_type", "product_fit", "source_url", "verification_score"],
      },
    });
  }

  if (/\b(outreach|email|emails|contact|meeting|meetings|appointment|appointments|follow[- ]?up|campaign)\b/i.test(command)) {
    actions.push({
      action_type: "outreach_campaign_plan",
      title: `${market} outreach brief`,
      description: "Prepares a campaign brief only. No Gmail message is created or sent without CRM selection and owner review.",
      risk_level: "low",
      payload: {
        name: `${market} qualified buyer outreach`,
        product_focus: products,
        target_market: market,
        objective: "Start qualified B2B conversations and book requirement or factory-view calls",
        language_mode: "Use the buyer's market language where verified; otherwise professional English",
        call_to_action: "Reply with your requirements or request a scheduled live factory video call.",
        lead_selection_rules: [
          "Verified business identity and source URL",
          "Relevant buyer type and product fit",
          "Valid contact channel",
          "Exclude opt-outs, suppressed addresses and duplicates",
        ],
        max_initial_batch: 20,
        follow_up_after_days: 3,
        compliance_checks: [
          "No invented price, MOQ or delivery commitment",
          "No sending before owner review",
          "Include unsubscribe handling for email campaigns",
        ],
      },
    });
  }

  if (/\b(social|post|posts|caption|captions|reel|reels|carousel|instagram|facebook|linkedin|tiktok)\b/i.test(command)) {
    const product = products[0] || "custom apparel manufacturing";
    actions.push({
      action_type: "social_content_pack",
      title: `${product} B2B content pack`,
      description: "Creates editable B2B draft copy only. It does not publish to any social platform.",
      risk_level: "low",
      payload: {
        platforms,
        product_name: product,
        language: romanUrdu ? "English with owner notes in Roman Urdu" : "English",
        captions: {
          linkedin: `Private-label ${product} manufacturing for wholesalers, importers and established brands. Share your specification to begin a reviewed quotation process.`,
          instagram: `Custom ${product} for B2B buyers — materials, branding, labels and packaging developed against an approved specification.`,
          facebook: `Sourcing ${product} for wholesale or private label? Irha Apparels supports custom development in Sialkot, Pakistan.`,
          tiktok: `B2B ${product} manufacturing: material, branding, stitching and packing details.`
        },
        hashtags: {
          default: ["#B2BApparel", "#PrivateLabel", "#ApparelManufacturer", "#Sialkot", "#Wholesale"]
        },
        reel_script: "Show product overview, material close-up, stitching detail, branding options and a final B2B inquiry call-to-action. Do not show public pricing.",
        carousel_outline: ["Product overview", "Material and construction", "Customization options", "Labels and packaging", "B2B inquiry call-to-action"],
        cta: "Send your specification or request a live factory video call.",
      },
    });
  }

  if (/\b(seo|google|keyword|keywords|ranking|rankings|sitemap|hreflang|localization|localisation)\b/i.test(command)) {
    actions.push({
      action_type: "seo_localization_plan",
      title: `${market} SEO localization plan`,
      description: "Creates a review plan only. Pages remain draft/noindex until quality and native-language review are complete.",
      risk_level: "low",
      payload: {
        languages: marketLanguages(market),
        page_types: ["category", "capability", "country landing", "buyer guide"],
        keyword_clusters: {
          commercial: products.map((product) => `${product} manufacturer`),
          buyer_intent: products.map((product) => `private label ${product} supplier`),
        },
        hreflang_strategy: "Publish hreflang only for fully translated, indexable locale pages with reciprocal references.",
        sitemap_strategy: "Include only approved, published and indexable locale routes.",
        quality_gates: ["Useful market-specific copy", "Native-language review", "No doorway-page duplication", "Canonical and hreflang validation", "No invented claims"],
      },
    });
  }

  if (/\b(reply|response|respond|answer|customer message|buyer message)\b/i.test(command)) {
    actions.push({
      action_type: "buyer_reply_draft",
      title: "Buyer reply draft",
      description: "Creates a safe draft only. Price, MOQ, payment and delivery commitments require owner confirmation.",
      risk_level: "low",
      payload: {
        channel: "email or messaging",
        language: romanUrdu ? "English" : "English",
        subject: "Your custom manufacturing requirements",
        body: "Thank you for contacting Irha Apparels. We are an experienced B2B manufacturer in Sialkot, Pakistan, and our website is newly built. Please share the product, quantity, material, branding, target market and delivery destination so we can review your requirements. A live factory view can also be arranged by video call. Final MOQ, pricing, payment terms and timeline will be confirmed after review.",
      },
    });
  }

  if (/\b(weekly|week|growth plan|daily plan|today|operations|priority|priorities)\b/i.test(command)) {
    actions.push({
      action_type: "weekly_growth_plan",
      title: "Owner growth plan",
      description: "Creates an internal plan. It does not send, publish or commit commercial terms.",
      risk_level: "low",
      payload: {
        focus: `${market} qualified B2B demand for ${products.join(", ")}`,
        days: [
          { day: "Day 1", work: "Verify priority leads and remove duplicates" },
          { day: "Day 2", work: "Prepare owner-reviewed outreach drafts" },
          { day: "Day 3", work: "Prepare B2B social and SEO drafts" },
          { day: "Day 4", work: "Follow up only with eligible contacts" },
          { day: "Day 5", work: "Review replies, meetings and next actions" },
        ],
        targets: { verified_leads: 20, reviewed_outreach_drafts: 20, content_drafts: 3 },
        dependencies: ["Verified contact evidence", "Owner approval for external sends", "Approved Business Rules"],
      },
    });
  }

  const reply = romanUrdu
    ? actions.length
      ? "Zero-credit planner ne safe drafts aur plans tayar kar diye hain. Koi email, post ya external listing send/publish nahi hui; owner approval ke baghair external action nahi hoga."
      : "Zero-credit operations mode active hai. Apna command leads, outreach, social, SEO, buyer reply ya weekly plan ke hawalay se likhein; system paid AI credits ke baghair structured plan bana dega."
    : actions.length
      ? "The zero-credit planner prepared safe drafts and plans. No email, social post or external listing was sent or published; external actions remain owner-controlled."
      : "Zero-credit operations mode is active. Ask for a lead, outreach, social, SEO, buyer-reply or weekly plan to create a structured draft without paid AI credits.";

  return { reply, actions: actions.slice(0, 6) };
}

function detectMarket(command: string) {
  const markets = [
    "Azerbaijan", "Germany", "Austria", "Switzerland", "Netherlands", "United Kingdom",
    "United States", "Canada", "Australia", "United Arab Emirates", "Spain", "France", "Italy",
  ];
  const aliases: Record<string, string> = {
    baku: "Azerbaijan",
    azeri: "Azerbaijan",
    uk: "United Kingdom",
    england: "United Kingdom",
    usa: "United States",
    america: "United States",
    uae: "United Arab Emirates",
    dubai: "United Arab Emirates",
  };
  const lower = command.toLowerCase();
  for (const [alias, market] of Object.entries(aliases)) {
    if (new RegExp(`\\b${alias}\\b`, "i").test(lower)) return market;
  }
  return markets.find((market) => lower.includes(market.toLowerCase())) || "Priority markets";
}

function detectProducts(command: string) {
  const lower = command.toLowerCase();
  const found: string[] = [];
  const mappings: Array<[RegExp, string]> = [
    [/\b(lederhosen|dirndl|trachten|bavarian|oktoberfest)\b/i, "Bavarian & Trachten wear"],
    [/\b(sportswear|teamwear|football|soccer|basketball|tracksuit|rugby|cricket|hockey)\b/i, "custom sportswear & teamwear"],
    [/\b(leather|biker jacket|bomber jacket|waistcoat)\b/i, "premium leather apparel"],
    [/\b(streetwear|hoodie|sweatshirt|activewear)\b/i, "streetwear & activewear"],
    [/\b(nightwear|sleepwear|leisurewear)\b/i, "leisurewear & nightwear"],
  ];
  for (const [pattern, label] of mappings) if (pattern.test(lower)) found.push(label);
  return found.length ? found : ["custom apparel manufacturing"];
}

function detectPlatforms(command: string) {
  const lower = command.toLowerCase();
  const platforms = ["facebook", "instagram", "linkedin", "tiktok"].filter((platform) => lower.includes(platform));
  return platforms.length ? platforms : ["instagram", "facebook", "linkedin"];
}

function marketLanguages(market: string) {
  const languageMap: Record<string, string[]> = {
    Azerbaijan: ["Azerbaijani", "English"],
    Germany: ["German", "English"],
    Austria: ["German", "English"],
    Switzerland: ["German", "French", "English"],
    Netherlands: ["Dutch", "English"],
    Spain: ["Spanish", "English"],
    France: ["French", "English"],
    Italy: ["Italian", "English"],
    "United Arab Emirates": ["Arabic", "English"],
  };
  return languageMap[market] || ["English"];
}

function extractSafeTarget(command: string) {
  const matches = command.match(/\b(\d{1,5})\b/g) || [];
  const requested = matches.map(Number).find((value) => value > 0);
  return Math.max(1, Math.min(requested || 25, 100));
}

function parseAgentOutput(raw: unknown): AgentOutput {
  if (typeof raw !== "string") return { reply: "AI returned no readable plan.", actions: [] };
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(trimmed) as AgentOutput;
  } catch {
    const first = trimmed.indexOf("{");
    const last = trimmed.lastIndexOf("}");
    if (first >= 0 && last > first) {
      try {
        return JSON.parse(trimmed.slice(first, last + 1)) as AgentOutput;
      } catch {
        // Fall through to safe text response.
      }
    }
    return { reply: trimmed.slice(0, 12000), actions: [] };
  }
}

function normalizeActions(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).flatMap((raw: ProposedAction) => {
    const type = typeof raw?.action_type === "string" ? raw.action_type : "";
    if (!ALLOWED_ACTION_TYPES.has(type)) return [];
    const title = typeof raw.title === "string" && raw.title.trim()
      ? raw.title.trim().slice(0, 180)
      : type.replaceAll("_", " ");
    const description = typeof raw.description === "string" ? raw.description.trim().slice(0, 1200) : null;
    const risk = raw.risk_level === "high" || raw.risk_level === "medium" ? raw.risk_level : "low";
    const payload = raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload)
      ? raw.payload as Record<string, unknown>
      : {};
    return [{
      action_type: type,
      title,
      description,
      risk_level: EXTERNAL_ACTION_TYPES.has(type) && risk === "low" ? "medium" : risk,
      payload,
    }];
  });
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
