import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = "https://irhaapparels.com";
const MAX_BATCH = 50;
const MAX_ATTEMPTS = 5;

type Json = Record<string, unknown>;
type BuyerItem = { name: string; quantity: string; sizes: string; notes: string };
type OutboxRow = {
  id: string;
  notification_id: string | null;
  channel: "web_push" | "email";
  recipient: string;
  payload: Json;
  attempt_count: number;
  event_key: string;
};

const service = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function allowedOrigin(origin: string | null) {
  if (!origin) return SITE_URL;
  try {
    const host = new URL(origin).hostname;
    return host === "irhaapparels.com" || host === "www.irhaapparels.com" || host === "localhost"
      ? origin
      : SITE_URL;
  } catch {
    return SITE_URL;
  }
}

function headers(origin: string | null) {
  return {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    "access-control-allow-origin": allowedOrigin(origin),
    "access-control-allow-headers": "authorization,apikey,content-type,x-client-info",
    "access-control-allow-methods": "POST,OPTIONS",
    "vary": "Origin",
  };
}

function json(payload: unknown, status = 200, origin: string | null = null) {
  return new Response(JSON.stringify(payload), { status, headers: headers(origin) });
}

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

async function requireAdmin(req: Request) {
  const authorization = req.headers.get("authorization") || "";
  if (!authorization.startsWith("Bearer ")) return null;
  const auth = createClient(SUPABASE_URL, ANON_KEY, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: userData } = await auth.auth.getUser();
  const user = userData.user;
  if (!user) return null;
  const { data: role } = await auth.from("user_roles").select("role")
    .eq("user_id", user.id).eq("role", "admin").maybeSingle();
  return role?.role === "admin" ? user : null;
}

function validSubscription(value: unknown) {
  if (!isRecord(value)) return null;
  const endpoint = text(value.endpoint, 3000);
  const keys = isRecord(value.keys) ? value.keys : {};
  const p256dh = text(keys.p256dh, 500);
  const auth = text(keys.auth, 500);
  if (!endpoint.startsWith("https://") || p256dh.length < 20 || auth.length < 8) return null;
  return { endpoint, keys: { p256dh, auth } };
}

function escapeHtml(value: unknown) {
  return text(value, 12000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function buyerItems(value: unknown): BuyerItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 50).flatMap((item) => {
    if (!isRecord(item)) return [];
    const name = text(item.name, 240);
    const quantity = text(item.target_quantity ?? item.quantity, 40);
    if (!name) return [];
    return [{
      name,
      quantity,
      sizes: text(item.size_breakdown ?? item.sizes, 1000),
      notes: text(item.notes, 1000),
    }];
  });
}

function itemSummary(items: BuyerItem[]) {
  if (items.length === 0) return { text: "", html: "" };
  const textRows = items.map((item, index) => {
    const details = [item.quantity ? `${item.quantity} pcs` : "quantity pending", item.sizes ? `sizes: ${item.sizes}` : ""].filter(Boolean).join(" · ");
    return `${index + 1}. ${item.name} — ${details}${item.notes ? `\n   Notes: ${item.notes}` : ""}`;
  }).join("\n");
  const htmlRows = items.map((item, index) => `
    <tr>
      <td style="padding:12px 10px;border-top:1px solid #e5e7eb;color:#6b7280;vertical-align:top">${index + 1}</td>
      <td style="padding:12px 10px;border-top:1px solid #e5e7eb;vertical-align:top"><strong>${escapeHtml(item.name)}</strong>${item.notes ? `<div style="margin-top:5px;color:#6b7280;font-size:12px">${escapeHtml(item.notes)}</div>` : ""}</td>
      <td style="padding:12px 10px;border-top:1px solid #e5e7eb;vertical-align:top;white-space:nowrap">${escapeHtml(item.quantity || "Pending")}</td>
      <td style="padding:12px 10px;border-top:1px solid #e5e7eb;vertical-align:top">${escapeHtml(item.sizes || "To be confirmed")}</td>
    </tr>`).join("");
  return {
    text: `\n\nRFQ summary (${items.length} style${items.length === 1 ? "" : "s"}):\n${textRows}`,
    html: `<div style="margin:24px 0"><h2 style="font-size:18px;margin:0 0 12px">RFQ summary</h2><div style="overflow-x:auto"><table role="presentation" style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="background:#f8fafc"><th style="padding:10px;text-align:left">#</th><th style="padding:10px;text-align:left">Style</th><th style="padding:10px;text-align:left">Qty</th><th style="padding:10px;text-align:left">Size breakdown</th></tr></thead><tbody>${htmlRows}</tbody></table></div></div>`,
  };
}

