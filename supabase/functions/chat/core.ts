export const SITE_URL = "https://irhaapparels.com";
export const WHATSAPP = "+92 320 411 0066";
export const WA_LINK = "https://wa.me/923204110066";
export const MAX_BODY_BYTES = 32_000;
export const MAX_MESSAGE_CHARS = 2_000;

export type ChatRole = "user" | "assistant";
export type SafeMessage = { role: ChatRole; content: string };
export type Provider = "lovable-ai-gateway" | "gemini" | "deterministic-backup";
export type PageContext = { path?: string; title?: string };

const securityHeaders = {
  "Strict-Transport-Security": "max-age=63072000; includeSubDomains; preload",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "geolocation=(), microphone=(), camera=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'; base-uri 'none'",
  "Cross-Origin-Resource-Policy": "same-site",
};

export function isAllowedOrigin(origin: string) {
  try {
    const url = new URL(origin);
    if (url.protocol !== "https:" && !["localhost", "127.0.0.1"].includes(url.hostname)) return false;
    return ["irhaapparels.com", "www.irhaapparels.com", "localhost", "127.0.0.1"].includes(url.hostname) ||
      url.hostname.endsWith(".lovable.app");
  } catch {
    return false;
  }
}

export function responseHeaders(origin: string | null) {
  return {
    "Access-Control-Allow-Origin": origin && isAllowedOrigin(origin) ? origin : SITE_URL,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
    ...securityHeaders,
  };
}

export function json(body: Record<string, unknown>, status: number, headers: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
}

const ipHits = new Map<string, { count: number; resetAt: number }>();
export function rateLimited(ip: string) {
  const now = Date.now();
  const hit = ipHits.get(ip);
  if (!hit || hit.resetAt <= now) {
    ipHits.set(ip, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  hit.count += 1;
  return hit.count > 10;
}

export function redact(value: string) {
  return value
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[email removed]")
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, "[phone removed]")
    .replace(/https?:\/\/\S+/gi, "[link removed]")
    .slice(0, MAX_MESSAGE_CHARS);
}

function words(value: string) {
  return value.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/).filter((word) => word.length > 2);
}

export function isTooSimilar(answer: string, earlier: string[]) {
  const current = answer.trim().toLowerCase().replace(/\s+/g, " ");
  const currentWords = new Set(words(answer));
  if (!current) return true;
  return earlier.slice(-4).some((previous) => {
    if (current === previous.trim().toLowerCase().replace(/\s+/g, " ")) return true;
    const priorWords = new Set(words(previous));
    if (currentWords.size < 5 || priorWords.size < 5) return false;
    const shared = [...currentWords].filter((word) => priorWords.has(word)).length;
    return shared / new Set([...currentWords, ...priorWords]).size >= 0.78;
  });
}

export function incomplete(text: string) {
  const compact = text.trim().replace(/[^\p{L}\p{N}]/gu, "");
  return compact.length > 0 && compact.length <= 2;
}

export function safePageContext(value: unknown): PageContext {
  if (!value || typeof value !== "object") return {};
  const input = value as Record<string, unknown>;
  return {
    path: typeof input.path === "string" ? input.path.slice(0, 300) : undefined,
    title: typeof input.title === "string" ? input.title.slice(0, 240) : undefined,
  };
}
