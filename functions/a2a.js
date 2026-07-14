const A2A_VERSION = "1.0";
const SITE_ORIGIN = "https://irhaapparels.com";
const MAX_REQUEST_BYTES = 32 * 1024;
const MAX_TEXT_LENGTH = 4_000;

const PUSH_METHODS = new Set(["CreateTaskPushNotificationConfig", "GetTaskPushNotificationConfig", "ListTaskPushNotificationConfigs", "DeleteTaskPushNotificationConfig"]);

function responseHeaders(extra = {}) {
  return {
    "Content-Type": "application/a2a+json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, A2A-Version, A2A-Extensions",
    "Access-Control-Expose-Headers": "A2A-Version, Link",
    "A2A-Version": A2A_VERSION,
    Link: `<${SITE_ORIGIN}/.well-known/agent-card.json>; rel="service-desc", <${SITE_ORIGIN}/docs/a2a.md>; rel="service-doc"`,
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function json(value, status = 200, extra = {}) { return new Response(JSON.stringify(value), { status, headers: responseHeaders(extra) }); }
function errorData(reason, metadata = {}) { return [{ "@type": "type.googleapis.com/google.rpc.ErrorInfo", reason, domain: "a2a-protocol.org", metadata: { ...metadata, timestamp: new Date().toISOString() } }]; }
function rpcError(id, code, message, reason, metadata) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message, data: errorData(reason, metadata) } }; }
function invalidParams(id, field, description) { return { jsonrpc: "2.0", id: id ?? null, error: { code: -32602, message: "Invalid parameters", data: [{ "@type": "type.googleapis.com/google.rpc.BadRequest", fieldViolations: [{ field, description }] }] } }; }
function safeText(value, maxLength = MAX_TEXT_LENGTH) { return typeof value === "string" ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength) : ""; }

function extractText(parts) {
  if (!Array.isArray(parts) || parts.length === 0) return { error: "At least one message part is required" };
  const texts = [];
  for (const part of parts.slice(0, 20)) {
    if (!part || typeof part !== "object" || Array.isArray(part)) return { error: "Each message part must be an object" };
    if (typeof part.text !== "string") return { unsupported: true };
    const text = safeText(part.text);
    if (text) texts.push(text);
  }
  const text = texts.join(" ").slice(0, MAX_TEXT_LENGTH);
  return text ? { text } : { error: "A non-empty text part is required" };
}

function buyerAnswer(text) {
  const lower = text.toLowerCase();
  if (/\b(admin|crm|lead export|bulk email|social post|publish|owner dashboard|private file)\b/.test(lower)) return "The public Irha Apparels A2A agent cannot access owner-only admin, CRM, outreach, social publishing or private-file systems. Those actions require the authenticated owner dashboard and human approval.";
  if (/\b(factory|video call|verification|verify|buyer trust|audit)\b/.test(lower)) return `Irha Apparels is an experienced manufacturer and the current website is newly built.\nBuyer verification: ${SITE_ORIGIN}/buyer-trust\nLive factory-view video call: ${SITE_ORIGIN}/factory-video-call\nNo meeting has been booked by this response.`;
  if (/\b(quote|quotation|inquiry|enquiry|catalogue|catalog|sample|mockup|meeting|contact|price|moq)\b/.test(lower)) {
    const params = new URLSearchParams({ source: "a2a-review", message: text.slice(0, 1_200) });
    return `A reviewable Irha Apparels inquiry has been prepared, but nothing has been submitted.\nReview and send it here: ${SITE_ORIGIN}/inquiry?${params.toString()}\nMOQ, price, materials, production timing, shipping and documentation require human confirmation.`;
  }
  if (/\b(product|collection|lederhosen|dirndl|trachten|leather|sportswear|activewear|streetwear|nightwear|uniform)\b/.test(lower)) return `Irha Apparels manufactures made-to-order B2B apparel for brands, importers, wholesalers and private-label buyers.\nBavarian Heritage & Leather: ${SITE_ORIGIN}/products/bavarian-trachten-wear\nAll public manufacturing programs: ${SITE_ORIGIN}/products\nRequest a reviewed quotation or catalogue: ${SITE_ORIGIN}/inquiry`;
  return `I am the read-only Irha Apparels public buyer agent. I can explain public product collections, provide factory-verification links, and prepare a buyer-reviewed inquiry URL without submitting data.\nProducts: ${SITE_ORIGIN}/products\nBuyer trust: ${SITE_ORIGIN}/buyer-trust\nInquiry: ${SITE_ORIGIN}/inquiry`;
}

