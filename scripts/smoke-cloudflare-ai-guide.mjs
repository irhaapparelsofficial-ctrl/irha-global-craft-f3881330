import { appendFile } from "node:fs/promises";

const base = String(process.argv[2] || "").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) throw new Error("A secure preview or production origin is required.");

const firstQuestion = "I need 200 custom football jerseys with embroidery for Germany. What details do you need?";
const TRANSIENT_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
const REQUEST_ATTEMPTS = 4;
const CONVERSATION_ATTEMPTS = 3;

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function safeError(error) {
  return String(error instanceof Error ? error.message : error)
    .replace(/Bearer\s+[A-Za-z0-9._~-]+/gi, "Bearer [masked]")
    .replace(/[0-9a-f]{32,}/gi, "[masked-hex]")
    .slice(0, 1200);
}

async function recordFailure(error) {
  const message = `\nWorkers AI smoke failure at ${base}: ${safeError(error)}\n`;
  await appendFile("/tmp/preview-deploy.log", message, "utf8").catch(() => undefined);
}

async function ask(sessionId, messages) {
  let lastError;

  for (let attempt = 1; attempt <= REQUEST_ATTEMPTS; attempt += 1) {
    try {
      const response = await fetch(`${base}/api/guide`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: base,
        },
        body: JSON.stringify({
          sessionId,
          messages,
          pageContext: { path: "/products/sportswear", title: "Custom Sportswear" },
          clientVersion: "workers-ai-smoke-v2",
        }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(`Guide returned ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
        if (!TRANSIENT_STATUSES.has(response.status) || attempt === REQUEST_ATTEMPTS) throw error;
        lastError = error;
        await sleep(attempt * 2500);
        continue;
      }

      const provider = response.headers.get("x-irha-ai-provider");
      const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
      if (provider !== "cloudflare-workers-ai") {
        const error = new Error(`Unexpected guide provider: ${provider || "missing"}`);
        if (attempt === REQUEST_ATTEMPTS) throw error;
        lastError = error;
        await sleep(attempt * 2500);
        continue;
      }
      if (answer.length < 40 || answer.length > 2_000) {
        const error = new Error(`Invalid answer length: ${answer.length}`);
        if (attempt === REQUEST_ATTEMPTS) throw error;
        lastError = error;
        await sleep(attempt * 2500);
        continue;
      }
      return answer;
    } catch (error) {
      lastError = error;
      if (attempt === REQUEST_ATTEMPTS) throw error;
      await sleep(attempt * 2500);
    }
  }

  throw lastError || new Error("Guide request failed without a response");
}

function wordSet(value) {
  return new Set(value.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter((word) => word.length > 2));
}

function similarity(left, right) {
  const a = wordSet(left);
  const b = wordSet(right);
  const union = new Set([...a, ...b]);
  let overlap = 0;
  a.forEach((word) => { if (b.has(word)) overlap += 1; });
  return union.size ? overlap / union.size : 1;
}

async function runConversation(attempt) {
  const sessionId = `qa-workers-ai-${Date.now()}-${attempt}`;
  const firstAnswer = await ask(sessionId, [{ role: "user", content: firstQuestion }]);
  const secondQuestion = "What about sampling for that same jersey?";
  const secondAnswer = await ask(sessionId, [
    { role: "user", content: firstQuestion },
    { role: "assistant", content: firstAnswer },
    { role: "user", content: secondQuestion },
  ]);

  if (firstAnswer === secondAnswer || similarity(firstAnswer, secondAnswer) >= 0.78) {
    throw new Error("The second answer repeated the first answer instead of handling the follow-up.");
  }
  if (!/(sample|sampling|prototype|reference|tech.?pack|revision)/i.test(secondAnswer)) {
    throw new Error("The follow-up answer did not address sampling.");
  }
  if (/(guaranteed|fixed price|final price|guaranteed delivery|certified by)/i.test(`${firstAnswer} ${secondAnswer}`)) {
    throw new Error("The guide emitted a prohibited commercial or certification claim.");
  }

  return {
    ok: true,
    provider: "cloudflare-workers-ai",
    first_answer_chars: firstAnswer.length,
    second_answer_chars: secondAnswer.length,
    similarity: Number(similarity(firstAnswer, secondAnswer).toFixed(3)),
    conversation_attempt: attempt,
  };
}

async function main() {
  let lastError;
  for (let attempt = 1; attempt <= CONVERSATION_ATTEMPTS; attempt += 1) {
    try {
      const result = await runConversation(attempt);
      console.log(JSON.stringify(result));
      return;
    } catch (error) {
      lastError = error;
      if (attempt < CONVERSATION_ATTEMPTS) await sleep(attempt * 3000);
    }
  }
  throw lastError || new Error("Workers AI conversation smoke failed");
}

try {
  await main();
} catch (error) {
  await recordFailure(error);
  throw error;
}
