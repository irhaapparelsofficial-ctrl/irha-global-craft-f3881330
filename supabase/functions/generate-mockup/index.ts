// B2B Custom Lab — generates Front + Back mockups via Lovable AI (Gemini image)
// and caches them in the private `mockup-cache` storage bucket. No JWT required.
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const BUCKET = "mockup-cache";
const MODEL = "google/gemini-3.1-flash-image";
const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

interface Body {
  productId: string;
  productName: string;
  color: { label: string; hex: string };
  placement: "left-chest" | "center-back" | "right-sleeve";
  presetId: string;
  presetLabel: string;
  logoBase64?: string | null; // data URL or raw base64
}

async function sha256(input: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function fetchAsDataUrl(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch base image: ${res.status}`);
  const ct = res.headers.get("content-type") || "image/jpeg";
  const bytes = new Uint8Array(await res.arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return `data:${ct};base64,${btoa(bin)}`;
}

function buildPrompt(b: Body, view: "front" | "back"): string {
  const placement = view === "back"
    ? "centered on the upper back"
    : b.placement === "left-chest"
      ? "on the left chest"
      : b.placement === "right-sleeve"
        ? "on the right sleeve"
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

  const res = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: "user", content }],
      modalities: ["image", "text"],
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Gateway ${res.status}: ${txt.slice(0, 300)}`);
  }
  const json = await res.json();
  // Lovable Gateway normalises Gemini → OpenAI images shape: data[0].b64_json
  let b64: string | undefined = json?.data?.[0]?.b64_json;
  if (!b64) {
    // Fallback: chat-completions image content
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
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Look up product image
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

    const logoHash = body.logoBase64 ? (await sha256(body.logoBase64)).slice(0, 16) : "nologo";
    const cacheKey = await sha256(
      [prod.id, body.color.hex, body.placement, body.presetId, logoHash].join("|"),
    );

    const paths = { front: `${cacheKey}/front.png`, back: `${cacheKey}/back.png` };

    const signUrls = async () => {
      const f = await supabase.storage.from(BUCKET).createSignedUrl(paths.front, 60 * 60 * 24 * 7);
      const b = await supabase.storage.from(BUCKET).createSignedUrl(paths.back, 60 * 60 * 24 * 7);
      return { frontUrl: f.data?.signedUrl, backUrl: b.data?.signedUrl };
    };

    // Cache hit?
    const existing = await supabase.storage.from(BUCKET).list(cacheKey);
    const names = (existing.data ?? []).map((f) => f.name);
    if (names.includes("front.png") && names.includes("back.png")) {
      const signed = await signUrls();
      if (signed.frontUrl && signed.backUrl) {
        return new Response(JSON.stringify({ ...signed, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // Build inputs once
    const baseDataUrl = await fetchAsDataUrl(prod.image_url);
    const logoDataUrl = body.logoBase64
      ? (body.logoBase64.startsWith("data:") ? body.logoBase64 : `data:image/png;base64,${body.logoBase64}`)
      : null;

    // Generate front + back in parallel
    const [frontBytes, backBytes] = await Promise.all([
      generateView(baseDataUrl, logoDataUrl, buildPrompt({ ...body, productName: prod.name }, "front"), apiKey),
      generateView(baseDataUrl, logoDataUrl, buildPrompt({ ...body, productName: prod.name }, "back"), apiKey),
    ]);

    await Promise.all([
      supabase.storage.from(BUCKET).upload(paths.front, frontBytes, {
        contentType: "image/png", upsert: true,
      }),
      supabase.storage.from(BUCKET).upload(paths.back, backBytes, {
        contentType: "image/png", upsert: true,
      }),
    ]);

    const signed = await signUrls();
    return new Response(JSON.stringify({ ...signed, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("generate-mockup error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
