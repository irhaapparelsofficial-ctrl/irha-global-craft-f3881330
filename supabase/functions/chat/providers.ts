import { incomplete, isTooSimilar, redact, type PageContext, type Provider, type SafeMessage } from "./core.ts";
import { catalogueContext } from "./data.ts";
import { fallbackReply, systemPrompt } from "./prompt.ts";

function irhaLovableRuntimeKey(): string | undefined {
  if (Deno.env.get("IRHA_ENABLE_LOVABLE_RUNTIME") !== "true") return undefined;
  return Deno.env.get("LOVABLE_API_KEY") || undefined;
}

function externalMessages(messages: SafeMessage[]) {
  return messages.slice(-12).map((message) => ({ role: message.role, content: redact(message.content) }));
}

function openAiText(payload: any) {
  const value = payload?.choices?.[0]?.message?.content;
  return typeof value === "string" ? value.trim().slice(0, 2_000) : "";
}

function geminiText(payload: any) {
  const parts = payload?.candidates?.[0]?.content?.parts;
  return Array.isArray(parts)
    ? parts.map((part: any) => typeof part?.text === "string" ? part.text : "").join("").trim().slice(0, 2_000)
    : "";
}

async function tryLovable(messages: SafeMessage[], prompt: string) {
  const key = irhaLovableRuntimeKey();
  if (!key) return "";
  const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Lovable-API-Key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: Deno.env.get("IRHA_GUIDE_MODEL") || "google/gemini-3-flash-preview",
      temperature: 0.35,
      max_tokens: 650,
      messages: [{ role: "system", content: prompt }, ...externalMessages(messages)],
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Lovable gateway ${response.status}`);
  return openAiText(payload);
}

async function tryGemini(messages: SafeMessage[], prompt: string) {
  const key = Deno.env.get("GEMINI_API_KEY") || Deno.env.get("GOOGLE_AI_API_KEY");
  if (!key) return "";
  const model = Deno.env.get("IRHA_GUIDE_GEMINI_MODEL") || "gemini-3.1-flash-lite";
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: prompt }] },
      contents: externalMessages(messages).map((message) => ({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      })),
      generationConfig: { temperature: 0.35, maxOutputTokens: 650 },
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Gemini ${response.status}`);
  return geminiText(payload);
}

export async function generateAnswer(
  messages: SafeMessage[],
  latestUser: string,
  page: PageContext,
): Promise<{ answer: string; provider: Provider }> {
  if (incomplete(latestUser)) return { answer: fallbackReply(latestUser, messages), provider: "deterministic-backup" };

  const previous = messages.filter((message) => message.role === "assistant").map((message) => message.content);
  const prompt = systemPrompt(messages, page) + await catalogueContext();
  try {
    const answer = await tryLovable(messages, prompt);
    if (answer && !isTooSimilar(answer, previous)) return { answer, provider: "lovable-ai-gateway" };
    if (answer) console.warn("Lovable response rejected as repetitive");
  } catch (error) {
    console.error("Lovable AI request failed", error);
  }

  try {
    const answer = await tryGemini(messages, `${prompt}\nProduce a fresh answer because the first provider was unavailable or repetitive.`);
    if (answer && !isTooSimilar(answer, previous)) return { answer, provider: "gemini" };
    if (answer) console.warn("Gemini response rejected as repetitive");
  } catch (error) {
    console.error("Gemini request failed", error);
  }

  return { answer: fallbackReply(latestUser, messages), provider: "deterministic-backup" };
}
