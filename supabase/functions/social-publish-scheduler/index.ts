import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-irha-scheduler-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GATEWAY = "https://connector-gateway.lovable.dev";
const MAX_BATCH = 10;
type JsonRecord = Record<string, unknown>;
type DbClient = ReturnType<typeof createClient>;

type DeliveryResult = {
  status: "published" | "verified_only" | "manual_required";
  externalPostId: string | null;
  externalPostUrl: string | null;
  raw: JsonRecord;
  error: string | null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({}));
    const action = typeof body?.action === "string" ? body.action : "health";
    const schedulerSecret = Deno.env.get("SOCIAL_SCHEDULER_SECRET") || "";
    const presentedSecret = req.headers.get("x-irha-scheduler-secret") || "";
    const schedulerAuthorized = Boolean(schedulerSecret && constantTimeEqual(schedulerSecret, presentedSecret));

    const authHeader = req.headers.get("Authorization") || "";
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await auth.auth.getUser();
    const user = userData?.user ?? null;
    let adminAuthorized = false;
    if (user) {
      const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
      adminAuthorized = Boolean(role);
    }

    if (!adminAuthorized && !schedulerAuthorized) return json({ error: "Unauthorized" }, 401);
    if (action === "health" && !adminAuthorized) return json({ error: "Admin required for health details" }, 403);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (action === "health") return await health(service);
    if (action === "run") {
      return await runDue(service, {
        triggerSource: schedulerAuthorized && !adminAuthorized ? "scheduler" : "admin",
        requestedBy: user?.id ?? null,
        limit: clamp(body?.limit, 1, MAX_BATCH, MAX_BATCH),
      });
    }
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("social-publish-scheduler", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: DbClient) {
  const tableNames = ["social_platform_accounts", "social_calendar_items", "social_delivery_attempts", "social_publish_runs", "social_publish_events"];
  const tables = await Promise.all(tableNames.map(async (table) => {
    const { error } = await service.from(table).select("*", { head: true, count: "exact" }).limit(1);
    return { table, ready: !error, error: error?.message ?? null };
  }));
  const connections = await verifyConnections();
  for (const connection of connections) {
    await service.from("social_platform_accounts").update({
      verification_status: connection.verified ? "verified" : connection.configured ? "failed" : "missing",
      external_account_id: connection.externalAccountId,
      last_verified_at: connection.verified ? new Date().toISOString() : null,
      last_health: connection,
      connection_note: connection.note,
    }).eq("platform", connection.platform);
  }
  const { data: accounts } = await service.from("social_platform_accounts").select("*").order("platform");
  return json({
    ok: tables.every((row) => row.ready),
    database_ready: tables.every((row) => row.ready),
    tables,
    scheduler_secret_configured: Boolean(Deno.env.get("SOCIAL_SCHEDULER_SECRET")),
    generic_gateway_configured: Boolean(Deno.env.get("SOCIAL_PUBLISH_GATEWAY_URL") && Deno.env.get("SOCIAL_PUBLISH_GATEWAY_SECRET")),
    accounts: accounts ?? [],
    connections,
    note: "Health verification is read-only at the platform. It does not publish a post.",
  });
}

