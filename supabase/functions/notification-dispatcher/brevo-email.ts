import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

type Json = Record<string, unknown>;

type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

type OutboxEmailRow = {
  id: string;
  recipient: string;
  attempt_count: number;
  payload: Json;
};

export type BrevoSendOutcome =
  | { status: "sent"; error: null; evidence: Json }
  | { status: "blocked" | "retry" | "failed"; error: string; evidence: Json };

export const BREVO_PROVIDER = "brevo-api";
export const BREVO_SECRET_NAME = "brevo_api_key";
export const BREVO_ENV_SECRET_NAME = "BREVO_API_KEY";
export const CHATGPT_OUTBOUND_TEMPLATE = "chatgpt_outbound";
export const BREVO_CHATGPT_DAILY_CAP = 200;
export const BREVO_BRIDGE_VERSION = "2026-08-07-v2";

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";
const DEFAULT_SENDER = "info@irhaapparels.com";
const MAX_ATTEMPTS = 5;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ALLOWED_SENDERS: Record<string, string> = {
  "info@irhaapparels.com": "Irha Apparels",
  "sales@irhaapparels.com": "Irha Apparels Sales",
  "export@irhaapparels.com": "Irha Apparels Export",
  "contact@irhaapparels.com": "Irha Apparels",
};

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.split("\u0000").join("").trim().slice(0, max) : "";
}

function validEmail(value: unknown) {
  const candidate = text(value, 254).toLowerCase();
  return EMAIL_PATTERN.test(candidate) ? candidate : "";
}

function emailList(value: unknown, max = 20) {
  const values = Array.isArray(value)
    ? value
    : typeof value === "string"
      ? value.split(",")
      : [];
  return values.map((item) => validEmail(item)).filter(Boolean).slice(0, max);
}

export function isChatgptOutbound(payload: Json) {
  return text(payload.template, 80) === CHATGPT_OUTBOUND_TEMPLATE;
}

function senderForPayload(payload: Json) {
  if (!isChatgptOutbound(payload)) {
    return { address: DEFAULT_SENDER, name: ALLOWED_SENDERS[DEFAULT_SENDER] };
  }
  const address = validEmail(payload.from_address);
  const name = ALLOWED_SENDERS[address];
  return name ? { address, name } : null;
}

function replyToForPayload(payload: Json, senderAddress: string) {
  if (isChatgptOutbound(payload)) return senderAddress;
  return validEmail(payload.reply_to) || DEFAULT_SENDER;
}

export async function getBrevoApiKey(service: SupabaseClient) {
  const { data, error } = await service.rpc("notification_get_secret", { _name: BREVO_SECRET_NAME });
  const vaultKey = error ? "" : text(data, 4000);
  if (vaultKey) return vaultKey;

  const runtimeKey = text(Deno.env.get(BREVO_ENV_SECRET_NAME), 4000)
    || text(Deno.env.get(BREVO_SECRET_NAME), 4000);
  if (runtimeKey) return runtimeKey;

  if (error) console.error("Brevo Vault secret lookup failed");
  return "";
}

async function chatgptSentInLast24Hours(service: SupabaseClient) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count, error } = await service
    .from("notification_delivery_attempts")
    .select("id", { count: "exact", head: true })
    .eq("channel", "email")
    .eq("provider", BREVO_PROVIDER)
    .eq("status", "sent")
    .gte("created_at", since)
    .contains("metadata", { source: CHATGPT_OUTBOUND_TEMPLATE });
  if (error) throw new Error("Unable to evaluate ChatGPT email safety cap");
  return count || 0;
}

function apiErrorMessage(status: number, raw: string) {
  if (!raw) return `Brevo API returned ${status}`;
  try {
    const parsed = JSON.parse(raw) as Json;
    return text(parsed.message, 1200) || text(parsed.code, 200) || `Brevo API returned ${status}`;
  } catch {
    return `Brevo API returned ${status}: ${raw.slice(0, 1000)}`;
  }
}

