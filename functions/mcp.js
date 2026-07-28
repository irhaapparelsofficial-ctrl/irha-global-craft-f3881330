const PROTOCOL_VERSION = "2025-06-18";
const SITE_ORIGIN = "https://irhaapparels.com";

const tools = [
  {
    name: "list_b2b_collections",
    title: "List B2B collections",
    description: "Return the current Irha Apparels manufacturing hubs and public collection links. This tool is read-only.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "get_factory_verification_options",
    title: "Get factory verification options",
    description: "Return buyer-trust and live factory video-call options. This tool is read-only and does not book a meeting.",
    inputSchema: {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
  {
    name: "prepare_buyer_inquiry",
    title: "Prepare buyer inquiry",
    description: "Build a reviewable Irha Apparels inquiry URL from buyer requirements. This tool never submits data; the buyer must review and send the form on the website.",
    inputSchema: {
      type: "object",
      properties: {
        category: {
          type: "string",
          maxLength: 180,
          description: "Requested product category or manufacturing program",
        },
        quantity: {
          type: "string",
          maxLength: 100,
          description: "Indicative quantity or quantity range",
        },
        country: {
          type: "string",
          maxLength: 80,
          description: "Buyer destination country",
        },
        message: {
          type: "string",
          maxLength: 1200,
          description: "Short requirements summary for buyer review",
        },
      },
      additionalProperties: false,
    },
    annotations: {
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
  },
];

function responseHeaders(extra = {}) {
  return {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store, max-age=0",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, MCP-Protocol-Version, MCP-Session-Id",
    "Access-Control-Expose-Headers": "MCP-Protocol-Version, Link",
    "MCP-Protocol-Version": PROTOCOL_VERSION,
    Link: `<${SITE_ORIGIN}/.well-known/mcp/server-card.json>; rel="service-desc", <${SITE_ORIGIN}/auth.md>; rel="authorization"`,
    ...extra,
  };
}

function json(value, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(value), {
    status,
    headers: responseHeaders(extraHeaders),
  });
}

function rpcError(id, code, message, data) {
  return {
    jsonrpc: "2.0",
    id: id ?? null,
    error: {
      code,
      message,
      ...(data === undefined ? {} : { data }),
    },
  };
}

function textResult(text, structuredContent) {
  return {
    content: [{ type: "text", text }],
    ...(structuredContent === undefined ? {} : { structuredContent }),
    isError: false,
  };
}

function safeText(value, maxLength) {
  return typeof value === "string"
    ? value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim().slice(0, maxLength)
    : "";
}

function callTool(name, args) {
  if (name === "list_b2b_collections") {
    const collections = [
      {
        name: "Bavarian Heritage & Leather",
        description: "Lederhosen, Dirndl and premium leather apparel programs for wholesalers, importers and private-label buyers.",
        url: `${SITE_ORIGIN}/products/bavarian-trachten-wear`,
      },
      {
        name: "Textile, Streetwear & Active",
        description: "Sportswear, activewear, heavyweight streetwear, leisurewear and nightwear manufacturing programs.",
        url: `${SITE_ORIGIN}/products`,
      },
    ];
    return textResult(
      collections.map((item) => `${item.name}: ${item.url}`).join("\n"),
      { collections },
    );
  }

  if (name === "get_factory_verification_options") {
    const options = {
      buyerTrustUrl: `${SITE_ORIGIN}/buyer-trust`,
      factoryVideoCallUrl: `${SITE_ORIGIN}/factory-video-call`,
      inquiryUrl: `${SITE_ORIGIN}/inquiry`,
      note: "Buyer verification should focus on the exact program, team and written scope. An appointment-based live factory call may be requested, subject to availability and viewing scope.",
    };
    return textResult(
      `Buyer trust: ${options.buyerTrustUrl}\nFactory video call: ${options.factoryVideoCallUrl}\nInquiry: ${options.inquiryUrl}`,
      options,
    );
  }

  if (name === "prepare_buyer_inquiry") {
    const input = args && typeof args === "object" && !Array.isArray(args) ? args : {};
    const params = new URLSearchParams();
    const category = safeText(input.category, 180);
    const quantity = safeText(input.quantity, 100);
    const country = safeText(input.country, 80);
    const message = safeText(input.message, 1200);
    if (category) params.set("category", category);
    if (quantity) params.set("quantity", quantity);
    if (country) params.set("country", country);
    if (message) params.set("message", message);
    params.set("source", "mcp-review");
    const url = `${SITE_ORIGIN}/inquiry?${params.toString()}`;
    return textResult(
      `Review the prepared inquiry at ${url}. No request has been submitted.`,
      {
        reviewUrl: url,
        submitted: false,
        confirmationRequired: true,
      },
    );
  }

  return {
    content: [{ type: "text", text: `Unknown tool: ${name}` }],
    isError: true,
  };
}

function handleRpc(message) {
  if (!message || typeof message !== "object" || Array.isArray(message)) {
    return rpcError(null, -32600, "Invalid Request");
  }

  const { id, method, params } = message;
  if (message.jsonrpc !== "2.0" || typeof method !== "string") {
    return rpcError(id, -32600, "Invalid Request");
  }

  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: {
        protocolVersion: PROTOCOL_VERSION,
        capabilities: {
          tools: { listChanged: false },
        },
        serverInfo: {
          name: "irha-apparels-public",
          title: "Irha Apparels Public Buyer Assistant",
          version: "1.0.0",
          websiteUrl: SITE_ORIGIN,
        },
        instructions: "Use only the advertised read-only tools. The inquiry tool prepares a review URL and never submits buyer information. Commercial terms are confirmed by Irha Apparels after human review.",
      },
    };
  }

  if (method === "ping") {
    return { jsonrpc: "2.0", id: id ?? null, result: {} };
  }

  if (method === "tools/list") {
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: { tools },
    };
  }

  if (method === "tools/call") {
    const toolName = params && typeof params === "object" ? params.name : undefined;
    const toolArgs = params && typeof params === "object" ? params.arguments : undefined;
    if (typeof toolName !== "string") {
      return rpcError(id, -32602, "Invalid params", "tools/call requires a tool name");
    }
    return {
      jsonrpc: "2.0",
      id: id ?? null,
      result: callTool(toolName, toolArgs),
    };
  }

  if (method.startsWith("notifications/")) return null;
  return rpcError(id, -32601, "Method not found");
}

