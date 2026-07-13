import { supabase } from "@/integrations/supabase/client";
import { safeStorageName, validatePrivateEvidenceFile } from "@/lib/productionQuality";

export const PRODUCTION_EVIDENCE_BUCKET = "production-evidence";

export async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest)).map((value) => value.toString(16).padStart(2, "0")).join("");
}

export async function uploadPrivateProductionEvidence(jobId: string, file: File) {
  const validation = validatePrivateEvidenceFile(file);
  if (!validation.valid) throw new Error(`Required: ${validation.errors.join(", ")}`);
  const storagePath = `${jobId}/${crypto.randomUUID()}/${safeStorageName(file.name)}`;
  const checksum = await sha256(file);
  const { error } = await supabase.storage.from(PRODUCTION_EVIDENCE_BUCKET).upload(storagePath, file, {
    cacheControl: "3600",
    upsert: false,
    contentType: file.type,
  });
  if (error) throw error;
  return { storagePath, checksum };
}

export async function removePrivateProductionEvidence(storagePath: string) {
  await supabase.storage.from(PRODUCTION_EVIDENCE_BUCKET).remove([storagePath]);
}

export async function createPrivateProductionEvidenceUrl(storagePath: string) {
  const { data, error } = await supabase.storage.from(PRODUCTION_EVIDENCE_BUCKET).createSignedUrl(storagePath, 300);
  if (error || !data?.signedUrl) throw error || new Error("Private signed URL was not created");
  return data.signedUrl;
}