function renderEmail(payload: Json) {
  const template = text(payload.template, 80);
  const subject = text(payload.subject, 300) || "Irha Apparels notification";
  if (template === "buyer_confirmation") {
    const rawName = text(payload.name, 100) || "Buyer";
    const name = escapeHtml(rawName);
    const company = escapeHtml(payload.company);
    const rawReference = text(payload.reference, 160);
    const reference = escapeHtml(rawReference);
    const rawRequestType = text(payload.request_type, 160) || "manufacturing request";
    const requestType = escapeHtml(rawRequestType);
    const summary = itemSummary(buyerItems(payload.items));
    const rawMessage = text(payload.message, 4000);
    const message = escapeHtml(rawMessage);
    return {
      subject,
      text: `Hello ${rawName},\n\nWe received your ${rawRequestType}.${company ? ` Company: ${text(payload.company, 160)}.` : ""} Reference: ${rawReference}.${summary.text}${rawMessage ? `\n\nAdditional notes:\n${rawMessage}` : ""}\n\nOur team will review product feasibility, quantities, sizes, branding, sampling, trade terms and delivery requirements before sending a written quotation.\n\nIrha Apparels\nSialkot, Pakistan\nhttps://irhaapparels.com`,
      html: `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#111827"><div style="max-width:680px;margin:0 auto;padding:28px 16px"><div style="background:#0b2747;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0"><strong style="font-size:22px">Irha Apparels</strong><div style="color:#d5ad4d;font-size:12px;text-transform:uppercase">Manufacturing Specialists</div></div><div style="background:#fff;padding:28px 26px;border-radius:0 0 14px 14px"><h1 style="margin-top:0">Request received</h1><p>Hello ${name}, we received your ${requestType}. Our sourcing team will review the requirements before responding.</p>${company ? `<p><strong>Company:</strong> ${company}</p>` : ""}${reference ? `<p><strong>Inquiry ID:</strong> <span style="font-family:monospace;color:#0b2747">${reference}</span></p>` : ""}${summary.html}${message ? `<div style="margin:20px 0;padding:16px;background:#f8fafc;border-left:3px solid #d5ad4d"><strong>Additional notes</strong><div style="margin-top:8px;white-space:pre-wrap;color:#4b5563">${message}</div></div>` : ""}<p style="color:#4b5563;line-height:1.65">We will confirm feasibility, material and construction details, quantities, size breakdowns, branding, sampling, Incoterm and delivery requirements in writing.</p><p style="color:#4b5563;line-height:1.65">Irha Apparels is an experienced manufacturer and the website is newly built. A live factory-view video call can be arranged for qualified buyers.</p><a href="${SITE_URL}/inquiry-cart" style="display:inline-block;background:#d5ad4d;color:#0b2747;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Open Irha Apparels</a></div></div></body></html>`,
    };
  }
  const title = escapeHtml(payload.title) || "Owner alert";
  const body = escapeHtml(payload.body);
  const url = text(payload.url, 1000).startsWith("https://") ? text(payload.url, 1000) : `${SITE_URL}/admin`;
  return {
    subject,
    text: `${text(payload.title, 300)}\n\n${text(payload.body, 4000)}\n\nOpen: ${url}`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:0 auto;padding:28px 16px"><div style="background:#0b2747;color:#fff;padding:22px 26px"><strong style="font-size:22px">Irha Apparels</strong><div style="color:#d5ad4d;font-size:12px;text-transform:uppercase">Owner notification</div></div><div style="background:#fff;padding:28px 26px"><h1>${title}</h1><p style="white-space:pre-wrap">${body}</p><a href="${escapeHtml(url)}" style="display:inline-block;background:#d5ad4d;color:#0b2747;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Open admin</a></div></div></body></html>`,
  };
}

async function recordAttempt(row: OutboxRow, status: "sent" | "blocked" | "retry" | "failed", provider: string, error: string | null, metadata: Json = {}) {
  await service.from("notification_delivery_attempts").insert({
    outbox_id: row.id,
    notification_id: row.notification_id,
    channel: row.channel,
    provider,
    recipient: row.recipient,
    status,
    error: error?.slice(0, 2000) || null,
    metadata,
  });
}

