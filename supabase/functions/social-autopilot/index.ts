// Irha Social Autopilot Approval Queue v2
// Admin-only weekly draft preparation. This function never approves, publishes or sends content.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUBLIC_BASE = "https://www.irhaapparels.com";
const MAX_ITEMS = 28;
const PLATFORMS = ["facebook", "instagram", "linkedin", "tiktok"] as const;
const CONTENT_TYPES = ["single_image", "carousel", "reel"] as const;

type Platform = typeof PLATFORMS[number];
type ContentType = typeof CONTENT_TYPES[number];
type JsonRecord = Record<string, unknown>;
type DbClient = ReturnType<typeof createClient>;

type Settings = {
  enabled: boolean;
  timezone: "Asia/Karachi";
  horizonDays: number;
  dailyDraftLimit: number;
  weeklyReels: number;
  platforms: Record<Platform, boolean>;
  postingWindows: Record<Platform, string[]>;
  contentMix: ContentType[];
  productCooldownDays: number;
  categoryRotation: boolean;
  language: string;
  targetMarkets: string[];
  visualPreset: JsonRecord;
};

type Product = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  short_description: string | null;
  image_url: string | null;
  category_id: string | null;
  primary_material: string | null;
  fabric_composition: string | null;
  gsm: string | number | null;
  customization: unknown;
  available_sizes: unknown;
  available_colors: unknown;
  is_published: boolean;
  category_name: string | null;
  category_slug: string | null;
  last_used_at: string | null;
  media: MediaAsset[];
  selection_reason: string;
};

type MediaAsset = {
  id: string;
  public_url: string;
  mime_type: string;
  tags: string[];
  width_px: number | null;
  height_px: number | null;
  duration_ms: number | null;
};

type Slot = {
  index: number;
  dayOffset: number;
  platform: Platform;
  localTime: string;
  contentType: ContentType;
  scheduledAt: string;
  product: Product;
  media: MediaAsset[];
  mediaStatus: "verified_attached" | "render_draft_possible" | "media_generation_required";
  mediaReason: string;
};

type GeneratedCopy = {
  slot_index: number;
  title: string;
  caption: string;
  hashtags: string[];
  call_to_action: string;
  carousel_outline: unknown[];
  reel_script: string;
  on_screen_text: string[];
  risk_flags: string[];
};

const VISUAL_PRESET: JsonRecord = {
  id: "irha-premium-b2b-v1",
  name: "Irha Premium B2B Studio",
  background: "Dark charcoal-to-navy seamless studio background with consistent soft directional lighting and clean negative space.",
  accents: "Restrained gold accents only; no decorative colours that compete with the product.",
  logoPlacement: "Use the official Irha Apparels crest in the top-right only, with safe margins and no replacement logo.",
  subjectRules: [
    "Product-only composition; no models or mannequins.",
    "Keep product colour, construction and proportions faithful to verified source media.",
    "Use consistent framing across image, carousel and reel scenes.",
  ],
  truthRules: [
    "Do not invent text, labels, logos, certifications, client marks, prices, MOQ, materials, delivery claims or production claims.",
    "Generated media remains a draft until an owner verifies the product and brand details.",
  ],
  imageAspectRatio: "4:5",
  reelAspectRatio: "9:16",
  reelDurationSeconds: 10,
};

const DEFAULT_SETTINGS: Settings = {
  enabled: false,
  timezone: "Asia/Karachi",
  horizonDays: 7,
  dailyDraftLimit: 2,
  weeklyReels: 3,
  platforms: { facebook: true, instagram: true, linkedin: true, tiktok: true },
  postingWindows: {
    facebook: ["13:00", "19:00"],
    instagram: ["13:30", "20:00"],
    linkedin: ["11:00"],
    tiktok: ["20:30"],
  },
  contentMix: ["single_image", "carousel", "reel"],
  productCooldownDays: 30,
  categoryRotation: true,
  language: "English",
  targetMarkets: ["Germany", "Austria", "Switzerland", "United Kingdom", "United States"],
  visualPreset: VISUAL_PRESET,
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
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";

    if (action === "health") return await health(service);
    if (action === "get_settings") return await getSettings(service);
    if (action === "save_settings") return await saveSettings(service, user.id, body);
    if (action === "prepare_week") return await prepareWeek(service, auth, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("social-autopilot error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const required = await Promise.all([
    tableHealth(service, "social_autopilot_settings"),
    tableHealth(service, "social_autopilot_runs"),
    tableHealth(service, "social_autopilot_events"),
    tableHealth(service, "social_campaigns"),
    tableHealth(service, "social_calendar_items"),
  ]);
  const media = await tableHealth(service, "media_assets");
  const renders = await tableHealth(service, "social_render_jobs");
  const renderItems = await tableHealth(service, "social_render_job_items");
  return json({
    ok: true,
    database_ready: required.every((check) => check.ready),
    ai_gateway_configured: Boolean(Deno.env.get("LOVABLE_API_KEY")),
    media_library_ready: media.ready,
    render_pipeline_ready: renders.ready && renderItems.ready,
    renderer_provider_configured: Boolean(Deno.env.get("SOCIAL_RENDER_PROVIDER") && Deno.env.get("SOCIAL_RENDER_API_URL") && Deno.env.get("SOCIAL_RENDER_API_KEY")),
    tables: [...required, media, renders, renderItems],
    note: media.ready
      ? "Autopilot can select only active, verified, social-approved Media Library assets."
      : "Backend activation required: Media Library/render migrations are not applied, so media drafts remain blocked for review.",
  });
}

