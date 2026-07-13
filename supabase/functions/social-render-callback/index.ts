import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

type OutputInput = {
  position: number;
  object_path: string;
  mime_type: string;
  width: number;
  height: number;
  duration_ms?: number | null;
  checksum_sha256?: string | null;
};

type RenderJob = {
  id: string;
  title: string;
  render_type: "reel" | "carousel";
  aspect_ratio: "9:16" | "4:5" | "1:1";
  status: string;
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  const expectedSecret = Deno.env.get("SOCIAL_RENDER_CALLBACK_SECRET") || "";
  const suppliedSecret = req.headers.get("x-irha-render-secret") || "";
  if (!expectedSecret || !constantTimeEqual(expectedSecret, suppliedSecret)) return json({ error: "Unauthorized callback" }, 401);

  const service = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  let jobId = "";
  try {
    const body = await req.json().catch(() => ({}));
    jobId = cleanText(body?.job_id, 80);
    if (!jobId) return json({ error: "job_id is required" }, 400);

    if (body?.status === "failed") {
      const message = cleanText(body?.error, 1500) || "Renderer reported failure";
      const { error } = await service.rpc("fail_social_render_job", { _job_id: jobId, _message: message });
      if (error) return json({ error: error.message }, 422);
      return json({ ok: true, job_id: jobId, status: "failed" });
    }

    const { data: jobData, error: jobError } = await service.from("social_render_jobs").select("id,title,render_type,aspect_ratio,status").eq("id", jobId).maybeSingle();
    if (jobError || !jobData) return json({ error: jobError?.message || "Render job not found" }, 404);
    const job = jobData as RenderJob;
    if (job.status === "ready") return json({ ok: true, job_id: job.id, status: "ready", idempotent: true });
    if (job.status !== "rendering") return json({ error: `Job is ${job.status}, not rendering` }, 409);

    const outputs = normalizeOutputs(body?.outputs);
    const expectedCount = job.render_type === "reel" ? 1 : await itemCount(service, job.id);
    if (outputs.length !== expectedCount) throw new Error(`Expected ${expectedCount} output files, received ${outputs.length}`);
    if (job.render_type === "reel" && outputs[0].mime_type !== "video/mp4" && outputs[0].mime_type !== "video/webm") {
      throw new Error("Reel callback must reference MP4 or WEBM output");
    }
    if (job.render_type === "carousel" && outputs.some((output) => !output.mime_type.startsWith("image/"))) {
      throw new Error("Every carousel output must be an image");
    }

    const verifiedFiles: Array<Record<string, unknown>> = [];
    for (const output of outputs.sort((a, b) => a.position - b.position)) {
      if (!output.object_path.startsWith(`${job.id}/`) || output.object_path.includes("..")) throw new Error("Invalid output object path");
      if (output.width < 100 || output.height < 100) throw new Error(`Invalid dimensions for output ${output.position}`);
      if (job.render_type === "reel" && (!output.duration_ms || output.duration_ms < 9500 || output.duration_ms > 10500)) {
        throw new Error("Verified reel duration must be between 9.5 and 10.5 seconds");
      }

      const { data: blob, error: downloadError } = await service.storage.from("social-renders").download(output.object_path);
      if (downloadError || !blob) throw new Error(downloadError?.message || `Output ${output.position} is missing from storage`);
      const bytes = new Uint8Array(await blob.arrayBuffer());
      if (bytes.byteLength <= 0) throw new Error(`Output ${output.position} is empty`);
      const checksum = await sha256(bytes);
      if (output.checksum_sha256 && output.checksum_sha256.toLowerCase() !== checksum) {
        throw new Error(`Checksum mismatch for output ${output.position}`);
      }

      const { data: publicData } = service.storage.from("social-renders").getPublicUrl(output.object_path);
      const publicUrl = publicData.publicUrl;
      if (!publicUrl.startsWith("https://")) throw new Error("Renderer output has no HTTPS public URL");

      const { data: asset, error: assetError } = await service.from("media_assets").insert({
        bucket: "social-renders",
        object_path: output.object_path,
        public_url: publicUrl,
        file_name: output.object_path.split("/").pop() || `render-${output.position}`,
        mime_type: output.mime_type,
        size_bytes: bytes.byteLength,
        title: `${job.title} · ${job.render_type === "reel" ? "Reel" : `Slide ${output.position}`}`,
        alt_text: job.render_type === "carousel" ? `${job.title} slide ${output.position}` : null,
        tags: ["social-render", job.render_type, job.aspect_ratio],
        usage_notes: `Verified renderer output for job ${job.id}`,
        status: "active",
        verification_status: "verified",
        width_px: output.width,
        height_px: output.height,
        duration_ms: output.duration_ms || null,
        checksum_sha256: checksum,
        social_approved: false,
      }).select("id").single();
      if (assetError || !asset) throw new Error(assetError?.message || `Could not register output ${output.position}`);

      verifiedFiles.push({
        mediaAssetId: asset.id,
        url: publicUrl,
        width: output.width,
        height: output.height,
        durationMs: output.duration_ms || null,
        checksumSha256: checksum,
        mimeType: output.mime_type,
        sizeBytes: bytes.byteLength,
        position: output.position,
      });
    }

    const first = verifiedFiles[0];
    const verification = job.render_type === "reel"
      ? {
          verified: true,
          checkedAt: new Date().toISOString(),
          width: first.width,
          height: first.height,
          durationSeconds: Number(first.durationMs || 0) / 1000,
          checksumSha256: first.checksumSha256,
          mimeType: first.mimeType,
          sizeBytes: first.sizeBytes,
        }
      : { verified: true, checkedAt: new Date().toISOString(), files: verifiedFiles };

    const { error: completeError } = await service.rpc("complete_social_render_job", {
      _job_id: job.id,
      _renderer_job_id: cleanText(body?.renderer_job_id, 240),
      _output_asset_id: first.mediaAssetId,
      _output_url: first.url,
      _verification: verification,
    });
    if (completeError) throw new Error(completeError.message);

    return json({ ok: true, job_id: job.id, status: "ready", verified_outputs: verifiedFiles.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Renderer callback failed";
    console.error("social-render-callback", jobId, error);
    if (jobId) await service.rpc("fail_social_render_job", { _job_id: jobId, _message: message }).catch(() => null);
    return json({ error: message, job_id: jobId || null }, 422);
  }
});

async function itemCount(service: ReturnType<typeof createClient>, jobId: string) {
  const { count, error } = await service.from("social_render_job_items").select("id", { count: "exact", head: true }).eq("job_id", jobId);
  if (error) throw new Error(error.message);
  return count || 0;
}

function normalizeOutputs(value: unknown): OutputInput[] {
  if (!Array.isArray(value)) throw new Error("outputs array is required");
  return value.map((item, index) => {
    const row = item && typeof item === "object" ? item as Record<string, unknown> : {};
    return {
      position: Number(row.position || index + 1),
      object_path: cleanText(row.object_path, 500),
      mime_type: cleanText(row.mime_type, 100).toLowerCase(),
      width: Number(row.width || 0),
      height: Number(row.height || 0),
      duration_ms: row.duration_ms == null ? null : Number(row.duration_ms),
      checksum_sha256: cleanText(row.checksum_sha256, 64) || null,
    };
  });
}

async function sha256(bytes: Uint8Array) {
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function cleanText(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let result = 0;
  for (let index = 0; index < left.length; index += 1) result |= left.charCodeAt(index) ^ right.charCodeAt(index);
  return result === 0;
}

function json(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), { status, headers: { "Content-Type": "application/json" } });
}
