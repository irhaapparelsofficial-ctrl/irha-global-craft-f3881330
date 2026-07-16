import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SITE_URL = "https://irhaapparels.com";
const MAX_BATCH = 50;
const MAX_ATTEMPTS = 5;

type Json = Record<string, unknown>;
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

const responseHeaders = {
  "content-type": "application/json; charset=utf-8",
  "cache-control": "no-store",
  "x-content-type-options": "nosniff",
};

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: responseHeaders });
}

function text(value: unknown, max = 4000) {
  return typeof value === "string"
    ? value.replace(/\u0000/g, "").trim().slice(0, max)
    : "";
}

function isRecord(value: unknown): value is Json {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return result === 0;
}

async function secret(name: string) {
  const { data, error } = await service.rpc("notification_get_secret", { _name: name });
  if (error) throw new Error(`Secret lookup failed for ${name}: ${error.message}`);
  return typeof data === "string" ? data.trim() : "";
}

async function requireCronToken(req: Request) {
  const provided = text(req.headers.get("x-irha-notification-token"), 300);
  const expected = await secret("irha_notification_dispatch_token");
  return Boolean(provided && expected && constantTimeEqual(provided, expected));
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

  const { data: role } = await auth
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();

  return role?.role === "admin" ? user : null;
}

function base64UrlToBuffer(value: string) {
  const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const binary = atob(padded);
  return Uint8Array.from(binary, (character) => character.charCodeAt(0));
}

