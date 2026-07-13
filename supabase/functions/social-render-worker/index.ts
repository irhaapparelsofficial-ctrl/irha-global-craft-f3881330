import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type JsonRecord = Record<string, unknown>;

type RenderJob = {
  id: string;
  title: string;
  render_type: "reel" | "carousel";
  aspect_ratio: "9:16" | "4:5" | "1:1";
  requested_duration_seconds: number;
  manifest: JsonRecord;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization") || "";
    const auth = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await auth.auth.getUser();
    const user = userData.user;
    if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await auth.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const action = typeof body.action === "string" ? body.action : "health";
    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    if (action === "health") return await health(service);
    if (action === "dispatch") return await dispatch(service);
    return json({ error: "Unsupported action" }, 400);
  } catch (error) {
    console.error("social-render-worker", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

async function health(service: ReturnType<typeof createClient>) {
  const checks = await Promise.all(
    ["social_render_jobs", "social_render_job_items", "media_assets"].map(async (table) => {
      const { error } = await service.from(table).select("id", { head: true, count: "exact" }).limit(1);
      return { table, ready: !error, error: error?.message };
    }),
  );
  const providerUrl = Deno.env.get("SOCIAL_RENDER_PROVIDER_URL") || "";
  const providerKey = Deno.env.get("SOCIAL_RENDER_PROVIDER_KEY") || "";
  const callbackSecret = Deno.env.get("SOCIAL_RENDER_CALLBACK_SECRET") || "";
  return json({
    ok: true,
    database_ready: checks.every((check) => check.ready),
    tables: checks,
    provider_configured: Boolean(providerUrl && providerKey),
    callback_configured: Boolean(callbackSecret),
    ready_to_dispatch: Boolean(checks.every((check) => check.ready) && providerUrl && providerKey && callbackSecret),
    note: providerUrl && providerKey && callbackSecret
      ? "Renderer dispatch is configured. Exact provider response and verified callback decide success."
      : "Renderer credentials are incomplete. Jobs remain safely queued and are not shown as rendered.",
  });
}

async function dispatch(service: ReturnType<typeof createClient>) {
  const providerUrl = Deno.env.get("SOCIAL_RENDER_PROVIDER_URL") || "";
  const providerKey = Deno.env.get("SOCIAL_RENDER_PROVIDER_KEY") || "";
  const callbackSecret = Deno.env.get("SOCIAL_RENDER_CALLBACK_SECRET") || "";
  if (!providerUrl || !providerKey || !callbackSecret) {
    return json({ error: "Renderer provider or callback secret is not configured" }, 503);
  }

  const providerName = new URL(providerUrl).hostname.slice(0, 80);
  const { data: claimed, error: claimError } = await service.rpc("claim_next_social_render_job", { _provider: providerName });
  if (claimError) return json({ error: claimError.message }, 422);
  if (!claimed) return json({ ok: true, claimed: false, note: "No approved render job is queued." });
  const job = claimed as RenderJob;

  const { data: items, error: itemError } = await service
    .from("social_render_job_items")
    .select("position,duration_ms,scene_text,overlay_text,media_assets(id,public_url,mime_type,file_name)")
    .eq("job_id", job.id)
    .order("position");
  if (itemError || !items?.length) {
    await service.rpc("fail_social_render_job", { _job_id: job.id, _message: itemError?.message || "Render items missing" });
    return json({ error: itemError?.message || "Render items missing", job_id: job.id }, 422);
  }

  const outputCount = job.render_type === "reel" ? 1 : items.length;
  const uploads: Array<{ position: number; object_path: string; token: string }> = [];
  for (let index = 0; index < outputCount; index += 1) {
    const extension = job.render_type === "reel" ? "mp4" : "webp";
    const path = `${job.id}/${String(index + 1).padStart(2, "0")}.${extension}`;
    const { data, error } = await service.storage.from("social-renders").createSignedUploadUrl(path);
    if (error || !data?.token) {
      await service.rpc("fail_social_render_job", { _job_id: job.id, _message: error?.message || "Could not create output upload URL" });
      return json({ error: error?.message || "Could not create output upload URL", job_id: job.id }, 500);
    }
    uploads.push({ position: index + 1, object_path: path, token: data.token });
  }

  const callbackUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-render-callback`;
  const response = await fetch(providerUrl, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${providerKey}` },
    body: JSON.stringify({
      schema: "irha.social-render.provider.v1",
      job,
      items,
      outputs: uploads.map((upload) => ({
        position: upload.position,
        bucket: "social-renders",
        object_path: upload.object_path,
        signed_upload_token: upload.token,
      })),
      callback: {
        url: callbackUrl,
        headers: { "x-irha-render-secret": callbackSecret },
      },
    }),
  });

  const providerBody = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = cleanText(providerBody?.error, 1500) || `Renderer returned HTTP ${response.status}`;
    await service.rpc("fail_social_render_job", { _job_id: job.id, _message: message });
    return json({ error: message, job_id: job.id }, 502);
  }

  const rendererJobId = cleanText(providerBody?.job_id, 240);
  if (rendererJobId) {
    await service.from("social_render_jobs").update({ renderer_job_id: rendererJobId }).eq("id", job.id).eq("status", "rendering");
  }
  return json({ ok: true, claimed: true, job_id: job.id, renderer_job_id: rendererJobId || null, note: "Renderer accepted the job. Ready status still requires the verified callback." });
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
