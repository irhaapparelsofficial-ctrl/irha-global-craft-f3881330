// Irha Guide — public B2B website assistant.
// Provider order: Lovable AI gateway -> Gemini -> conversation-aware verified backup.
import { createClient } from "npm:@supabase/supabase-js@2";

const SITE_URL = "https://irhaapparels.com";
const WHATSAPP = "+92 320 411 0066";
const WA_LINK = "https://wa.me/923204110066";
const MAX_BODY_BYTES = 32_000;
const MAX_MESSAGE_CHARS = 2_000;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

type ChatRole = "user" | "assistant";
type SafeMessage = { role: ChatRole; content: string };
type Provider = "lovable-ai-gateway" | "gemini" | "deterministic-backup";
type PageContext = { path?: string; title?: string };

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

const BASE_PROMPT = `You are "Irha Guide", the official live website assistant for Irha Apparels, an experienced B2B custom apparel manufacturer based in Sialkot, Pakistan.

LANGUAGE:
- Mirror the visitor's language when it is English or German.
- If the visitor writes in another language, politely continue in clear English and mention that German is also available.

YOUR JOB:
- Answer the buyer's exact question using the live catalogue and verified facts.
- Remember the conversation. Resolve words such as "it", "that", "this product", "same design" and "what about price" from previous messages.
- Give the direct answer first. Use short bullets only when they improve clarity.
- Ask no more than one focused follow-up question, and only when information is genuinely missing.
- If the visitor has already supplied product, quantity, target market, material or branding, acknowledge and use those details.
- Never restart with a welcome after the conversation has begun.
- Never repeat an earlier answer or lightly paraphrase the same generic paragraph.
- Do not answer a follow-up as if it were a new conversation.

SUPPORTED TOPICS:
- Published product categories and products.
- Bavarian & Trachten Wear, Lederhosen, Dirndl and accessories.
- Premium Leather Apparel.
- Sportswear and teamwear.
- Streetwear, Activewear, Leisurewear and Nightwear.
- OEM, ODM, private label, sampling, materials, construction, branding, labels, packaging, requirement review and live factory video calls.

COMMERCIAL SAFETY:
- Never invent or estimate price, sample fee, shipping cost, MOQ, production time or delivery time.
- Never promise a response deadline.
- Never claim a certification, audit, export market, shipping method or document unless it appears in live catalogue data.
- Explain that commercial terms are confirmed after review of product, material, quantity, branding, packaging and destination.
- For a formal quotation, direct the buyer to the inquiry form or WhatsApp ${WHATSAPP} (${WA_LINK}).
- Never negotiate discounts or issue a final quotation.

VERIFIED FACTS:
- Irha Apparels is based in Sialkot, Pakistan and serves B2B buyers.
- The company supports custom, OEM, ODM and private-label manufacturing subject to requirement review.
- The website is request-a-quote based; prices are not public.
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
    const [categories, products] = await Promise.all([
      supabase.from("categories").select("slug, name, short").eq("is_published", true).order("sort_order"),
      supabase.from("products")
        .select("name, slug, category_id, categories!inner(slug, name)")
        .eq("is_published", true)
        .order("sort_order")
        .limit(300),
    ]);

    const categoryLines = (categories.data ?? [])
      .map((category: any) => `- ${category.name} (/products/${category.slug})${category.short ? ` — ${category.short}` : ""}`)
      .join("\n");

    const grouped = new Map<string, string[]>();
    for (const product of (products.data ?? []) as any[]) {
      const key = product.categories?.name ?? "Other";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(product.name);
    }

    const productLines = Array.from(grouped.entries())
      .map(([category, names]) => `• ${category}: ${names.slice(0, 20).join(", ")}${names.length > 20 ? ` …(+${names.length - 20} more)` : ""}`)
      .join("\n");

    return `\nLIVE CATALOGUE DATA — reference only these published items:\n\nCATEGORIES:\n${categoryLines}\n\nPRODUCTS BY CATEGORY:\n${productLines}\n`;
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

function externalMessages(messages: SafeMessage[]) {
  return messages.slice(-12).map((message) => ({
    role: message.role,
    content: redactForExternalAi(message.content),
  }));
}

function normalizeWords(value: string) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function isTooSimilar(answer: string, previousAssistantAnswers: string[]) {
  const compactAnswer = answer.trim().toLowerCase().replace(/\s+/g, " ");
  const answerWords = new Set(normalizeWords(answer));
  if (!compactAnswer) return true;

  return previousAssistantAnswers.slice(-4).some((previous) => {
    const compactPrevious = previous.trim().toLowerCase().replace(/\s+/g, " ");
    if (!compactPrevious) return false;
    if (compactAnswer === compactPrevious) return true;
    if (compactAnswer.length > 100 && compactPrevious.length > 100) {
      if (compactAnswer.includes(compactPrevious) || compactPrevious.includes(compactAnswer)) return true;
    }

    const previousWords = new Set(normalizeWords(previous));
    if (answerWords.size < 5 || previousWords.size < 5) return false;
    let intersection = 0;
    answerWords.forEach((word) => {
      if (previousWords.has(word)) intersection += 1;
    });
    const union = new Set([...answerWords, ...previousWords]).size;
    return union > 0 && intersection / union >= 0.78;
  });
}

const GERMAN_HINTS = /[äöüß]|\b(wie|welche|was|preis|kosten|muster|lieferung|fertigung|habt|können|kollektionen|anfrage|kontakt|etikett|stickerei)\b/i;

function isIncompleteFragment(text: string): boolean {
  const compact = text.trim().replace(/[^\p{L}\p{N}]/gu, "");
  return compact.length > 0 && compact.length <= 2;
}

function fallbackReply(text: string, messages: SafeMessage[]): string {
  const query = text.trim();
  const lower = query.toLowerCase();
  const german = GERMAN_HINTS.test(query);
  const previousAssistantAnswers = messages.filter((message) => message.role === "assistant").map((message) => message.content);
  let answer: string;

  if (isIncompleteFragment(query)) {
    answer = german
      ? "Bitte vervollständigen Sie Ihre Frage, damit ich gezielt antworten kann."
      : "Please complete your question so I can answer accurately.";
  } else if (/^(hi|hello|hey|hallo|guten\s*(tag|morgen|abend)|salam|assalam)/i.test(query)) {
    answer = previousAssistantAnswers.length > 0
      ? (german
        ? "Willkommen zurück. Was möchten Sie jetzt klären: Produkt, Muster, Branding, Menge oder Angebot?"
        : "Welcome back. What would you like to clarify now: product, sampling, branding, quantity or quotation?")
      : (german
        ? "Hallo! Welches Produkt oder Fertigungsthema möchten Sie prüfen?"
        : "Hello! Which product or manufacturing topic would you like to review?");
  } else if (/(price|cost|quote|rate|how much|preis|kosten|angebot|stückpreis)/i.test(lower)) {
    answer = german
      ? "Preise werden nach Prüfung von Produkt, Material, Menge, Branding, Verpackung und Lieferziel bestätigt. Nennen Sie Produkt, geschätzte Menge und Zielland."
      : "Pricing is confirmed after reviewing product, material, quantity, branding, packaging and destination. Share the product, estimated quantity and destination country.";
  } else if (/(sample|sampling|prototype|muster)/i.test(lower)) {
    answer = german
      ? "Der Musterweg hängt von Produkt, Material, Schnitt, Branding und Revisionen ab. Haben Sie ein Referenzbild, eine Skizze oder ein Tech-Pack?"
      : "The sampling path depends on product, material, pattern, branding and revisions. Do you have a reference image, sketch or tech pack?";
  } else if (/(private\s*label|white\s*label|oem|odm|own\s*brand|eigene\s*marke|privatmarke)/i.test(lower)) {
    answer = german
      ? "Ja. Private-Label-, OEM- und ODM-Programme können Muster, kundenspezifische Labels, Stickerei oder Druck und Serienfertigung umfassen. Welches Produkt planen Sie?"
      : "Yes. Private-label, OEM and ODM programs can include sampling, custom labels, embroidery or printing, and bulk production. Which product are you planning?";
  } else if (/(moq|minimum|minimum order|mindestmenge)/i.test(lower)) {
    answer = german
      ? "Die Mindestmenge wird je Produktprogramm anhand von Material, Konstruktion, Branding sowie Größen- und Farbmix bestätigt. Um welches Produkt geht es?"
      : "MOQ is confirmed per product program based on material, construction, branding, and the size or color mix. Which product are you considering?";
  } else if (/(lederhosen|trachten|bavarian|oktoberfest|dirndl)/i.test(lower)) {
    answer = german
      ? "Wir zeigen kundenspezifische Programme für Lederhosen, Dirndl und Trachten. Suchen Sie Herren-Lederhosen, Damen-Dirndl oder Accessoires?"
      : "We present custom Lederhosen, Dirndl and Trachten programs. Are you looking for men's Lederhosen, women's Dirndl or accessories?";
  } else if (/(sportswear|teamwear|jersey|football|soccer|basketball|rugby|cricket)/i.test(lower)) {
    answer = german
      ? "Sportswear- und Teamwear-Programme werden nach Stoff, Konstruktion, Druck, Stickerei, Größen und Branding geprüft. Für welche Sportart und Teamgröße?"
      : "Sportswear and teamwear programs are reviewed around fabric, construction, printing, embroidery, sizing and branding. Which sport and approximate team size?";
  } else if (/(label|tag|branding|logo|embroidery|print|dtf|sublimation|etikett|stickerei|druck)/i.test(lower)) {
    answer = german
      ? "Branding kann Weblabels, Pflegeetiketten, Hangtags, Stickerei, DTF oder ein materialgeeignetes Druckverfahren umfassen. Welches Produkt und welche Logo-Größe?"
      : "Branding can include woven labels, care labels, hangtags, embroidery, DTF or a material-suitable print method. Which product and logo size?";
  } else {
    answer = german
      ? "Damit ich gezielt antworte, nennen Sie bitte Produkt, geschätzte Menge und die Entscheidung, bei der Sie Hilfe brauchen."
      : "To answer precisely, share the product, estimated quantity and the decision you need help with.";
  }

  if (!isTooSimilar(answer, previousAssistantAnswers)) return answer;
  return german
    ? "Ich behalte den bisherigen Kontext. Was möchten Sie als Nächstes klären: Material, Branding, Muster, Menge oder formelle Anfrage?"
    : "I have the earlier context. What should we clarify next: material, branding, sample, quantity or the formal inquiry?";
}

function safePageContext(value: unknown): PageContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  return {
    path: typeof input.path === "string" ? input.path.slice(0, 300) : undefined,
    title: typeof input.title === "string" ? input.title.slice(0, 240) : undefined,
  };
}

function conversationInstructions(messages: SafeMessage[], pageContext: PageContext) {
  const previousAssistantAnswers = messages
    .filter((message) => message.role === "assistant")
    .map((message) => redactForExternalAi(message.content))
    .slice(-4);
  const previousBlock = previousAssistantAnswers.length > 0
    ? `\nPREVIOUS ASSISTANT ANSWERS — do not repeat or lightly paraphrase these:\n${previousAssistantAnswers.map((answer, index) => `${index + 1}. ${answer}`).join("\n")}\n`
    : "";
  const pageBlock = pageContext.path || pageContext.title
    ? `\nCURRENT WEBSITE PAGE:\n- Path: ${pageContext.path || "/"}\n- Title: ${pageContext.title || "Irha Apparels"}\nUse this only as navigation context; do not invent page facts.\n`
    : "";
  return `${pageBlock}${previousBlock}\nBefore answering, identify the latest buyer intent and relevant facts already supplied. Respond with new, specific value. If the latest question is a follow-up, connect it explicitly to the earlier topic.`;
}

function extractOpenAiText(payload: any): string {
  const content = payload?.choices?.[0]?.message?.content;
  return typeof content === "string" ? content.trim().slice(0, MAX_MESSAGE_CHARS) : "";
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

async function tryLovable(messages: SafeMessage[], systemPrompt: string): Promise<string> {
  const key = Deno.env.get("LOVABLE_API_KEY");
  if (!key) return "";

  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("IRHA_GUIDE_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.35,
      max_tokens: 650,
      messages: [
        { role: "system", content: systemPrompt },
        ...externalMessages(messages),
      ],
    }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Lovable gateway ${response.status}: ${JSON.stringify(payload).slice(0, 400)}`);
  return extractOpenAiText(payload);
}

