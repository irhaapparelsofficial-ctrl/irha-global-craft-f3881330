import nodemailer from "npm:nodemailer@7.0.5";
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

export const BREVO_PROVIDER = "brevo-smtp";
export const BREVO_SECRET_NAME = "brevo_smtp_key";
export const CHATGPT_OUTBOUND_TEMPLATE = "chatgpt_outbound";
export const BREVO_CHATGPT_DAILY_CAP = 200;

const BREVO_SMTP_HOST = "smtp-relay.brevo.com";
const BREVO_SMTP_PORT = 587;
const BREVO_SMTP_LOGIN = "b4af30001@smtp-brevo.com";
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
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
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

function threadHeaders(payload: Json) {
  const inReplyTo = text(payload.in_reply_to, 1000);
  const rawReferences = Array.isArray(payload.references)
    ? payload.references.map((item) => text(item, 1000)).filter(Boolean).slice(0, 20)
    : text(payload.references, 4000);
  return {
    inReplyTo: inReplyTo || undefined,
    references: Array.isArray(rawReferences)
      ? rawReferences.length > 0 ? rawReferences : undefined
      : rawReferences || undefined,
  };
}

export async function getBrevoSmtpKey(service: SupabaseClient) {
  const { data, error } = await service.rpc("notification_get_secret", { _name: BREVO_SECRET_NAME });
  if (error) {
    console.error("Brevo SMTP secret lookup failed");
    return "";
  }
  return text(data, 4000);
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

function errorDetails(error: unknown) {
  const source = error && typeof error === "object" ? error as Record<string, unknown> : {};
  const message = error instanceof Error ? error.message : text(error, 1000) || "SMTP delivery failed";
  return {
    message: message.slice(0, 1500),
    code: text(source.code, 100),
    responseCode: Number(source.responseCode || 0),
    response: text(source.response, 1000),
  };
}

export async function sendBrevoEmail(
  service: SupabaseClient,
  row: OutboxEmailRow,
  payload: Json,
  rendered: RenderedEmail,
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

  const smtpKey = await getBrevoSmtpKey(service);
  if (!smtpKey) {
    return {
      status: "blocked",
      error: "Brevo SMTP provider is not configured",
      evidence: { source: isChatgptOutbound(payload) ? CHATGPT_OUTBOUND_TEMPLATE : "notification" },
    };
  }

  const transporter = nodemailer.createTransport({
    host: BREVO_SMTP_HOST,
    port: BREVO_SMTP_PORT,
    secure: false,
    requireTLS: true,
    auth: { user: BREVO_SMTP_LOGIN, pass: smtpKey },
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    tls: { minVersion: "TLSv1.2" },
  });

  const source = isChatgptOutbound(payload) ? CHATGPT_OUTBOUND_TEMPLATE : "notification";
  const cc = isChatgptOutbound(payload) ? emailList(payload.cc) : [];
  const bcc = isChatgptOutbound(payload) ? emailList(payload.bcc) : [];
  const threading = threadHeaders(payload);

  try {
    const info = await transporter.sendMail({
      from: { name: sender.name, address: sender.address },
      to: [recipient],
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      replyTo: replyToForPayload(payload, sender.address),
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
      inReplyTo: threading.inReplyTo,
      references: threading.references,
      headers: {
        "X-Irha-Outbox-ID": row.id,
        "X-Irha-Source": source,
      },
    });
    return {
      status: "sent",
      error: null,
      evidence: {
        source,
        provider_message_id: text(info.messageId, 500) || null,
        accepted: Array.isArray(info.accepted) ? info.accepted.map((item) => text(String(item), 300)).filter(Boolean).slice(0, 20) : [],
        rejected: Array.isArray(info.rejected) ? info.rejected.map((item) => text(String(item), 300)).filter(Boolean).slice(0, 20) : [],
        from_address: sender.address,
      },
    };
  } catch (error) {
    const details = errorDetails(error);
    const evidence: Json = {
      source,
      code: details.code || null,
      response_code: details.responseCode || null,
      from_address: sender.address,
    };
    const failure = [details.message, details.response].filter(Boolean).join(" — ").slice(0, 1800);
    if (details.code === "EAUTH" || details.responseCode === 535) {
      return { status: "blocked", error: failure || "Brevo SMTP authentication failed", evidence };
    }
    if (details.responseCode >= 500 && details.responseCode < 600) {
      return { status: "failed", error: failure || "Brevo SMTP rejected the message", evidence };
    }
    if (row.attempt_count >= MAX_ATTEMPTS) {
      return { status: "failed", error: failure || "Brevo SMTP delivery failed", evidence };
    }
    return { status: "retry", error: failure || "Brevo SMTP delivery failed", evidence };
  } finally {
    transporter.close();
  }
}
