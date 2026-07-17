const DEFAULT_SUPABASE_URL = "https://pvzjiozismyxqrzmtfbi.supabase.co";

export async function onRequest(context) {
  const request = context.request;
  const method = request.method.toUpperCase();
  if (method !== "GET" && method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: responseHeaders("application/json; charset=utf-8"),
    });
  }

  const incomingUrl = new URL(request.url);
  const supabaseUrl = String(
    context.env.SUPABASE_URL ||
    context.env.VITE_SUPABASE_URL ||
    DEFAULT_SUPABASE_URL,
  ).replace(/\/+$/, "");
  const target = new URL(`${supabaseUrl}/functions/v1/meta-webhook`);
  target.search = incomingUrl.search;

  const headers = new Headers();
  const contentType = request.headers.get("content-type");
  const signature = request.headers.get("x-hub-signature-256");
  if (contentType) headers.set("content-type", contentType);
  if (signature) headers.set("x-hub-signature-256", signature);
  headers.set("user-agent", request.headers.get("user-agent") || "Irha-Meta-Webhook-Proxy/1.0");

  const anonKey = context.env.SUPABASE_ANON_KEY || context.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (anonKey) {
    headers.set("apikey", anonKey);
    headers.set("authorization", `Bearer ${anonKey}`);
  }

  const upstream = await fetch(target.toString(), {
    method,
    headers,
    body: method === "POST" ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const responseType = upstream.headers.get("content-type") || "application/json; charset=utf-8";
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders(responseType),
  });
}

function responseHeaders(contentType) {
  return {
    "content-type": contentType,
    "cache-control": "no-store, max-age=0",
    "x-content-type-options": "nosniff",
    "referrer-policy": "no-referrer",
  };
}