async function runDue(service: DbClient, input: { triggerSource: "admin" | "scheduler"; requestedBy: string | null; limit: number }) {
  const workerId = `social-${crypto.randomUUID()}`;
  const { data: run, error: runError } = await service.from("social_publish_runs").insert({
    worker_id: workerId,
    trigger_source: input.triggerSource,
    requested_by: input.requestedBy,
  }).select("*").single();
  if (runError || !run) throw new Error(runError?.message || "Could not create publish run");

  const { data: claimed, error: claimError } = await service.rpc("social_claim_due_publications", {
    _worker_id: workerId,
    _limit: input.limit,
  });
  if (claimError) {
    await service.from("social_publish_runs").update({ status: "failed", error: claimError.message, completed_at: new Date().toISOString() }).eq("id", run.id);
    throw new Error(claimError.message);
  }

  const items = Array.isArray(claimed) ? claimed as JsonRecord[] : [];
  const outcomes: JsonRecord[] = [];
  let publishedCount = 0;
  let manualCount = 0;
  let failedCount = 0;

  for (const item of items) {
    const itemId = String(item.id || "");
    const lockToken = String(item.delivery_lock_token || "");
    const attemptNumber = Number(item.publish_attempts || 0) + 1;
    const { data: attempt } = await service.from("social_delivery_attempts").insert({
      item_id: itemId,
      campaign_id: item.campaign_id,
      platform: item.platform,
      attempt_number: attemptNumber,
      status: "started",
      request_snapshot: redactRequest(item),
      actor: input.requestedBy,
    }).select("id").single();

    try {
      const result = await deliver(item);
      const { data: completed, error: completeError } = await service.rpc("social_complete_publication", {
        _item_id: itemId,
        _lock_token: lockToken,
        _run_id: run.id,
        _status: result.status,
        _external_post_id: result.externalPostId,
        _external_post_url: result.externalPostUrl,
        _connector_result: result.raw,
        _error: result.error,
      });
      if (completeError) throw new Error(completeError.message);
      if (attempt?.id) {
        await service.from("social_delivery_attempts").update({
          status: result.status,
          response_snapshot: result.raw,
          error: result.error,
        }).eq("id", attempt.id);
      }
      if (result.status === "published") publishedCount += 1;
      else manualCount += 1;
      outcomes.push({
        item_id: itemId,
        platform: item.platform,
        status: result.status,
        external_post_id: result.externalPostId,
        external_post_url: result.externalPostUrl,
        record: completed,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delivery failed";
      failedCount += 1;
      const { data: failed } = await service.rpc("social_fail_publication", {
        _item_id: itemId,
        _lock_token: lockToken,
        _run_id: run.id,
        _error: message,
        _connector_result: { worker_id: workerId },
      });
      if (attempt?.id) {
        await service.from("social_delivery_attempts").update({ status: "failed", error: message.slice(0, 2000) }).eq("id", attempt.id);
      }
      outcomes.push({ item_id: itemId, platform: item.platform, status: "failed", error: message, record: failed });
    }
  }

  const status = failedCount === 0 ? "completed" : publishedCount + manualCount > 0 ? "partial" : "failed";
  await service.from("social_publish_runs").update({
    status,
    claimed_count: items.length,
    published_count: publishedCount,
    manual_count: manualCount,
    failed_count: failedCount,
    summary: { outcomes },
    completed_at: new Date().toISOString(),
  }).eq("id", run.id);

  return json({
    ok: failedCount === 0,
    run_id: run.id,
    claimed: items.length,
    published: publishedCount,
    manual_required: manualCount,
    failed: failedCount,
    outcomes,
    note: items.length === 0 ? "No owner-approved automatic items are due." : "Only exact platform results are counted as published.",
  });
}

async function deliver(item: JsonRecord): Promise<DeliveryResult> {
  const gatewayUrl = Deno.env.get("SOCIAL_PUBLISH_GATEWAY_URL") || "";
  const gatewaySecret = Deno.env.get("SOCIAL_PUBLISH_GATEWAY_SECRET") || "";
  if (gatewayUrl && gatewaySecret) return await deliverViaGateway(gatewayUrl, gatewaySecret, item);

  const platform = String(item.platform || "");
  if (platform === "facebook") return await deliverFacebook(item);
  if (platform === "instagram") return await deliverInstagram(item);
  if (platform === "linkedin") return await deliverLinkedIn(item);
  if (platform === "tiktok") return await deliverTikTok(item);
  throw new Error(`Unsupported platform ${platform}`);
}

async function deliverViaGateway(url: string, secret: string, item: JsonRecord): Promise<DeliveryResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${secret}` },
    body: JSON.stringify({
      schema: "irha.social-publish.v1",
      idempotency_key: item.idempotency_key,
      platform: item.platform,
      content_type: item.content_type,
      title: item.title,
      caption: completeCaption(item),
      product_url: item.product_url,
      image_url: item.image_url,
      video_url: item.video_url,
      creative_brief: item.creative_brief,
    }),
  });
  const payload = await safeJson(response);
  if (!response.ok || !isRecord(payload)) throw new Error(readApiError(payload, `Publish gateway returned ${response.status}`));
  const status = payload.status;
  if (!['published','verified_only','manual_required'].includes(String(status))) throw new Error("Publish gateway returned an invalid status");
  const postId = typeof payload.external_post_id === "string" ? payload.external_post_id : null;
  const postUrl = httpsUrl(payload.external_post_url);
  if (status === "published" && !postId && !postUrl) throw new Error("Publish gateway did not return publication evidence");
  return { status: status as DeliveryResult["status"], externalPostId: postId, externalPostUrl: postUrl, raw: payload, error: typeof payload.error === "string" ? payload.error : null };
}

async function deliverFacebook(item: JsonRecord): Promise<DeliveryResult> {
  const token = Deno.env.get("META_PAGE_ACCESS_TOKEN") || Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") || "";
  const pageId = Deno.env.get("META_PAGE_ID") || Deno.env.get("FACEBOOK_PAGE_ID") || "";
  const version = Deno.env.get("META_GRAPH_VERSION") || "";
  if (!token || !pageId || !version) throw new Error("Meta Page token, Page ID and META_GRAPH_VERSION are required");
  const base = `https://graph.facebook.com/${version}/${pageId}`;
  const contentType = String(item.content_type || "text");
  const imageUrl = httpsUrl(item.image_url);
  const videoUrl = httpsUrl(item.video_url);
  const params = new URLSearchParams({ access_token: token });
  let endpoint = `${base}/feed`;
  if (contentType === "reel" && videoUrl) {
    endpoint = `${base}/videos`;
    params.set("file_url", videoUrl);
    params.set("description", completeCaption(item));
  } else if (contentType === "single_image" && imageUrl) {
    endpoint = `${base}/photos`;
    params.set("url", imageUrl);
    params.set("caption", completeCaption(item));
  } else if (contentType === "carousel") {
    return manual("Facebook carousel requires a verified gateway adapter.");
  } else {
    params.set("message", completeCaption(item));
    const productUrl = httpsUrl(item.product_url);
    if (productUrl) params.set("link", productUrl);
  }
  const response = await fetch(`${endpoint}?${params}`, { method: "POST" });
  const payload = await safeJson(response);
  if (!response.ok || !isRecord(payload)) throw new Error(readApiError(payload, `Facebook returned ${response.status}`));
  const postId = typeof payload.post_id === "string" ? payload.post_id : typeof payload.id === "string" ? payload.id : null;
  if (!postId) throw new Error("Facebook did not return a post identifier");
  return { status: "published", externalPostId: postId, externalPostUrl: `https://www.facebook.com/${postId}`, raw: payload, error: null };
}

async function deliverInstagram(item: JsonRecord): Promise<DeliveryResult> {
  const token = Deno.env.get("META_PAGE_ACCESS_TOKEN") || Deno.env.get("INSTAGRAM_ACCESS_TOKEN") || "";
  const instagramId = Deno.env.get("META_INSTAGRAM_BUSINESS_ID") || Deno.env.get("INSTAGRAM_BUSINESS_ID") || "";
  const version = Deno.env.get("META_GRAPH_VERSION") || "";
  if (!token || !instagramId || !version) throw new Error("Instagram token, Business ID and META_GRAPH_VERSION are required");
  const contentType = String(item.content_type || "single_image");
  if (contentType === "carousel") return manual("Instagram carousel requires a verified gateway adapter.");
  if (contentType === "text") return manual("Instagram requires an approved image or reel asset.");
  const params = new URLSearchParams({ caption: completeCaption(item), access_token: token });
  if (contentType === "reel") {
    const videoUrl = httpsUrl(item.video_url);
    if (!videoUrl || item.render_verified !== true) throw new Error("Instagram reel requires verified HTTPS video output");
    params.set("media_type", "REELS");
    params.set("video_url", videoUrl);
    params.set("share_to_feed", "true");
  } else {
    const imageUrl = httpsUrl(item.image_url);
    if (!imageUrl) throw new Error("Instagram image post requires a public HTTPS image");
    params.set("image_url", imageUrl);
  }
  const createResponse = await fetch(`https://graph.facebook.com/${version}/${instagramId}/media?${params}`, { method: "POST" });
  const createPayload = await safeJson(createResponse);
  if (!createResponse.ok || !isRecord(createPayload) || typeof createPayload.id !== "string") throw new Error(readApiError(createPayload, `Instagram container returned ${createResponse.status}`));
  const publishParams = new URLSearchParams({ creation_id: createPayload.id, access_token: token });
  const publishResponse = await fetch(`https://graph.facebook.com/${version}/${instagramId}/media_publish?${publishParams}`, { method: "POST" });
  const publishPayload = await safeJson(publishResponse);
  if (!publishResponse.ok || !isRecord(publishPayload) || typeof publishPayload.id !== "string") throw new Error(readApiError(publishPayload, `Instagram publish returned ${publishResponse.status}`));
  const permalinkResponse = await fetch(`https://graph.facebook.com/${version}/${publishPayload.id}?fields=permalink&access_token=${encodeURIComponent(token)}`);
  const permalinkPayload = await safeJson(permalinkResponse);
  const permalink = isRecord(permalinkPayload) ? httpsUrl(permalinkPayload.permalink) : null;
  return { status: "published", externalPostId: publishPayload.id, externalPostUrl: permalink, raw: { container: createPayload, publish: publishPayload, permalink: permalinkPayload }, error: null };
}

async function deliverLinkedIn(item: JsonRecord): Promise<DeliveryResult> {
  if (!["text","single_image"].includes(String(item.content_type))) return manual("LinkedIn media delivery requires a verified gateway adapter.");
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const linkedinKey = Deno.env.get("LINKEDIN_API_KEY") || "";
  if (!lovableKey || !linkedinKey) throw new Error("LinkedIn connector runtime keys are missing");
  let author = Deno.env.get("LINKEDIN_ORG_URN") || "";
  if (!author) {
    const profileResponse = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": linkedinKey } });
    const profile = await safeJson(profileResponse);
    if (!profileResponse.ok || !isRecord(profile) || typeof profile.sub !== "string") throw new Error(readApiError(profile, `LinkedIn profile returned ${profileResponse.status}`));
    author = `urn:li:person:${profile.sub}`;
  }
  const productUrl = httpsUrl(item.product_url);
  const shareContent: JsonRecord = { shareCommentary: { text: completeCaption(item) }, shareMediaCategory: productUrl ? "ARTICLE" : "NONE" };
  if (productUrl) shareContent.media = [{ status: "READY", originalUrl: productUrl, title: { text: String(item.title || "Irha Apparels") } }];
  const response = await fetch(`${GATEWAY}/linkedin/v2/ugcPosts`, {
    method: "POST",
    headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": linkedinKey, "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" },
    body: JSON.stringify({ author, lifecycleState: "PUBLISHED", specificContent: { "com.linkedin.ugc.ShareContent": shareContent }, visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" } }),
  });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `LinkedIn returned ${response.status}`));
  const postId = response.headers.get("x-restli-id") || (isRecord(payload) && typeof payload.id === "string" ? payload.id : null);
  if (!postId) throw new Error("LinkedIn did not return a post identifier");
  return { status: "published", externalPostId: postId, externalPostUrl: null, raw: { status: response.status, body: payload, post_id: postId }, error: null };
}

async function deliverTikTok(_item: JsonRecord): Promise<DeliveryResult> {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const tiktokKey = Deno.env.get("TIKTOK_API_KEY") || "";
  if (!lovableKey || !tiktokKey) return manual("TikTok connector runtime keys are missing; manual upload required.");
  const response = await fetch(`${GATEWAY}/tiktok/user/info/?fields=open_id,display_name`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": tiktokKey } });
  const payload = await safeJson(response);
  if (!response.ok) throw new Error(readApiError(payload, `TikTok profile returned ${response.status}`));
  return { status: "verified_only", externalPostId: null, externalPostUrl: null, raw: { profile_verified: true, profile: payload, note: "Profile verification is not publication evidence." }, error: "TikTok direct posting is not enabled" };
}

async function verifyConnections() {
  const results = [];
  results.push(await verifyMeta("facebook"));
  results.push(await verifyMeta("instagram"));
  results.push(await verifyLinkedIn());
  results.push(await verifyTikTok());
  return results;
}

async function verifyMeta(platform: "facebook" | "instagram") {
  const token = Deno.env.get("META_PAGE_ACCESS_TOKEN") || (platform === "facebook" ? Deno.env.get("FACEBOOK_PAGE_ACCESS_TOKEN") : Deno.env.get("INSTAGRAM_ACCESS_TOKEN")) || "";
  const id = platform === "facebook"
    ? Deno.env.get("META_PAGE_ID") || Deno.env.get("FACEBOOK_PAGE_ID") || ""
    : Deno.env.get("META_INSTAGRAM_BUSINESS_ID") || Deno.env.get("INSTAGRAM_BUSINESS_ID") || "";
  const version = Deno.env.get("META_GRAPH_VERSION") || "";
  if (!token || !id || !version) return connection(platform, false, false, null, `Missing ${platform} credentials or META_GRAPH_VERSION.`);
  try {
    const fields = platform === "facebook" ? "id,name" : "id,username";
    const response = await fetch(`https://graph.facebook.com/${version}/${id}?fields=${fields}&access_token=${encodeURIComponent(token)}`);
    const payload = await safeJson(response);
    return connection(platform, true, response.ok, response.ok && isRecord(payload) && typeof payload.id === "string" ? payload.id : null, response.ok ? `${platform} identity verified.` : readApiError(payload, `${platform} verification returned ${response.status}`), payload);
  } catch (error) {
    return connection(platform, true, false, null, error instanceof Error ? error.message : `${platform} verification failed`);
  }
}

async function verifyLinkedIn() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const key = Deno.env.get("LINKEDIN_API_KEY") || "";
  if (!lovableKey || !key) return connection("linkedin", false, false, null, "LinkedIn connector keys are missing.");
  try {
    const response = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key } });
    const payload = await safeJson(response);
    return connection("linkedin", true, response.ok, response.ok && isRecord(payload) && typeof payload.sub === "string" ? payload.sub : null, response.ok ? "LinkedIn identity verified." : readApiError(payload, `LinkedIn verification returned ${response.status}`), payload);
  } catch (error) {
    return connection("linkedin", true, false, null, error instanceof Error ? error.message : "LinkedIn verification failed");
  }
}

