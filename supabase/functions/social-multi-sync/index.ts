// social-multi-sync — Attempts product delivery to selected social channels.
// LinkedIn via Lovable Connector Gateway.
// TikTok currently verifies the connected profile only; it does not publish without a video asset flow.
// Facebook & Instagram via Meta Graph API.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Body {
  productId: string;
  channels: Array<"facebook" | "instagram" | "linkedin" | "tiktok">;
}

type ChannelResult = Record<string, unknown>;

const PUBLIC_BASE = "https://www.irhaapparels.com";
const GATEWAY = "https://connector-gateway.lovable.dev";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  // ── Admin gate ──────────────────────────────────────────
  const token = (req.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return json({ error: "Unauthorized" }, 401);
  const authClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );
  const { data: ud } = await authClient.auth.getUser();
  if (!ud?.user) return json({ error: "Unauthorized" }, 401);
  const { data: roleRow } = await authClient.from("user_roles")
    .select("role").eq("user_id", ud.user.id).eq("role", "admin").maybeSingle();
  if (!roleRow) return json({ error: "Forbidden — admin only" }, 403);

  let body: Body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }
  if (!body?.productId || !Array.isArray(body?.channels) || body.channels.length === 0) {
    return json({ error: "productId and channels[] required" }, 400);
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: product, error } = await supabase
    .from("products")
    .select("id,name,slug,description,image_url,category_id")
    .eq("id", body.productId)
    .maybeSingle();

  if (error || !product) {
    return json({ error: "Product not found", details: error?.message }, 404);
  }

  const { data: category } = await supabase
    .from("categories")
    .select("slug,name")
    .eq("id", product.category_id)
    .maybeSingle();

  const productUrl = `${PUBLIC_BASE}/products/${category?.slug ?? "uncategorised"}/${product.slug}`;
  const imageUrl = product.image_url?.startsWith("http")
    ? product.image_url
    : `${PUBLIC_BASE}${product.image_url ?? ""}`;
  const caption = `${product.name}\n\n${product.description ?? ""}\n\nFactory direct from Sialkot · ${productUrl}\n#ApparelManufacturer #B2BExports #IrhaApparels`;

  const results: Record<string, ChannelResult> = {};
  const lovableKey = Deno.env.get("LOVABLE_API_KEY");

  // ── LinkedIn (connector gateway) ──────────────────────────────
  if (body.channels.includes("linkedin")) {
    const linkedinKey = Deno.env.get("LINKEDIN_API_KEY");
    if (!linkedinKey || !lovableKey) {
      results.linkedin = { skipped: "LINKEDIN_API_KEY missing — link LinkedIn connector in Workspace Settings" };
    } else {
      try {
        const orgUrn = Deno.env.get("LINKEDIN_ORG_URN");
        let author = orgUrn;
        if (!author) {
          const me = await fetch(`${GATEWAY}/linkedin/v2/userinfo`, {
            headers: {
              Authorization: `Bearer ${lovableKey}`,
              "X-Connection-Api-Key": linkedinKey,
            },
          });
          const meJson = await me.json();
          author = meJson?.sub ? `urn:li:person:${meJson.sub}` : undefined;
        }
        if (!author) throw new Error("Unable to resolve LinkedIn author URN");

        const post = await fetch(`${GATEWAY}/linkedin/v2/ugcPosts`, {
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
            specificContent: {
              "com.linkedin.ugc.ShareContent": {
                shareCommentary: { text: caption },
                shareMediaCategory: "ARTICLE",
                media: [
                  {
                    status: "READY",
                    originalUrl: productUrl,
                    title: { text: product.name },
                    description: { text: product.description ?? "" },
                  },
                ],
              },
            },
            visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
          }),
        });
        results.linkedin = { status: post.status, body: await safeJson(post) };
      } catch (e) {
        results.linkedin = { error: (e as Error).message };
      }
    }
  }

  // ── TikTok (profile verification only) ────────────────────────
  if (body.channels.includes("tiktok")) {
    const tiktokKey = Deno.env.get("TIKTOK_API_KEY");
    if (!tiktokKey || !lovableKey) {
      results.tiktok = { skipped: "TIKTOK_API_KEY missing — link TikTok connector in Workspace Settings" };
    } else {
      try {
        const r = await fetch(`${GATEWAY}/tiktok/user/info/?fields=open_id,display_name`, {
          headers: { Authorization: `Bearer ${lovableKey}`, "X-Connection-Api-Key": tiktokKey },
        });
        results.tiktok = {
          verified: r.ok,
          status: r.status,
          note: "TikTok publishing is not implemented here; this action only verifies the connected profile.",
          profile: await safeJson(r),
        };
      } catch (e) {
        results.tiktok = { error: (e as Error).message };
      }
    }
  }

  // ── Meta Graph (Facebook + Instagram) ─────────────────────────
  const metaToken = Deno.env.get("META_ACCESS_TOKEN");
  if (body.channels.includes("facebook")) {
    const pageId = Deno.env.get("META_PAGE_ID");
    if (!metaToken || !pageId) {
      results.facebook = { skipped: "META_ACCESS_TOKEN / META_PAGE_ID secret missing" };
    } else {
      try {
        const r = await fetch(`https://graph.facebook.com/v19.0/${pageId}/feed`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: caption, link: productUrl, access_token: metaToken }),
        });
        results.facebook = { status: r.status, body: await safeJson(r) };
      } catch (e) {
        results.facebook = { error: (e as Error).message };
      }
    }
  }

  if (body.channels.includes("instagram")) {
    const igId = Deno.env.get("IG_ACCOUNT_ID");
    if (!metaToken || !igId || !imageUrl) {
      results.instagram = { skipped: "IG_ACCOUNT_ID / META_ACCESS_TOKEN missing or product has no image" };
    } else {
      try {
        const create = await fetch(`https://graph.facebook.com/v19.0/${igId}/media`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image_url: imageUrl, caption, access_token: metaToken }),
        });
        const createBody = await create.json();
        if (!createBody?.id) throw new Error(JSON.stringify(createBody));
        const publish = await fetch(`https://graph.facebook.com/v19.0/${igId}/media_publish`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ creation_id: createBody.id, access_token: metaToken }),
        });
        results.instagram = { status: publish.status, body: await safeJson(publish) };
      } catch (e) {
        results.instagram = { error: (e as Error).message };
      }
    }
  }

  const summary = summarizeResults(results);
  const success = summary.published.length > 0 && summary.failed.length === 0 && summary.skipped.length === 0;
  const partial = summary.published.length > 0 && !success;

  return json({
    success,
    partial,
    product: { url: productUrl, name: product.name },
    summary,
    results,
  }, 200);
});

function summarizeResults(results: Record<string, ChannelResult>) {
  const published: string[] = [];
  const verified: string[] = [];
  const skipped: string[] = [];
  const failed: string[] = [];

  for (const [channel, result] of Object.entries(results)) {
    if (typeof result.error === "string") {
      failed.push(channel);
      continue;
    }
    if (typeof result.skipped === "string") {
      skipped.push(channel);
      continue;
    }
    if (channel === "tiktok") {
      if (result.verified === true) verified.push(channel);
      else failed.push(channel);
      continue;
    }
    if (typeof result.status === "number" && result.status >= 200 && result.status < 300) {
      published.push(channel);
    } else {
      failed.push(channel);
    }
  }

  return { published, verified, skipped, failed };
}

function json(payload: unknown, status: number) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function safeJson(r: Response) {
  const text = await r.text();
  try {
    return JSON.parse(text);
  } catch {
    return text.slice(0, 500);
  }
}