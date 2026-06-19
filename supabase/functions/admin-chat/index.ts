// Admin-only Gemini assistant for Irha Apparels dashboard.
// Streams via Lovable AI Gateway. Requires authenticated admin user.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SYSTEM_PROMPT = `You are "Irha Atelier AI" — a private business assistant for the OWNER of Irha Apparels (a premium clothing manufacturer in Sialkot, Pakistan).

You help the owner with:
- Marketing copy, captions, hashtags for Facebook/Instagram
- Product descriptions, spec sheet copy, catalogue text
- Buyer outreach emails, B2B inquiry replies, negotiation drafts
- Business strategy, market research summaries, competitor notes
- Operations: lead time planning, MOQ logic, packaging ideas
- Translations (English, Urdu, Roman Urdu, German)
- Quick brainstorming and content ideas

CONTEXT — Irha Apparels:
- Categories: Bavarian Wear, Sportswear, Leatherwear, Streetwear, Leisurewear, Nightwear, Business Suits.
- Services: OEM, ODM, Private Label, custom embroidery, sublimation, sampling.
- Markets: Germany, Austria, USA, UAE, EU.
- Contact: WhatsApp +92 320 411 0066, email irhaapparelsofficial@gmail.com, irhaapparels.com.

STYLE:
- Reply in the same language the owner writes in. Default English.
- Be concise, direct, practical. Use bullet points and short paragraphs.
- When drafting customer-facing copy, follow the public no-pricing policy (never quote prices; always direct buyers to share tech-pack for custom quote).
- For internal owner-only analysis, you CAN discuss costs, margins, and pricing strategy candidly.
- Always offer a clear next action.`;

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

    // Verify caller is an authenticated admin.
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
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
      .filter(
        (m) =>
          m &&
          typeof m.content === "string" &&
          (m.role === "user" || m.role === "assistant"),
      )
      .map((m) => ({
        role: m.role as "user" | "assistant",
        content: (m.content as string).slice(0, 8000),
      }))
      .slice(-30);

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
          ? "Rate limit reached. Try again in a moment."
          : upstream.status === 402
            ? "AI credits exhausted. Add credits in workspace billing."
            : "AI service error.";
      console.error("admin-chat gateway error", upstream.status, text);
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
    console.error("admin-chat fn error", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