async function getSettings(service: DbClient) {
  const { data, error } = await service.from("social_autopilot_settings").select("*").eq("id", "default").maybeSingle();
  if (error) return json({ error: error.message, migration_required: isMissingTable(error) }, isMissingTable(error) ? 503 : 422);
  return json({ ok: true, settings: settingsFromRow(data as JsonRecord | null) });
}

async function saveSettings(service: DbClient, userId: string, body: JsonRecord) {
  const settings = normalizeSettings(isRecord(body.settings) ? body.settings : body);
  const row = settingsToRow(settings, userId);
  const { data, error } = await service.from("social_autopilot_settings").upsert(row, { onConflict: "id" }).select("*").single();
  if (error) return json({ error: error.message, migration_required: isMissingTable(error) }, isMissingTable(error) ? 503 : 422);
  await service.from("social_autopilot_events").insert({
    event_type: "settings_saved",
    actor: userId,
    detail: { settings_fingerprint: fingerprint(settings), enabled: settings.enabled },
  });
  return json({ ok: true, settings: settingsFromRow(data as JsonRecord), note: "Settings saved. No content was generated or published." });
}

async function prepareWeek(service: DbClient, auth: DbClient, userId: string, body: JsonRecord) {
  const dryRun = body.dry_run === true;
  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured" }, 503);

  const { data: settingsRow, error: settingsError } = await service.from("social_autopilot_settings").select("*").eq("id", "default").maybeSingle();
  if (settingsError) return json({ error: settingsError.message, migration_required: isMissingTable(settingsError) }, isMissingTable(settingsError) ? 503 : 422);
  const settings = settingsFromRow(settingsRow as JsonRecord | null);
  const key = weekKey(new Date());
  const settingsHash = fingerprint(settings);

  const { data: existing } = await service
    .from("social_autopilot_runs")
    .select("*")
    .eq("week_key", key)
    .eq("settings_fingerprint", settingsHash)
    .eq("dry_run", dryRun)
    .maybeSingle();
  if (existing && ["preview", "ready"].includes(existing.status)) {
    return json({
      ok: true,
      idempotent_replay: true,
      dry_run: dryRun,
      run_id: existing.id,
      campaign_id: existing.campaign_id,
      selected_products: existing.selected_products,
      plan: existing.plan,
      summary: existing.summary,
      note: dryRun ? "Existing dry-run preview returned. Nothing was created." : "This weekly draft queue already exists; no duplicates were created.",
    });
  }

  const backend = await healthSnapshot(service);
  const products = await loadProducts(service, settings, backend.mediaLibraryReady);
  if (products.length === 0) return json({ error: "No eligible published products remain after the cooldown filter" }, 409);
  const slots = buildSlots(settings, key, products);
  if (slots.length === 0) return json({ error: "Enable at least one platform and content type" }, 409);

  const selectedProducts = uniqueBy(slots.map((slot) => slot.product), (product) => product.id).map((product) => ({
    id: product.id,
    name: product.name,
    category: product.category_name,
    verified_media_count: product.media.length,
    reason: product.selection_reason,
  }));
  const previewPlan = slots.map(serialiseSlot);

  const { data: run, error: runError } = await service.from("social_autopilot_runs").upsert({
    week_key: key,
    settings_fingerprint: settingsHash,
    dry_run: dryRun,
    status: dryRun ? "preview" : "preparing",
    selected_products: selectedProducts,
    plan: previewPlan,
    summary: summarizePlan(slots, backend),
    requested_by: userId,
    completed_at: dryRun ? new Date().toISOString() : null,
    error: null,
  }, { onConflict: "week_key,settings_fingerprint,dry_run" }).select("*").single();
  if (runError || !run) throw new Error(runError?.message || "Could not create autopilot run");

  if (dryRun) {
    await addEvent(service, userId, "week_previewed", { week_key: key, items: slots.length }, run.id);
    return json({
      ok: true,
      dry_run: true,
      run_id: run.id,
      selected_products: selectedProducts,
      plan: previewPlan,
      summary: summarizePlan(slots, backend),
      note: "Dry run only. No campaign, draft, render job, approval, schedule or post was created.",
    });
  }

  let campaignId: string | null = null;
  try {
    const platforms = [...new Set(slots.map((slot) => slot.platform))];
    const { data: campaign, error: campaignError } = await service.from("social_campaigns").insert({
      name: `Social Autopilot · Week of ${key}`,
      objective: "Prepare a seven-day owner-review queue of truthful B2B product content for qualified importer, wholesaler, distributor, retailer and private-label enquiries.",
      product_id: null,
      product_focus: selectedProducts.map((product) => String(product.name)).slice(0, 20),
      target_markets: settings.targetMarkets,
      platforms,
      language: settings.language,
      status: "generating",
      brief: {
        autopilot_version: "v2",
        run_id: run.id,
        week_key: key,
        settings_fingerprint: settingsHash,
        owner_approval_required: true,
        auto_publish: false,
        visual_preset: VISUAL_PRESET,
      },
      requested_by: userId,
    }).select("*").single();
    if (campaignError || !campaign) throw new Error(campaignError?.message || "Could not create weekly campaign");
    campaignId = campaign.id;
    await service.from("social_autopilot_runs").update({ campaign_id: campaign.id }).eq("id", run.id);

    const generated = await generateCopy(settings, slots);
    const generatedBySlot = new Map(generated.map((item) => [item.slot_index, item]));
    const rows: JsonRecord[] = [];

    for (const slot of slots) {
      const copy = generatedBySlot.get(slot.index) ?? fallbackCopy(slot);
      const productUrl = slot.product.category_slug
        ? `${PUBLIC_BASE}/products/${slot.product.category_slug}/${slot.product.slug}`
        : `${PUBLIC_BASE}/products`;
      const attachedImage = slot.contentType === "single_image" && slot.media[0] ? absoluteUrl(slot.media[0].public_url) : null;
      const renderJob = await createRenderDraft(auth, userId, slot, copy, productUrl, backend.renderPipelineReady);
      const creativeStatus = attachedImage ? "asset_attached" : renderJob ? "brief_ready" : "asset_required";
      rows.push({
        campaign_id: campaign.id,
        product_id: slot.product.id,
        platform: slot.platform,
        content_type: slot.contentType,
        language: settings.language,
        title: cleanText(copy.title, 240) || `${slot.product.name} · ${slot.platform}`,
        caption: cleanMultiline(copy.caption, 12000),
        hashtags: stringArray(copy.hashtags).map((tag) => tag.replace(/^#/, "")).slice(0, 30),
        call_to_action: cleanText(copy.call_to_action, 800),
        product_url: productUrl,
        image_url: attachedImage,
        video_url: null,
        carousel_outline: slot.contentType === "carousel" ? copy.carousel_outline.slice(0, 10) : [],
        reel_script: slot.contentType === "reel" ? cleanMultiline(copy.reel_script, 5000) : null,
        creative_brief: {
          autopilot: {
            version: "v2",
            run_id: run.id,
            week_key: key,
            slot_index: slot.index,
            proposed_schedule: slot.scheduledAt,
            product_selection_reason: slot.product.selection_reason,
            media_selection_reason: slot.mediaReason,
            media_status: slot.mediaStatus,
            render_status: renderJob ? "draft_owner_review" : "backend_or_assets_required",
            render_job_id: renderJob?.id ?? null,
            owner_approval_required: true,
            auto_publish: false,
          },
          visual_preset: VISUAL_PRESET,
          source_media: slot.media.map((asset) => ({ id: asset.id, public_url: asset.public_url, mime_type: asset.mime_type })),
          on_screen_text: copy.on_screen_text,
          reel_scene_contract: slot.contentType === "reel" ? reelScenes() : null,
          runtime_note: backend.mediaLibraryReady
            ? "Only verified, social-approved Media Library assets were selected. Generated/rendered output still requires owner review."
            : "Backend activation required. No media URL was fabricated and no render was claimed.",
        },
        creative_status: creativeStatus,
        scheduled_at: slot.scheduledAt,
        timezone: "Asia/Karachi",
        status: "draft",
        risk_flags: [...new Set([...copy.risk_flags, ...(slot.mediaStatus === "media_generation_required" ? ["media_review_required"] : [])])],
        idempotency_key: `autopilot-v2-${key}-${settingsHash}-${slot.index}`,
      });
    }

    const { data: items, error: itemError } = await service.from("social_calendar_items").upsert(rows, { onConflict: "idempotency_key", ignoreDuplicates: false }).select("*");
    if (itemError) throw new Error(itemError.message);
    const itemRows = items ?? [];

    for (const item of itemRows) {
      const detail = isRecord(item.creative_brief) && isRecord(item.creative_brief.autopilot) ? item.creative_brief.autopilot : {};
      await addEvent(service, userId, "draft_created", detail, run.id, campaign.id, item.id);
      await addEvent(service, userId, item.creative_status === "asset_required" ? "media_required" : "media_selected", detail, run.id, campaign.id, item.id);
      if (detail.render_job_id) await addEvent(service, userId, "render_required", detail, run.id, campaign.id, item.id);
    }

    const summary = summarizeCreated(itemRows, backend);
    await service.from("social_campaigns").update({ status: "ready", item_count: itemRows.length, error: null }).eq("id", campaign.id);
    await service.from("social_autopilot_runs").update({ status: "ready", plan: previewPlan, summary, completed_at: new Date().toISOString(), error: null }).eq("id", run.id);
    await addEvent(service, userId, "week_prepared", { week_key: key, campaign_id: campaign.id, summary }, run.id, campaign.id);

    return json({
      ok: true,
      dry_run: false,
      run_id: run.id,
      campaign_id: campaign.id,
      created: itemRows.length,
      selected_products: selectedProducts,
      summary,
      note: "Weekly content drafts were created for owner review. Nothing was approved, published or sent.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Weekly preparation failed";
    if (campaignId) await service.from("social_campaigns").update({ status: "failed", error: message.slice(0, 4000) }).eq("id", campaignId);
    await service.from("social_autopilot_runs").update({ status: "failed", error: message.slice(0, 4000), completed_at: new Date().toISOString() }).eq("id", run.id);
    await addEvent(service, userId, "failed", { error: message }, run.id, campaignId ?? undefined);
    return json({ error: message, run_id: run.id, campaign_id: campaignId }, 422);
  }
}

async function loadProducts(service: DbClient, settings: Settings, mediaReady: boolean): Promise<Product[]> {
  const { data: productRows, error } = await service.from("products")
    .select("id,name,slug,description,short_description,image_url,category_id,primary_material,fabric_composition,gsm,customization,available_sizes,available_colors,is_published")
    .eq("is_published", true)
    .order("name")
    .limit(500);
  if (error) throw new Error(error.message);
  const categoryIds = [...new Set((productRows ?? []).map((row) => row.category_id).filter(Boolean))];
  const { data: categoryRows } = categoryIds.length
    ? await service.from("categories").select("id,name,slug").in("id", categoryIds)
    : { data: [] };
  const categories = new Map((categoryRows ?? []).map((row) => [row.id, row]));

  const cooldownStart = new Date(Date.now() - settings.productCooldownDays * 86_400_000).toISOString();
  const { data: recentRows } = await service.from("social_calendar_items")
    .select("product_id,created_at")
    .not("product_id", "is", null)
    .gte("created_at", cooldownStart)
    .order("created_at", { ascending: false })
    .limit(2000);
  const lastUsed = new Map<string, string>();
  for (const row of recentRows ?? []) if (row.product_id && !lastUsed.has(row.product_id)) lastUsed.set(row.product_id, row.created_at);

  let assets: MediaAsset[] = [];
  if (mediaReady) {
    const { data } = await service.from("media_assets")
      .select("id,public_url,mime_type,tags,width_px,height_px,duration_ms")
      .eq("status", "active")
      .eq("verification_status", "verified")
      .eq("social_approved", true)
      .order("created_at", { ascending: false })
      .limit(2000);
    assets = (data ?? []).map((asset) => ({ ...asset, tags: stringArray(asset.tags) })) as MediaAsset[];
  }

  const candidates = (productRows ?? []).flatMap((row): Product[] => {
    if (lastUsed.has(row.id) && settings.productCooldownDays > 0) return [];
    const category = row.category_id ? categories.get(row.category_id) : null;
    const productMedia = assets.filter((asset) => {
      const tags = asset.tags.map((tag) => tag.toLowerCase());
      return tags.includes(row.id.toLowerCase()) || tags.includes(row.slug.toLowerCase()) || absoluteUrl(asset.public_url) === absoluteUrl(row.image_url);
    });
    return [{
      ...row,
      category_name: category?.name ?? null,
      category_slug: category?.slug ?? null,
      last_used_at: lastUsed.get(row.id) ?? null,
      media: productMedia,
      selection_reason: productMedia.length > 0
        ? `Published product with ${productMedia.length} verified, social-approved media asset${productMedia.length === 1 ? "" : "s"}; category rotation: ${category?.name ?? "Uncategorised"}.`
        : `Published product passed the ${settings.productCooldownDays}-day cooldown; no verified social media is linked, so owner-reviewed media generation is required; category: ${category?.name ?? "Uncategorised"}.`,
    } as Product];
  }).sort((left, right) => {
    if ((left.media.length > 0) !== (right.media.length > 0)) return left.media.length > 0 ? -1 : 1;
    return left.name.localeCompare(right.name);
  });

  if (!settings.categoryRotation) return candidates;
  const result: Product[] = [];
  const categoriesUsed = new Set<string>();
  for (const product of candidates) {
    if (!product.category_id || !categoriesUsed.has(product.category_id)) {
      result.push(product);
      if (product.category_id) categoriesUsed.add(product.category_id);
    }
  }
  for (const product of candidates) if (!result.some((item) => item.id === product.id)) result.push(product);
  return result;
}

function buildSlots(settings: Settings, key: string, products: Product[]): Slot[] {
  const platforms = PLATFORMS.filter((platform) => settings.platforms[platform]);
  if (platforms.length === 0 || settings.contentMix.length === 0) return [];
  const count = Math.min(MAX_ITEMS, settings.horizonDays * settings.dailyDraftLimit);
  const baseSlots: Omit<Slot, "product" | "media" | "mediaStatus" | "mediaReason">[] = [];
  let reelsRemaining = Math.min(settings.weeklyReels, count);
  for (let index = 0; index < count; index += 1) {
    const dayOffset = Math.floor(index / settings.dailyDraftLimit);
    const platform = platforms[index % platforms.length];
    const windows = settings.postingWindows[platform].filter(validTime);
    const localTime = windows[index % Math.max(1, windows.length)] || "13:00";
    const interval = Math.max(1, Math.floor(count / Math.max(1, settings.weeklyReels)));
    const forceReel = reelsRemaining > 0 && settings.contentMix.includes("reel") && index % interval === 0;
    const contentType = forceReel ? "reel" : settings.contentMix[index % settings.contentMix.length];
    if (contentType === "reel") reelsRemaining -= 1;
    baseSlots.push({ index, dayOffset, platform, localTime, contentType, scheduledAt: scheduleIso(key, dayOffset, localTime) });
  }

  return baseSlots.map((slot, index) => {
    const product = products[index % products.length];
    const imageAssets = product.media.filter((asset) => asset.mime_type.startsWith("image/"));
    const required = slot.contentType === "single_image" ? 1 : slot.contentType === "carousel" ? Math.min(5, Math.max(2, imageAssets.length)) : 5;
    const selected = imageAssets.slice(0, required);
    const enough = slot.contentType === "single_image" ? selected.length >= 1 : slot.contentType === "carousel" ? selected.length >= 2 : selected.length === 5;
    return {
      ...slot,
      product,
      media: enough ? selected : [],
      mediaStatus: enough ? (slot.contentType === "single_image" ? "verified_attached" : "render_draft_possible") : "media_generation_required",
      mediaReason: enough
        ? `${selected.length} active, verified and social-approved source asset${selected.length === 1 ? "" : "s"} selected for ${slot.contentType.replace(/_/g, " ")}.`
        : `${slot.contentType.replace(/_/g, " ")} requires ${slot.contentType === "carousel" ? "2–5" : required} verified source images; none were fabricated.`,
    };
  });
}

async function generateCopy(settings: Settings, slots: Slot[]): Promise<GeneratedCopy[]> {
  const prompt = `Prepare the exact owner-review copy for an Irha Apparels seven-day social queue.

VERIFIED BRAND FACTS:
- Irha Apparels is an experienced apparel manufacturer in Sialkot, Pakistan; the website is newly built, the company is not new.
- Factory view is available through a scheduled live video call.
- OEM, ODM, private-label and custom manufacturing are offered.
- No public prices. MOQ, materials, timing, documentation and shipping are confirmed only after requirement review.
- Audience is B2B importers, wholesalers, distributors, retailers and private-label brands, not retail consumers.

VISUAL PRESET:
${JSON.stringify(VISUAL_PRESET)}

SLOTS:
${JSON.stringify(slots.map((slot) => ({
  slot_index: slot.index,
  platform: slot.platform,
  content_type: slot.contentType,
  language: settings.language,
  target_markets: settings.targetMarkets,
  scheduled_at: slot.scheduledAt,
  product: {
    name: slot.product.name,
    description: slot.product.description,
    short_description: slot.product.short_description,
    category: slot.product.category_name,
    primary_material: slot.product.primary_material,
    fabric_composition: slot.product.fabric_composition,
    gsm: slot.product.gsm,
    customization: slot.product.customization,
    available_sizes: slot.product.available_sizes,
    available_colors: slot.product.available_colors,
  },
  media_status: slot.mediaStatus,
}))) }

STRICT RULES:
- Return one item for every slot_index and keep its platform/content type unchanged.
- Use only supplied product evidence. Never invent price, MOQ, certification, client, review, capacity, material, lead time, shipping promise or completed order.
- Write native platform-specific copy, concise relevant hashtags without #, and a B2B RFQ/catalogue/live-factory-video-call CTA.
- Mention experienced manufacturer/new website naturally where suitable, not in every post.
- Carousel outline must have 2–5 slides. Reel must be exactly 10 seconds with five 2-second product-only scenes.
- TikTok is a draft/manual export plan unless Content Posting API is independently proven; never claim auto-publication.
- On-screen text must not invent product facts or replace the official crest.
- All output remains draft-only for Daim's final clearance.

Return strict JSON:
{"items":[{"slot_index":0,"title":"","caption":"","hashtags":[],"call_to_action":"","carousel_outline":[],"reel_script":"Scene 1 (0-2s): ...","on_screen_text":[],"risk_flags":[]}]}`;
  const result = await aiJson(prompt);
  const values = Array.isArray(result.items) ? result.items : [];
  return values.flatMap((value): GeneratedCopy[] => {
    if (!isRecord(value)) return [];
    const slotIndex = Number(value.slot_index);
    if (!Number.isInteger(slotIndex) || slotIndex < 0 || slotIndex >= slots.length) return [];
    const caption = cleanMultiline(value.caption, 12000);
    if (!caption) return [];
    return [{
      slot_index: slotIndex,
      title: cleanText(value.title, 240),
      caption,
      hashtags: stringArray(value.hashtags).slice(0, 30),
      call_to_action: cleanText(value.call_to_action, 800),
      carousel_outline: Array.isArray(value.carousel_outline) ? value.carousel_outline.slice(0, 5) : [],
      reel_script: cleanMultiline(value.reel_script, 5000),
      on_screen_text: stringArray(value.on_screen_text).slice(0, 12),
      risk_flags: stringArray(value.risk_flags).slice(0, 20),
    }];
  });
}

async function createRenderDraft(auth: DbClient, userId: string, slot: Slot, copy: GeneratedCopy, productUrl: string, renderReady: boolean) {
  if (!renderReady || slot.contentType === "single_image" || slot.media.length === 0) return null;
  if (slot.contentType === "reel" && slot.media.length !== 5) return null;
  if (slot.contentType === "carousel" && slot.media.length < 2) return null;
  const scenes = slot.contentType === "reel"
    ? reelScenes().map((scene, index) => ({ ...scene, mediaAssetId: slot.media[index].id, sourceUrl: slot.media[index].public_url }))
    : slot.media.map((asset, index) => ({ position: index + 1, mediaAssetId: asset.id, sourceUrl: asset.public_url }));
  const { data: job, error } = await auth.from("social_render_jobs").insert({
    title: `${slot.product.name} ${slot.contentType === "reel" ? "10s reel" : "carousel"}`.slice(0, 120),
    render_type: slot.contentType === "reel" ? "reel" : "carousel",
    aspect_ratio: slot.contentType === "reel" ? "9:16" : "4:5",
    requested_duration_seconds: slot.contentType === "reel" ? 10 : 0,
    status: "draft",
    manifest: {
      schema: "irha.social-render.v1",
      owner_approval_required: true,
      auto_queue: false,
      visual_preset: VISUAL_PRESET,
      product: { id: slot.product.id, name: slot.product.name, url: productUrl },
      platform: slot.platform,
      caption: copy.caption,
      on_screen_text: copy.on_screen_text,
      scenes,
    },
    created_by: userId,
  }).select("*").single();
  if (error || !job) return null;
  const items = slot.media.map((asset, index) => ({
    job_id: job.id,
    media_asset_id: asset.id,
    position: index + 1,
    duration_ms: slot.contentType === "reel" ? 2000 : null,
    scene_text: slot.contentType === "reel" ? `Scene ${index + 1} of 5` : `Slide ${index + 1}`,
    overlay_text: copy.on_screen_text[index] ?? null,
  }));
  const { error: itemError } = await auth.from("social_render_job_items").insert(items);
  if (itemError) {
    await auth.from("social_render_jobs").delete().eq("id", job.id);
    return null;
  }
  return job;
}

function fallbackCopy(slot: Slot): GeneratedCopy {
  const category = slot.product.category_name ? ` in ${slot.product.category_name}` : "";
  const platformLead = slot.platform === "linkedin" ? "For sourcing teams and private-label buyers:" : "B2B product development spotlight:";
  return {
    slot_index: slot.index,
    title: `${slot.product.name} · B2B manufacturing`,
    caption: `${platformLead} ${slot.product.name}${category} is available for requirement-led custom manufacturing by Irha Apparels in Sialkot, Pakistan. We are an experienced manufacturer and our website is newly built. Product specifications, branding, MOQ, timing and shipping are confirmed after reviewing the buyer's programme. A live factory video call is available for verification.`,
    hashtags: ["IrhaApparels", "B2BManufacturing", "PrivateLabel", "CustomApparel", "SialkotManufacturer"],
    call_to_action: "Request a tailored quote, catalogue discussion or live factory video call.",
    carousel_outline: slot.contentType === "carousel" ? ["Product overview", "Construction detail", "Custom branding options", "B2B enquiry CTA"] : [],
    reel_script: slot.contentType === "reel" ? reelScenes().map((scene) => `Scene ${scene.position} (${(scene.position - 1) * 2}-${scene.position * 2}s): verified product detail`).join("\n") : "",
    on_screen_text: [slot.product.name, "Custom manufacturing", "Private label", "Request a quote"],
    risk_flags: ["fallback_copy_owner_review_required"],
  };
}

function normalizeSettings(input: JsonRecord): Settings {
  const platformInput = isRecord(input.platforms) ? input.platforms : {};
  const windowInput = isRecord(input.postingWindows) ? input.postingWindows : isRecord(input.posting_windows) ? input.posting_windows : {};
  const contentMix = stringArray(input.contentMix ?? input.content_mix).filter((value): value is ContentType => CONTENT_TYPES.includes(value as ContentType));
  return {
    enabled: input.enabled === true,
    timezone: "Asia/Karachi",
    horizonDays: clamp(input.horizonDays ?? input.horizon_days, 1, 14, 7),
    dailyDraftLimit: clamp(input.dailyDraftLimit ?? input.daily_draft_limit, 1, 4, 2),
    weeklyReels: clamp(input.weeklyReels ?? input.weekly_reels, 0, 7, 3),
    platforms: Object.fromEntries(PLATFORMS.map((platform) => [platform, platformInput[platform] !== false])) as Record<Platform, boolean>,
    postingWindows: Object.fromEntries(PLATFORMS.map((platform) => {
      const values = stringArray(windowInput[platform]).filter(validTime);
      return [platform, values.length ? values : DEFAULT_SETTINGS.postingWindows[platform]];
    })) as Record<Platform, string[]>,
    contentMix: contentMix.length ? contentMix : DEFAULT_SETTINGS.contentMix,
    productCooldownDays: clamp(input.productCooldownDays ?? input.product_cooldown_days, 0, 120, 30),
    categoryRotation: input.categoryRotation !== false && input.category_rotation !== false,
    language: cleanText(input.language, 80) || "English",
    targetMarkets: stringArray(input.targetMarkets ?? input.target_markets).slice(0, 20),
    visualPreset: VISUAL_PRESET,
  };
}

function settingsFromRow(row: JsonRecord | null): Settings {
  if (!row) return DEFAULT_SETTINGS;
  return normalizeSettings({
    enabled: row.enabled,
    horizon_days: row.horizon_days,
    daily_draft_limit: row.daily_draft_limit,
    weekly_reels: row.weekly_reels,
    platforms: row.platforms,
    posting_windows: row.posting_windows,
    content_mix: row.content_mix,
    product_cooldown_days: row.product_cooldown_days,
    category_rotation: row.category_rotation,
    language: row.language,
    target_markets: row.target_markets,
  });
}

function settingsToRow(settings: Settings, userId: string) {
  return {
    id: "default",
    enabled: settings.enabled,
    timezone: "Asia/Karachi",
    horizon_days: settings.horizonDays,
    daily_draft_limit: settings.dailyDraftLimit,
    weekly_reels: settings.weeklyReels,
    platforms: settings.platforms,
    posting_windows: settings.postingWindows,
    content_mix: settings.contentMix,
    product_cooldown_days: settings.productCooldownDays,
    category_rotation: settings.categoryRotation,
    language: settings.language,
    target_markets: settings.targetMarkets,
    visual_preset: VISUAL_PRESET,
    updated_by: userId,
  };
}

async function healthSnapshot(service: DbClient) {
  const mediaLibraryReady = (await tableHealth(service, "media_assets")).ready;
  const renderPipelineReady = (await tableHealth(service, "social_render_jobs")).ready && (await tableHealth(service, "social_render_job_items")).ready;
  return { mediaLibraryReady, renderPipelineReady };
}

async function tableHealth(service: DbClient, table: string) {
  const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
  return { table, ready: !error, error: error?.message ?? null };
}

async function addEvent(service: DbClient, actor: string, eventType: string, detail: unknown, runId?: string, campaignId?: string, itemId?: string) {
  await service.from("social_autopilot_events").insert({
    run_id: runId ?? null,
    campaign_id: campaignId ?? null,
    calendar_item_id: itemId ?? null,
    event_type: eventType,
    detail: isRecord(detail) ? detail : { value: detail },
    actor,
  });
}

function summarizePlan(slots: Slot[], backend: { mediaLibraryReady: boolean; renderPipelineReady: boolean }) {
  return {
    total: slots.length,
    ready_with_verified_media: slots.filter((slot) => slot.mediaStatus === "verified_attached").length,
    render_draft_possible: slots.filter((slot) => slot.mediaStatus === "render_draft_possible").length,
    media_generation_required: slots.filter((slot) => slot.mediaStatus === "media_generation_required").length,
    reels: slots.filter((slot) => slot.contentType === "reel").length,
    carousels: slots.filter((slot) => slot.contentType === "carousel").length,
    images: slots.filter((slot) => slot.contentType === "single_image").length,
    media_library_ready: backend.mediaLibraryReady,
    render_pipeline_ready: backend.renderPipelineReady,
  };
}

function summarizeCreated(items: JsonRecord[], backend: { mediaLibraryReady: boolean; renderPipelineReady: boolean }) {
  return {
    total: items.length,
    ready_to_approve: items.filter((item) => item.creative_status === "asset_attached" || item.content_type === "text").length,
    media_needed: items.filter((item) => item.creative_status === "asset_required").length,
    render_needed: items.filter((item) => isRecord(item.creative_brief) && isRecord(item.creative_brief.autopilot) && item.creative_brief.autopilot.render_job_id).length,
    scheduled: 0,
    published: 0,
    failed_or_manual: 0,
    media_library_ready: backend.mediaLibraryReady,
    render_pipeline_ready: backend.renderPipelineReady,
    owner_approval_required: true,
  };
}

function serialiseSlot(slot: Slot) {
  return {
    index: slot.index,
    day_offset: slot.dayOffset,
    platform: slot.platform,
    content_type: slot.contentType,
    proposed_schedule: slot.scheduledAt,
    product: { id: slot.product.id, name: slot.product.name, category: slot.product.category_name },
    product_selection_reason: slot.product.selection_reason,
    media_status: slot.mediaStatus,
    media_selection_reason: slot.mediaReason,
    verified_media: slot.media.map((asset) => ({ id: asset.id, url: asset.public_url, mime_type: asset.mime_type })),
    visual_preset: VISUAL_PRESET,
  };
}

function reelScenes() {
  return Array.from({ length: 5 }, (_, index) => ({ position: index + 1, durationMs: 2000, aspectRatio: "9:16" }));
}

function scheduleIso(key: string, dayOffset: number, localTime: string) {
  const [year, month, day] = key.split("-").map(Number);
  const [hour, minute] = localTime.split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day + dayOffset, hour - 5, minute, 0)).toISOString();
}

function weekKey(date: Date) {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

function fingerprint(settings: Settings) {
  const stable = JSON.stringify(sortObject(settings));
  let hash = 2166136261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v2-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

async function aiJson(prompt: string): Promise<JsonRecord> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("SOCIAL_CONTENT_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.3,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: "You create evidence-based B2B social drafts. Never invent claims, approvals, media generation or external execution. Return strict JSON only." },
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

function absoluteUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const candidate = value.trim().startsWith("http") ? value.trim() : `${PUBLIC_BASE}${value.trim().startsWith("/") ? "" : "/"}${value.trim()}`;
    const url = new URL(candidate);
    return ["http:", "https:"].includes(url.protocol) ? url.toString() : null;
  } catch {
    return null;
  }
}

function parseJsonObject(text: string): JsonRecord {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  try {
    return JSON.parse(cleaned);
  } catch {
    const first = cleaned.indexOf("{");
    const last = cleaned.lastIndexOf("}");
    if (first >= 0 && last > first) return JSON.parse(cleaned.slice(first, last + 1));
    throw new Error("AI returned invalid JSON");
  }
}

function isMissingTable(error: { code?: string; message?: string }) {
  return `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase().includes("42p01");
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, Math.round(number))) : fallback;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanMultiline(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max) : "";
}

function stringArray(value: unknown) {
  if (Array.isArray(value)) return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  if (typeof value === "string") return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
  return [];
}

function uniqueBy<T>(values: T[], key: (value: T) => string) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const id = key(value);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as JsonRecord).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, sortObject(child)]));
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
    for (const key of ["error", "message", "detail"]) {
      if (typeof payload[key] === "string") return `${fallback}: ${payload[key]}`;
      if (isRecord(payload[key]) && typeof payload[key].message === "string") return `${fallback}: ${payload[key].message}`;
    }
  }
  return fallback;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