async function finish(row: OutboxRow, status: "sent" | "blocked" | "retry" | "failed", provider: string, error: string | null, metadata: Json = {}) {
  const update: Json = {
    status,
    provider,
    last_error: error?.slice(0, 4000) || null,
    locked_at: null,
    updated_at: new Date().toISOString(),
    response_metadata: metadata,
  };
  if (status === "sent") update.sent_at = new Date().toISOString();
  if (status === "retry") {
    const delayMinutes = Math.min(60, Math.max(1, 2 ** Math.min(row.attempt_count, 6)));
    update.next_attempt_at = new Date(Date.now() + delayMinutes * 60_000).toISOString();
  }
  await service.from("notification_outbox").update(update).eq("id", row.id);
  await recordAttempt(row, status, provider, error, metadata);
}

async function processPush(row: OutboxRow) {
  const publicKey = text(Deno.env.get("VAPID_PUBLIC_KEY"), 500);
  const privateKey = text(Deno.env.get("VAPID_PRIVATE_KEY"), 500);
  if (!publicKey || !privateKey) {
    await finish(row, "blocked", "web-push", "VAPID keys are not configured");
    return;
  }
  const { data: subscriptions, error } = await service.from("owner_push_subscriptions")
    .select("id,endpoint,p256dh,auth").eq("enabled", true);
  if (error) throw error;
  if (!subscriptions?.length) {
    await finish(row, "blocked", "web-push", "No active owner push subscription");
    return;
  }
  webpush.setVapidDetails("mailto:irhaapparelsofficial@gmail.com", publicKey, privateKey);
  const pushPayload = JSON.stringify({
    title: text(row.payload.title, 180) || "Irha Apparels",
    body: text(row.payload.body, 500) || "Owner attention required",
    icon: "/icon-512x512.png",
    badge: "/icon-512x512.png",
    url: text(row.payload.url, 1000) || "/admin",
    tag: text(row.payload.tag, 300) || row.event_key,
    kind: text(row.payload.kind, 80),
    timestamp: Date.now(),
  });
  let sent = 0;
  let disabled = 0;
  const failures: string[] = [];
  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({ endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, pushPayload, { TTL: 600, urgency: "high" });
      sent += 1;
      await service.from("owner_push_subscriptions").update({ last_success_at: new Date().toISOString(), failure_count: 0, last_error: null, updated_at: new Date().toISOString() }).eq("id", subscription.id);
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
      const message = error instanceof Error ? error.message : String(error);
      failures.push(message.slice(0, 300));
      if (statusCode === 404 || statusCode === 410) {
        disabled += 1;
        await service.from("owner_push_subscriptions").update({ enabled: false, failure_count: 1, last_error: `Push endpoint expired (${statusCode})`, updated_at: new Date().toISOString() }).eq("id", subscription.id);
      } else {
        await service.from("owner_push_subscriptions").update({ failure_count: 1, last_error: message.slice(0, 1000), updated_at: new Date().toISOString() }).eq("id", subscription.id);
      }
    }
  }
  if (sent > 0) await finish(row, "sent", "web-push", null, { sent, disabled, attempted: subscriptions.length });
  else if (disabled === subscriptions.length) await finish(row, "blocked", "web-push", "All push subscriptions expired", { disabled });
  else if (row.attempt_count >= MAX_ATTEMPTS) await finish(row, "failed", "web-push", failures.join(" | ") || "Push delivery failed");
  else await finish(row, "retry", "web-push", failures.join(" | ") || "Push delivery failed");
}

async function processEmail(row: OutboxRow) {
  const apiKey = text(Deno.env.get("RESEND_API_KEY"), 1000);
  const from = text(Deno.env.get("IRHA_EMAIL_FROM"), 300);
  if (!apiKey || !from) {
    await finish(row, "blocked", "resend", "Email provider is not configured");
    return;
  }
  const rendered = renderEmail(row.payload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", "idempotency-key": row.id },
    body: JSON.stringify({ from, to: [row.recipient], reply_to: text(row.payload.reply_to, 254) || "info@irhaapparels.com", subject: rendered.subject, html: rendered.html, text: rendered.text }),
  });
  const raw = await response.text();
  let result: Json = {};
  try { result = JSON.parse(raw) as Json; } catch { result = { raw: raw.slice(0, 1000) }; }
  if (response.ok) await finish(row, "sent", "resend", null, { provider_id: result.id || null });
  else {
    const message = `Resend returned ${response.status}: ${raw.slice(0, 1500)}`;
    if ([401, 403, 422].includes(response.status)) await finish(row, "blocked", "resend", message, { status: response.status });
    else if (row.attempt_count >= MAX_ATTEMPTS) await finish(row, "failed", "resend", message, { status: response.status });
    else await finish(row, "retry", "resend", message, { status: response.status });
  }
}

