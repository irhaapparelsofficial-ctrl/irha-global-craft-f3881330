import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";
const headers = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type", "Access-Control-Allow-Methods": "POST, OPTIONS" };
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  let runId: string | null = null; let service: any = null;
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const client = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, { global: { headers: { Authorization: auth } } });
    const { data: ud } = await client.auth.getUser(); const user = ud?.user; if (!user) return json({ error: "Unauthorized" }, 401);
    const { data: role } = await client.from("user_roles").select("role").eq("user_id", user.id).eq("role", "admin").maybeSingle(); if (!role) return json({ error: "Admin only" }, 403);
    const body = await req.json().catch(() => ({})); const command = typeof body?.command === "string" ? body.command.trim().slice(0, 5000) : ""; if (!command) return json({ error: "command is required" }, 400);
    service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data: snapshot, error: snapshotError } = await service.rpc("admin_ai_live_snapshot"); if (snapshotError || !snapshot) throw new Error(snapshotError?.message || "Live context unavailable");
    const { data: run, error: createError } = await service.from("ai_runs").insert({ command, mode: "operate", status: "planning", requested_by: user.id, context_snapshot: snapshot }).select("*").single(); if (createError || !run) throw new Error(createError?.message || "AI run could not be created"); runId = run.id;
    const response = await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/admin-chat`, { method: "POST", headers: { Authorization: auth, apikey: Deno.env.get("SUPABASE_ANON_KEY")!, "Content-Type": "application/json" }, body: JSON.stringify({ messages: [{ role: "user", content: command }] }) });
    const text = await response.text(); if (!response.ok) { let message = `Admin AI returned ${response.status}`; try { message = JSON.parse(text)?.error ?? message; } catch {} throw new Error(message); }
    const reply = extract(text) || "Admin AI completed the request but returned no text.";
    const { data: saved, error: saveError } = await service.from("ai_runs").update({ status: "completed", reply, updated_at: new Date().toISOString() }).eq("id", runId).select("*").single(); if (saveError || !saved) throw new Error(saveError?.message || "AI result could not be saved");
    return json({ ok: true, run: saved, actions: [], guardrails: { live_business_brain: true, context_checked_at: snapshot.checked_at, external_execution: false, commercial_commitments_require_owner: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Internal error"; if (runId && service) await service.from("ai_runs").update({ status: "failed", reply: message, updated_at: new Date().toISOString() }).eq("id", runId); return json({ error: message }, 500);
  }
});
function extract(stream: string) { let out = ""; for (const line of stream.split("\n")) { if (!line.startsWith("data: ")) continue; const p = line.slice(6).trim(); if (!p || p === "[DONE]") continue; try { const c = JSON.parse(p)?.choices?.[0]?.delta?.content; if (typeof c === "string") out += c; } catch {} } return out.trim(); }
function json(payload: unknown, status = 200) { return new Response(JSON.stringify(payload), { status, headers: { ...headers, "Content-Type": "application/json", "Cache-Control": "no-store" } }); }
