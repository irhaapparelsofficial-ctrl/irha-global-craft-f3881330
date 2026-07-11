// Irha Social Content & Calendar Engine v1
// Admin-only AI content generation, explicit approval and exact platform delivery.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const PUBLIC_BASE = "https://www.irhaapparels.com";
const GATEWAY = "https://connector-gateway.lovable.dev";
const MAX_GENERATE_ITEMS = 28;
const MAX_PUBLISH_ITEMS = 10;
const PLATFORMS = new Set(["facebook", "instagram", "linkedin", "tiktok"]);

type DbClient = ReturnType<typeof createClient>;
type JsonRecord = Record<string, unknown>;

type GeneratedItem = {
  platform: string;
  content_type: string;
  language: string;
  title: string;
  caption: string;
  hashtags: string[];
  call_to_action: string;
  carousel_outline: unknown[];
  reel_script: string;
  creative_brief: JsonRecord;
  risk_flags: string[];
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
    if (action === "generate") return await generateContent(service, user.id, body);
    if (action === "update") return await updateItem(service, user.id, body);
    if (action === "publish") return await publishItems(service, user.id, body);
    if (action === "publish_due") return await publishDue(service, user.id, body);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("social-calendar error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const checks = await Promise.all(
    ["social_campaigns", "social_calendar_items", "social_delivery_attempts"].map(async (table) => {
      const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
      return { table, ready: !error, error: error?.message };
    }),
  );
  const databaseReady = checks.every((item) => item.ready);
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const linkedinKey = Deno.env.get("LINKEDIN_API_KEY") || "";
  const tiktokKey = Deno.env.get("TIKTOK_API_KEY") || "";
  const meta = metaCredentials();

  const [linkedin, tiktok] = await Promise.all([
    verifyLinkedIn(lovableKey, linkedinKey),
    verifyTikTok(lovableKey, tiktokKey),
  ]);

  return json({
    ok: true,
    database_ready: databaseReady,
    tables: checks,
    ai_gateway_configured: Boolean(lovableKey),
    ready_to_generate: Boolean(databaseReady && lovableKey),
    channels: {
      facebook: {
        configured: Boolean(meta.token && meta.pageId),
        publish_capable: Boolean(meta.token && meta.pageId),
        note: meta.token && meta.pageId ? "Meta credentials detected; exact API result decides success." : "Meta Page credentials missing.",
      },
      instagram: {
        configured: Boolean(meta.token && meta.instagramId),
        publish_capable: Boolean(meta.token && meta.instagramId),
        note: meta.token && meta.instagramId ? "Instagram Business credentials detected; a public image URL is required." : "Instagram Business credentials missing.",
      },
      linkedin,
      tiktok,
    },
    creative_runtime: {
      canva: {
        connected_in_builder: true,
        deployed_runtime_connected: false,
        note: "Canva MCP is a build/chat connector, not a deployed admin runtime. The engine creates a copyable creative handoff brief.",
      },
      heygen: {
        connected_in_builder: true,
        deployed_runtime_connected: false,
        note: "HeyGen MCP is a build/chat connector, not a deployed admin runtime. The engine creates a copyable video handoff brief.",
      },
    },
    scheduling: {
      calendar_ready: databaseReady,
      unattended_cron_verified: false,
      note: "Approved scheduled items can be processed with Publish due now. An unattended cron is not claimed in v1.",
    },
    limits: { generate_items: MAX_GENERATE_ITEMS, publish_items: MAX_PUBLISH_ITEMS },
  });
}

