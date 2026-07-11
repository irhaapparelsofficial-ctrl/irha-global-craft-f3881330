// Irha AI Command Center planner.
// Admin-only. Reads a limited business snapshot, returns structured actions,
// and stores every run/action for approval and audit.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

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
]);

const APPROVAL_REQUIRED = new Set(["social_publish", "listing_task"]);

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
    const mode = body?.mode === "operate" ? "operate" : "plan";
    if (!command) return json({ error: "command is required" }, 400);

    const service = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const context = await buildBusinessContext(service);
    const { data: run, error: runError } = await service
      .from("ai_runs")
      .insert({
        command,
        mode,
        status: "planning",
        requested_by: user.id,
        context_snapshot: context,
      })
      .select("*")
      .single();
    if (runError || !run) throw new Error(runError?.message || "Could not create AI run");

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    if (!lovableKey) {
      await service.from("ai_runs").update({ status: "failed", reply: "AI gateway is not configured." }).eq("id", run.id);
      return json({ error: "AI gateway is not configured", run_id: run.id }, 500);
    }

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

    if (!upstream.ok) {
      const details = (await upstream.text()).slice(0, 800);
      await service.from("ai_runs").update({ status: "failed", reply: "AI service did not return a plan." }).eq("id", run.id);
      console.error("admin-agent gateway error", upstream.status, details);
      const message = upstream.status === 429
        ? "AI rate limit reached. Try again shortly."
        : upstream.status === 402
          ? "AI credits are exhausted."
          : "AI service error.";
      return json({ error: message, run_id: run.id }, upstream.status === 429 || upstream.status === 402 ? upstream.status : 500);
    }

    const gatewayPayload = await upstream.json();
    const rawContent = gatewayPayload?.choices?.[0]?.message?.content;
    const parsed = parseAgentOutput(rawContent);
    const reply = typeof parsed.reply === "string" && parsed.reply.trim()
      ? parsed.reply.trim().slice(0, 12000)
      : "Plan prepared. Review the actions below.";
    const actions = normalizeActions(parsed.actions);

    const rows = actions.map((action) => {
      const requiresApproval = APPROVAL_REQUIRED.has(action.action_type);
      return {
        run_id: run.id,
        action_type: action.action_type,
        title: action.title,
        description: action.description,
        status: requiresApproval ? "proposed" : "completed",
        risk_level: action.risk_level,
        requires_approval: requiresApproval,
        payload: action.payload,
        result: requiresApproval ? {} : action.payload,
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
      run: { ...run, status: "planned", reply },
      actions: savedActions,
      guardrails: {
        approval_required_for: Array.from(APPROVAL_REQUIRED),
        external_execution_claimed: false,
      },
    });
  } catch (error) {
    console.error("admin-agent error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function buildBusinessContext(service: ReturnType<typeof createClient>) {
  const [products, categories, inquiries, catalogueLeads, prospects, socialPosts, listings] = await Promise.all([
    service.from("products").select("id,name,slug,description,is_published,category_id").eq("is_published", true).order("sort_order").limit(40),
    service.from("categories").select("id,name,slug,parent_id,is_published").eq("is_published", true).order("sort_order").limit(80),
    service.from("inquiries").select("id,name,company,country,category,status,source,message,created_at").order("created_at", { ascending: false }).limit(12),
    service.from("catalogue_leads").select("id,name,company_name,country,category_interest,status,source,created_at").order("created_at", { ascending: false }).limit(12),
    service.from("b2b_leads").select("id,company_name,country,apparel_segment,lead_status,crm_status,priority,updated_at").order("updated_at", { ascending: false }).limit(20),
    service.from("social_posts").select("id,channels,status,caption,error,created_at").order("created_at", { ascending: false }).limit(12),
    service.from("business_listings").select("id,platform,account_name,profile_url,status,verification_level,next_action,last_verified_at").order("updated_at", { ascending: false }).limit(40),
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
    recent_prospects: safe(prospects, []),
    recent_social_results: safe(socialPosts, []).map((row: Record<string, unknown>) => ({
      channels: row.channels,
      status: row.status,
      error: row.error,
      created_at: row.created_at,
    })),
    listings: safe(listings, []),
  };
}

function buildSystemPrompt(context: unknown) {
  return `You are Irha Operations AI, the private command-center planner for the owner of Irha Apparels.

Your job is to turn the owner's natural-language command into an accurate business response and a small set of structured actions. You can plan and draft; you must never falsely claim that an external action was completed.

IRHA RULES:
- Irha Apparels is an experienced B2B apparel manufacturer in Sialkot, Pakistan; the website is newly built.
- Buyers may request a live factory view by video call.
- No public prices. Never invent MOQ, delivery dates, certifications, buyer counts, reviews, customers, platform metrics or successful posts.
- Public claims must be supported by the supplied context.
- Write in the same language as the owner. If the owner uses Roman Urdu, reply in Roman Urdu.
- Social content must target wholesalers, importers, retailers, distributors and private-label brands, not retail consumers.
- For multilingual SEO, do not propose hidden keyword stuffing, machine-generated doorway pages or hreflang for untranslated pages. Propose useful localized pages, native-quality review and published-locale-only sitemaps.
- External writes require approval. Do not claim a post, message, listing or outreach was sent.

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
   This always requires owner approval.
5. buyer_reply_draft
   payload: { lead_reference?: string, channel: string, language: string, subject?: string, body: string }
6. seo_localization_plan
   payload: { languages: string[], page_types: string[], keyword_clusters: object, hreflang_strategy: string, sitemap_strategy: string, quality_gates: string[] }
7. weekly_growth_plan
   payload: { focus: string, days: object[], targets: object, dependencies: string[] }

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
    const payload = raw.payload && typeof raw.payload === "object" && !Array.isArray(raw.payload) ? raw.payload : {};
    return [{
      action_type: type,
      title,
      description,
      risk_level: APPROVAL_REQUIRED.has(type) && risk === "low" ? "medium" : risk,
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
