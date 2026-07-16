const base = String(process.argv[2] || "").replace(/\/$/, "");
if (!/^https:\/\//.test(base)) throw new Error("A secure preview or production origin is required.");

const sessionId = `qa-workers-ai-${Date.now()}`;
const firstQuestion = "I need 200 custom football jerseys with embroidery for Germany. What details do you need?";

async function ask(messages) {
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
      clientVersion: "workers-ai-smoke-v1",
    }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(`Guide returned ${response.status}: ${JSON.stringify(payload).slice(0, 300)}`);
  const provider = response.headers.get("x-irha-ai-provider");
  const answer = typeof payload.answer === "string" ? payload.answer.trim() : "";
  if (provider !== "cloudflare-workers-ai") throw new Error(`Unexpected guide provider: ${provider || "missing"}`);
  if (answer.length < 40 || answer.length > 2_000) throw new Error(`Invalid answer length: ${answer.length}`);
  return answer;
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

const firstAnswer = await ask([{ role: "user", content: firstQuestion }]);
const secondQuestion = "What about sampling for that same jersey?";
const secondAnswer = await ask([
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

console.log(JSON.stringify({
  ok: true,
  provider: "cloudflare-workers-ai",
  first_answer_chars: firstAnswer.length,
  second_answer_chars: secondAnswer.length,
  similarity: Number(similarity(firstAnswer, secondAnswer).toFixed(3)),
}));
