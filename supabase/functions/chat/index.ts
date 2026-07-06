// Irha Guide — website assistant. AI is optional because the frontend has a
// deterministic backup mode for products and manufacturing questions.
import { createClient } from "npm:@supabase/supabase-js@2";

const securityHeaders = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Max-Age": "86400",
  ...securityHeaders,
};

const WHATSAPP = "+92 320 411 0066";
const WA_LINK = "https://wa.me/923204110066";

const BASE_PROMPT = `You are "Irha Guide", the official website assistant for Irha Apparels, a B2B custom apparel manufacturer based in Sialkot, Pakistan.

LANGUAGE POLICY:
- Reply only in English or German.
- Mirror the language used by the visitor.
- If the visitor writes in another language, politely offer English or German.

SCOPE:
- Published products and categories.
- Bavarian & Trachten Wear.
- Premium Leather Apparel.
- Sportswear.
- Streetwear & Activewear.
- Leisure & Nightwear.
- OEM, ODM, private label, sampling, materials, construction, branding, packaging, requirement review and live video calls.
- Only use facts from the injected CATALOG DATA or the verified rules below.

COMMERCIAL SAFETY — STRICT:
- Never invent or estimate price, sample fee, shipping cost, MOQ, production timing or delivery timing.
- Never promise a response deadline.
- Never claim a certification, audit, export market, shipping method or document unless it is explicitly verified in CATALOG DATA.
- For price or quotation questions, explain that pricing is confirmed after review of product, material, quantity, branding, packaging and delivery requirements.
- Direct visitors to the inquiry form or WhatsApp ${WHATSAPP} (${WA_LINK}) for formal commercial review.

STYLE:
- Concise, warm and professional.
- Give a useful next step.
- Never negotiate, decide discounts or issue a final quotation.

VERIFIED FACTS:
- Irha Apparels is based in Sialkot, Pakistan.
- The website is B2B and request-a-quote based.
- A live video view of the manufacturing environment can be requested during requirement discussion.
- Contact: WhatsApp ${WHATSAPP} · irhaapparelsofficial@gmail.com · irhaapparels.com
`;

async function buildCatalogSummary(): Promise<string> {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const [cats, prods] = await Promise.all([
      supabase.from("categories").select("slug, name, short").eq("is_published", true).order("sort_order"),
      supabase.from("products").select("name, slug, category_id, categories!inner(slug, name)").eq("is_published", true).order("sort_order").limit(200),
    ]);

    const catLines = (cats.data ?? [])
      .map((c: any) => `- ${c.name} (/products/${c.slug})${c.short ? ` — ${c.short}` : ""}`)
      .join("\n");

    const grouped = new Map<string, string[]>();
    for (const p of (prods.data ?? []) as any[]) {
      const key = p.categories?.name ?? "Other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(p.name);
    }

    const prodLines = Array.from(grouped.entries())
      .map(([cat, names]) => `• ${cat}: ${names.slice(0, 12).join(", ")}${names.length > 12 ? ` …(+${names.length - 12} more)` : ""}`)
      .join("\n");

    return `\nCATALOG DATA (live from database — only reference these facts):\n\nCATEGORIES:\n${catLines}\n\nPRODUCTS BY CATEGORY:\n${prodLines}\n`;
  } catch (e) {
    console.warn("catalog summary failed", e);
    return "";
  }
}

let cachedCatalog: { value: string; expires: number } | null = null;
async function getCatalog(): Promise<string> {
  const now = Date.now();
  if (cachedCatalog && cachedCatalog.expires > now) return cachedCatalog.value;
  const value = await buildCatalogSummary();
  cachedCatalog = { value, expires: now + 10 * 60 * 1000 };
  return value;
}

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 20;
const ipHits = new Map<string, { count: number; reset: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);
  if (!entry || entry.reset < now) {
    ipHits.set(ip, { count: 1, reset: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "guide_unavailable" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";

    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "guide_busy" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages_required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = (messages as Array<{ role?: unknown; content?: unknown }>)
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, 2000) }))
      .slice(-20);

    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "invalid_messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = BASE_PROMPT + (await getCatalog());
    const upstream = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Lovable-API-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        stream: true,
        messages: [
          { role: "system", content: systemPrompt },
          ...safeMessages,
        ],
      }),
    });

    if (!upstream.ok) {
      const text = await upstream.text();
      console.error("Gateway error", upstream.status, text);
      const status = upstream.status === 429 ? 429 : 503;
      return new Response(JSON.stringify({ error: "guide_unavailable" }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("chat fn error", e);
    return new Response(JSON.stringify({ error: "guide_unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
