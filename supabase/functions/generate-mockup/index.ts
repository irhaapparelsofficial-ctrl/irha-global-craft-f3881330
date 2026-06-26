// B2B Custom Lab — generates Front + Back mockups via Lovable AI (Gemini image)
// and caches them in the private `mockup-cache` storage bucket. No JWT required.
// Graceful fallback: if Gemini fails for a view, returns the base image with a
// `fallback: true` flag so the UI can show a "Back preview pending" watermark.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "mockup-cache";
const MODEL = "google/gemini-3.1-flash-image";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";
const PUBLISHED_ORIGIN = "https://www.irhaapparels.com";
const PER_CALL_TIMEOUT_MS = 25_000;
const HEAL_TIMEOUT_MS = 55_000;
const HEAL_MAX_ATTEMPTS = 3;
const HEAL_BACKOFF_MS = 1_500;

// Track in-flight self-heal jobs to avoid duplicate background work for the
// same cache key during a single isolate's lifetime.
const healingInFlight = new Set<string>();

interface Body {
  productId: string;
  productName: string;
  color: { label: string; hex: string };
  placement: "left-chest" | "center-back" | "right-sleeve";
  presetId: string;
  presetLabel: string;
  logoBase64?: string | null;
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

function resolveImageUrl(raw: string, originHeader: string | null): string {
  if (/^https?:\/\//i.test(raw)) return raw;
  const origin = originHeader && /^https?:\/\//i.test(originHeader)
    ? originHeader.replace(/\/$/, "")
    : PUBLISHED_ORIGIN;
  return raw.startsWith("/") ? `${origin}${raw}` : `${origin}/${raw}`;
}

async function fetchAsBytes(url: string): Promise<{ bytes: Uint8Array; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch base image ${url}: ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  return { bytes: new Uint8Array(await res.arrayBuffer()), contentType: ct };
}

function buildPrompt(b: Body & { productName: string }, view: "front" | "back"): string {
  const placement = view === "back"
    ? "centered on the upper back"
    : b.placement === "left-chest" ? "on the left chest"
    : b.placement === "right-sleeve" ? "on the right sleeve"
    : "centered on the upper back";
  const logo = b.logoBase64
    ? `Apply the provided customer logo ${placement}, embroidered with a clean ${b.presetLabel} treatment, scaled appropriately, no distortion.`
    : `Add a tasteful "${b.presetLabel}" embroidery motif ${placement}.`;
  const viewInstr = view === "front"
    ? "Show a clean front view of the garment on a neutral studio background, no model, e-commerce flat-lay style."
    : "Show a clean back view of the same garment on a neutral studio background, no model, matching lighting and material.";
  return [
    `Photoreal B2B product mockup of: ${b.productName}.`,
    `Recolor the entire base garment to ${b.color.label} (${b.color.hex}) while preserving material texture, stitching, and shadows.`,
    logo,
    viewInstr,
    "High resolution, sharp, realistic fabric, no text watermarks.",
  ].join(" ");
}

async function generateView(
  baseDataUrl: string,
  logoDataUrl: string | null,
  prompt: string,
  apiKey: string,
): Promise<Uint8Array> {
  const content: any[] = [
    { type: "text", text: prompt },
    { type: "image_url", image_url: { url: baseDataUrl } },
  ];
  if (logoDataUrl) content.push({ type: "image_url", image_url: { url: logoDataUrl } });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PER_CALL_TIMEOUT_MS);
  let res: Response;
  try {
    res = await fetch(GATEWAY, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: "user", content }],
        modalities: ["image", "text"],
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gateway ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  let b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) {
    const msg = json?.choices?.[0]?.message;
    const images = msg?.images;
    if (Array.isArray(images) && images[0]?.image_url?.url) {
      const url: string = images[0].image_url.url;
      b64 = url.startsWith("data:") ? url.split(",")[1] : url;
    }
  }
  if (!b64) throw new Error(`No image in response: ${JSON.stringify(json).slice(0, 300)}`);
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const body = (await req.json()) as Body;
    if (!body?.productId || !body?.color?.hex) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: prod, error: pErr } = await supabase
      .from("products")
      .select("id, name, image_url")
      .eq("id", body.productId)
      .maybeSingle();
    if (pErr) throw pErr;
    if (!prod?.image_url) {
      return new Response(JSON.stringify({ error: "Product image not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") || req.headers.get("referer");
    const absoluteImageUrl = resolveImageUrl(prod.image_url, origin);

    const logoHash = body.logoBase64 ? (await sha256(body.logoBase64)).slice(0, 16) : "nologo";
    const cacheKey = await sha256(
      [prod.id, body.color.hex, body.placement, body.presetId, logoHash].join("|"),
    );
    const paths = { front: `${cacheKey}/front.png`, back: `${cacheKey}/back.png` };

    const signUrls = async () => {
      const [f, b] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(paths.front, 60 * 60 * 24 * 7),
        supabase.storage.from(BUCKET).createSignedUrl(paths.back, 60 * 60 * 24 * 7),
      ]);
      return { frontUrl: f.data?.signedUrl, backUrl: b.data?.signedUrl };
    };

    // Cache hit?
    const existing = await supabase.storage.from(BUCKET).list(cacheKey);
    const names = (existing.data ?? []).map((f) => f.name);
    if (names.includes("front.png") && names.includes("back.png")) {
      const signed = await signUrls();
      if (signed.frontUrl && signed.backUrl) {
        return new Response(JSON.stringify({ ...signed, cached: true, fallback: false }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build inputs
    const { bytes: baseBytes, contentType: baseCt } = await fetchAsBytes(absoluteImageUrl);
    const baseDataUrl = `data:${baseCt};base64,${bytesToBase64(baseBytes)}`;
    const logoDataUrl = body.logoBase64
      ? (body.logoBase64.startsWith("data:") ? body.logoBase64 : `data:image/png;base64,${body.logoBase64}`)
      : null;

    // Generate each view independently; fallback to base bytes per view on failure.
    const enriched = { ...body, productName: prod.name };
    const [frontResult, backResult] = await Promise.allSettled([
      generateView(baseDataUrl, logoDataUrl, buildPrompt(enriched, "front"), apiKey),
      generateView(baseDataUrl, logoDataUrl, buildPrompt(enriched, "back"), apiKey),
    ]);

    let frontFallback = false;
    let backFallback = false;
    let frontBytes: Uint8Array;
    let backBytes: Uint8Array;

    if (frontResult.status === "fulfilled") {
      frontBytes = frontResult.value;
    } else {
      console.warn("front generation failed, using base:", frontResult.reason);
      frontBytes = baseBytes;
      frontFallback = true;
    }
    if (backResult.status === "fulfilled") {
      backBytes = backResult.value;
    } else {
      console.warn("back generation failed, using base:", backResult.reason);
      backBytes = baseBytes;
      backFallback = true;
    }

    const fallback = frontFallback || backFallback;

    // Cache only fully successful results so we retry next time on partial failures
    if (!fallback) {
      await Promise.all([
        supabase.storage.from(BUCKET).upload(paths.front, frontBytes, {
          contentType: "image/png", upsert: true,
        }),
        supabase.storage.from(BUCKET).upload(paths.back, backBytes, {
          contentType: "image/png", upsert: true,
        }),
      ]);
      const signed = await signUrls();
      return new Response(JSON.stringify({ ...signed, cached: false, fallback: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Partial/total failure → return inline data URLs so the UI shows the base
    // image immediately with a watermark badge; nothing is cached.
    const inline = (bytes: Uint8Array, ct: string) => `data:${ct};base64,${bytesToBase64(bytes)}`;
    return new Response(
      JSON.stringify({
        frontUrl: frontFallback ? inline(baseBytes, baseCt) : inline(frontBytes, "image/png"),
        backUrl: backFallback ? inline(baseBytes, baseCt) : inline(backBytes, "image/png"),
        cached: false,
        fallback: true,
        fallbackViews: { front: frontFallback, back: backFallback },
        message: "AI back-preview pending — showing base reference",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-mockup error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
