// Irha Guide — public B2B website assistant.
// Uses Google Gemini free tier when configured and a deterministic local backup otherwise.
// Buyer and assistant messages are persisted server-side so public RLS never needs INSERT access.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://irhaapparels.com";
const GEMINI_MODEL = "gemini-3.1-flash-lite";
const WHATSAPP = "+92 320 411 0066";
const WA_LINK = "https://wa.me/923204110066";
const MAX_BODY_BYTES = 24_000;
const MAX_MESSAGE_CHARS = 2_000;

const securityHeaders = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
};

function isAllowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && url.hostname !== "localhost" && url.hostname !== "127.0.0.1") return false;
    return url.hostname === "irhaapparels.com" ||
      url.hostname === "www.irhaapparels.com" ||
      url.hostname === "localhost" ||
      url.hostname === "127.0.0.1" ||
      url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

function corsHeaders(origin: string | null) {
  const allowedOrigin = origin && isAllowedOrigin(origin) ? origin : SITE_URL;
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...securityHeaders,
  };
}

function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

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

let serviceClient: ReturnType<typeof createClient> | null = null;
function service() {
  if (!serviceClient) {
    serviceClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return serviceClient;
}

async function buildCatalogSummary(): Promise<string> {
  try {
    const supabase = service();
    const [cats, prods] = await Promise.all([
      supabase.from("categories").select("slug, name, short").eq("is_published", true).order("sort_order"),
      supabase.from("products").select("name, slug, category_id, categories!inner(slug, name)").eq("is_published", true).order("sort_order").limit(250),
    ]);

    const catLines = (cats.data ?? [])
      .map((category: any) => `- ${category.name} (/products/${category.slug})${category.short ? ` — ${category.short}` : ""}`)
      .join("\n");

    const grouped = new Map<string, string[]>();
    for (const product of (prods.data ?? []) as any[]) {
      const key = product.categories?.name ?? "Other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(product.name);
    }

    const prodLines = Array.from(grouped.entries())
      .map(([category, names]) => `• ${category}: ${names.slice(0, 14).join(", ")}${names.length > 14 ? ` …(+${names.length - 14} more)` : ""}`)
      .join("\n");

    return `\nCATALOG DATA (live from database — only reference these facts):\n\nCATEGORIES:\n${catLines}\n\nPRODUCTS BY CATEGORY:\n${prodLines}\n`;
  } catch (error) {
    console.warn("catalog summary failed", error);
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
const RATE_LIMIT_MAX = 8;
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

function redactForExternalAi(value: string): string {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone removed]")
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .slice(0, MAX_MESSAGE_CHARS);
}

function toGeminiContents(messages: Array<{ role: "user" | "assistant"; content: string }>) {
  return messages.slice(-8).map((message) => ({
    role: message.role === "assistant" ? "model" : "user",
    parts: [{ text: redactForExternalAi(message.content) }],
  }));
}

function extractGeminiText(payload: any): string {
  const parts = payload?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return "";
  return parts
    .map((part: any) => (typeof part?.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("")
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
}

const GERMAN_HINTS = /[äöüß]|\b(wie|welche|preis|kosten|muster|lieferung|fertigung|habt|können|kollektionen)\b/i;

function fallbackReply(text: string): string {
  const query = text.toLowerCase();
  const german = GERMAN_HINTS.test(text);

  if (/(price|cost|quote|rate|how much|preis|kosten|angebot|stückpreis)/i.test(query)) {
    return german
      ? "Preise werden erst nach Prüfung von Produkt, Material, Menge, Branding, Verpackung und Lieferanforderungen bestätigt. Nutzen Sie bitte die Anfrage oder WhatsApp für ein formelles Angebot."
      : "Pricing is confirmed only after review of the product, material, quantity, branding, packaging and delivery requirements. Please use the inquiry form or WhatsApp for a formal quotation.";
  }
  if (/(moq|minimum|mindestmenge)/i.test(query)) {
    return german
      ? "Die Mindestmenge wird je Produktprogramm nach Prüfung von Material, Konstruktion, Branding und Größen-/Farbmix bestätigt."
      : "MOQ is confirmed per product program after review of material, construction, branding and the size or color mix.";
  }
  if (/(sample|sampling|muster)/i.test(query)) {
    return german
      ? "Der Musterprozess richtet sich nach Produkt, Material, Schnittentwicklung, Branding und möglichen Revisionen. Senden Sie eine Skizze, ein Tech-Pack oder ein Referenzbild für die Prüfung."
      : "The sampling path depends on the product, materials, pattern development, branding and possible revisions. Send a sketch, tech pack or reference image for review.";
  }
  if (/(lederhosen|trachten|bavarian|oktoberfest)/i.test(query)) {
    return german
      ? "Wir zeigen kundenspezifische Programme für Lederhosen, Dirndl und Trachten. Öffnen Sie die Kategorie Bavarian & Trachten Wear oder senden Sie Ihre Referenz für eine Prüfung."
      : "We present custom Lederhosen, Dirndl and Trachten programs. Browse Bavarian & Trachten Wear or send your reference for requirement review.";
  }
  if (/(dirndl|blouse|apron|schürze)/i.test(query)) {
    return german
      ? "Dirndl-Programme können Stoff, Mieder, Schürze, Bluse, Verzierungen, Labels und Verpackung umfassen. Die umsetzbare Kombination wird pro Anfrage geprüft."
      : "Dirndl programs can cover fabric, bodice, apron, blouse, decoration, labels and packaging. The workable combination is reviewed per requirement.";
  }
  if (/(leather|jacket|leder)/i.test(query)) {
    return german
      ? "Wir besprechen kundenspezifische Lederbekleidung wie Jacken und Westen. Lederart, Konstruktion, Futter, Beschläge und Branding werden vor dem Angebot geprüft."
      : "We discuss custom leather apparel such as jackets and vests. Leather type, construction, lining, hardware and branding are reviewed before quotation.";
  }
  if (/(sportswear|teamwear|jersey|kit|football|soccer|basketball)/i.test(query)) {
    return german
      ? "Sportswear- und Teamwear-Programme werden nach Stoff, Konstruktion, Druck, Stickerei, Größen und Branding geprüft."
      : "Sportswear and teamwear programs are reviewed around fabric, construction, printing, embroidery, sizing and branding requirements.";
  }
  if (/(streetwear|activewear|hoodie|tracksuit|gym|nightwear|leisure|sleepwear)/i.test(query)) {
    return german
      ? "Wir zeigen Programme für Streetwear, Activewear sowie Leisure- und Nightwear. Senden Sie Ihr Produktbriefing oder eine Referenz für die passende Kategorie."
      : "We present Streetwear, Activewear, Leisurewear and Nightwear programs. Send your product brief or reference so the right category can be reviewed.";
  }
  if (/(factory|video call|visit|manufacturing environment|fabrik|videoanruf)/i.test(query)) {
    return german
      ? "Eine Live-Videoansicht der Fertigungsumgebung kann während der Anforderungsbesprechung angefragt werden."
      : "A live video view of the manufacturing environment can be requested during the requirement discussion.";
  }
  if (/(category|categories|range|products|kollektion|kollektionen|produkte)/i.test(query)) {
    return german
      ? "Unsere Hauptprogramme umfassen Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear sowie Leisure & Nightwear."
      : "Our main programs include Bavarian & Trachten Wear, Premium Leather Apparel, Sportswear, Streetwear & Activewear, and Leisure & Nightwear.";
  }

  return german
    ? "Ich kann Ihnen zu Produkten, Kategorien, Mustern, Private Label und dem Fertigungsprozess helfen. Für eine genaue Prüfung öffnen Sie die Produkte oder senden Sie eine Anfrage."
    : "I can help with products, categories, sampling, private label and the manufacturing process. For an exact review, browse the products or send an inquiry.";
}

async function resolveSessionId(value: unknown, req: Request) {
  if (typeof value === "string" && /^[A-Za-z0-9:_-]{8,100}$/.test(value)) return value;
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const agent = (req.headers.get("user-agent") || "unknown").slice(0, 300);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${ip}|${agent}`));
  const hex = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `legacy-${hex.slice(0, 32)}`;
}

async function persistExchange(sessionId: string, userMessage: string, assistantMessage: string) {
  try {
    const { error } = await service().from("chat_messages").insert([
      { session_id: sessionId, role: "user", message: userMessage.slice(0, MAX_MESSAGE_CHARS) },
      { session_id: sessionId, role: "assistant", message: assistantMessage.slice(0, MAX_MESSAGE_CHARS) },
    ]);
    if (error) console.error("chat persistence failed", error.message);
  } catch (error) {
    console.error("chat persistence failed", error);
  }
}

async function generateAnswer(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  latestUser: string,
): Promise<{ answer: string; provider: "gemini-free-tier" | "deterministic-backup" }> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) return { answer: fallbackReply(latestUser), provider: "deterministic-backup" };

  try {
    const systemPrompt = BASE_PROMPT + (await getCatalog());
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: toGeminiContents(messages),
          generationConfig: { temperature: 0.3, maxOutputTokens: 500 },
          store: false,
        }),
      },
    );

    if (!upstream.ok) {
      const detail = await upstream.text();
      console.error("Gemini error", upstream.status, detail.slice(0, 600));
      return { answer: fallbackReply(latestUser), provider: "deterministic-backup" };
    }

    const answer = extractGeminiText(await upstream.json());
    if (!answer) return { answer: fallbackReply(latestUser), provider: "deterministic-backup" };
    return { answer, provider: "gemini-free-tier" };
  } catch (error) {
    console.error("Gemini request failed", error);
    return { answer: fallbackReply(latestUser), provider: "deterministic-backup" };
  }
}

function openAiCompatibleSse(
  text: string,
  provider: "gemini-free-tier" | "deterministic-backup",
  headers: Record<string, string>,
): Response {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\n`));
      controller.enqueue(encoder.encode("data: [DONE]\n\n"));
      controller.close();
    },
  });

  return new Response(body, {
    status: 200,
    headers: {
      ...headers,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Irha-AI-Provider": provider,
    },
  });
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403, headers);

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("cf-connecting-ip") ||
    "unknown";
  if (rateLimited(ip)) return json({ error: "guide_busy" }, 429, headers);

  const declaredLength = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413, headers);
  }

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, headers);
    const body = JSON.parse(raw) as { messages?: unknown; sessionId?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: "messages_required" }, 400, headers);
    }

    const safeMessages = (body.messages as Array<{ role?: unknown; content?: unknown }>)
      .filter((message) => message && typeof message.content === "string" && (message.role === "user" || message.role === "assistant"))
      .map((message) => ({
        role: message.role as "user" | "assistant",
        content: (message.content as string).trim().slice(0, MAX_MESSAGE_CHARS),
      }))
      .filter((message) => message.content.length > 0)
      .slice(-8);

    const latestUser = [...safeMessages].reverse().find((message) => message.role === "user")?.content;
    if (!latestUser) return json({ error: "user_message_required" }, 400, headers);

    const sessionId = await resolveSessionId(body.sessionId, req);
    const { answer, provider } = await generateAnswer(safeMessages, latestUser);
    await persistExchange(sessionId, latestUser, answer);

    return openAiCompatibleSse(answer, provider, headers);
  } catch (error) {
    console.error("chat fn error", error);
    return json({ error: "guide_unavailable" }, 503, headers);
  }
});
