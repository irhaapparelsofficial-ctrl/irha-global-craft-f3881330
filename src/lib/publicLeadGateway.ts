import { supabase } from "@/integrations/supabase/client";
import type { UploadedFileRef } from "@/lib/inquiryDraft";

type JsonRecord = Record<string, unknown>;

type GatewayResponse = {
  ok?: boolean;
  reference?: string;
  error?: string;
  bucket?: string;
  path?: string;
  token?: string;
};

async function invokeGateway(action: "submit_inquiry" | "submit_catalogue" | "create_upload", payload: JsonRecord) {
  const { data, error } = await supabase.functions.invoke<GatewayResponse>("public-lead-gateway", {
    body: { action, payload },
  });
  if (error) throw new Error(error.message || "Request failed");
  if (!data?.ok) throw new Error(data?.error || "Request failed");
  return data;
}

export async function submitPublicInquiry(payload: JsonRecord) {
  const data = await invokeGateway("submit_inquiry", payload);
  return { reference: data.reference || "received" };
}

export async function submitPublicCatalogueLead(payload: JsonRecord) {
  const data = await invokeGateway("submit_catalogue", payload);
  return { reference: data.reference || "received" };
}

export async function uploadPublicLeadFile(
  file: File,
  purpose: "inquiry" | "mockup",
  formStartedAt: number,
): Promise<UploadedFileRef> {
  const ticket = await invokeGateway("create_upload", {
    filename: file.name,
    mime: file.type,
    size: file.size,
    purpose,
    form_started_at: formStartedAt,
    website: "",
  });
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