async function generateContent(service: DbClient, userId: string, body: JsonRecord) {
  if (!Deno.env.get("LOVABLE_API_KEY")) return json({ error: "Lovable AI gateway is not configured" }, 503);

  const campaignInput = isRecord(body.campaign) ? body.campaign : body;
  const platforms = stringArray(campaignInput.platforms).filter((value) => PLATFORMS.has(value)).slice(0, 4);
  const objective = cleanText(campaignInput.objective, 1500);
  const productId = typeof campaignInput.product_id === "string" ? campaignInput.product_id : null;
  const productFocus = stringArray(campaignInput.product_focus).slice(0, 20);
  const targetMarkets = stringArray(campaignInput.target_markets).slice(0, 20);
  const language = cleanText(campaignInput.language, 80) || "English";
  const postsPerPlatform = clampNumber(campaignInput.posts_per_platform, 1, 7, 2);
  if (!objective || platforms.length === 0) {
    return json({ error: "campaign.objective and at least one supported platform are required" }, 400);
  }

  let product: JsonRecord | null = null;
  let category: JsonRecord | null = null;
  if (productId) {
    const { data, error } = await service
      .from("products")
      .select("id,name,slug,description,short_description,image_url,gallery,category_id,primary_material,fabric_composition,gsm,customization,available_sizes,available_colors,is_published")
      .eq("id", productId)
      .maybeSingle();
    if (error || !data) return json({ error: "Product not found" }, 404);
    product = data as JsonRecord;
    const { data: categoryRow } = await service
      .from("categories")
      .select("id,name,slug")
      .eq("id", data.category_id)
      .maybeSingle();
    category = (categoryRow as JsonRecord | null) ?? null;
  }

  const { data: campaign, error: campaignError } = await service
    .from("social_campaigns")
    .insert({
      name: cleanText(campaignInput.name, 240) || defaultCampaignName(product, productFocus, targetMarkets),
      objective,
      product_id: productId,
      product_focus: productFocus,
      target_markets: targetMarkets,
      platforms,
      language,
      status: "generating",
      brief: {
        posts_per_platform: postsPerPlatform,
        requested_content_types: stringArray(campaignInput.content_types),
        owner_notes: cleanText(campaignInput.owner_notes, 3000),
      },
      requested_by: userId,
    })
    .select("*")
    .single();
  if (campaignError || !campaign) throw new Error(campaignError?.message || "Could not create social campaign");

  try {
    const generated = await generateItemsWithAI({
      campaign,
      product,
      category,
      platforms,
      postsPerPlatform,
      language,
      requestedTypes: stringArray(campaignInput.content_types),
    });
    const productUrl = product && category
      ? `${PUBLIC_BASE}/products/${category.slug}/${product.slug}`
      : PUBLIC_BASE;
    const productImage = absoluteUrl(product?.image_url);
    const rows = generated.slice(0, MAX_GENERATE_ITEMS).map((item, index) => {
      const assetState = creativeState(item, productImage);
      return {
        campaign_id: campaign.id,
        product_id: productId,
        platform: item.platform,
        content_type: item.content_type,
        language: item.language,
        title: item.title,
        caption: item.caption,
        hashtags: item.hashtags,
        call_to_action: item.call_to_action,
        product_url: productUrl,
        image_url: assetState.imageUrl,
        video_url: null,
        carousel_outline: item.carousel_outline,
        reel_script: item.reel_script || null,
        creative_brief: {
          ...item.creative_brief,
          canva_handoff: buildCanvaHandoff(item, product, productUrl),
          heygen_handoff: item.content_type === "reel" ? buildHeyGenHandoff(item, product, productUrl) : null,
          runtime_note: "Canva and HeyGen MCP connections are not callable by the deployed admin runtime.",
        },
        creative_status: assetState.status,
        scheduled_at: null,
        timezone: "Asia/Karachi",
        status: "draft",
        risk_flags: item.risk_flags,
        idempotency_key: `social-${campaign.id}-${item.platform}-${index}`,
      };
    });
    if (rows.length === 0) throw new Error("AI returned no usable calendar items");

    const { data: items, error: itemError } = await service
      .from("social_calendar_items")
      .insert(rows)
      .select("*");
    if (itemError) throw new Error(itemError.message);
    await service.from("social_campaigns").update({
      status: "ready",
      item_count: items?.length ?? 0,
      error: null,
    }).eq("id", campaign.id);

    return json({
      ok: true,
      campaign_id: campaign.id,
      created: items?.length ?? 0,
      items,
      note: "Content items are drafts only. Nothing was approved, scheduled or published.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Content generation failed";
    await service.from("social_campaigns").update({ status: "failed", error: message.slice(0, 4000) }).eq("id", campaign.id);
    return json({ error: message, campaign_id: campaign.id }, 422);
  }
}

async function updateItem(service: DbClient, userId: string, body: JsonRecord) {
  const itemId = typeof body.item_id === "string" ? body.item_id : "";
  if (!itemId) return json({ error: "item_id required" }, 400);
  const { data: item, error } = await service.from("social_calendar_items").select("*").eq("id", itemId).maybeSingle();
  if (error || !item) return json({ error: "Calendar item not found" }, 404);
  if (["published", "verified_only", "manual_required", "publishing"].includes(item.status)) {
    return json({ error: `Item cannot be edited from status ${item.status}` }, 409);
  }

  const requestedStatus = typeof body.status === "string" ? body.status : item.status;
  if (!["draft", "approved", "scheduled", "ready", "rejected", "cancelled"].includes(requestedStatus)) {
    return json({ error: "Unsupported status update" }, 400);
  }
  const scheduledAt = parseDate(body.scheduled_at) ?? item.scheduled_at;
  const imageUrl = body.image_url === null ? null : normalizeUrl(body.image_url) ?? item.image_url;
  const videoUrl = body.video_url === null ? null : normalizeUrl(body.video_url) ?? item.video_url;
  const contentType = typeof body.content_type === "string" ? body.content_type : item.content_type;
  const assetReady = contentType === "text"
    || (contentType === "single_image" && Boolean(imageUrl))
    || (contentType === "reel" && Boolean(videoUrl));

  if (["approved", "scheduled", "ready"].includes(requestedStatus) && !assetReady && item.platform !== "linkedin") {
    return json({ error: "Attach the required public image/video asset before approval" }, 409);
  }

  const nextStatus = requestedStatus === "approved" && scheduledAt ? "scheduled" : requestedStatus;
  const update: JsonRecord = {
    title: typeof body.title === "string" ? cleanText(body.title, 240) : item.title,
    caption: typeof body.caption === "string" ? cleanMultiline(body.caption, 12000) : item.caption,
    language: typeof body.language === "string" ? cleanText(body.language, 80) : item.language,
    hashtags: body.hashtags !== undefined ? stringArray(body.hashtags).slice(0, 30) : item.hashtags,
    call_to_action: typeof body.call_to_action === "string" ? cleanText(body.call_to_action, 800) : item.call_to_action,
    image_url: imageUrl,
    video_url: videoUrl,
    scheduled_at: scheduledAt,
    timezone: typeof body.timezone === "string" ? cleanText(body.timezone, 80) : item.timezone,
    status: nextStatus,
    creative_status: assetReady ? "ready" : item.creative_status,
    error: null,
  };

  if (["approved", "scheduled", "ready"].includes(nextStatus)) {
    update.approved_by = userId;
    update.approved_at = new Date().toISOString();
  } else {
    update.approved_by = null;
    update.approved_at = null;
  }

  const { data: saved, error: updateError } = await service
    .from("social_calendar_items")
    .update(update)
    .eq("id", itemId)
    .select("*")
    .single();
  if (updateError || !saved) throw new Error(updateError?.message || "Calendar item update failed");
  await refreshCampaignCounts(service, item.campaign_id);
  return json({ ok: true, item: saved });
}

async function publishDue(service: DbClient, userId: string, body: JsonRecord) {
  const now = new Date().toISOString();
  const limit = clampNumber(body.limit, 1, MAX_PUBLISH_ITEMS, MAX_PUBLISH_ITEMS);
  const { data: items, error } = await service
    .from("social_calendar_items")
    .select("id")
    .in("status", ["scheduled", "ready", "failed"])
    .not("approved_at", "is", null)
    .lte("scheduled_at", now)
    .order("scheduled_at", { ascending: true })
    .limit(limit);
  if (error) throw new Error(error.message);
  const ids = (items ?? []).map((item) => item.id);
  if (ids.length === 0) return json({ ok: true, outcomes: [], note: "No approved calendar items are due." });
  return await publishItems(service, userId, { item_ids: ids, due_only: true });
}

async function publishItems(service: DbClient, userId: string, body: JsonRecord) {
  const ids = stringArray(body.item_ids).slice(0, MAX_PUBLISH_ITEMS);
  if (ids.length === 0) return json({ error: "item_ids[] required" }, 400);
  const { data: items, error } = await service
    .from("social_calendar_items")
    .select("*,products(name,slug,description),social_campaigns(name)")
    .in("id", ids);
  if (error) throw new Error(error.message);

  const outcomes: JsonRecord[] = [];
  for (const item of items ?? []) {
    const approved = Boolean(item.approved_by && item.approved_at);
    const retry = item.status === "failed" && approved;
    if (!approved || !["approved", "scheduled", "ready", "failed"].includes(item.status)) {
      outcomes.push({ id: item.id, platform: item.platform, status: "skipped", reason: "Explicit approval is required" });
      continue;
    }
    if (item.scheduled_at && new Date(item.scheduled_at).getTime() > Date.now()) {
      outcomes.push({ id: item.id, platform: item.platform, status: "skipped", reason: "Scheduled time has not arrived" });
      continue;
    }
    if (["published", "verified_only", "manual_required"].includes(item.status)) {
      outcomes.push({ id: item.id, platform: item.platform, status: "skipped", reason: `Already ${item.status}` });
      continue;
    }

    const attemptNumber = Number(item.publish_attempts || 0) + 1;
    await service.from("social_calendar_items").update({
      status: "publishing",
      publish_attempts: attemptNumber,
      error: null,
    }).eq("id", item.id);
    const { data: attempt } = await service.from("social_delivery_attempts").insert({
      item_id: item.id,
      campaign_id: item.campaign_id,
      platform: item.platform,
      attempt_number: attemptNumber,
      status: "started",
      request_snapshot: {
        caption: item.caption,
        image_url: item.image_url,
        video_url: item.video_url,
        content_type: item.content_type,
        scheduled_at: item.scheduled_at,
        retry,
      },
      actor: userId,
    }).select("id").single();

    try {
      const result = await deliver(item as JsonRecord);
      await service.from("social_calendar_items").update({
        status: result.status,
        external_post_id: result.externalPostId,
        external_post_url: result.externalPostUrl,
        connector_result: result.raw,
        error: result.error,
        published_at: result.status === "published" ? new Date().toISOString() : null,
      }).eq("id", item.id);
      if (attempt?.id) {
        await service.from("social_delivery_attempts").update({
          status: result.status === "published" ? "published" : result.status,
          response_snapshot: result.raw,
          error: result.error,
        }).eq("id", attempt.id);
      }
      outcomes.push({
        id: item.id,
        platform: item.platform,
        status: result.status,
        external_post_id: result.externalPostId,
        external_post_url: result.externalPostUrl,
        error: result.error,
      });
    } catch (deliveryError) {
      const message = deliveryError instanceof Error ? deliveryError.message : "Delivery failed";
      await service.from("social_calendar_items").update({ status: "failed", error: message.slice(0, 2000) }).eq("id", item.id);
      if (attempt?.id) {
        await service.from("social_delivery_attempts").update({
          status: "failed",
          error: message.slice(0, 2000),
        }).eq("id", attempt.id);
      }
      outcomes.push({ id: item.id, platform: item.platform, status: "failed", error: message });
    }
    await refreshCampaignCounts(service, item.campaign_id);
  }

  return json({
    ok: outcomes.some((item) => item.status === "published"),
    outcomes,
    summary: summarizeOutcomes(outcomes),
  });
}

async function deliver(item: JsonRecord): Promise<{
  status: "published" | "verified_only" | "manual_required";
  externalPostId: string | null;
  externalPostUrl: string | null;
  raw: JsonRecord;
  error: string | null;
}> {
  const platform = String(item.platform);
  if (platform === "tiktok") return await deliverTikTok(item);
  if (item.content_type === "reel" && !item.video_url) {
    return {
      status: "manual_required",
      externalPostId: null,
      externalPostUrl: null,
      raw: { note: "A rendered video asset is required. HeyGen MCP is not a deployed runtime connector." },
      error: "Video asset required for reel delivery",
    };
  }
  if (item.content_type === "carousel") {
    return {
      status: "manual_required",
      externalPostId: null,
      externalPostUrl: null,
      raw: { note: "Carousel delivery is not implemented in v1. Use the stored Canva handoff brief and attach final assets." },
      error: "Carousel assets require manual handoff",
    };
  }
  if (platform === "facebook") return await deliverFacebook(item);
  if (platform === "instagram") return await deliverInstagram(item);
  if (platform === "linkedin") return await deliverLinkedIn(item);
  throw new Error(`Unsupported platform ${platform}`);
}

async function deliverFacebook(item: JsonRecord) {
  const meta = metaCredentials();
  if (!meta.token || !meta.pageId) throw new Error("Meta Page credentials are not configured");
  const caption = completeCaption(item);
  const imageUrl = normalizeUrl(item.image_url);
  const endpoint = imageUrl
    ? `https://graph.facebook.com/v19.0/${meta.pageId}/photos`
    : `https://graph.facebook.com/v19.0/${meta.pageId}/feed`;
  const params = new URLSearchParams({ access_token: meta.token });
  if (imageUrl) {
    params.set("url", imageUrl);
    params.set("caption", caption);
  } else {
    params.set("message", caption);
    const productUrl = normalizeUrl(item.product_url);
    if (productUrl) params.set("link", productUrl);
  }
  const response = await fetch(`${endpoint}?${params}`, { method: "POST" });
  const payload = await safeJson(response);
  if (!response.ok || !isRecord(payload)) throw new Error(readApiError(payload, `Facebook returned ${response.status}`));
  const postId = typeof payload.post_id === "string" ? payload.post_id : typeof payload.id === "string" ? payload.id : null;
  return {
    status: "published" as const,
    externalPostId: postId,
    externalPostUrl: postId ? `https://facebook.com/${postId}` : null,
    raw: payload,
    error: null,
  };
}

async function deliverInstagram(item: JsonRecord) {
  const meta = metaCredentials();
  if (!meta.token || !meta.instagramId) throw new Error("Instagram Business credentials are not configured");
  const imageUrl = normalizeUrl(item.image_url);
  if (!imageUrl) throw new Error("Instagram single-image delivery requires a public image URL");
  const createParams = new URLSearchParams({
    image_url: imageUrl,
    caption: completeCaption(item),
    access_token: meta.token,
  });
  const createResponse = await fetch(
    `https://graph.facebook.com/v19.0/${meta.instagramId}/media?${createParams}`,
    { method: "POST" },
  );
  const createPayload = await safeJson(createResponse);
  if (!createResponse.ok || !isRecord(createPayload) || typeof createPayload.id !== "string") {
    throw new Error(readApiError(createPayload, `Instagram container returned ${createResponse.status}`));
  }
  const publishParams = new URLSearchParams({
    creation_id: createPayload.id,
    access_token: meta.token,
  });
  const publishResponse = await fetch(
    `https://graph.facebook.com/v19.0/${meta.instagramId}/media_publish?${publishParams}`,
    { method: "POST" },
  );
  const publishPayload = await safeJson(publishResponse);
  if (!publishResponse.ok || !isRecord(publishPayload) || typeof publishPayload.id !== "string") {
    throw new Error(readApiError(publishPayload, `Instagram publish returned ${publishResponse.status}`));
  }
  const permalinkResponse = await fetch(
    `https://graph.facebook.com/v19.0/${publishPayload.id}?fields=permalink&access_token=${encodeURIComponent(meta.token)}`,
  );
  const permalinkPayload = await safeJson(permalinkResponse);
  return {
    status: "published" as const,
    externalPostId: publishPayload.id,
    externalPostUrl: isRecord(permalinkPayload) && typeof permalinkPayload.permalink === "string" ? permalinkPayload.permalink : null,
    raw: { container: createPayload, publish: publishPayload, permalink: permalinkPayload },
    error: null,
  };
}

async function deliverLinkedIn(item: JsonRecord) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const linkedinKey = Deno.env.get("LINKEDIN_API_KEY");
  if (!lovableKey || !linkedinKey) throw new Error("LinkedIn connector runtime keys are missing");
  let author = Deno.env.get("LINKEDIN_ORG_URN") || "";
  if (!author) {
    const profileResponse = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, {
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": linkedinKey,
      },
    });
    const profile = await safeJson(profileResponse);
    if (!profileResponse.ok || !isRecord(profile) || typeof profile.sub !== "string") {
      throw new Error(readApiError(profile, `LinkedIn profile returned ${profileResponse.status}`));
    }
    author = `urn:li:person:${profile.sub}`;
  }
  const productUrl = normalizeUrl(item.product_url);
  const shareContent: JsonRecord = {
    shareCommentary: { text: completeCaption(item) },
    shareMediaCategory: productUrl ? "ARTICLE" : "NONE",
  };
  if (productUrl) {
    shareContent.media = [{
      status: "READY",
      originalUrl: productUrl,
      title: { text: String(item.title || "Irha Apparels") },
    }];
  }
  const response = await fetch(`${GATEWAY}/linkedin/v2/ugcPosts`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": linkedinKey,
      "Content-Type": "application/json",
      "X-Restli-Protocol-Version": "2.0.0",
    },
    body: JSON.stringify({
      author,
      lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": shareContent },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `LinkedIn returned ${response.status}`));
  const postId = response.headers.get("x-restli-id")
    || (isRecord(payload) && typeof payload.id === "string" ? payload.id : null);
  return {
    status: "published" as const,
    externalPostId: postId,
    externalPostUrl: null,
    raw: { status: response.status, body: payload, post_id: postId },
    error: null,
  };
}

async function deliverTikTok(_item: JsonRecord) {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");
  const tiktokKey = Deno.env.get("TIKTOK_API_KEY");
  if (!lovableKey || !tiktokKey) {
    return {
      status: "manual_required" as const,
      externalPostId: null,
      externalPostUrl: null,
      raw: { note: "TikTok connector runtime keys are missing." },
      error: "TikTok manual upload required",
    };
  }
  const response = await fetch(`${GATEWAY}/tiktok/user/info/?fields=open_id,display_name`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": tiktokKey,
    },
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `TikTok profile returned ${response.status}`));
  return {
    status: "verified_only" as const,
    externalPostId: null,
    externalPostUrl: null,
    raw: {
      profile_verified: true,
      profile: payload,
      note: "TikTok public posting is not enabled until Content Posting API scope and audit are proven. No post was published.",
    },
    error: "Connected profile verified; manual upload still required",
  };
}