export async function sendBrevoEmail(
  service: SupabaseClient,
  row: OutboxEmailRow,
  payload: Json,
  rendered: RenderedEmail,
  apiKey: string,
): Promise<BrevoSendOutcome> {
  const sender = senderForPayload(payload);
  if (!sender) {
    return {
      status: "blocked",
      error: "Requested From address is not an approved Irha Apparels sender",
      evidence: { source: CHATGPT_OUTBOUND_TEMPLATE },
    };
  }

  const recipient = validEmail(row.recipient);
  if (!recipient) {
    return {
      status: "failed",
      error: "Recipient email address is invalid",
      evidence: { source: isChatgptOutbound(payload) ? CHATGPT_OUTBOUND_TEMPLATE : "notification" },
    };
  }

  if (isChatgptOutbound(payload)) {
    try {
      const sent = await chatgptSentInLast24Hours(service);
      if (sent >= BREVO_CHATGPT_DAILY_CAP) {
        return {
          status: "blocked",
          error: `ChatGPT outbound safety cap reached (${BREVO_CHATGPT_DAILY_CAP} messages in 24 hours)`,
          evidence: { source: CHATGPT_OUTBOUND_TEMPLATE, sent_last_24h: sent },
        };
      }
    } catch (error) {
      return {
        status: "retry",
        error: error instanceof Error ? error.message : "Unable to evaluate ChatGPT email safety cap",
        evidence: { source: CHATGPT_OUTBOUND_TEMPLATE },
      };
    }
  }

  if (!apiKey) {
    return {
      status: "blocked",
      error: "Brevo API provider is not configured",
      evidence: { source: isChatgptOutbound(payload) ? CHATGPT_OUTBOUND_TEMPLATE : "notification" },
    };
  }

  const source = isChatgptOutbound(payload) ? CHATGPT_OUTBOUND_TEMPLATE : "notification";
  const cc = isChatgptOutbound(payload) ? emailList(payload.cc) : [];
  const bcc = isChatgptOutbound(payload) ? emailList(payload.bcc) : [];
  const requestBody: Json = {
    sender: { name: sender.name, email: sender.address },
    to: [{ email: recipient }],
    replyTo: { email: replyToForPayload(payload, sender.address) },
    subject: rendered.subject,
    htmlContent: rendered.html,
    headers: {
      "Idempotency-Key": row.id,
      "X-Irha-Outbox-ID": row.id,
      "X-Irha-Source": source,
      "X-Irha-Bridge-Version": BREVO_BRIDGE_VERSION,
    },
    tags: [source === CHATGPT_OUTBOUND_TEMPLATE ? "irha-chatgpt-outbound" : "irha-notification"],
  };
  if (cc.length) requestBody.cc = cc.map((email) => ({ email }));
  if (bcc.length) requestBody.bcc = bcc.map((email) => ({ email }));

  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": apiKey,
        "content-type": "application/json",
      },
      body: JSON.stringify(requestBody),
    });
    const raw = await response.text();
    let result: Json = {};
    try { result = JSON.parse(raw) as Json; } catch { result = { raw: raw.slice(0, 1000) }; }
    const evidence: Json = {
      source,
      bridge_version: BREVO_BRIDGE_VERSION,
      provider_message_id: text(result.messageId, 500) || null,
      from_address: sender.address,
      response_status: response.status,
    };
    if (response.ok) return { status: "sent", error: null, evidence };

    const message = apiErrorMessage(response.status, raw);
    if ([401, 403, 402].includes(response.status)) {
      return { status: "blocked", error: message, evidence };
    }
    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
      return { status: "failed", error: message, evidence };
    }
    if (row.attempt_count >= MAX_ATTEMPTS) {
      return { status: "failed", error: message, evidence };
    }
    return { status: "retry", error: message, evidence };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Brevo API request failed";
    const evidence: Json = { source, bridge_version: BREVO_BRIDGE_VERSION, from_address: sender.address };
    if (row.attempt_count >= MAX_ATTEMPTS) return { status: "failed", error: message, evidence };
    return { status: "retry", error: message, evidence };
  }
}