async function processOutbox(limit = 25) {
  const { data: allowed, error: guardError } = await service.rpc("notification_begin_dispatch", { _minimum_seconds: 20 });
  if (guardError) throw guardError;
  if (allowed !== true) return { accepted: true, throttled: true };
  const { data, error } = await service.rpc("notification_claim_outbox", { _limit: Math.max(1, Math.min(limit, MAX_BATCH)) });
  if (error) throw error;
  const rows = (data || []) as OutboxRow[];
  for (const row of rows) {
    try {
      if (row.channel === "web_push") await processPush(row);
      else await processEmail(row);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await finish(row, row.attempt_count >= MAX_ATTEMPTS ? "failed" : "retry", row.channel, message);
    }
  }
  return { accepted: true, claimed: rows.length };
}

async function adminAction(req: Request, body: Json, origin: string | null) {
  const user = await requireAdmin(req);
  if (!user) return json({ error: "Admin authentication required" }, 401, origin);
  const action = text(body.action, 80);
  if (action === "config" || action === "health") {
    const publicKey = text(Deno.env.get("VAPID_PUBLIC_KEY"), 500);
    const resendKey = text(Deno.env.get("RESEND_API_KEY"), 1000);
    const emailFrom = text(Deno.env.get("IRHA_EMAIL_FROM"), 300);
    const { count } = await service.from("owner_push_subscriptions").select("id", { count: "exact", head: true }).eq("user_id", user.id).eq("enabled", true);
    const { data: health } = await service.rpc("notification_delivery_health");
    return json({ ok: true, vapid_public_key: publicKey || null, push_supported: Boolean(publicKey), active_subscriptions: count || 0, email_provider_configured: Boolean(resendKey && emailFrom), health: health || {} }, 200, origin);
  }
  if (action === "subscribe") {
    const subscription = validSubscription(body.subscription);
    if (!subscription) return json({ error: "Invalid push subscription" }, 400, origin);
    const { error } = await service.from("owner_push_subscriptions").upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
      user_agent: text(req.headers.get("user-agent"), 1000) || null,
      platform: text(body.platform, 100) || null,
      enabled: true,
      failure_count: 0,
      last_error: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: "endpoint" });
    if (error) throw error;
    await service.rpc("notification_requeue_blocked", { _channel: "web_push" });
    const eventKey = `push-test:${user.id}:${Date.now()}`;
    await service.from("notification_outbox").insert({ dedupe_key: eventKey, event_key: eventKey, channel: "web_push", recipient: "owner-admins", payload: { title: "Irha owner alerts enabled", body: "Background notifications are connected to this device.", url: "/admin", tag: eventKey, kind: "system" } });
    return json({ ok: true, subscribed: true }, 200, origin);
  }
  if (action === "test_push") {
    const eventKey = `manual-push-test:${user.id}:${Date.now()}`;
    await service.from("notification_outbox").insert({ dedupe_key: eventKey, event_key: eventKey, channel: "web_push", recipient: "owner-admins", payload: { title: "Irha notification test", body: "Quote and human live-chat alerts are connected.", url: "/admin", tag: eventKey, kind: "system" } });
    return json({ ok: true, queued: true }, 200, origin);
  }
  if (action === "requeue_email") {
    const { data, error } = await service.rpc("notification_requeue_blocked", { _channel: "email" });
    if (error) throw error;
    return json({ ok: true, requeued: data || 0 }, 200, origin);
  }
  return json({ error: "Unsupported action" }, 400, origin);
}

Deno.serve(async (req: Request) => {
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: headers(origin) });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  try {
    const body = await req.json().catch(() => ({})) as Json;
    if (text(body.action, 80) === "process") {
      const result = await processOutbox(Number(body.limit) || 25);
      return json({ ok: true, ...result }, 200, origin);
    }
    return await adminAction(req, body, origin);
  } catch (error) {
    console.error("notification-dispatcher error", error);
    return json({ error: error instanceof Error ? error.message : "Notification dispatcher failed" }, 500, origin);
  }
});
