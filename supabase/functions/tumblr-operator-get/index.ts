import "jsr:@supabase/functions-js/edge-runtime.d.ts";
Deno.serve(async (req: Request) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405 });
  const url = new URL(req.url);
  const token = url.searchParams.get("token") || "";
  if (!/^[A-Za-z0-9_-]{40,120}$/.test(token)) return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { "content-type": "application/json", "cache-control": "no-store" } });
  const base = Deno.env.get("SUPABASE_URL") || "";
  const response = await fetch(`${base}/functions/v1/tumblr-operator`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token }) });
  const text = await response.text();
  return new Response(text, { status: response.status, headers: { "content-type": response.headers.get("content-type") || "application/json", "cache-control": "no-store" } });
});