async function generateItemsWithAI(input: {
  campaign: JsonRecord;
  product: JsonRecord | null;
  category: JsonRecord | null;
  platforms: string[];
  postsPerPlatform: number;
  language: string;
  requestedTypes: string[];
}): Promise<GeneratedItem[]> {
  const prompt = `Create a premium B2B social content calendar for Irha Apparels.

BRAND FACTS:
- Experienced apparel manufacturer in Sialkot, Pakistan; website is newly built.
- Factory view is available by live video call.
- OEM, ODM, private-label and custom manufacturing.
- No public prices. MOQ, timeline, documentation and shipping are confirmed after requirement review.
- Audience: wholesalers, importers, distributors, retailers and private-label brands. Not retail consumers.

CAMPAIGN:
${JSON.stringify({
  objective: input.campaign.objective,
  product_focus: input.campaign.product_focus,
  target_markets: input.campaign.target_markets,
  platforms: input.platforms,
  language: input.language,
  posts_per_platform: input.postsPerPlatform,
  requested_content_types: input.requestedTypes,
})}

PRODUCT EVIDENCE:
${JSON.stringify(input.product ? {
  name: input.product.name,
  description: input.product.description,
  short_description: input.product.short_description,
  category: input.category?.name,
  primary_material: input.product.primary_material,
  fabric_composition: input.product.fabric_composition,
  gsm: input.product.gsm,
  customization: input.product.customization,
  available_sizes: input.product.available_sizes,
  available_colors: input.product.available_colors,
} : null)}

STRICT RULES:
- Return exactly ${input.postsPerPlatform} items per requested platform where possible.
- Use only supplied facts. Never invent certifications, buyers, orders, prices, delivery times, MOQ, material or production claims.
- Each platform needs native-style copy, not duplicated text.
- Captions must be useful to B2B buyers and end with a clear RFQ/catalogue/factory-video-call CTA.
- Hashtags must be relevant, concise and returned without # symbols.
- For carousel include 4-7 slide outlines. For reel include a 10-20 second scene script.
- A creative brief must describe layout, asset requirements and on-screen text without claiming the asset was generated.
- TikTok content is a manual/export plan; do not claim it will auto-publish.
- Canva and HeyGen are handoff destinations only; do not claim a deployed runtime connection.

Return strict JSON:
{"items":[{"platform":"linkedin","content_type":"text|single_image|carousel|reel","language":"English","title":"","caption":"","hashtags":[],"call_to_action":"","carousel_outline":[],"reel_script":"","creative_brief":{"format":"","visual_direction":"","on_screen_text":[],"asset_requirements":[]},"risk_flags":[]}]}`;

  const result = await aiJson(prompt);
  const values = Array.isArray(result.items) ? result.items : [];
  return values.flatMap((value): GeneratedItem[] => {
    if (!isRecord(value)) return [];
    const platform = typeof value.platform === "string" ? value.platform.toLowerCase() : "";
    if (!input.platforms.includes(platform)) return [];
    const contentType = typeof value.content_type === "string" && ["text", "single_image", "carousel", "reel"].includes(value.content_type)
      ? value.content_type
      : platform === "linkedin" ? "text" : "single_image";
    const caption = cleanMultiline(value.caption, 12000);
    if (!caption) return [];
    return [{
      platform,
      content_type: contentType,
      language: cleanText(value.language, 80) || input.language,
      title: cleanText(value.title, 240) || `${platform} content`,
      caption,
      hashtags: stringArray(value.hashtags).map((item) => item.replace(/^#/, "")).slice(0, 30),
      call_to_action: cleanText(value.call_to_action, 800),
      carousel_outline: Array.isArray(value.carousel_outline) ? value.carousel_outline.slice(0, 10) : [],
      reel_script: cleanMultiline(value.reel_script, 5000),
      creative_brief: isRecord(value.creative_brief) ? value.creative_brief : {},
      risk_flags: stringArray(value.risk_flags).slice(0, 20),
    }];
  });
}

async function aiJson(prompt: string): Promise<JsonRecord> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) throw new Error("LOVABLE_API_KEY missing");
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("SOCIAL_CONTENT_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.35,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You create evidence-based B2B social content. Never invent business claims or external execution. Return strict JSON only.",
        },
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

async function verifyLinkedIn(lovableKey: string, linkedinKey: string) {
  if (!lovableKey || !linkedinKey) {
    return { configured: false, verified: false, publish_capable: false, note: "LinkedIn connector runtime key missing." };
  }
  try {
    const response = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": linkedinKey },
    });
    const payload = await safeJson(response);
    return {
      configured: true,
      verified: response.ok,
      publish_capable: response.ok,
      note: response.ok ? "LinkedIn identity verified; exact publish response is logged." : `LinkedIn profile returned ${response.status}.`,
      profile: response.ok && isRecord(payload) ? { id: payload.sub ?? null, name: payload.name ?? null } : null,
    };
  } catch (error) {
    return { configured: true, verified: false, publish_capable: false, note: error instanceof Error ? error.message : "LinkedIn verification failed" };
  }
}