function sendMessage(id, params) {
  const message = params && typeof params === "object" && !Array.isArray(params) ? params.message : null;
  if (!message || typeof message !== "object" || Array.isArray(message)) return invalidParams(id, "message", "A message object is required");
  if (message.role !== "ROLE_USER") return invalidParams(id, "message.role", "The client message role must be ROLE_USER");
  const clientMessageId = safeText(message.messageId, 200);
  if (!clientMessageId) return invalidParams(id, "message.messageId", "A non-empty messageId is required");
  const taskId = safeText(message.taskId, 200);
  if (taskId) return rpcError(id, -32001, "Task not found", "TASK_NOT_FOUND", { taskId });
  const parsed = extractText(message.parts);
  if (parsed.unsupported) return rpcError(id, -32005, "Content type not supported", "CONTENT_TYPE_NOT_SUPPORTED", { supportedMediaTypes: "text/plain" });
  if (parsed.error) return invalidParams(id, "message.parts", parsed.error);
  return { jsonrpc: "2.0", id: id ?? null, result: { message: { messageId: crypto.randomUUID(), contextId: safeText(message.contextId, 200) || crypto.randomUUID(), role: "ROLE_AGENT", parts: [{ text: buyerAnswer(parsed.text), mediaType: "text/plain" }], metadata: { readOnly: true, submitted: false, source: "irha-public-a2a", clientMessageId } } } };
}

function handleRpc(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return { status: 400, body: rpcError(null, -32600, "Request payload validation error", "INVALID_REQUEST") };
  const { id, method, params } = payload;
  if (payload.jsonrpc !== "2.0" || typeof method !== "string") return { status: 400, body: rpcError(id, -32600, "Request payload validation error", "INVALID_REQUEST") };
  if (method === "SendMessage") return { status: 200, body: sendMessage(id, params) };
  if (method === "ListTasks") return { status: 200, body: { jsonrpc: "2.0", id: id ?? null, result: { tasks: [], nextPageToken: "" } } };
  if (method === "GetTask" || method === "CancelTask") return { status: 200, body: rpcError(id, -32001, "Task not found", "TASK_NOT_FOUND", { taskId: safeText(params?.id, 200) || "unknown" }) };
  if (method === "SendStreamingMessage" || method === "SubscribeToTask" || method === "GetExtendedAgentCard") return { status: 200, body: rpcError(id, -32004, "Unsupported operation", "UNSUPPORTED_OPERATION", { method }) };
  if (PUSH_METHODS.has(method)) return { status: 200, body: rpcError(id, -32003, "Push notifications are not supported", "PUSH_NOTIFICATION_NOT_SUPPORTED", { method }) };
  return { status: 200, body: { jsonrpc: "2.0", id: id ?? null, error: { code: -32601, message: "Method not found", data: errorData("METHOD_NOT_FOUND", { method }) } } };
}

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();
  if (method === "OPTIONS") return new Response(null, { status: 204, headers: responseHeaders() });
  if (method === "GET" || method === "HEAD") {
    const body = { name: "Irha Apparels Public Buyer Agent", protocol: "A2A", protocolVersion: A2A_VERSION, binding: "JSONRPC", agentCard: `${SITE_ORIGIN}/.well-known/agent-card.json`, endpoint: `${SITE_ORIGIN}/a2a`, readOnly: true };
    return method === "HEAD" ? new Response(null, { status: 200, headers: responseHeaders() }) : json(body);
  }
  if (method !== "POST") return json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD, POST, OPTIONS" });
  const requestedVersion = safeText(request.headers.get("A2A-Version"), 20) || "0.3";
  if (requestedVersion !== A2A_VERSION) return json(rpcError(null, -32009, "A2A protocol version not supported", "VERSION_NOT_SUPPORTED", { requestedVersion, supportedVersions: A2A_VERSION }), 400);
  const declaredLength = Number(request.headers.get("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_REQUEST_BYTES) return json(rpcError(null, -32600, "Request payload validation error", "REQUEST_TOO_LARGE"), 413);
  let raw;
  try { raw = await request.text(); } catch { return json(rpcError(null, -32700, "Invalid JSON payload", "JSON_PARSE_ERROR"), 400); }
  if (new TextEncoder().encode(raw).byteLength > MAX_REQUEST_BYTES) return json(rpcError(null, -32600, "Request payload validation error", "REQUEST_TOO_LARGE"), 413);
  let payload;
  try { payload = JSON.parse(raw); } catch { return json(rpcError(null, -32700, "Invalid JSON payload", "JSON_PARSE_ERROR"), 400); }
  const result = handleRpc(payload);
  return json(result.body, result.status);
}
