export async function onRequest({ request, env }) {
  if (request.method !== "GET" && request.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  const supabaseUrl = String(env.SUPABASE_URL || "").replace(/\/$/, "");
  const publishableKey = String(env.SUPABASE_ANON_KEY || env.SUPABASE_PUBLISHABLE_KEY || "");
  if (!supabaseUrl || !publishableKey) {
    return json({ error: "Webhook route is not configured" }, 503);
  }

  const incomingUrl = new URL(request.url);
  const upstreamUrl = new URL(`${supabaseUrl}/functions/v1/meta-webhook`);
  upstreamUrl.search = incomingUrl.search;

  const upstreamHeaders = new Headers(request.headers);
  upstreamHeaders.delete("host");
  upstreamHeaders.delete("authorization");
  upstreamHeaders.set("apikey", publishableKey);
  upstreamHeaders.set("authorization", `Bearer ${publishableKey}`);
  upstreamHeaders.set("x-forwarded-host", incomingUrl.host);
  upstreamHeaders.set("x-forwarded-proto", incomingUrl.protocol.replace(":", ""));

  const upstream = await fetch(upstreamUrl.toString(), {
    method: request.method,
    headers: upstreamHeaders,
    body: request.method === "POST" ? await request.arrayBuffer() : undefined,
    redirect: "manual",
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set("Cache-Control", "no-store");
  responseHeaders.set("X-Content-Type-Options", "nosniff");
  return new Response(upstream.body, {
    status: upstream.status,
    headers: responseHeaders,
  });
}

function json(payload, status) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
