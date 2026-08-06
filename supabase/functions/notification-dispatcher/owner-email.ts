import type { SupabaseClient } from "npm:@supabase/supabase-js@2.49.4";

type Json = Record<string, unknown>;

export type OwnerEmailOutboxRow = {
  id: string;
  notification_id: string | null;
  payload: Json;
  event_key: string;
};

function text(value: unknown, max = 4000) {
  return typeof value === "string" ? value.replace(/\u0000/g, "").trim().slice(0, max) : "";
}

function record(value: unknown): Json {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Json : {};
}

function array(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function firstText(value: unknown) {
  return array(value).map((item) => text(item, 300)).find(Boolean) || "";
}

function displayTime(value: unknown) {
  const raw = text(value, 100);
  if (!raw) return "Not supplied";
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : `${date.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, " UTC")}`;
}

function formatObject(value: unknown, max = 1400) {
  const source = record(value);
  const entries = Object.entries(source)
    .filter(([, item]) => item !== null && item !== undefined && item !== "")
    .slice(0, 20)
    .map(([key, item]) => `${key.replaceAll("_", " ")}: ${text(String(item), 300)}`);
  return entries.join("\n").slice(0, max);
}

function itemSummary(value: unknown) {
  return array(value).slice(0, 50).flatMap((entry, index) => {
    const item = record(entry);
    const name = text(item.name, 240);
    if (!name) return [];
    const quantity = text(item.target_quantity ?? item.targetQuantity, 80) || "quantity not supplied";
    const sizes = text(item.size_breakdown ?? item.sizeBreakdown, 500);
    return [`${index + 1}. ${name} — ${quantity} pcs${sizes ? ` — Sizes: ${sizes}` : ""}`];
  }).join("\n");
}

function intentLabel(intent: string) {
  switch (intent) {
    case "sample": return "Sample Request";
    case "meeting": return "Factory Video Call Request";
    case "catalogue": return "Catalogue Request";
    case "reference": return "Buyer Reference Inquiry";
    default: return "New RFQ";
  }
}

function inquirySubject(intent: string, buyer: string, product: string) {
  switch (intent) {
    case "sample": return `Sample Request — ${buyer} — ${product}`;
    case "meeting": return `Factory Video Call Request — ${buyer}`;
    case "catalogue": return `Catalogue Request — ${buyer} — ${product}`;
    case "reference": return `Buyer Reference Inquiry — ${buyer} — ${product}`;
    default: return `New Website RFQ — ${buyer} — ${product}`;
  }
}

async function inquiryPayload(service: SupabaseClient, sourceId: string, base: Json) {
  const { data, error } = await service.from("inquiries")
    .select("id,inquiry_ref,name,company,email,phone,country,category,quantity,intent,source,message,lead_context,created_at")
    .eq("id", sourceId)
    .maybeSingle();
  if (error || !data) return base;

  const context = record(data.lead_context);
  const intent = text(data.intent, 80).toLowerCase() || text(context.intent, 80).toLowerCase() || "rfq";
  const product = text(context.product_name, 300) || firstText(context.product_names) || text(data.category, 300) || "General inquiry";
  const buyer = text(data.company, 240) || text(data.name, 240) || "Buyer";
  const buyerType = text(context.buyer_type, 160);
  const sourcePage = text(context.source_page, 800) || text(context.current_page, 800) || text(data.source, 800);
  const items = itemSummary(context.inquiry_items);
  const sample = formatObject(context.sample_requirements);
  const meeting = formatObject(context.meeting_preferences);
  const catalogue = formatObject(context.catalogue_preferences);
  const lines = [
    intentLabel(intent),
    `Buyer: ${text(data.name, 240) || "Not supplied"}`,
    `Company: ${text(data.company, 240) || "Not supplied"}`,
    `Country: ${text(data.country, 160) || "Not supplied"}`,
    `Product: ${product}`,
    `Quantity: ${text(data.quantity, 160) || "Not supplied"}`,
    `WhatsApp: ${text(data.phone, 160) || "Not supplied"}`,
    `Email: ${text(data.email, 254) || "Not supplied"}`,
    "",
    `Inquiry reference: ${text(data.inquiry_ref, 160) || text(data.id, 160)}`,
    buyerType ? `Buyer type: ${buyerType}` : "",
    sourcePage ? `Source page: ${sourcePage}` : "",
    `Submitted: ${displayTime(data.created_at)}`,
    items ? `\nRequested styles:\n${items}` : "",
    sample ? `\nSample details:\n${sample}` : "",
    meeting ? `\nMeeting preferences:\n${meeting}` : "",
    catalogue ? `\nCatalogue preferences:\n${catalogue}` : "",
    text(data.message, 2500) ? `\nRequirements:\n${text(data.message, 2500)}` : "",
  ].filter((line) => line !== "");

  return {
    ...base,
    kind: intent,
    subject: inquirySubject(intent, buyer, product),
    title: intentLabel(intent),
    body: lines.join("\n").slice(0, 4000),
    reply_to: text(data.email, 254) || base.reply_to,
  };
}

async function cataloguePayload(service: SupabaseClient, sourceId: string, base: Json) {
  const { data, error } = await service.from("catalogue_leads")
    .select("id,name,company_name,email,whatsapp,country,category_interest,message,catalogue_url,source,utm_source,utm_medium,utm_campaign,created_at")
    .eq("id", sourceId)
    .maybeSingle();
  if (error || !data) return base;

  const buyer = text(data.company_name, 240) || text(data.name, 240) || "Buyer";
  const category = text(data.category_interest, 300) || "Catalogue";
  const source = text(data.catalogue_url, 800) || text(data.source, 800);
  const lines = [
    "Catalogue Request",
    `Buyer: ${text(data.name, 240) || "Not supplied"}`,
    `Company: ${text(data.company_name, 240) || "Not supplied"}`,
    `Country: ${text(data.country, 160) || "Not supplied"}`,
    `Category: ${category}`,
    `WhatsApp: ${text(data.whatsapp, 160) || "Not supplied"}`,
    `Email: ${text(data.email, 254) || "Not supplied"}`,
    "",
    source ? `Source: ${source}` : "",
    text(data.utm_source, 160) ? `UTM source: ${text(data.utm_source, 160)}` : "",
    text(data.utm_medium, 160) ? `UTM medium: ${text(data.utm_medium, 160)}` : "",
    text(data.utm_campaign, 200) ? `UTM campaign: ${text(data.utm_campaign, 200)}` : "",
    `Submitted: ${displayTime(data.created_at)}`,
    text(data.message, 2500) ? `\nRequirements:\n${text(data.message, 2500)}` : "",
  ].filter((line) => line !== "");

  return {
    ...base,
    kind: "catalogue",
    subject: `Catalogue Request — ${buyer} — ${category}`,
    title: "Catalogue Request",
    body: lines.join("\n").slice(0, 4000),
    reply_to: text(data.email, 254) || base.reply_to,
  };
}

async function liveChatPayload(service: SupabaseClient, notification: Json, base: Json) {
  const metadata = record(notification.metadata);
  if (text(metadata.channel, 80) !== "human_live_chat") return base;

  const sessionId = text(metadata.session_id, 200);
  const event = text(metadata.event, 80) || "message";
  if (!sessionId) return base;

  const { data: session } = await service.from("chat_sessions")
    .select("session_id,visitor_name,visitor_company,visitor_email,visitor_whatsapp,visitor_requirement,visitor_country,visitor_country_code,visitor_region,visitor_city,entry_path,created_at")
    .eq("session_id", sessionId)
    .maybeSingle();
  if (!session) return base;

  const place = [session.visitor_city, session.visitor_region, session.visitor_country || session.visitor_country_code]
    .map((value) => text(value, 160)).filter(Boolean).join(", ") || "Not supplied";
  const identity = text(session.visitor_name, 240) || text(session.visitor_country, 160) || text(session.visitor_country_code, 20) || "Website visitor";
  const common = [
    `Buyer: ${text(session.visitor_name, 240) || "Not supplied"}`,
    `Company: ${text(session.visitor_company, 240) || "Not supplied"}`,
    `Country: ${place}`,
    `Page: ${text(session.entry_path, 800) || "Not supplied"}`,
    `WhatsApp: ${text(session.visitor_whatsapp, 160) || "Not supplied"}`,
    `Email: ${text(session.visitor_email, 254) || "Not supplied"}`,
    text(session.visitor_requirement, 1000) ? `Requirement: ${text(session.visitor_requirement, 1000)}` : "",
  ].filter(Boolean);

  if (event === "presence") {
    return {
      ...base,
      kind: "live_chat_opened",
      subject: `Live Chat Opened — ${identity}`,
      title: "Live Chat Opened",
      body: [
        "Live Chat Opened",
        ...common,
        `Conversation: ${sessionId}`,
        `Time: ${displayTime(metadata.presence_seen_at || session.created_at)}`,
      ].join("\n").slice(0, 4000),
      reply_to: text(session.visitor_email, 254) || base.reply_to,
    };
  }

  const messageId = text(metadata.message_id, 100);
  let message = "";
  let createdAt: unknown = notification.created_at;
  if (messageId) {
    const { data: chatMessage } = await service.from("chat_messages")
      .select("message,role,created_at")
      .eq("id", messageId)
      .eq("session_id", sessionId)
      .eq("channel", "human")
      .maybeSingle();
    if (chatMessage?.role === "user") {
      message = text(chatMessage.message, 2200);
      createdAt = chatMessage.created_at;
    }
  }
  if (!message) message = text(notification.body, 2200);

  return {
    ...base,
    kind: "live_chat_message",
    subject: `Live Chat Message — ${identity}`,
    title: "Live Chat Message",
    body: [
      "Live Chat Message",
      ...common,
      "",
      `New message: ${message || "Message available in admin"}`,
      `Conversation: ${sessionId}`,
      `Time: ${displayTime(createdAt)}`,
    ].join("\n").slice(0, 4000),
    reply_to: text(session.visitor_email, 254) || base.reply_to,
  };
}

export async function enrichOwnerEmailPayload(service: SupabaseClient, row: OwnerEmailOutboxRow): Promise<Json> {
  const base = { ...row.payload };
  if (text(base.template, 80) !== "owner_alert" || !row.notification_id) return base;

  const { data: notification, error } = await service.from("crm_notifications")
    .select("id,source_type,source_id,title,body,metadata,created_at")
    .eq("id", row.notification_id)
    .maybeSingle();
  if (error || !notification) return base;

  const sourceType = text(notification.source_type, 80);
  const sourceId = text(notification.source_id, 100);
  if (sourceType === "inquiry" && sourceId) return inquiryPayload(service, sourceId, base);
  if (sourceType === "catalogue" && sourceId) return cataloguePayload(service, sourceId, base);
  return liveChatPayload(service, notification as Json, base);
}
