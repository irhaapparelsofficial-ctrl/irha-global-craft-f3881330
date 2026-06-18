// Irha Apparels AI assistant — streaming chat via Lovable AI Gateway
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

const SYSTEM_PROMPT = `You are "Irha Assistant", the friendly AI sales concierge for Irha Apparels — a premium clothing manufacturer based in Sialkot, Pakistan.

ABOUT IRHA APPARELS:
- Manufacturer and exporter of premium apparel since years; serves boutiques, brands, and retailers worldwide (Germany, Austria, USA, UAE, EU).
- Six core categories: Bavarian Wear (Lederhosen, Dirndl, Trachten), Sportswear (jerseys, tracksuits, compression, basketball kits), Leatherwear (biker jackets, napa moto, leather trousers, bombers), Streetwear (heavyweight hoodies, boxy tees, cargos, varsity jackets), Leisurewear (cashmere lounge, organic cotton sets, bamboo, knit co-ords), Nightwear (mulberry silk pajamas, modal slips, brushed cotton pajamas, satin robes).
- Services: OEM, ODM, Private Label, custom design, embroidery, sublimation, full sampling.
- Typical MOQ: 30–100 pieces per design/color depending on category.
- Lead times: 25–70 days depending on product (sportswear fastest, leather and varsity slowest).
- Certifications: OEKO-TEX 100, GOTS (organic cotton), LWG (leather), BCI, REACH.
- Packaging: Branded poly bags, gift boxes, hangtags, woven labels — fully customizable.
- Shipping: FOB Karachi or DDP options via sea / air.

CONTACT:
- WhatsApp / Phone: +92 320 411 0066
- Email: irhaapparelsofficial@gmail.com
- Website: irhaapparels.com

STYLE:
- Reply in the same language the user writes in (English, Urdu, Roman Urdu, German). Default to English.
- Be concise, warm, professional. Use short paragraphs and bullet points.
- Always offer next steps: request a quote, share tech-pack, schedule a sample.
- When asked about pricing, explain pricing depends on fabric/quantity/customization and invite them to send specs via the Inquiry form or WhatsApp +92 320 411 0066.
- Never invent certifications, factory size numbers, or claims you weren't given.
- If a question is outside apparel manufacturing, politely steer back.`;

// Simple in-memory per-IP rate limit (per isolate). Best-effort abuse mitigation
// for a public, unauthenticated chat widget.
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

    // Sanitize: only allow user/assistant roles, cap content length, cap history depth.
    const safeMessages = (messages as Array<{ role?: unknown; content?: unknown }>)
      .filter(
        (m) =>
          m &&
          typeof m.content === "string" &&
          (m.role === "user" || m.role === "assistant"),
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: (m.content as string).slice(0, 2000),
      }))
      .slice(-20);

    if (safeMessages.length === 0) {
      return new Response(JSON.stringify({ error: "Invalid messages" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
          { role: "system", content: SYSTEM_PROMPT },
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
            ? "AI credits exhausted. Please contact us on WhatsApp +92 320 411 0066."
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
