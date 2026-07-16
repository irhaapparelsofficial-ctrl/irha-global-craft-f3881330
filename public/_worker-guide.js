const GUIDE_MODEL = "@cf/qwen/qwen3-30b-a3b-fp8";
const MAX_BODY_BYTES = 32_000;
const MAX_MESSAGE_CHARS = 2_000;
const MAX_MESSAGES = 12;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;

const hits = new Map();

const SYSTEM_PROMPT = `You are Irha Guide, the official website assistant for Irha Apparels, an experienced B2B custom-apparel manufacturer in Sialkot, Pakistan.

Conversation rules:
- Answer the buyer's latest question directly and professionally.
- Use the supplied conversation history. Resolve follow-ups such as "what about sampling?", "same product", "it" and "that design" from earlier messages.
- Never restart with a greeting after the conversation has begun.
- Never repeat or lightly paraphrase an earlier assistant answer. Add new, specific value.
- Ask at most one focused follow-up question, only when essential information is missing.
- Mirror English or German. For other languages, answer in clear English.
- Keep the answer concise, usually 60-150 words.

Verified business scope:
- B2B OEM, ODM, private-label and custom manufacturing.
- Bavarian and Trachten wear, Lederhosen, Dirndl and accessories.
- Premium leather apparel.
- Sportswear and teamwear.
- Streetwear, activewear, leisurewear and nightwear.
- Sampling, materials, construction, embroidery, printing, woven labels, care labels, hangtags, packaging and live factory video-call requests.

Commercial safety:
- Never invent or estimate price, sample fee, shipping cost, MOQ, production time or delivery time.
- Explain that commercial terms are confirmed after the exact product, material, quantity, branding, packaging and destination are reviewed.
- Never claim certifications, audits, buyers, export markets or guarantees not supplied in the conversation.
- For a formal quotation, direct the buyer to the website inquiry form or the human team.
- Do not negotiate or issue a final quotation.`;

function allowedOrigin(origin) {
  if (!origin) return true;
  try {
    const { protocol, hostname } = new URL(origin);
    if (protocol !== "https:") return hostname === "localhost" || hostname === "127.0.0.1";
    return hostname === "irhaapparels.com" ||
      hostname === "www.irhaapparels.com" ||
      hostname === "irha-apparels.pages.dev" ||
      hostname.endsWith(".irha-apparels.pages.dev");
  } catch {
    return false;
  }
}

function responseHeaders(origin, provider = "cloudflare-workers-ai") {
  const headers = {
    "Cache-Control": "no-store, max-age=0",
    "Content-Type": "application/json; charset=utf-8",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-Irha-AI-Provider": provider,
    "X-Irha-Conversation-Version": "4",
  };
  if (origin && allowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers.Vary = "Origin";
  }
  return headers;
}

function json(body, status, origin, provider) {
  return new Response(JSON.stringify(body), {
    status,
    headers: responseHeaders(origin, provider),
  });
}

function clientKey(request) {
  return request.headers.get("CF-Connecting-IP") ||
    request.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() ||
    "unknown";
}

function rateLimited(request) {
  const key = clientKey(request);
  const now = Date.now();
  const current = hits.get(key);
  if (!current || current.resetAt <= now) {
    hits.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  current.count += 1;
  return current.count > RATE_LIMIT_MAX;
}

function redact(value) {
  return String(value || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone removed]")
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .trim()
    .slice(0, MAX_MESSAGE_CHARS);
}

function safeMessages(input) {
  if (!Array.isArray(input)) return [];
  return input
    .filter((item) => item && (item.role === "user" || item.role === "assistant") && typeof item.content === "string")
    .map((item) => ({ role: item.role, content: redact(item.content) }))
    .filter((item) => item.content)
    .slice(-MAX_MESSAGES);
}

function pageContext(input) {
  if (!input || typeof input !== "object") return "";
  const path = typeof input.path === "string" ? input.path.slice(0, 300) : "/";
  const title = typeof input.title === "string" ? input.title.slice(0, 240) : "Irha Apparels";
  return `Current website page: ${title} (${path}). Use this only as navigation context.`;
}

function normalizeWords(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2);
}

