export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "tiktok";
export type SocialContentType = "text" | "single_image" | "carousel" | "reel";
export type SocialAccountCapability = {
  text: boolean;
  image: boolean;
  carousel: boolean;
  reel: boolean;
};

export type SocialAccountState = {
  platform: SocialPlatform;
  enabled: boolean;
  verificationStatus: "missing" | "pending" | "verified" | "failed";
  capabilities: SocialAccountCapability;
};

export type SocialDeliveryInput = {
  platform: SocialPlatform;
  contentType: SocialContentType;
  caption: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  scheduledAt?: string | null;
  approvedAt?: string | null;
  renderVerified?: boolean;
  account?: SocialAccountState | null;
};

const CAPABILITY_KEY: Record<SocialContentType, keyof SocialAccountCapability> = {
  text: "text",
  single_image: "image",
  carousel: "carousel",
  reel: "reel",
};

export function socialDeliveryReadiness(input: SocialDeliveryInput) {
  const missing: string[] = [];
  if (!input.caption.trim()) missing.push("caption");
  if (!input.approvedAt) missing.push("owner approval");
  if (!input.account?.enabled) missing.push("enabled platform account");
  if (input.account?.verificationStatus !== "verified") missing.push("verified platform connection");
  if (input.account && !input.account.capabilities[CAPABILITY_KEY[input.contentType]]) {
    missing.push(`${input.contentType.replace("_", " ")} capability`);
  }
  if (input.contentType === "single_image" && !isHttps(input.imageUrl)) missing.push("public HTTPS image");
  if (input.contentType === "reel") {
    if (!isHttps(input.videoUrl)) missing.push("public HTTPS video");
    if (!input.renderVerified) missing.push("verified reel output");
  }
  if (input.contentType === "carousel" && !input.renderVerified) missing.push("verified carousel output");
  if (input.scheduledAt && Number.isNaN(Date.parse(input.scheduledAt))) missing.push("valid scheduled time");
  return { ready: missing.length === 0, missing: [...new Set(missing)] };
}

export function hasPublishedEvidence(input: { postId?: string | null; postUrl?: string | null }) {
  return Boolean(input.postId?.trim() || isHttps(input.postUrl));
}

export function retryDelayMinutes(attempt: number) {
  if (attempt <= 1) return 5;
  if (attempt === 2) return 15;
  if (attempt === 3) return 60;
  if (attempt === 4) return 240;
  return 1440;
}

export function isHttps(value?: string | null) {
  if (!value) return false;
  try {
    return new URL(value).protocol === "https:";
  } catch {
    return false;
  }
}
