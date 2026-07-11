import { supabase } from "@/integrations/supabase/client";
import type { UploadedFileRef } from "@/lib/inquiryDraft";

type JsonRecord = Record<string, unknown>;
type GatewayAction = "submit_inquiry" | "submit_catalogue" | "create_upload";

type GatewayResponse = {
  ok?: boolean;
  reference?: string;
  error?: string;
  bucket?: string;
  path?: string;
  token?: string;
};

type FunctionErrorLike = {
  message?: string;
  context?: { status?: number };
};

class GatewayNotDeployedError extends Error {
  constructor() {
    super("Secure form service is not deployed yet");
    this.name = "GatewayNotDeployedError";
  }
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function object(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function isGatewayMissing(error: FunctionErrorLike | null | undefined) {
  const message = (error?.message || "").toLowerCase();
  return error?.context?.status === 404 || message.includes("not found") || message.includes("function was not found");
}

async function invokeGateway(action: GatewayAction, payload: JsonRecord) {
  const { data, error } = await supabase.functions.invoke<GatewayResponse>("public-lead-gateway", {
    body: { action, payload },
  });
  if (error) {
    if (isGatewayMissing(error as FunctionErrorLike)) throw new GatewayNotDeployedError();
    throw new Error(error.message || "Request failed");
  }
  if (!data?.ok) throw new Error(data?.error || "Request failed");
  return data;
}

function inquiryReference(payload: JsonRecord) {
  const provided = text(payload.inquiry_ref, 80).toUpperCase();
  if (/^IRQ-[A-Z0-9-]{6,70}$/.test(provided)) return provided;
  const random = typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID().slice(0, 6).toUpperCase()
    : Math.random().toString(36).slice(2, 8).toUpperCase();
  return `IRQ-${Date.now().toString(36).toUpperCase()}-${random}`;
}

async function fallbackInquiry(payload: JsonRecord) {
  const kind = text(payload.kind, 40) || "inquiry";
  const reference = inquiryReference(payload);
  const incomingContext = object(payload.lead_context);
  const files = Array.isArray(payload.files) ? payload.files.slice(0, 5) : [];
  const intent = text(payload.intent, 50) || (kind === "mockup" ? "reference" : kind === "quote" ? "rfq" : null);

  const { error } = await supabase.from("inquiries").insert({
    name: text(payload.name, 100),
    email: text(payload.email, 254) || null,
    company: text(payload.company, 160) || null,
    country: text(payload.country, 80) || null,
    phone: text(payload.phone ?? payload.whatsapp, 40) || null,
    category: text(payload.category, 180) || null,
    quantity: text(payload.quantity, 100) || null,
    message: text(payload.message, 12000) || null,
    source: text(payload.source, 240) || `public-${kind}`,
    intent,
    inquiry_ref: reference,
    lead_context: {
      ...incomingContext,
      uploaded_files: files,
      gateway_fallback: {
        reason: "edge_function_not_deployed",
        received_at: new Date().toISOString(),
      },
    },
  } as never);

  if (error && error.code !== "23505") throw new Error(error.message || "Request could not be saved");
  return { reference };
}

async function fallbackCatalogue(payload: JsonRecord) {
  const { data, error } = await supabase.from("catalogue_leads").insert({
    name: text(payload.name, 100),
    whatsapp: text(payload.whatsapp ?? payload.phone, 40) || null,
    email: text(payload.email, 254) || null,
    company_name: text(payload.company_name ?? payload.company, 160) || null,
    country: text(payload.country, 80) || null,
    category_interest: text(payload.category_interest, 180) || null,
    message: text(payload.message, 6000) || null,
    catalogue_url: text(payload.catalogue_url, 1000) || null,
    source: text(payload.source, 240) || "public-catalogue",
    utm_source: text(payload.utm_source, 160) || null,
    utm_medium: text(payload.utm_medium, 160) || null,
    utm_campaign: text(payload.utm_campaign, 200) || null,
    language: text(payload.language, 20) || "en",
  } as never).select("id").maybeSingle();

  if (error) throw new Error(error.message || "Catalogue request could not be saved");
  return { reference: data?.id || "received" };
}

export async function submitPublicInquiry(payload: JsonRecord) {
  const reference = inquiryReference(payload);
  const normalized = { ...payload, inquiry_ref: reference };
  try {
    const data = await invokeGateway("submit_inquiry", normalized);
    return { reference: data.reference || reference };
  } catch (error) {
    if (error instanceof GatewayNotDeployedError) return await fallbackInquiry(normalized);
    throw error;
  }
}

export async function submitPublicCatalogueLead(payload: JsonRecord) {
  try {
    const data = await invokeGateway("submit_catalogue", payload);
    return { reference: data.reference || "received" };
  } catch (error) {
    if (error instanceof GatewayNotDeployedError) return await fallbackCatalogue(payload);
    throw error;
  }
}

export async function uploadPublicLeadFile(
  file: File,
  purpose: "inquiry" | "mockup",
  formStartedAt: number,
): Promise<UploadedFileRef> {
  let ticket: GatewayResponse;
  try {
    ticket = await invokeGateway("create_upload", {
      filename: file.name,
      mime: file.type,
      size: file.size,
      purpose,
      form_started_at: formStartedAt,
      website: "",
    });
  } catch (error) {
    if (error instanceof GatewayNotDeployedError) {
      throw new Error("Secure file upload is activating. Submit without the file and share it on WhatsApp.");
    }
    throw error;
  }

  if (!ticket.bucket || !ticket.path || !ticket.token) throw new Error("Upload ticket was incomplete");

  const { error } = await supabase.storage
    .from(ticket.bucket)
    .uploadToSignedUrl(ticket.path, ticket.token, file, {
      contentType: file.type,
      upsert: false,
    });
  if (error) throw new Error(error.message || "Upload failed");

  return {
    path: ticket.path,
    name: file.name,
    size: file.size,
    mime: file.type,
  };
}