export async function onRequest(context) {
  const method = context.request.method.toUpperCase();

  if (method === "OPTIONS") {
    return new Response(null, { status: 204, headers: responseHeaders() });
  }

  if (method === "GET" || method === "HEAD") {
    const body = {
      name: "irha-apparels-public",
      title: "Irha Apparels Public Buyer Assistant",
      version: "1.0.0",
      protocolVersion: PROTOCOL_VERSION,
      transport: "streamable-http",
      endpoint: `${SITE_ORIGIN}/mcp`,
      authentication: "none",
      tools: tools.map(({ name, title, description, inputSchema, annotations }) => ({
        name,
        title,
        description,
        inputSchema,
        annotations,
      })),
    };
    if (method === "HEAD") return new Response(null, { status: 200, headers: responseHeaders() });
    return json(body);
  }

  if (method !== "POST") {
    return json({ error: "Method not allowed" }, 405, { Allow: "GET, HEAD, POST, OPTIONS" });
  }

  let payload;
  try {
    payload = await context.request.json();
  } catch {
    return json(rpcError(null, -32700, "Parse error"), 400);
  }

  if (Array.isArray(payload)) {
    if (payload.length === 0) return json(rpcError(null, -32600, "Invalid Request"), 400);
    const results = payload.map(handleRpc).filter(Boolean);
    if (results.length === 0) return new Response(null, { status: 202, headers: responseHeaders() });
    return json(results);
  }

  const result = handleRpc(payload);
  if (result === null) return new Response(null, { status: 202, headers: responseHeaders() });
  return json(result);
}
