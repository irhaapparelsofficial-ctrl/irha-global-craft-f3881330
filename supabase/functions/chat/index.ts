// Irha Guide — public B2B website assistant.
// Provider order: Lovable AI gateway -> Gemini -> conversation-aware verified backup.
import {
  MAX_BODY_BYTES,
  MAX_MESSAGE_CHARS,
  isAllowedOrigin,
  json,
  rateLimited,
  responseHeaders,
  safePageContext,
  type ChatRole,
  type Provider,
  type SafeMessage,
} from "./core.ts";
import { persistExchange, resolveSessionId } from "./data.ts";
import { fallbackReply } from "./prompt.ts";
import { generateAnswer } from "./providers.ts";

function stream(answer: string, provider: Provider, headers: Record<string, string>) {
  const encoder = new TextEncoder();
  const body = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content: answer } }] })}\n\n`));
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
  const headers = responseHeaders(origin);
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405, headers);
  if (origin && !isAllowedOrigin(origin)) return json({ error: "origin_not_allowed" }, 403, headers);

  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  if (rateLimited(ip)) return json({ error: "guide_busy" }, 429, headers);
  const length = Number(req.headers.get("content-length") || 0);
  if (Number.isFinite(length) && length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, headers);

  try {
    const raw = await req.text();
    if (raw.length > MAX_BODY_BYTES) return json({ error: "request_too_large" }, 413, headers);
    const body = JSON.parse(raw) as { messages?: unknown; sessionId?: unknown; pageContext?: unknown };
    if (!Array.isArray(body.messages) || body.messages.length === 0) return json({ error: "messages_required" }, 400, headers);

    const safeMessages: SafeMessage[] = (body.messages as Array<{ role?: unknown; content?: unknown }>)
      .filter((message) => message && typeof message.content === "string" && (message.role === "user" || message.role === "assistant"))
      .map((message) => ({ role: message.role as ChatRole, content: (message.content as string).trim().slice(0, MAX_MESSAGE_CHARS) }))
      .filter((message) => Boolean(message.content))
      .slice(-12);
    const latestUser = [...safeMessages].reverse().find((message) => message.role === "user")?.content;
    if (!latestUser) return json({ error: "user_message_required" }, 400, headers);

    const sessionId = await resolveSessionId(body.sessionId, req);
    const { answer, provider } = await generateAnswer(safeMessages, latestUser, safePageContext(body.pageContext));
    const safeAnswer = answer.trim() || fallbackReply(latestUser, safeMessages);
    await persistExchange(sessionId, latestUser, safeAnswer);
    return stream(safeAnswer, provider, headers);
  } catch (error) {
    console.error("chat fn error", error);
    return json({ error: "guide_unavailable" }, 503, headers);
  }
});