async function verifyTikTok(lovableKey: string, tiktokKey: string) {
  if (!lovableKey || !tiktokKey) {
    return { configured: false, verified: false, publish_capable: false, note: "TikTok connector runtime key missing." };
  }
  try {
    const response = await fetch(`${GATEWAY}/tiktok/user/info/?fields=open_id,display_name`, {
      headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": tiktokKey },
    });
    return {
      configured: true,
      verified: response.ok,
      publish_capable: false,
      note: response.ok
        ? "TikTok profile verified. Public posting remains disabled until Content Posting API scope/audit is proven."
        : `TikTok profile returned ${response.status}.`,
    };
  } catch (error) {
    return { configured: true, verified: false, publish_capable: false, note: error instanceof Error ? error.message : "TikTok verification failed" };
  }
}

async function refreshCampaignCounts(service: DbClient, campaignId: string) {
  const { data } = await service.from("social_calendar_items").select("status").eq("campaign_id", campaignId);
  const statuses = (data ?? []).map((item) => item.status);
  const published = statuses.filter((status) => status === "published").length;
  const failed = statuses.filter((status) => status === "failed").length;
  const approved = statuses.filter((status) => ["approved", "scheduled", "ready", "published", "verified_only", "manual_required"].includes(status)).length;
  let status = "ready";
  if (statuses.length === 0) status = "draft";
  else if (statuses.some((value) => value === "publishing")) status = "active";
  else if (statuses.every((value) => ["published", "verified_only", "manual_required", "rejected", "cancelled"].includes(value))) status = "completed";
  else if (published > 0) status = "active";
  await service.from("social_campaigns").update({
    item_count: statuses.length,
    approved_count: approved,
    published_count: published,
    failed_count: failed,
    status,
  }).eq("id", campaignId);
}

