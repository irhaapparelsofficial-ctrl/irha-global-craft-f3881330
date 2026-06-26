// Irha Guide — website AI assistant. Streams via Lovable AI Gateway.
// Scope: products, categories, manufacturing/process only.
// Languages: English + German. Pricing questions → redirect to WhatsApp.
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

const BASE_PROMPT = `You are "Irha Guide", the official website assistant for Irha Apparels — a premium B2B clothing manufacturer in Sialkot, Pakistan.

LANGUAGE POLICY (strict):
- Reply ONLY in English or German.
- Mirror the language the user wrote in. If the message is German, answer in German. Otherwise English.
- If the user writes in another language, politely respond in English: "I can help in English or German. / Ich kann auf Englisch oder Deutsch helfen."

SCOPE (strict — do NOT answer outside this):
- Our products and categories (Bavarian Heritage, Leatherwear, Sportswear, Streetwear, Leisurewear, Nightwear).
- Our manufacturing capabilities: OEM/ODM/Private Label, sampling, embroidery, sublimation, fabrics, certifications, MOQ rules, lead times, packaging, shipping (FOB Karachi / DDP).
- The catalog facts injected below under "CATALOG DATA".
- If a question is outside this scope (politics, general advice, recipes, code, competitors, etc.), politely steer back: "I can only help with our products and manufacturing. / Ich kann nur zu unseren Produkten und der Fertigung helfen."

PRICING POLICY (ABSOLUTE — NEVER violate):
- NEVER state, estimate, hint at, or imply any price, per-unit cost, sample fee, FOB rate, shipping cost, or ballpark. No ranges, no "starting from", no currency figures of any kind.
- If the user asks anything price-related (cost, quote, rate, how much, Preis, Kosten, Angebot, Stückpreis), respond ONLY with the bilingual handoff template:

  EN: "Pricing is bespoke and only confirmed via formal quote. Please WhatsApp our sales team on ${WHATSAPP} (${WA_LINK}) with your tech-pack, quantity, fabric and branding details — you'll get a tailored FOB Sialkot quote within 12 hours."
  DE: "Preise sind individuell und werden nur per formellem Angebot bestätigt. Bitte schreiben Sie uns auf WhatsApp ${WHATSAPP} (${WA_LINK}) mit Tech-Pack, Stückzahl, Stoff- und Branding-Wünschen — Sie erhalten Ihr maßgeschneidertes FOB-Sialkot-Angebot innerhalb von 12 Stunden."

  Pick the language matching the user. Do not add numbers, do not negotiate, do not soften.

STYLE:
- Concise, warm, professional. Short paragraphs and bullets.
- Always offer a clear next step (browse a category page, request a sample, send tech-pack via WhatsApp).
- Never invent certifications, factory sizes, or claims not in CATALOG DATA.

KEY FACTS:
- MOQ: from 50 pieces per design (varies by category).
- Lead times: 25–70 days depending on complexity.
- Certifications: OEKO-TEX 100, GOTS, LWG (leather), BCI, REACH.
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
    const catLines = (cats.data ?? []).map((c: any) => `- ${c.name} (/products/${c.slug})${c.short ? ` — ${c.short}` : ""}`).join("\n");
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
  cachedCatalog = { value, expires: now + 10 * 60 * 1000 }; // 10 min
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
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    if (rateLimited(ip)) {
      return new Response(JSON.stringify({ error: "Too many requests. Please try again shortly." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const safeMessages = (messages as Array<{ role?: unknown; content?: unknown }>)
      .filter((m) => m && typeof m.content === "string" && (m.role === "user" || m.role === "assistant"))
      .map((m) => ({ role: m.role as "user" | "assistant", content: (m.content as string).slice(0, 2000) }))
      .slice(-20);

    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
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
      const status = upstream.status === 429 || upstream.status === 402 ? upstream.status : 500;
      const msg =
        upstream.status === 429
          ? "Rate limit reached. Please try again in a moment."
          : upstream.status === 402
            ? `AI credits exhausted. Please contact us on WhatsApp ${WHATSAPP}.`
            : "AI service error.";
      console.error("Gateway error", upstream.status, text);
      return new Response(JSON.stringify({ error: msg }), {
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
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
