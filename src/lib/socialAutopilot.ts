export type SocialPlatform = "facebook" | "instagram" | "linkedin" | "tiktok";
export type SocialContentType = "single_image" | "carousel" | "reel";

export type ChannelState = {
  configured?: boolean;
  verified?: boolean;
  publish_capable?: boolean;
  note?: string;
};

export type SocialVisualPreset = {
  id: string;
  name: string;
  background: string;
  accents: string;
  logoPlacement: string;
  subjectRules: string[];
  truthRules: string[];
  imageAspectRatio: "4:5";
  reelAspectRatio: "9:16";
  reelDurationSeconds: 10;
};

export type SocialAutopilotSettings = {
  enabled: boolean;
  timezone: "Asia/Karachi";
  horizonDays: number;
  dailyDraftLimit: number;
  weeklyReels: number;
  platforms: Record<SocialPlatform, boolean>;
  postingWindows: Record<SocialPlatform, string[]>;
  contentMix: SocialContentType[];
  productCooldownDays: number;
  categoryRotation: boolean;
  language: string;
  targetMarkets: string[];
  visualPreset: SocialVisualPreset;
};

export type AutopilotProductCandidate = {
  id: string;
  name: string;
  categoryId: string | null;
  categoryName: string | null;
  isPublished: boolean;
  hasVerifiedMedia: boolean;
  lastUsedAt?: string | null;
};

export type RankedAutopilotProduct = AutopilotProductCandidate & {
  selectionReason: string;
};

export type PostingSlot = {
  dayOffset: number;
  platform: SocialPlatform;
  localTime: string;
  contentType: SocialContentType;
};

export const IRHA_SOCIAL_VISUAL_PRESET: SocialVisualPreset = {
  id: "irha-premium-b2b-v1",
  name: "Irha Premium B2B Studio",
  background: "Dark charcoal-to-navy seamless studio background with consistent soft directional lighting and clean negative space.",
  accents: "Restrained gold accents only; no decorative colours that compete with the product.",
  logoPlacement: "Use the official Irha Apparels crest in the top-right only, with safe margins and no replacement logo.",
  subjectRules: [
    "Product-only composition; no models or mannequins.",
    "Keep product colour, construction and proportions faithful to verified source media.",
    "Use consistent framing across image, carousel and reel scenes.",
  ],
  truthRules: [
    "Do not invent text, labels, logos, certifications, client marks, prices, MOQ, materials, delivery claims or production claims.",
    "Generated media remains a draft until an owner verifies the product and brand details.",
  ],
  imageAspectRatio: "4:5",
  reelAspectRatio: "9:16",
  reelDurationSeconds: 10,
};

export const DEFAULT_SOCIAL_AUTOPILOT_SETTINGS: SocialAutopilotSettings = {
  enabled: false,
  timezone: "Asia/Karachi",
  horizonDays: 7,
  dailyDraftLimit: 2,
  weeklyReels: 3,
  platforms: {
    facebook: true,
    instagram: true,
    linkedin: true,
    tiktok: true,
  },
  postingWindows: {
    facebook: ["13:00", "19:00"],
    instagram: ["13:30", "20:00"],
    linkedin: ["11:00"],
    tiktok: ["20:30"],
  },
  contentMix: ["single_image", "carousel", "reel"],
  productCooldownDays: 30,
  categoryRotation: true,
  language: "English",
  targetMarkets: ["Germany", "Austria", "Switzerland", "United Kingdom", "United States"],
  visualPreset: IRHA_SOCIAL_VISUAL_PRESET,
};

export function normalizeAutopilotSettings(input?: Partial<SocialAutopilotSettings> | null): SocialAutopilotSettings {
  const source = input ?? {};
  const platforms = { ...DEFAULT_SOCIAL_AUTOPILOT_SETTINGS.platforms, ...(source.platforms ?? {}) };
  const postingWindows = { ...DEFAULT_SOCIAL_AUTOPILOT_SETTINGS.postingWindows, ...(source.postingWindows ?? {}) };
  const contentMix = Array.isArray(source.contentMix)
    ? source.contentMix.filter((value): value is SocialContentType => ["single_image", "carousel", "reel"].includes(value))
    : DEFAULT_SOCIAL_AUTOPILOT_SETTINGS.contentMix;

  return {
    enabled: source.enabled === true,
    timezone: "Asia/Karachi",
    horizonDays: clamp(source.horizonDays, 1, 14, 7),
    dailyDraftLimit: clamp(source.dailyDraftLimit, 1, 4, 2),
    weeklyReels: clamp(source.weeklyReels, 0, 7, 3),
    platforms,
    postingWindows,
    contentMix: contentMix.length > 0 ? contentMix : DEFAULT_SOCIAL_AUTOPILOT_SETTINGS.contentMix,
    productCooldownDays: clamp(source.productCooldownDays, 0, 120, 30),
    categoryRotation: source.categoryRotation !== false,
    language: clean(source.language) || "English",
    targetMarkets: uniqueStrings(source.targetMarkets).slice(0, 20),
    visualPreset: IRHA_SOCIAL_VISUAL_PRESET,
  };
}

export function weekKey(date: Date): string {
  const value = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = value.getUTCDay() || 7;
  value.setUTCDate(value.getUTCDate() - day + 1);
  return value.toISOString().slice(0, 10);
}

