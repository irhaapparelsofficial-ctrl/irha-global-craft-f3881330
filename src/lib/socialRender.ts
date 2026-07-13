export type SocialRenderType = "reel" | "carousel";
export type SocialAspectRatio = "9:16" | "4:5" | "1:1";
export type SocialRenderStatus =
  | "draft"
  | "owner_review"
  | "queued"
  | "rendering"
  | "ready"
  | "failed"
  | "cancelled";

export type SocialRenderAsset = {
  id: string;
  mimeType: string;
  status: "active" | "archived";
  publicUrl: string;
  verificationStatus?: string | null;
  socialApproved?: boolean | null;
};

export type SocialRenderItemInput = {
  mediaAssetId: string;
  position: number;
  sceneText?: string | null;
  overlayText?: string | null;
  durationMs?: number | null;
};

export type SocialRenderDraft = {
  title: string;
  renderType: SocialRenderType;
  aspectRatio: SocialAspectRatio;
  requestedDurationSeconds: number;
  items: SocialRenderItemInput[];
};

export type SocialRenderVerifiedFile = {
  mediaAssetId?: string;
  url?: string;
  width?: number;
  height?: number;
  checksumSha256?: string;
  mimeType?: string;
  sizeBytes?: number;
  position?: number;
};

export type SocialRenderVerification = {
  verified?: boolean;
  checkedAt?: string;
  width?: number;
  height?: number;
  durationSeconds?: number;
  checksumSha256?: string;
  mimeType?: string;
  sizeBytes?: number;
  files?: SocialRenderVerifiedFile[];
};

export const SOCIAL_RENDER_TRANSITIONS: Record<SocialRenderStatus, SocialRenderStatus[]> = {
  draft: ["owner_review", "cancelled"],
  owner_review: ["draft", "queued", "cancelled"],
  queued: ["rendering", "failed", "cancelled"],
  rendering: ["ready", "failed", "cancelled"],
  ready: [],
  failed: ["draft", "queued", "cancelled"],
  cancelled: [],
};

export function requiredAssetRange(type: SocialRenderType) {
  return type === "reel" ? { min: 5, max: 5 } : { min: 2, max: 10 };
}

export function defaultAspectRatio(type: SocialRenderType): SocialAspectRatio {
  return type === "reel" ? "9:16" : "4:5";
}

export function defaultDurationSeconds(type: SocialRenderType) {
  return type === "reel" ? 10 : 0;
}

export function canTransitionSocialRender(from: SocialRenderStatus, to: SocialRenderStatus) {
  return SOCIAL_RENDER_TRANSITIONS[from].includes(to);
}

export function validateSocialRenderDraft(draft: SocialRenderDraft, assets: SocialRenderAsset[]) {
  const missing: string[] = [];
  const range = requiredAssetRange(draft.renderType);
  const title = draft.title.trim();

  if (title.length < 3) missing.push("title");
  if (title.length > 120) missing.push("title under 120 characters");
  if (draft.items.length < range.min || draft.items.length > range.max) {
    missing.push(draft.renderType === "reel" ? "exactly 5 scenes" : "2 to 10 carousel slides");
  }
  if (draft.renderType === "reel" && draft.requestedDurationSeconds !== 10) {
    missing.push("10-second reel duration");
  }

  const seen = new Set<string>();
  draft.items.forEach((item, index) => {
    if (!item.mediaAssetId) missing.push(`media for item ${index + 1}`);
    if (seen.has(item.mediaAssetId)) missing.push(`unique media for item ${index + 1}`);
    seen.add(item.mediaAssetId);
    const asset = assets.find((candidate) => candidate.id === item.mediaAssetId);
    if (!asset) {
      missing.push(`available media for item ${index + 1}`);
      return;
    }
    if (asset.status !== "active") missing.push(`active media for item ${index + 1}`);
    if (!asset.publicUrl.startsWith("https://")) missing.push(`HTTPS media URL for item ${index + 1}`);
    const usable = asset.mimeType.startsWith("image/") || asset.mimeType.startsWith("video/");
    if (!usable) missing.push(`image or video media for item ${index + 1}`);
  });

  return { ready: missing.length === 0, missing: [...new Set(missing)] };
}

function verifiedFile(file: SocialRenderVerifiedFile, requiredPrefix: "image/" | "video/") {
  return Boolean(
    file.mediaAssetId
      && file.url?.startsWith("https://")
      && file.checksumSha256
      && /^[a-f0-9]{64}$/i.test(file.checksumSha256)
      && file.width && file.width >= 100
      && file.height && file.height >= 100
      && file.mimeType?.startsWith(requiredPrefix)
      && file.sizeBytes && file.sizeBytes > 0,
  );
}

export function verifiedRenderOutput(input: {
  outputUrl?: string | null;
  outputAssetId?: string | null;
  verification?: SocialRenderVerification | null;
  renderType: SocialRenderType;
  aspectRatio: SocialAspectRatio;
}) {
  const verification = input.verification || {};
  if (verification.verified !== true) return false;

  if (input.renderType === "carousel") {
    const files = verification.files || [];
    if (files.length < 2 || files.length > 10) return false;
    if (!files.every((file) => verifiedFile(file, "image/"))) return false;
    const positions = files.map((file) => file.position).filter((value): value is number => Number.isInteger(value));
    return positions.length === files.length && new Set(positions).size === files.length;
  }

  if (!input.outputAssetId || !input.outputUrl?.startsWith("https://")) return false;
  if (!verification.checksumSha256 || !/^[a-f0-9]{64}$/i.test(verification.checksumSha256)) return false;
  if (!verification.width || !verification.height || verification.width < 100 || verification.height < 100) return false;
  if (!verification.mimeType?.startsWith("video/")) return false;
  if (!verification.sizeBytes || verification.sizeBytes <= 0) return false;
  const duration = verification.durationSeconds || 0;
  if (duration < 9.5 || duration > 10.5) return false;
  return input.aspectRatio === "9:16";
}

export function renderManifest(draft: SocialRenderDraft, assets: SocialRenderAsset[]) {
  const ordered = [...draft.items].sort((a, b) => a.position - b.position);
  return {
    schema: "irha.social-render.v1",
    title: draft.title.trim(),
    render_type: draft.renderType,
    aspect_ratio: draft.aspectRatio,
    requested_duration_seconds: draft.renderType === "reel" ? 10 : null,
    owner_approval_required: true,
    output_must_be_verified: true,
    scenes: ordered.map((item) => {
      const asset = assets.find((candidate) => candidate.id === item.mediaAssetId);
      return {
        position: item.position,
        media_asset_id: item.mediaAssetId,
        media_url: asset?.publicUrl || null,
        mime_type: asset?.mimeType || null,
        duration_ms: draft.renderType === "reel" ? (item.durationMs || 2000) : null,
        scene_text: item.sceneText?.trim() || null,
        overlay_text: item.overlayText?.trim() || null,
      };
    }),
  };
}
