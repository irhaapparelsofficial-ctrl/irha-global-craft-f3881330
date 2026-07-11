// Public one-click unsubscribe endpoint for Irha outreach messages.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "GET" && req.method !== "POST") return responsePage("Method not allowed", "This unsubscribe request method is not supported.", 405);

  try {
    const url = new URL(req.url);
    const token = url.searchParams.get("token")?.trim() || "";
    if (!/^[a-f0-9]{48}$/i.test(token)) return responsePage("Invalid link", "This unsubscribe link is invalid or incomplete.", 400);

    const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: message, error } = await service
      .from("outreach_messages")
      .select("id,campaign_id,lead_id,recipient_email,status")
      .eq("unsubscribe_token", token)
      .maybeSingle();
    if (error || !message) return responsePage("Link not found", "This unsubscribe link could not be found.", 404);

    const email = String(message.recipient_email || "").trim().toLowerCase();
    const now = new Date().toISOString();

    await service.from("suppressed_emails").upsert({
      email,
      reason: "unsubscribe",
      metadata: { outreach_message_id: message.id, outreach_campaign_id: message.campaign_id, source: "outreach-unsubscribe" },
      created_at: now,
    }, { onConflict: "email" });

    await service.from("outreach_messages").update({
      status: "unsubscribed",
      error: null,
    }).eq("id", message.id);

    await service.from("b2b_leads").update({
      outreach_opt_out: true,
      last_outreach_status: "unsubscribed",
    }).eq("id", message.lead_id);

    const { data: existingEvent } = await service
      .from("outreach_events")
      .select("id")
      .eq("message_id", message.id)
      .eq("event_type", "unsubscribed")
      .limit(1)
      .maybeSingle();
    if (!existingEvent) {
      await service.from("outreach_events").insert({
        campaign_id: message.campaign_id,
        message_id: message.id,
        lead_id: message.lead_id,
        event_type: "unsubscribed",
        detail: { email, method: req.method, at: now },
        actor: null,
      });
    }

    return responsePage("You are unsubscribed", "This email address will not receive future Irha Apparels outreach messages.", 200);
  } catch (error) {
    console.error("outreach-unsubscribe error", error);
    return responsePage("Request failed", "We could not process the unsubscribe request. Please try again.", 500);
  }
});

function responsePage(title: string, message: string, status: number) {
  const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <meta name="robots" content="noindex,nofollow" />
  <title>${escapeHtml(title)} — Irha Apparels</title>
  <style>
    :root{color-scheme:dark}body{margin:0;background:#08111f;color:#f5f0e5;font-family:Arial,sans-serif;min-height:100vh;display:grid;place-items:center;padding:24px}.card{max-width:560px;border:1px solid #9b7a36;background:#0d192a;padding:42px;text-align:center}.eyebrow{font-size:11px;letter-spacing:.25em;text-transform:uppercase;color:#c9a85e}h1{font-family:Georgia,serif;font-size:32px;margin:14px 0}p{line-height:1.7;color:#cbd3df}a{color:#d5b76c}
  </style>
</head>
<body><main class="card"><div class="eyebrow">Irha Apparels</div><h1>${escapeHtml(title)}</h1><p>${escapeHtml(message)}</p><p><a href="https://www.irhaapparels.com">Return to website</a></p></main></body>
</html>`;
  return new Response(html, { status, headers: { ...corsHeaders, "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[char] || char));
}