export function settingsFingerprint(settings: SocialAutopilotSettings): string {
  const normalized = normalizeAutopilotSettings(settings);
  const stable = JSON.stringify(sortObject(normalized));
  let hash = 2166136261;
  for (let index = 0; index < stable.length; index += 1) {
    hash ^= stable.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `v2-${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

export function rankAutopilotProducts(
  candidates: AutopilotProductCandidate[],
  now: Date,
  cooldownDays: number,
  limit: number,
): RankedAutopilotProduct[] {
  const cutoff = now.getTime() - Math.max(0, cooldownDays) * 86_400_000;
  const eligible = candidates
    .filter((candidate) => candidate.isPublished)
    .filter((candidate) => {
      if (!candidate.lastUsedAt) return true;
      const used = new Date(candidate.lastUsedAt).getTime();
      return Number.isNaN(used) || used < cutoff;
    })
    .sort((left, right) => {
      if (left.hasVerifiedMedia !== right.hasVerifiedMedia) return left.hasVerifiedMedia ? -1 : 1;
      const leftUsed = left.lastUsedAt ? new Date(left.lastUsedAt).getTime() : 0;
      const rightUsed = right.lastUsedAt ? new Date(right.lastUsedAt).getTime() : 0;
      if (leftUsed !== rightUsed) return leftUsed - rightUsed;
      return left.name.localeCompare(right.name);
    });

  const result: RankedAutopilotProduct[] = [];
  const usedCategories = new Set<string>();
  const append = (candidate: AutopilotProductCandidate) => {
    if (result.some((item) => item.id === candidate.id) || result.length >= limit) return;
    const category = candidate.categoryName || "Uncategorised";
    result.push({
      ...candidate,
      selectionReason: candidate.hasVerifiedMedia
        ? `Published product selected with verified social media; category rotation: ${category}.`
        : `Published product selected after cooldown; verified media is unavailable, so media generation/review is required; category: ${category}.`,
    });
    if (candidate.categoryId) usedCategories.add(candidate.categoryId);
  };

  for (const candidate of eligible) {
    if (result.length >= limit) break;
    if (!candidate.categoryId || !usedCategories.has(candidate.categoryId)) append(candidate);
  }
  for (const candidate of eligible) append(candidate);

  return result;
}

export function buildPostingSlots(settingsInput: SocialAutopilotSettings): PostingSlot[] {
  const settings = normalizeAutopilotSettings(settingsInput);
  const platforms = (Object.keys(settings.platforms) as SocialPlatform[]).filter((platform) => settings.platforms[platform]);
  if (platforms.length === 0) return [];
  const total = Math.min(28, settings.horizonDays * settings.dailyDraftLimit);
  const slots: PostingSlot[] = [];
  let reelsRemaining = Math.min(settings.weeklyReels, total);

  for (let index = 0; index < total; index += 1) {
    const dayOffset = Math.floor(index / settings.dailyDraftLimit);
    const platform = platforms[index % platforms.length];
    const windows = settings.postingWindows[platform].filter(validTime);
    const localTime = windows[index % Math.max(1, windows.length)] || "13:00";
    const preferred = settings.contentMix[index % settings.contentMix.length];
    const mustUseReel = reelsRemaining > 0 && (index % Math.max(1, Math.floor(total / Math.max(1, settings.weeklyReels))) === 0);
    const contentType = mustUseReel && settings.contentMix.includes("reel") ? "reel" : preferred;
    if (contentType === "reel") reelsRemaining -= 1;
    slots.push({ dayOffset, platform, localTime, contentType });
  }
  return slots;
}

export function reelSceneContract() {
  return Array.from({ length: 5 }, (_, index) => ({
    position: index + 1,
    durationMs: 2000,
    aspectRatio: "9:16" as const,
  }));
}

export function truthfulChannelStatus(platform: SocialPlatform, state?: ChannelState) {
  if (state?.publish_capable === true) {
    return { status: "publish_capable" as const, note: state.note || `${platform} delivery capability was verified.` };
  }
  if (platform === "tiktok" && state?.verified) {
    return {
      status: "manual_required" as const,
      note: state.note || "TikTok profile verification is not Content Posting API permission; manual upload remains required.",
    };
  }
  return {
    status: state?.configured ? "configured_not_publish_capable" as const : "credentials_required" as const,
    note: state?.note || `${platform} delivery credentials/capability are not verified.`,
  };
}

export function applyVisualPreset<T extends Record<string, unknown>>(brief: T): T & { visual_preset: SocialVisualPreset } {
  return { ...brief, visual_preset: IRHA_SOCIAL_VISUAL_PRESET };
}

function clamp(value: unknown, minimum: number, maximum: number, fallback: number) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(minimum, Math.min(maximum, Math.round(number))) : fallback;
}

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, 120) : "";
}

function uniqueStrings(value: unknown) {
  if (!Array.isArray(value)) return DEFAULT_SOCIAL_AUTOPILOT_SETTINGS.targetMarkets;
  return [...new Set(value.filter((item): item is string => typeof item === "string").map(clean).filter(Boolean))];
}

function validTime(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(Object.entries(value as Record<string, unknown>).sort(([left], [right]) => left.localeCompare(right)).map(([key, child]) => [key, sortObject(child)]));
}