async function verifyTikTok() {
  const lovableKey = Deno.env.get("LOVABLE_API_KEY") || "";
  const key = Deno.env.get("TIKTOK_API_KEY") || "";
  if (!lovableKey || !key) return connection("tiktok", false, false, null, "TikTok connector keys are missing.");
  try {
    const response = await fetch(`${GATEWAY}/tiktok/user/info/?fields=open_id,display_name`, { headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": key } });
    const payload = await safeJson(response);
    const externalId = response.ok && isRecord(payload) && typeof payload.open_id === "string" ? payload.open_id : null;
    return connection("tiktok", true, response.ok, externalId, response.ok ? "TikTok profile verified; direct posting remains disabled." : readApiError(payload, `TikTok verification returned ${response.status}`), payload);
  } catch (error) {
    return connection("tiktok", true, false, null, error instanceof Error ? error.message : "TikTok verification failed");
  }
}

function connection(platform: string, configured: boolean, verified: boolean, externalAccountId: string | null, note: string, raw: unknown = null) {
  return { platform, configured, verified, externalAccountId, note, raw: redact(raw) };
}

function manual(message: string): DeliveryResult {
  return { status: "manual_required", externalPostId: null, externalPostUrl: null, raw: { note: message }, error: message };
}

function completeCaption(item: JsonRecord) {
  const caption = String(item.caption || "").trim();
  const hashtags = Array.isArray(item.hashtags) ? item.hashtags.map((value) => `#${String(value).replace(/^#/, "")}`).join(" ") : "";
  return [caption, hashtags].filter(Boolean).join("\n\n").slice(0, 12000);
}

function redactRequest(item: JsonRecord) {
  return {
    idempotency_key: item.idempotency_key,
    platform: item.platform,
    content_type: item.content_type,
    scheduled_at: item.scheduled_at,
    image_url: item.image_url,
    video_url: item.video_url,
    render_verified: item.render_verified,
  };
}

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (!isRecord(value)) return value;
  return Object.fromEntries(Object.entries(value).map(([key, child]) => /token|secret|key|authorization/i.test(key) ? [key, "[redacted]"] : [key, redact(child)]));
}

function httpsUrl(value: unknown) {
  if (typeof value !== "string") return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is JsonRecord {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function safeJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return {};
  try { return JSON.parse(text); } catch { return { raw: text.slice(0, 4000) }; }
}

function readApiError(payload: unknown, fallback: string) {
  if (!isRecord(payload)) return fallback;
  if (typeof payload.message === "string") return payload.message;
  if (isRecord(payload.error) && typeof payload.error.message === "string") return payload.error.message;
  if (typeof payload.error === "string") return payload.error;
  return fallback;
}

function clamp(value: unknown, min: number, max: number, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, Math.round(parsed))) : fallback;
}

function constantTimeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
