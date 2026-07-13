// Irha Command Center — zero-credit bridge to the internal admin chat lead operator.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const auth = req.headers.get("Authorization") ?? "";
    const client = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: userData } = await client.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const { data: role } = await client
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle();
    if (!role) return json({ error: "Admin only" }, 403);

    const body = await req.json().catch(() => ({}));
    const command = typeof body?.command === "string" ? body.command.trim().slice(0, 4000) : "";
    if (!command) return json({ error: "command is required" }, 400);

    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-chat`, {
      method: "POST",
      headers: {
        Authorization: auth,
        apikey: Deno.env.get("SUPABASE_ANON_KEY")!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ messages: [{ role: "user", content: command }] }),
    });
    const text = await response.text();
    if (!response.ok) {
      let message = `Zero-credit assistant returned ${response.status}`;
      try { message = JSON.parse(text)?.error ?? message; } catch { /* keep message */ }
      return json({ error: message }, response.status);
    }

    const reply = extractContent(text) || "Zero-credit command completed.";
    return json({
      ok: true,
      run: {
        id: crypto.randomUUID(),
        mode: "operate",
        status: "completed",
        reply,
      },
      actions: [],
      guardrails: {
        zero_credit_mode: true,
        external_credits_used: 0,
        external_execution: false,
        engine: "admin-chat/lead-research",
      },
    });
  } catch (error) {
    console.error("admin-agent zero-credit bridge error", error);
    return json({ error: error instanceof Error ? error.message : "Internal error" }, 500);
  }
});

function extractContent(stream: string) {
  let output = "";
  for (const line of stream.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    const payload = line.slice(6).trim();
    if (!payload || payload === "[DONE]") continue;
    try {
      const parsed = JSON.parse(payload);
      const content = parsed?.choices?.[0]?.delta?.content;
      if (typeof content === "string") output += content;
    } catch {
      // Ignore malformed stream fragments.
    }
  }
  return output.trim();
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}