function creativeState(item: GeneratedItem, productImage: string | null) {
  if (item.content_type === "text") return { status: "ready", imageUrl: null };
  if (item.content_type === "single_image" && productImage) return { status: "asset_attached", imageUrl: productImage };
  return { status: "runtime_not_connected", imageUrl: null };
}

function buildCanvaHandoff(item: GeneratedItem, product: JsonRecord | null, productUrl: string) {
  return {
    tool: "Canva",
    runtime_status: "not_connected_to_deployed_admin",
    instruction: `Create a ${item.platform} ${item.content_type} for Irha Apparels using the approved creative brief. Keep it premium, dark charcoal/navy and gold, B2B-focused, with the official Irha Apparels logo. Do not invent certifications, buyer logos, prices, MOQ or delivery claims.`,
    product_name: product?.name ?? null,
    product_url: productUrl,
    creative_brief: item.creative_brief,
    carousel_outline: item.carousel_outline,
    caption: item.caption,
  };
}

function buildHeyGenHandoff(item: GeneratedItem, product: JsonRecord | null, productUrl: string) {
  return {
    tool: "HeyGen",
    runtime_status: "not_connected_to_deployed_admin",
    instruction: "Create a vertical B2B product reel from the approved script. Use product-only visuals where possible, no unsupported claims, no public pricing, and finish with Request a Quote / live factory video call CTA.",
    product_name: product?.name ?? null,
    product_url: productUrl,
    script: item.reel_script,
    creative_brief: item.creative_brief,
  };
}

