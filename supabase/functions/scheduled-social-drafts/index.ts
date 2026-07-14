import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

type Row = Record<string, any>;
const SITE = "https://www.irhaapparels.com";
const json = (payload: unknown, status = 200) => new Response(JSON.stringify(payload), { status, headers: { "content-type": "application/json", "cache-control": "no-store" } });

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!url || !serviceKey) return json({ error: "runtime_not_configured" }, 500);
  const db = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const body = await req.json().catch(() => ({})) as Row;
  const token = req.headers.get("x-irha-ops-token") || "";
  const action = "social_drafts";
  if (!/^[0-9a-f-]{36}$/i.test(token)) return json({ error: "unauthorized" }, 401);
  const nowIso = new Date().toISOString();
  const { data: claimed } = await db.from("operations_call_tokens").update({ consumed_at: nowIso }).eq("id", token).eq("action", action).is("consumed_at", null).gt("expires_at", nowIso).select("id").maybeSingle();
  if (!claimed) return json({ error: "invalid_or_consumed_token" }, 401);
  const { data: control } = await db.from("operations_control").select("enabled,social_drafts_enabled").eq("id", "default").maybeSingle();
  if (!control?.enabled || control.social_drafts_enabled === false) return json({ ok: true, skipped: true, reason: "social_drafts_disabled" });

  const triggerSource = body.trigger_source === "manual" ? "manual" : "cron";
  const { data: run, error: runError } = await db.from("operations_runs").insert({ action, trigger_source: triggerSource, status: "running" }).select("id").single();
  if (runError || !run) return json({ error: runError?.message || "run_create_failed" }, 500);
  const started = Date.now();

  try {
    const local = new Date(Date.now() + 5 * 60 * 60_000);
    const dateKey = local.toISOString().slice(0, 10);
    const dayIndex = dayOfYear(local) - 1;
    const campaignName = `Scheduled B2B Drafts · ${dateKey}`;
    const { data: existing } = await db.from("social_campaigns").select("id,status,item_count").eq("name", campaignName).maybeSingle();
    if (existing) {
      const result = { ok: true, skipped: true, reason: "already_created_today", campaign_id: existing.id, status: existing.status, item_count: existing.item_count };
      await finish(db, run.id, started, "skipped", result, null);
      return json({ run_id: run.id, ...result });
    }

    const [{ data: owner }, { data: settings }, { data: products }, { data: categories }, { data: media }] = await Promise.all([
      db.from("user_roles").select("user_id").eq("role", "admin").limit(1).maybeSingle(),
      db.from("automation_settings").select("social_enabled,social_platforms,daily_social_draft_limit,lead_markets").eq("id", "default").maybeSingle(),
      db.from("products").select("id,name,slug,short_description,description,image_url,category_id,primary_material,fabric_composition,gsm,is_published").eq("is_published", true).order("name").limit(500),
      db.from("categories").select("id,name,slug").limit(200),
      db.from("media_assets").select("id,public_url,mime_type,tags").eq("status", "active").eq("verification_status", "verified").eq("social_approved", true).limit(500),
    ]);
    if (settings?.social_enabled === false) {
      const result = { ok: true, skipped: true, reason: "social_module_disabled" };
      await finish(db, run.id, started, "skipped", result, null);
      return json({ run_id: run.id, ...result });
    }

    const productRows = products || [];
    if (!productRows.length) throw new Error("no_published_products");
    const categoryMap = new Map((categories || []).map((row: Row) => [row.id, row]));
    const mediaRows = media || [];
    const platforms = strings(settings?.social_platforms).filter((item) => ["facebook", "instagram", "linkedin", "tiktok"].includes(item));
    const enabledPlatforms = platforms.length ? platforms : ["linkedin", "instagram", "facebook", "tiktok"];
    const limit = Math.max(1, Math.min(4, Number(settings?.daily_social_draft_limit || 2)));
    const selected = rotate(productRows, dayIndex).slice(0, limit);
    const targetMarkets = strings(settings?.lead_markets).slice(0, 8);

    const { data: campaign, error: campaignError } = await db.from("social_campaigns").insert({
      name: campaignName,
      objective: "Prepare truthful B2B product content for owner review and qualified buyer enquiries.",
      product_focus: selected.map((product: Row) => product.name),
      target_markets: targetMarkets,
      platforms: enabledPlatforms,
      language: "English",
      status: "generating",
      brief: { source: "scheduled_deterministic_worker_v1", owner_approval_required: true, auto_publish: false, ai_used: false, verified_media_only: true },
      requested_by: owner?.user_id || null,
    }).select("*").single();
    if (campaignError || !campaign) throw new Error(campaignError?.message || "campaign_create_failed");

    const rows: Row[] = [];
    for (let index = 0; index < selected.length; index += 1) {
      const product = selected[index];
      const category = categoryMap.get(product.category_id) || null;
      const asset = findMedia(mediaRows, product);
      let platform = enabledPlatforms[(dayIndex + index) % enabledPlatforms.length];
      if (!asset && ["instagram", "tiktok"].includes(platform)) platform = index % 2 === 0 ? "linkedin" : "facebook";
      const contentType = asset ? "single_image" : "text";
      const productUrl = category?.slug ? `${SITE}/products/${category.slug}/${product.slug}` : `${SITE}/products`;
      const material = clean(product.fabric_composition || product.primary_material || "", 140);
      const detail = material ? ` Verified product data lists ${material}.` : "";
      const caption = `${platform === "linkedin" ? "For importers, wholesalers and private-label sourcing teams:" : "B2B product spotlight:"} ${product.name} is available for requirement-led custom manufacturing by Irha Apparels in Sialkot, Pakistan.${detail} We are an experienced manufacturer and our website is newly built. Branding, specifications, MOQ, sampling, timing and shipping are confirmed after reviewing the buyer's programme. A live factory video call is available for verification.`;
      const scheduledAt = scheduleUtc(dateKey, index === 0 ? "13:00" : "19:00");
      rows.push({
        campaign_id: campaign.id,
        product_id: product.id,
        platform,
        content_type: contentType,
        language: "English",
        title: `${product.name} · B2B manufacturing`,
        caption,
        hashtags: ["IrhaApparels", "B2BManufacturing", "PrivateLabel", "CustomApparel", "SialkotManufacturer"],
        call_to_action: "Request a tailored quote, catalogue discussion or scheduled live factory video call.",
        product_url: productUrl,
        image_url: asset?.public_url || null,
        carousel_outline: [],
        creative_brief: {
          source: "scheduled_deterministic_worker_v1",
          owner_approval_required: true,
          auto_publish: false,
          ai_used: false,
          verified_product_id: product.id,
          verified_media_asset_id: asset?.id || null,
          evidence: { material: material || null, category: category?.name || null },
          visual_rule: "Use only the attached owner-approved media. Do not invent labels, prices, certifications, MOQ or delivery claims.",
        },
        creative_status: asset ? "asset_attached" : "ready",
        scheduled_at: scheduledAt,
        timezone: "Asia/Karachi",
        status: "draft",
        risk_flags: asset ? ["owner_review_required", "deterministic_copy"] : ["owner_review_required", "deterministic_copy", "text_only_no_verified_media"],
        idempotency_key: `ops-social-${dateKey}-${product.id}-${platform}`,
        source_media_asset_id: asset?.id || null,
        delivery_mode: "manual",
        max_attempts: 5,
      });
    }

    const { data: items, error: itemError } = await db.from("social_calendar_items").upsert(rows, { onConflict: "idempotency_key" }).select("id,platform,content_type,creative_status,status");
    if (itemError) throw new Error(itemError.message);
    await db.from("social_campaigns").update({ status: "ready", item_count: items?.length || 0, error: null }).eq("id", campaign.id);
    const result = { ok: true, campaign_id: campaign.id, created: items?.length || 0, drafts: items || [], approved_media_used: rows.filter((row) => row.source_media_asset_id).length, text_only: rows.filter((row) => !row.source_media_asset_id).length, published: 0, owner_approval_required: true };
    await finish(db, run.id, started, "completed", result, null);
    return json({ run_id: run.id, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    await finish(db, run.id, started, "failed", {}, message);
    return json({ ok: false, run_id: run.id, error: message }, 500);
  }
});

async function finish(db: any, id: string, started: number, status: string, summary: unknown, error: string | null) {
  await db.from("operations_runs").update({ status, completed_at: new Date().toISOString(), duration_ms: Date.now() - started, summary, error }).eq("id", id);
}
function findMedia(media: Row[], product: Row) {
  return media.find((asset) => asset.public_url === product.image_url || strings(asset.tags).some((tag) => [String(product.id).toLowerCase(), String(product.slug).toLowerCase()].includes(tag.toLowerCase()))) || null;
}
function rotate<T>(rows: T[], offset: number) { if (!rows.length) return rows; const start = offset % rows.length; return [...rows.slice(start), ...rows.slice(0, start)]; }
function scheduleUtc(dateKey: string, localTime: string) { const [year, month, day] = dateKey.split("-").map(Number); const [hour, minute] = localTime.split(":").map(Number); return new Date(Date.UTC(year, month - 1, day, hour - 5, minute, 0)).toISOString(); }
function strings(value: unknown) { return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim()) : []; }
function clean(value: unknown, max: number) { return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : ""; }
function dayOfYear(date: Date) { const start = Date.UTC(date.getUTCFullYear(), 0, 0); return Math.floor((date.getTime() - start) / 86_400_000); }