function tooSimilar(answer, previousAnswers) {
  const compact = answer.trim().toLowerCase().replace(/\s+/g, " ");
  const words = new Set(normalizeWords(answer));
  if (!compact) return true;
  return previousAnswers.slice(-4).some((previous) => {
    const prior = previous.trim().toLowerCase().replace(/\s+/g, " ");
    if (compact === prior) return true;
    if (compact.length > 90 && prior.length > 90 && (compact.includes(prior) || prior.includes(compact))) return true;
    const priorWords = new Set(normalizeWords(previous));
    if (words.size < 5 || priorWords.size < 5) return false;
    let overlap = 0;
    words.forEach((word) => { if (priorWords.has(word)) overlap += 1; });
    return overlap / new Set([...words, ...priorWords]).size >= 0.78;
  });
}

function extractAnswer(result) {
  if (typeof result === "string") return result.trim();
  const candidates = [
    result?.response,
    result?.result?.response,
    result?.choices?.[0]?.message?.content,
    result?.output_text,
  ];
  return candidates.find((value) => typeof value === "string" && value.trim())?.trim() || "";
}

async function runModel(env, messages, page, repair = false) {
  const priorAnswers = messages
    .filter((message) => message.role === "assistant")
    .map((message) => message.content)
    .slice(-4);
  const repeatBlock = priorAnswers.length
    ? `\nPrevious assistant answers that must not be repeated:\n${priorAnswers.map((answer, index) => `${index + 1}. ${answer}`).join("\n")}`
    : "";
  const repairBlock = repair
    ? "\nThe first draft was repetitive. Produce a materially different answer focused on the latest buyer question."
    : "";
  const result = await env.AI.run(GUIDE_MODEL, {
    messages: [
      { role: "system", content: `${SYSTEM_PROMPT}\n${page}${repeatBlock}${repairBlock}` },
      ...messages,
    ],
    temperature: repair ? 0.42 : 0.28,
    max_tokens: 650,
  });
  return extractAnswer(result).slice(0, MAX_MESSAGE_CHARS);
}

export async function handleIrhaGuideRequest(request, env) {
  const origin = request.headers.get("Origin");

  if (request.method === "OPTIONS") {
    if (!allowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403, origin);
    const headers = responseHeaders(origin);
    headers["Access-Control-Allow-Headers"] = "content-type";
    headers["Access-Control-Allow-Methods"] = "POST, OPTIONS";
    headers["Access-Control-Max-Age"] = "86400";
    return new Response(null, { status: 204, headers });
  }

  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405, origin);
  if (!allowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403, origin);
  if (rateLimited(request)) return json({ error: "rate_limited" }, 429, origin);
  if (!env?.AI?.run) return json({ error: "ai_binding_unavailable" }, 503, origin, "unavailable");

  const declaredLength = Number(request.headers.get("Content-Length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: "request_too_large" }, 413, origin);
  }

  try {
    const raw = await request.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, origin);
    const body = JSON.parse(raw);
    const messages = safeMessages(body.messages);
    const latestUser = [...messages].reverse().find((message) => message.role === "user")?.content;
    if (!latestUser) return json({ error: "user_message_required" }, 400, origin);

    const previousAnswers = messages.filter((message) => message.role === "assistant").map((message) => message.content);
    const page = pageContext(body.pageContext);
    let answer = await runModel(env, messages, page, false);
    if (!answer || tooSimilar(answer, previousAnswers)) answer = await runModel(env, messages, page, true);
    if (!answer || tooSimilar(answer, previousAnswers)) {
      return json({ error: "repetitive_model_output" }, 502, origin);
    }

    return json({
      answer,
      provider: "cloudflare-workers-ai",
      model: GUIDE_MODEL,
      conversation_version: 4,
    }, 200, origin);
  } catch (error) {
    console.error("Irha Workers AI guide failed", error);
    return json({ error: "guide_unavailable" }, 503, origin);
  }
}
