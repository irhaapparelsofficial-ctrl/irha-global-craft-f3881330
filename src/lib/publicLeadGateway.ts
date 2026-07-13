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
    super("Secure form service is not deployed");
    this.name = "GatewayNotDeployedError";
  }
}

function text(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
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

function gatewayUnavailable(surface: "inquiry" | "catalogue" | "upload") {
  if (surface === "upload") {
    return new Error("Secure file upload is temporarily unavailable. Submit without the file and share it through WhatsApp.");
  }
  if (surface === "catalogue") {
    return new Error("Secure catalogue request service is temporarily unavailable. Please retry or contact us through WhatsApp.");
  }
  return new Error("Secure inquiry service is temporarily unavailable. Please retry or share your requirements through WhatsApp.");
}

export async function submitPublicInquiry(payload: JsonRecord) {
  const reference = inquiryReference(payload);
  const normalized = { ...payload, inquiry_ref: reference };
  try {
    const data = await invokeGateway("submit_inquiry", normalized);
    return { reference: data.reference || reference };
  } catch (error) {
    if (error instanceof GatewayNotDeployedError) throw gatewayUnavailable("inquiry");
    throw error;
  }
}

export async function submitPublicCatalogueLead(payload: JsonRecord) {
  try {
    const data = await invokeGateway("submit_catalogue", payload);
    return { reference: data.reference || "received" };
  } catch (error) {
    if (error instanceof GatewayNotDeployedError) throw gatewayUnavailable("catalogue");
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
    if (error instanceof GatewayNotDeployedError) throw gatewayUnavailable("upload");
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