function completeCaption(item: JsonRecord) {
  const caption = cleanMultiline(item.caption, 12000);
  const hashtags = stringArray(item.hashtags).map((tag) => `#${tag.replace(/^#/, "")}`).join(" ");
  return [caption, hashtags].filter(Boolean).join("\n\n");
}

function defaultCampaignName(product: JsonRecord | null, productFocus: string[], markets: string[]) {
  const subject = cleanText(product?.name, 120) || productFocus.slice(0, 2).join(" + ") || "Irha B2B";
  return `${subject} · ${markets.slice(0, 2).join(" & ") || "Social"}`;
}

function metaCredentials() {
  return {
    token: Deno.env.get("META_PAGE_ACCESS_TOKEN") || Deno.env.get("META_ACCESS_TOKEN") || "",
    pageId: Deno.env.get("META_FB_PAGE_ID") || Deno.env.get("META_PAGE_ID") || "",
    instagramId: Deno.env.get("META_IG_BUSINESS_ACCOUNT_ID") || Deno.env.get("IG_ACCOUNT_ID") || "",
  };
}

function absoluteUrl(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  if (value.startsWith("http://") || value.startsWith("https://")) return normalizeUrl(value);
  return normalizeUrl(`${PUBLIC_BASE}${value.startsWith("/") ? value : `/${value}`}`);
}

function normalizeUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim().startsWith("http") ? value.trim() : `https://${value.trim()}`);
    if (!["http:", "https:"].includes(url.protocol)) return null;
    return url.toString();
  } catch {
    return null;
  }
}

function parseDate(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
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

function stringArray(value: unknown) {
  if (Array.isArray(value)) {
    return [...new Set(value.filter((item): item is string => typeof item === "string").map((item) => item.trim()).filter(Boolean))];
  }
  if (typeof value === "string") {
    return [...new Set(value.split(/[,\n]/).map((item) => item.trim()).filter(Boolean))];
  }
  return [];
}

function summarizeOutcomes(outcomes: JsonRecord[]) {
  const result: Record<string, number> = {};
  for (const outcome of outcomes) {
    const status = typeof outcome.status === "string" ? outcome.status : "unknown";
    result[status] = (result[status] || 0) + 1;
  }
  return result;
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(min, Math.min(max, Math.round(number))) : fallback;
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function cleanMultiline(value: unknown, max: number) {
  return typeof value === "string"
    ? value.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim().slice(0, max)
    : "";
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 2000);
  }
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
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
