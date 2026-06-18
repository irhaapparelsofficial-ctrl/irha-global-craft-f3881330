// Publishes a post to Facebook Page and/or Instagram Business via Meta Graph API.
// Admin-only. Logs result to public.social_posts.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GRAPH = "https://graph.facebook.com/v19.0";

type Body = {
  caption: string;
  imageUrl?: string;
  channels: Array<"facebook" | "instagram">;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: cErr } = await supabase.auth.getClaims(token);
    if (cErr || !claims?.claims?.sub) return json({ error: "Unauthorized" }, 401);
    const userId = claims.claims.sub as string;

    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden — admin only" }, 403);

    const body = (await req.json()) as Body;
    if (!body?.caption || !Array.isArray(body.channels) || body.channels.length === 0) {
      return json({ error: "caption and channels[] required" }, 400);
    }
    if (body.channels.includes("instagram") && !body.imageUrl) {
      return json({ error: "Instagram requires imageUrl" }, 400);
    }

    const TOKEN = Deno.env.get("META_PAGE_ACCESS_TOKEN");
    const PAGE_ID = Deno.env.get("META_FB_PAGE_ID");
    const IG_ID = Deno.env.get("META_IG_BUSINESS_ACCOUNT_ID");
    if (!TOKEN || !PAGE_ID) return json({ error: "Meta credentials not configured" }, 500);

    // Service role client for logging (RLS-safe).
    const svc = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: logRow } = await svc
      .from("social_posts")
      .insert({
        caption: body.caption,
        image_url: body.imageUrl ?? null,
        channels: body.channels,
        status: "publishing",
        created_by: userId,
      })
      .select()
      .single();
    const logId = logRow?.id;

    const result: Record<string, unknown> = {};
    let anyFail = false;
    const errors: string[] = [];

    // FACEBOOK
    if (body.channels.includes("facebook")) {
      try {
        const endpoint = body.imageUrl
          ? `${GRAPH}/${PAGE_ID}/photos`
          : `${GRAPH}/${PAGE_ID}/feed`;
        const params = new URLSearchParams({ access_token: TOKEN });
        if (body.imageUrl) {
          params.set("url", body.imageUrl);
          params.set("caption", body.caption);
        } else {
          params.set("message", body.caption);
        }
        const r = await fetch(`${endpoint}?${params}`, { method: "POST" });
        const data = await r.json();
        if (!r.ok) throw new Error(data?.error?.message ?? `FB ${r.status}`);
        const postId = data.post_id ?? data.id;
        result.facebook = { postId, url: `https://facebook.com/${postId}` };
      } catch (e) {
        anyFail = true;
        errors.push(`Facebook: ${(e as Error).message}`);
      }
    }

    // INSTAGRAM (2-step: create container → publish)
    if (body.channels.includes("instagram")) {
      try {
        if (!IG_ID) throw new Error("META_IG_BUSINESS_ACCOUNT_ID missing");
        const containerParams = new URLSearchParams({
          image_url: body.imageUrl!,
          caption: body.caption,
          access_token: TOKEN,
        });
        const cRes = await fetch(`${GRAPH}/${IG_ID}/media?${containerParams}`, { method: "POST" });
        const cData = await cRes.json();
        if (!cRes.ok) throw new Error(cData?.error?.message ?? "IG container failed");

        const pubParams = new URLSearchParams({
          creation_id: cData.id,
          access_token: TOKEN,
        });
        const pRes = await fetch(`${GRAPH}/${IG_ID}/media_publish?${pubParams}`, { method: "POST" });
        const pData = await pRes.json();
        if (!pRes.ok) throw new Error(pData?.error?.message ?? "IG publish failed");

        // Fetch permalink
        const pl = await fetch(
          `${GRAPH}/${pData.id}?fields=permalink&access_token=${TOKEN}`,
        ).then((r) => r.json());
        result.instagram = { postId: pData.id, url: pl?.permalink ?? null };
      } catch (e) {
        anyFail = true;
        errors.push(`Instagram: ${(e as Error).message}`);
      }
    }

    const fb = (result.facebook as { postId?: string; url?: string }) ?? {};
    const ig = (result.instagram as { postId?: string; url?: string }) ?? {};

    if (logId) {
      await svc
        .from("social_posts")
        .update({
          status: anyFail ? (Object.keys(result).length ? "partial" : "failed") : "success",
          fb_post_id: fb.postId ?? null,
          fb_post_url: fb.url ?? null,
          ig_post_id: ig.postId ?? null,
          ig_post_url: ig.url ?? null,
          error: errors.length ? errors.join(" | ") : null,
        })
        .eq("id", logId);
    }

    return json({ ok: !anyFail, result, errors });
  } catch (e) {
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