async function tryGemini(messages: SafeMessage[], systemPrompt: string): Promise<string> {
  const apiKey = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) return "";

  const model = Deno.env.get("IRHA_GUIDE_GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents: externalMessages(messages).map((message) => ({
          role: message.role === "assistant" ? "model" : "user",
          parts: [{ text: message.content }],
        })),
        generationConfig: { temperature: 0.35, maxOutputTokens: 650 },
      }),
    },
  );

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini ${response.status}: ${JSON.stringify(payload).slice(0, 400)}`);
  return extractGeminiText(payload);
}

async function generateAnswer(messages: SafeMessage[], latestUser: string, pageContext: PageContext): Promise<{ answer: string; provider: Provider }> {
  if (isIncompleteFragment(latestUser)) {
    return { answer: fallbackReply(latestUser, messages), provider: "deterministic-backup" };
  }

  const previousAssistantAnswers = messages.filter((message) => message.role === "assistant").map((message) => message.content);
  const systemPrompt = BASE_PROMPT + (await getCatalog()) + conversationInstructions(messages, pageContext);

  try {
    const answer = await tryLovable(messages, systemPrompt);
    if (answer && !isTooSimilar(answer, previousAssistantAnswers)) {
      return { answer, provider: "lovable-ai-gateway" };
    }
    if (answer) console.warn("Lovable response rejected as repetitive");
  } catch (error) {
    console.error("Lovable AI request failed", error);
  }

  try {
    const repairPrompt = `${systemPrompt}\nThe first provider was unavailable or repetitive. Produce a fresh answer that directly addresses the latest user message without repeating prior assistant wording.`;
    const answer = await tryGemini(messages, repairPrompt);
    if (answer && !isTooSimilar(answer, previousAssistantAnswers)) {
      return { answer, provider: "gemini" };
    }
    if (answer) console.warn("Gemini response rejected as repetitive");
  } catch (error) {
    console.error("Gemini request failed", error);
  }

  return { answer: fallbackReply(latestUser, messages), provider: "deterministic-backup" };
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
  if (!userMessage.trim() || !assistantMessage.trim()) return;
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

function openAiCompatibleSse(text: string, provider: Provider, headers: Record<string, string>): Response {
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
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-store",
      "Connection": "keep-alive",
      "X-Irha-AI-Provider": provider,
      "X-Irha-Conversation-Version": "3",
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
    const body = JSON.parse(raw) as { messages?: unknown; sessionId?: unknown; pageContext?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) {
      return json({ error: "messages_required" }, 400, headers);
    }

    const safeMessages = (body.messages as Array<{ role?: unknown; content?: unknown }>)
      .filter((message) => message && typeof message.content === "string" && (message.role === "user" || message.role === "assistant"))
      .map((message) => ({
        role: message.role as ChatRole,
        content: (message.content as string).trim().slice(0, MAX_MESSAGE_CHARS),
      }))
      .filter((message) => message.content.length > 0)
      .slice(-12);

    const latestUser = [...safeMessages].reverse().find((message) => message.role === "user")?.content;
    if (!latestUser) return json({ error: "user_message_required" }, 400, headers);

    const sessionId = await resolveSessionId(body.sessionId, req);
    const pageContext = safePageContext(body.pageContext);
    const { answer, provider } = await generateAnswer(safeMessages, latestUser, pageContext);
    const safeAnswer = answer.trim() || fallbackReply(latestUser, safeMessages);
    await persistExchange(sessionId, latestUser, safeAnswer);

    return openAiCompatibleSse(safeAnswer, provider, headers);
  } catch (error) {
    console.error("chat fn error", error);
    return json({ error: "guide_unavailable" }, 503, headers);
  }
});