function validSubscription(value: unknown) {
  if (!isRecord(value)) return null;
  const endpoint = text(value.endpoint, 3000);
  const keys = isRecord(value.keys) ? value.keys : {};
  const p256dh = text(keys.p256dh, 500);
  const auth = text(keys.auth, 500);
  if (!endpoint.startsWith("https://") || p256dh.length < 20 || auth.length < 8) return null;
  try {
    base64UrlToBuffer(p256dh);
    base64UrlToBuffer(auth);
  } catch {
    return null;
  }
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

function renderEmail(payload: Json) {
  const template = text(payload.template, 80);
  const subject = text(payload.subject, 300) || "Irha Apparels notification";

  if (template === "buyer_confirmation") {
    const name = escapeHtml(payload.name) || "Buyer";
    const reference = escapeHtml(payload.reference);
    const requestType = escapeHtml(payload.request_type) || "manufacturing request";
    const category = escapeHtml(payload.category);
    const quantity = escapeHtml(payload.quantity);
    const detailRows = [
      reference ? `<tr><td style="padding:7px 0;color:#6b7280">Reference</td><td style="padding:7px 0;font-weight:600">${reference}</td></tr>` : "",
      category ? `<tr><td style="padding:7px 0;color:#6b7280">Category</td><td style="padding:7px 0;font-weight:600">${category}</td></tr>` : "",
      quantity ? `<tr><td style="padding:7px 0;color:#6b7280">Quantity</td><td style="padding:7px 0;font-weight:600">${quantity}</td></tr>` : "",
    ].join("");

    return {
      subject,
      text: `Hello ${text(payload.name, 100) || "Buyer"},\n\nWe received your ${text(payload.request_type, 160) || "manufacturing request"}. Our team will review the requirements and respond from a company email. Reference: ${text(payload.reference, 160)}\n\nIrha Apparels\nSialkot, Pakistan\n${SITE_URL}`,
      html: `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:0 auto;padding:28px 16px"><div style="background:#0b2747;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0"><div style="font-size:22px;font-weight:700">Irha Apparels</div><div style="margin-top:4px;color:#d5ad4d;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Manufacturing Specialists</div></div><div style="background:#fff;padding:28px 26px;border-radius:0 0 14px 14px"><h1 style="font-size:24px;margin:0 0 16px">Request received</h1><p style="line-height:1.65;margin:0 0 18px">Hello ${name}, we received your ${requestType}. Our team will review the product, customization, quantity and delivery requirements before preparing a response.</p><table style="width:100%;border-collapse:collapse;margin:18px 0">${detailRows}</table><p style="line-height:1.65;color:#4b5563">Irha Apparels is an experienced manufacturer and the website is newly built. A live factory-view video call can be arranged for buyer verification.</p><a href="${SITE_URL}" style="display:inline-block;margin-top:10px;background:#d5ad4d;color:#0b2747;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Visit Irha Apparels</a><p style="margin:24px 0 0;color:#6b7280;font-size:12px">Sialkot, Pakistan · B2B manufacturing only</p></div></div></body></html>`,
    };
  }

  const title = escapeHtml(payload.title) || "Owner alert";
  const body = escapeHtml(payload.body);
  const url = text(payload.url, 1000).startsWith("https://") ? text(payload.url, 1000) : `${SITE_URL}/admin`;

  return {
    subject,
    text: `${text(payload.title, 300)}\n\n${text(payload.body, 4000)}\n\nOpen: ${url}`,
    html: `<!doctype html><html><body style="margin:0;background:#f4f1ea;font-family:Arial,sans-serif;color:#111827"><div style="max-width:640px;margin:0 auto;padding:28px 16px"><div style="background:#0b2747;color:#fff;padding:22px 26px;border-radius:14px 14px 0 0"><div style="font-size:22px;font-weight:700">Irha Apparels</div><div style="margin-top:4px;color:#d5ad4d;font-size:12px;letter-spacing:.14em;text-transform:uppercase">Owner notification</div></div><div style="background:#fff;padding:28px 26px;border-radius:0 0 14px 14px"><h1 style="font-size:24px;margin:0 0 16px">${title}</h1><p style="line-height:1.65;white-space:pre-wrap">${body}</p><a href="${escapeHtml(url)}" style="display:inline-block;margin-top:14px;background:#d5ad4d;color:#0b2747;text-decoration:none;font-weight:700;padding:12px 18px;border-radius:8px">Open admin</a></div></div></body></html>`,
  };
}

async function recordAttempt(
  row: OutboxRow,
  status: "sent" | "blocked" | "retry" | "failed",
  provider: string,
  error: string | null,
  metadata: Json = {},
) {
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

async function finish(
  row: OutboxRow,
  status: "sent" | "blocked" | "retry" | "failed",
  provider: string,
  error: string | null,
  metadata: Json = {},
) {
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
  const publicKey = await secret("irha_vapid_public_key");
  const privateKey = await secret("irha_vapid_private_key");
  const { data: ownerEmail } = await service.rpc("notification_owner_email");

  if (!publicKey || !privateKey) {
    await finish(row, "blocked", "web-push", "VAPID keys are not configured");
    return;
  }

  const { data: subscriptions, error } = await service
    .from("owner_push_subscriptions")
    .select("id,endpoint,p256dh,auth")
    .eq("enabled", true);

  if (error) throw error;
  if (!subscriptions?.length) {
    await finish(row, "blocked", "web-push", "No active owner push subscription");
    return;
  }

  webpush.setVapidDetails(`mailto:${ownerEmail || "irhaapparelsofficial@gmail.com"}`, publicKey, privateKey);
  const payload = JSON.stringify({
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
  const errors: string[] = [];

  for (const subscription of subscriptions) {
    try {
      await webpush.sendNotification({
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      }, payload, {
        TTL: 600,
        urgency: "high",
        topic: text(row.payload.kind, 24) || "irha-alert",
      });
      sent += 1;
      await service.from("owner_push_subscriptions").update({
        last_success_at: new Date().toISOString(),
        failure_count: 0,
        last_error: null,
        updated_at: new Date().toISOString(),
      }).eq("id", subscription.id);
    } catch (error) {
      const statusCode = Number((error as { statusCode?: number })?.statusCode || 0);
      const message = error instanceof Error ? error.message : String(error);
      errors.push(message.slice(0, 300));
      if (statusCode === 404 || statusCode === 410) {
        disabled += 1;
        await service.from("owner_push_subscriptions").update({
          enabled: false,
          failure_count: 1,
          last_error: `Push endpoint expired (${statusCode})`,
          updated_at: new Date().toISOString(),
        }).eq("id", subscription.id);
      } else {
        await service.from("owner_push_subscriptions").update({
          failure_count: 1,
          last_error: message.slice(0, 1000),
          updated_at: new Date().toISOString(),
        }).eq("id", subscription.id);
      }
    }
  }

  if (sent > 0) {
    await finish(row, "sent", "web-push", null, { sent, disabled, attempted: subscriptions.length });
  } else if (disabled === subscriptions.length) {
    await finish(row, "blocked", "web-push", "All push subscriptions expired", { disabled });
  } else if (row.attempt_count >= MAX_ATTEMPTS) {
    await finish(row, "failed", "web-push", errors.join(" | ") || "Push delivery failed");
  } else {
    await finish(row, "retry", "web-push", errors.join(" | ") || "Push delivery failed");
  }
}

async function processEmail(row: OutboxRow) {
  const apiKey = await secret("irha_resend_api_key");
  const from = await secret("irha_email_from");

  if (!apiKey || !from) {
    await finish(row, "blocked", "resend", "Email provider is not configured");
    return;
  }

  const rendered = renderEmail(row.payload);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
      "idempotency-key": row.id,
    },
    body: JSON.stringify({
      from,
      to: [row.recipient],
      reply_to: text(row.payload.reply_to, 254) || "info@irhaapparels.com",
      subject: rendered.subject,
      html: rendered.html,
      text: rendered.text,
      tags: [
        { name: "source", value: "irha-website" },
        { name: "event", value: text(row.payload.template, 80) || "owner-alert" },
      ],
    }),
  });

  const raw = await response.text();
  let result: Json = {};
  try {
    result = JSON.parse(raw) as Json;
  } catch {
    result = { raw: raw.slice(0, 1000) };
  }

  if (response.ok) {
    await finish(row, "sent", "resend", null, { provider_id: result.id || null });
  } else {
    const error = `Resend returned ${response.status}: ${raw.slice(0, 1500)}`;
    if ([401, 403, 422].includes(response.status)) {
      await finish(row, "blocked", "resend", error, { status: response.status });
    } else if (row.attempt_count >= MAX_ATTEMPTS) {
      await finish(row, "failed", "resend", error, { status: response.status });
    } else {
      await finish(row, "retry", "resend", error, { status: response.status });
    }
  }
}

async function processOutbox(limit = 25) {
  const { data, error } = await service.rpc("notification_claim_outbox", {
    _limit: Math.max(1, Math.min(limit, MAX_BATCH)),
  });
  if (error) throw error;

  const rows = (data || []) as OutboxRow[];
  const results = { claimed: rows.length, sent: 0, blocked: 0, retry: 0, failed: 0 };

  for (const row of rows) {
    try {
      if (row.channel === "web_push") await processPush(row);
      else if (row.channel === "email") await processEmail(row);
      const { data: state } = await service
        .from("notification_outbox")
        .select("status")
        .eq("id", row.id)
        .single();
      const status = text(state?.status, 20) as keyof typeof results;
      if (status in results && status !== "claimed") results[status] += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (row.attempt_count >= MAX_ATTEMPTS) {
        await finish(row, "failed", row.channel, message);
        results.failed += 1;
      } else {
        await finish(row, "retry", row.channel, message);
        results.retry += 1;
      }
    }
  }

  return results;
}

async function handleAdmin(req: Request, body: Json) {
  const user = await requireAdmin(req);
  if (!user) return json({ error: "Admin authentication required" }, 401);

  const action = text(body.action, 80);

  if (action === "config" || action === "health") {
    const publicKey = await secret("irha_vapid_public_key");
    const resendKey = await secret("irha_resend_api_key");
    const emailFrom = await secret("irha_email_from");
    const { count: subscriptionCount } = await service
      .from("owner_push_subscriptions")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("enabled", true);
    const { data: health } = await service.rpc("notification_delivery_health");
    return json({
      ok: true,
      vapid_public_key: publicKey || null,
      push_supported: Boolean(publicKey),
      active_subscriptions: subscriptionCount || 0,
      email_provider_configured: Boolean(resendKey && emailFrom),
      health: health || {},
    });
  }

  if (action === "subscribe") {
    const subscription = validSubscription(body.subscription);
    if (!subscription) return json({ error: "Invalid push subscription" }, 400);

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
    await service.from("notification_outbox").insert({
      dedupe_key: eventKey,
      event_key: eventKey,
      channel: "web_push",
      recipient: "owner-admins",
      payload: {
        title: "Irha owner alerts enabled",
        body: "Background notifications are now connected to this device.",
        url: "/admin",
        tag: eventKey,
        kind: "system",
      },
    });
    const processed = await processOutbox(10);
    return json({ ok: true, subscribed: true, test: processed });
  }

  if (action === "unsubscribe") {
    const endpoint = text(body.endpoint, 3000);
    if (!endpoint) return json({ error: "endpoint is required" }, 400);
    await service.from("owner_push_subscriptions").update({
      enabled: false,
      updated_at: new Date().toISOString(),
    }).eq("user_id", user.id).eq("endpoint", endpoint);
    return json({ ok: true, subscribed: false });
  }

  if (action === "test_push") {
    const eventKey = `manual-push-test:${user.id}:${Date.now()}`;
    await service.from("notification_outbox").insert({
      dedupe_key: eventKey,
      event_key: eventKey,
      channel: "web_push",
      recipient: "owner-admins",
      payload: {
        title: "Irha notification test",
        body: "Your quote and human live-chat alerts are connected.",
        url: "/admin",
        tag: eventKey,
        kind: "system",
      },
    });
    return json({ ok: true, queued: true, processed: await processOutbox(10) });
  }

  if (action === "requeue_email") {
    const { data, error } = await service.rpc("notification_requeue_blocked", { _channel: "email" });
    if (error) throw error;
    return json({ ok: true, requeued: data || 0, processed: await processOutbox(25) });
  }

  return json({ error: "Unsupported action" }, 400);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": SITE_URL,
        "access-control-allow-headers": "authorization,apikey,content-type,x-irha-notification-token",
        "access-control-allow-methods": "POST,OPTIONS",
        "access-control-max-age": "86400",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const body = await req.json().catch(() => ({})) as Json;
    const action = text(body.action, 80);

    if (action === "process") {
      if (!(await requireCronToken(req))) return json({ error: "Unauthorized" }, 401);
      return json({ ok: true, ...(await processOutbox(Number(body.limit) || 25)) });
    }

    return await handleAdmin(req, body);
  } catch (error) {
    console.error("notification-dispatcher error", error);
    return json({ error: error instanceof Error ? error.message : "Notification dispatcher failed" }, 500);
  }
});
